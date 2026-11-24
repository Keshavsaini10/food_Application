import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliveryDocument = Delivery & Document;

export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true, collection: 'deliveries' })
export class Delivery {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  restaurantId: string;

  @Prop({ required: true })
  deliveryAddress: string;

  @Prop({ enum: Object.values(DeliveryStatus), default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Prop({ default: '' })
  driverName: string;

  @Prop({ default: '' })
  driverPhone: string;

  @Prop({ default: 30 })
  estimatedMinutes: number;

  @Prop({ type: Date })
  pickedUpAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ default: '' })
  traceId: string;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
