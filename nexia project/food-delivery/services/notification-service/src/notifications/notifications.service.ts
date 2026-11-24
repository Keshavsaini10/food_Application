import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) type: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  @Prop({ default: false }) read: boolean;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);

// ── Service ──────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
  ) {}

  async send(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationDocument> {
    // In production: integrate with Firebase FCM / Twilio / SendGrid
    this.logger.log(`📢 [${data.type}] → user:${data.userId} | ${data.title}`);
    this.logger.log(`   ${data.body}`);

    return new this.notifModel(data).save();
  }

  findByUser(userId: string): Promise<NotificationDocument[]> {
    return this.notifModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
  }
}
