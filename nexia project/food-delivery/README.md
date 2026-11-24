# 🍕 Food Delivery Platform — Microservices Architecture

A production-grade food delivery backend built with **NestJS**, **RabbitMQ**, **gRPC**, **Kong API Gateway**, **MongoDB**, and **Jaeger** distributed tracing.

---

## 🏗️ Architecture Overview

```
Client
  │
  ▼
Kong API Gateway (port 8000)
  │  ├─ /api/users     → User Service        (port 3001)
  │  ├─ /api/restaurants→ Restaurant Service  (port 3002)
  │  ├─ /api/orders    → Order Service       (port 3003)
  │  ├─ /api/payments  → Payment Service     (port 3004)
  │  └─ /api/deliveries→ Delivery Service    (port 3005)
  │
  └─ JWT Auth Plugin (validates tokens from User Service)

Async Event Bus (RabbitMQ)
  ├─ order.placed       → Payment Service, Delivery Service
  ├─ payment.completed  → Order Service (confirm), Delivery Service (dispatch)
  ├─ payment.failed     → Order Service (cancel), Inventory Service (release)
  └─ delivery.updated   → Notification Service

gRPC Internal Calls
  ├─ Order → Restaurant (pricing, menu validation)
  └─ Order → User       (address, profile lookup)

Distributed Tracing: Jaeger (port 16686)
Databases: Each service has its own MongoDB database
```

---

## 📦 Services

| Service | Port | gRPC Port | Database |
|---|---|---|---|
| User Service | 3001 | 50051 | `food_users` |
| Restaurant Service | 3002 | 50052 | `food_restaurants` |
| Order Service | 3003 | — | `food_orders` |
| Payment Service | 3004 | — | `food_payments` |
| Delivery Service | 3005 | — | `food_deliveries` |
| Notification Service | 3006 | — | `food_notifications` |

---

## 🔄 Saga Pattern (Choreography)

```
OrderPlaced
   ├─ PaymentService: debit user wallet
   │     ├─ SUCCESS → PaymentCompleted → OrderService confirms, DeliveryService dispatches
   │     └─ FAIL    → PaymentFailed   → OrderService cancels, StockService releases inventory
   └─ NotificationService: sends "Order Received" push
```

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop ≥ 4.x
- Node.js ≥ 18
- npm ≥ 9

### 1. Start all infrastructure + services
```bash
docker compose up --build -d
```

### 2. Seed sample data
```bash
node seed-data/seed.js
```

### 3. Test via Kong Gateway
```bash
# Register a user
curl -X POST http://localhost:8000/api/users/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:8000/api/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Place an order (use JWT from login)
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"...","items":[{"menuItemId":"...","quantity":2}]}'
```

### 4. View distributed traces
Open **http://localhost:16686** (Jaeger UI)

### 5. Kong Admin API
Open **http://localhost:8001**

---

## 🗂️ Project Structure

```
food-delivery/
├── services/
│   ├── user-service/        # Auth, JWT, user profiles
│   ├── restaurant-service/  # Restaurants, menus, pricing (gRPC server)
│   ├── order-service/       # Order lifecycle + Saga orchestration
│   ├── payment-service/     # Wallet, payments, Stripe-ready
│   ├── delivery-service/    # Driver dispatch, real-time tracking
│   └── notification-service/# Email/SMS/push via RabbitMQ events
├── shared/
│   ├── proto/               # .proto files for gRPC
│   ├── events/              # RabbitMQ event type constants
│   └── tracing/             # OpenTelemetry + Jaeger setup
├── kong/                    # Kong declarative config
├── k8s/                     # Kubernetes manifests
├── seed-data/               # MongoDB seed scripts
└── docker-compose.yml
```

---

## 🌐 URLs at a Glance

| Service | URL |
|---|---|
| Kong Gateway | http://localhost:8000 |
| Kong Admin | http://localhost:8001 |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |
| Jaeger UI | http://localhost:16686 |
| MongoDB Express| http://localhost:8081 |
