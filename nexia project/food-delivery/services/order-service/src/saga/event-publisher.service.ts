import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  OrderPlacedEvent,
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '../../../shared/events';

/**
 * EventPublisherService
 * Publishes domain events to RabbitMQ using a topic exchange.
 * The saga is choreography-based: each service reacts to events independently.
 */
@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672');
    let retries = 10;
    while (retries > 0) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();
        // Declare topic exchanges
        for (const exchange of Object.values(RABBITMQ_EXCHANGES)) {
          await this.channel.assertExchange(exchange, 'topic', { durable: true });
        }
        console.log('[RabbitMQ] EventPublisher connected');
        return;
      } catch (err) {
        retries--;
        console.warn(`[RabbitMQ] Connection failed, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error('[RabbitMQ] Could not connect after 10 retries');
  }

  async publishOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    const payload = Buffer.from(JSON.stringify(event));
    this.channel.publish(
      RABBITMQ_EXCHANGES.ORDERS,
      RABBITMQ_ROUTING_KEYS.ORDER_PLACED,
      payload,
      { persistent: true, headers: { traceId: event.traceId } },
    );
    console.log(`[RabbitMQ] Published: order.placed → orderId=${event.orderId}`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
