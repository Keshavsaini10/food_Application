import {
  Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { trace, context } from '@opentelemetry/api';
import { Order, OrderDocument, OrderStatus } from './order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventPublisherService } from '../saga/event-publisher.service';

interface RestaurantGrpcService {
  validateOrder(data: any): any;
  getRestaurant(data: any): any;
}

interface UserGrpcService {
  getUser(data: any): any;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private restaurantGrpc: RestaurantGrpcService;
  private userGrpc: UserGrpcService;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject('RESTAURANT_SERVICE') private restaurantClient: ClientGrpc,
    @Inject('USER_SERVICE') private userClient: ClientGrpc,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  onModuleInit() {
    this.restaurantGrpc = this.restaurantClient.getService<RestaurantGrpcService>('RestaurantService');
    this.userGrpc = this.userClient.getService<UserGrpcService>('UserService');
  }

  async create(userId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    // ── Start a trace span ───────────────────────────────
    const tracer = trace.getTracer('order-service');
    return tracer.startActiveSpan('OrdersService.create', async (span) => {
      try {
        span.setAttribute('order.userId', userId);
        span.setAttribute('order.restaurantId', dto.restaurantId);

        // ── 1. Validate restaurant exists via gRPC ───────
        span.addEvent('grpc.getRestaurant');
        const restaurant = await firstValueFrom(
          this.restaurantGrpc.getRestaurant({ restaurantId: dto.restaurantId }),
        );
        if (!restaurant.isOpen) {
          throw new BadRequestException('Restaurant is currently closed');
        }

        // ── 2. Validate & price items via gRPC ───────────
        span.addEvent('grpc.validateOrder');
        const validation = await firstValueFrom(
          this.restaurantGrpc.validateOrder({
            restaurantId: dto.restaurantId,
            items: dto.items,
          }),
        );
        if (!validation.valid) {
          throw new BadRequestException(`Order validation failed: ${validation.message}`);
        }

        // ── 3. Get user delivery address via gRPC ────────
        span.addEvent('grpc.getUser');
        const user = await firstValueFrom(this.userGrpc.getUser({ userId }));

        // ── 4. Create order in DB ────────────────────────
        const order = new this.orderModel({
          userId,
          restaurantId: dto.restaurantId,
          items: validation.pricedItems,
          totalAmount: validation.totalPrice,
          deliveryAddress: dto.deliveryAddress || user.address,
          deliveryFee: restaurant.deliveryFee || 0,
          traceId: span.spanContext().traceId,
        });
        const saved = await order.save();
        span.setAttribute('order.id', saved._id.toString());
        span.setAttribute('order.total', saved.totalAmount);

        // ── 5. Publish OrderPlaced event (Saga starts) ───
        span.addEvent('rabbitmq.publish.OrderPlaced');
        await this.eventPublisher.publishOrderPlaced({
          orderId: saved._id.toString(),
          userId,
          restaurantId: dto.restaurantId,
          items: validation.pricedItems,
          totalAmount: validation.totalPrice,
          deliveryAddress: saved.deliveryAddress,
          traceId: span.spanContext().traceId,
          timestamp: new Date().toISOString(),
        });

        span.setStatus({ code: 1 }); // OK
        return saved;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: 2, message: err.message }); // ERROR
        throw err;
      } finally {
        span.end();
      }
    });
  }

  findAll(userId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async confirmOrder(orderId: string, paymentId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status: OrderStatus.CONFIRMED, paymentId },
      { new: true },
    );
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  async cancelOrder(orderId: string, reason: string): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status: OrderStatus.CANCELLED, cancelReason: reason },
      { new: true },
    );
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  findRestaurantOrders(restaurantId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ restaurantId }).sort({ createdAt: -1 });
  }
}
