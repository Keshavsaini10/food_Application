import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { trace } from '@opentelemetry/api';
import { Delivery, DeliveryDocument, DeliveryStatus } from './delivery.schema';
import {
  RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, PaymentCompletedEvent
} from '../../../shared/events';

// Simulated driver pool
const DRIVERS = [
  { name: 'Rahul Kumar', phone: '+91-9876543210' },
  { name: 'Priya Sharma', phone: '+91-9876543211' },
  { name: 'Amit Singh', phone: '+91-9876543212' },
];

@Injectable()
export class DeliveriesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveriesService.name);
  private connection: amqp.Connection;
  private pubChannel: amqp.Channel;
  private consumerChannel: amqp.Channel;

  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
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

        for (const exchange of Object.values(RABBITMQ_EXCHANGES)) {
          await this.pubChannel.assertExchange(exchange, 'topic', { durable: true });
        }

        // Consume PaymentCompleted events → dispatch driver
        const q = await this.consumerChannel.assertQueue('delivery_saga_queue', { durable: true });
        await this.consumerChannel.bindQueue(q.queue, RABBITMQ_EXCHANGES.PAYMENTS, RABBITMQ_ROUTING_KEYS.PAYMENT_COMPLETED);
        this.consumerChannel.prefetch(5);

        this.consumerChannel.consume(q.queue, async (msg) => {
          if (!msg) return;
          try {
            const event: PaymentCompletedEvent = JSON.parse(msg.content.toString());
            await this.dispatchDelivery(event);
            this.consumerChannel.ack(msg);
          } catch (err) {
            this.logger.error('Error dispatching delivery:', err.message);
            this.consumerChannel.nack(msg, false, false);
          }
        });

        this.logger.log('Delivery service listening for payment.completed events');
        return;
      } catch (err) {
        retries--;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  private async dispatchDelivery(event: PaymentCompletedEvent) {
    const tracer = trace.getTracer('delivery-service');
    return tracer.startActiveSpan('DeliveriesService.dispatchDelivery', async (span) => {
      span.setAttribute('order.id', event.orderId);
      if (event.traceId) span.setAttribute('parent.traceId', event.traceId);

      // Idempotency check
      const existing = await this.deliveryModel.findOne({ orderId: event.orderId });
      if (existing) { span.end(); return; }

      // Assign random driver
      const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];

      const delivery = await new this.deliveryModel({
        orderId: event.orderId,
        userId: event.userId,
        restaurantId: '', // Would come from order context in production
        deliveryAddress: '',
        status: DeliveryStatus.ASSIGNED,
        driverName: driver.name,
        driverPhone: driver.phone,
        estimatedMinutes: Math.floor(Math.random() * 20) + 20,
        traceId: span.spanContext().traceId,
      }).save();

      // Publish delivery.assigned event
      this.pubChannel.publish(
        RABBITMQ_EXCHANGES.DELIVERY,
        RABBITMQ_ROUTING_KEYS.DELIVERY_ASSIGNED,
        Buffer.from(JSON.stringify({
          deliveryId: delivery._id.toString(),
          orderId: event.orderId,
          userId: event.userId,
          status: 'ASSIGNED',
          driverName: driver.name,
          estimatedMinutes: delivery.estimatedMinutes,
          traceId: span.spanContext().traceId,
          timestamp: new Date().toISOString(),
        })),
        { persistent: true },
      );

      this.logger.log(`[Saga] Delivery assigned: driver=${driver.name}, order=${event.orderId}`);
      span.end();
    });
  }

  findAll(): Promise<DeliveryDocument[]> {
    return this.deliveryModel.find().sort({ createdAt: -1 });
  }

  findByOrder(orderId: string): Promise<DeliveryDocument | null> {
    return this.deliveryModel.findOne({ orderId });
  }

  async updateStatus(id: string, status: DeliveryStatus): Promise<DeliveryDocument> {
    const updates: any = { status };
    if (status === DeliveryStatus.PICKED_UP) updates.pickedUpAt = new Date();
    if (status === DeliveryStatus.DELIVERED) updates.deliveredAt = new Date();
    return this.deliveryModel.findByIdAndUpdate(id, updates, { new: true });
  }

  async onModuleDestroy() {
    await this.pubChannel?.close();
    await this.consumerChannel?.close();
    await this.connection?.close();
  }
}
