import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true, collection: 'restaurants' })
export class Restaurant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  cuisineType: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: true })
  isOpen: boolean;

  @Prop({ default: 30 })
  estimatedDeliveryMinutes: number;

  @Prop()
  imageUrl: string;

  @Prop({ default: 0 })
  minimumOrder: number;

  @Prop({ default: 25 })
  deliveryFee: number;

  @Prop({ default: '' })
  ownerId: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
