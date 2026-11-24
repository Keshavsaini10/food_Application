import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { trace } from '@opentelemetry/api';
import { Payment, PaymentDocument, PaymentStatus } from './payment.schema';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS } from '../../../shared/events';

/**
 * PaymentsService
 *
 * Saga role: Consumes OrderPlaced → attempts wallet debit →
 *   publishes PaymentCompleted (success) or PaymentFailed (compensation trigger)
 */
@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private connection: amqp.Connection;
  private pubChannel: amqp.Channel;
  private consumerChannel: amqp.Channel;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672');
    let retries = 10;
    while (retries > 0) {
      try {
        this.connection = await amqp.connect(url);
        this.pubChannel = await this.connection.createChannel();
        this.consumerChannel = await this.connection.createChannel();

        // Declare exchanges
        for (const exchange of Object.values(RABBITMQ_EXCHANGES)) {
          await this.pubChannel.assertExchange(exchange, 'topic', { durable: true });
        }

        // Declare and bind payment consumer queue
        const q = await this.consumerChannel.assertQueue('payment_saga_queue', { durable: true });
        await this.consumerChannel.bindQueue(q.queue, RABBITMQ_EXCHANGES.ORDERS, RABBITMQ_ROUTING_KEYS.ORDER_PLACED);
        this.consumerChannel.prefetch(5);

        // Start consuming
        this.consumerChannel.consume(q.queue, async (msg) => {
          if (!msg) return;
          try {
            const event = JSON.parse(msg.content.toString());
            await this.processOrderPlaced(event);
            this.consumerChannel.ack(msg);
          } catch (err) {
            this.logger.error(`Error processing order.placed: ${err.message}`);
            this.consumerChannel.nack(msg, false, false);
          }
        });

        this.logger.log('RabbitMQ connected and consuming order.placed events');
        return;
      } catch (err) {
        retries--;
        this.logger.warn(`RabbitMQ connection failed, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  /**
   * Core Saga Step: Process an OrderPlaced event
   * Simulates wallet deduction (replace with real payment gateway in production)
   */
  private async processOrderPlaced(event: {
    orderId: string;
    userId: string;
    totalAmount: number;
    traceId?: string;
  }) {
    const tracer = trace.getTracer('payment-service');
    return tracer.startActiveSpan('PaymentsService.processOrderPlaced', async (span) => {
      span.setAttribute('order.id', event.orderId);
      span.setAttribute('order.userId', event.userId);
      span.setAttribute('order.amount', event.totalAmount);
      if (event.traceId) span.setAttribute('parent.traceId', event.traceId);

      // Check if already processed (idempotency)
      const existing = await this.paymentModel.findOne({ orderId: event.orderId });
      if (existing) {
        this.logger.warn(`Payment for order ${event.orderId} already processed`);
        span.end();
        return;
      }

      const payment = new this.paymentModel({
        orderId: event.orderId,
        userId: event.userId,
        amount: event.totalAmount,
        method: 'WALLET',
        status: PaymentStatus.PENDING,
        traceId: span.spanContext().traceId,
      });
      await payment.save();

      // ── Simulate wallet check (replace with real gRPC call to User Service) ──
      // For demo: orders < 2000 succeed, >= 2000 fail (simulates insufficient balance)
      const paymentSucceeds = event.totalAmount < 2000;

      if (paymentSucceeds) {
        payment.status = PaymentStatus.COMPLETED;
        await payment.save();
        span.addEvent('payment.completed');

        this.pubChannel.publish(
          RABBITMQ_EXCHANGES.PAYMENTS,
          RABBITMQ_ROUTING_KEYS.PAYMENT_COMPLETED,
          Buffer.from(JSON.stringify({
            paymentId: payment._id.toString(),
            orderId: event.orderId,
            userId: event.userId,
            amount: event.totalAmount,
            method: 'WALLET',
            traceId: span.spanContext().traceId,
            timestamp: new Date().toISOString(),
          })),
          { persistent: true },
        );
        this.logger.log(`[Saga] payment.completed for order ${event.orderId}`);
      } else {
        // Saga compensation: publish PaymentFailed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'Insufficient wallet balance';
        await payment.save();
        span.addEvent('payment.failed');

        this.pubChannel.publish(
          RABBITMQ_EXCHANGES.PAYMENTS,
          RABBITMQ_ROUTING_KEYS.PAYMENT_FAILED,
          Buffer.from(JSON.stringify({
            paymentId: payment._id.toString(),
            orderId: event.orderId,
            userId: event.userId,
            amount: event.totalAmount,
            reason: 'Insufficient wallet balance',
            traceId: span.spanContext().traceId,
            timestamp: new Date().toISOString(),
          })),
          { persistent: true },
        );
        this.logger.warn(`[Saga] payment.failed — compensation triggered for order ${event.orderId}`);
      }

      span.end();
    });
  }

  findByOrder(orderId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ orderId });
  }

  findByUser(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 });
  }

  async onModuleDestroy() {
    await this.pubChannel?.close();
    await this.consumerChannel?.close();
    await this.connection?.close();
  }
}
