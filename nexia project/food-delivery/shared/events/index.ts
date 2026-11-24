// ─────────────────────────────────────────────────────────
//  Shared RabbitMQ Event Types
//  Import this in any service that publishes or consumes events
// ─────────────────────────────────────────────────────────

export const RABBITMQ_EXCHANGES = {
  ORDERS: 'orders.exchange',
  PAYMENTS: 'payments.exchange',
  DELIVERY: 'delivery.exchange',
  NOTIFICATIONS: 'notifications.exchange',
} as const;

export const RABBITMQ_QUEUES = {
  // Payment Service consumes these
  ORDER_PLACED_FOR_PAYMENT: 'order.placed.payment',
  // Order Service consumes these
  PAYMENT_COMPLETED_FOR_ORDER: 'payment.completed.order',
  PAYMENT_FAILED_FOR_ORDER: 'payment.failed.order',
  // Delivery Service consumes these
  PAYMENT_COMPLETED_FOR_DELIVERY: 'payment.completed.delivery',
  // Notification Service consumes these
  ORDER_PLACED_FOR_NOTIFICATION: 'order.placed.notification',
  PAYMENT_COMPLETED_FOR_NOTIFICATION: 'payment.completed.notification',
  PAYMENT_FAILED_FOR_NOTIFICATION: 'payment.failed.notification',
  DELIVERY_UPDATED_FOR_NOTIFICATION: 'delivery.updated.notification',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_COMPLETED: 'delivery.completed',
} as const;

// ── Event Payloads ────────────────────────────────────────

export interface OrderPlacedEvent {
  orderId: string;
  userId: string;
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  totalAmount: number;
  deliveryAddress: string;
  traceId?: string;
  timestamp: string;
}

export interface PaymentCompletedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  method: string;
  traceId?: string;
  timestamp: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: string;
  traceId?: string;
  timestamp: string;
}

export interface DeliveryUpdatedEvent {
  deliveryId: string;
  orderId: string;
  userId: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED';
  driverName?: string;
  estimatedMinutes?: number;
  traceId?: string;
  timestamp: string;
}
