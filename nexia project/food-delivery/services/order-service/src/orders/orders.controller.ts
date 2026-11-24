import {
  Controller, Get, Post, Body, Param, UseGuards, Request, Patch
} from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── REST Endpoints ────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a new order (triggers OrderPlaced saga)' })
  create(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders' })
  findAll(@Request() req) {
    return this.ordersService.findAll(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  // ── RabbitMQ Saga Event Consumers ────────────────────

  /**
   * Saga Step: PaymentCompleted → Confirm order
   */
  @EventPattern('payment.completed')
  async handlePaymentCompleted(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      console.log(`[Saga] payment.completed for order ${data.orderId}`);
      await this.ordersService.confirmOrder(data.orderId, data.paymentId);
      channel.ack(msg);
    } catch (err) {
      console.error('[Saga] Error confirming order:', err.message);
      channel.nack(msg, false, false); // Dead-letter
    }
  }

  /**
   * Saga Compensation: PaymentFailed → Cancel order
   */
  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      console.log(`[Saga] payment.failed for order ${data.orderId} — cancelling`);
      await this.ordersService.cancelOrder(data.orderId, `Payment failed: ${data.reason}`);
      channel.ack(msg);
    } catch (err) {
      console.error('[Saga] Error cancelling order:', err.message);
      channel.nack(msg, false, false);
    }
  }

  /**
   * Delivery status updates
   */
  @EventPattern('delivery.updated')
  async handleDeliveryUpdated(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      const statusMap = {
        ASSIGNED: 'OUT_FOR_DELIVERY',
        PICKED_UP: 'OUT_FOR_DELIVERY',
        ON_THE_WAY: 'OUT_FOR_DELIVERY',
        DELIVERED: 'DELIVERED',
      };
      const newStatus = statusMap[data.status];
      if (newStatus) {
        await this.ordersService.updateStatus(data.orderId, newStatus as any);
      }
      channel.ack(msg);
    } catch (err) {
      channel.nack(msg, false, false);
    }
  }
}
