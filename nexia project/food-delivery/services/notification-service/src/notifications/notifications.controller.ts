import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

/**
 * NotificationsController
 *
 * Saga role: Passive listener — sends push/email/SMS notifications
 * in response to domain events across the platform.
 */
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('order.placed')
  async onOrderPlaced(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      await this.notificationsService.send({
        userId: data.userId,
        type: 'ORDER_PLACED',
        title: '🍕 Order Received!',
        body: `Your order of ₹${data.totalAmount} has been placed. We're preparing it!`,
        metadata: { orderId: data.orderId },
      });
      channel.ack(msg);
    } catch (err) {
      this.logger.error('Failed to send order.placed notification', err.message);
      channel.nack(msg, false, false);
    }
  }

  @EventPattern('payment.completed')
  async onPaymentCompleted(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      await this.notificationsService.send({
        userId: data.userId,
        type: 'PAYMENT_COMPLETED',
        title: '✅ Payment Successful!',
        body: `₹${data.amount} debited. Your order is confirmed!`,
        metadata: { orderId: data.orderId, paymentId: data.paymentId },
      });
      channel.ack(msg);
    } catch (err) {
      this.logger.error('Failed to send payment.completed notification', err.message);
      channel.nack(msg, false, false);
    }
  }

  @EventPattern('payment.failed')
  async onPaymentFailed(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      await this.notificationsService.send({
        userId: data.userId,
        type: 'PAYMENT_FAILED',
        title: '❌ Payment Failed',
        body: `Could not process payment: ${data.reason}. Order cancelled.`,
        metadata: { orderId: data.orderId },
      });
      channel.ack(msg);
    } catch (err) {
      this.logger.error('Failed to send payment.failed notification', err.message);
      channel.nack(msg, false, false);
    }
  }

  @EventPattern('delivery.assigned')
  async onDeliveryAssigned(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      await this.notificationsService.send({
        userId: data.userId,
        type: 'DELIVERY_ASSIGNED',
        title: '🚴 Driver on the way!',
        body: `${data.driverName} is picking up your order. ETA: ~${data.estimatedMinutes} mins`,
        metadata: { orderId: data.orderId, deliveryId: data.deliveryId },
      });
      channel.ack(msg);
    } catch (err) {
      channel.nack(msg, false, false);
    }
  }
}
