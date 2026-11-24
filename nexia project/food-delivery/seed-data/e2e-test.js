#!/usr/bin/env node
/**
 * End-to-End Flow Test Script
 * 
 * Tests the full saga flow:
 * 1. Register user
 * 2. Login → get JWT
 * 3. List restaurants
 * 4. Place order (triggers OrderPlaced → PaymentCompleted → DeliveryAssigned saga)
 * 5. Poll order status
 * 6. Check Jaeger for traces
 * 
 * Usage: node seed-data/e2e-test.js
 * Prereq: All services running (docker compose up)
 */

const BASE_URL = process.env.KONG_URL || 'http://localhost:8000';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  
  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}:`, data);
    return null;
  }
  return data;
}

async function runTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Food Delivery — End-to-End Saga Flow Test');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Register user
  console.log('Step 1: Register user...');
  const reg = await req('POST', '/api/users/auth/register', {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'secret123',
    address: '789 Whitefield, Bangalore',
  });
  if (!reg) return;
  const { access_token: token, user } = reg;
  console.log(`✅ Registered: ${user.email} | token: ${token.slice(0, 20)}...\n`);

  // 2. List restaurants
  console.log('Step 2: List restaurants via Kong...');
  const restaurants = await req('GET', '/api/restaurants', null, token);
  if (!restaurants?.length) {
    console.log('⚠️  No restaurants found. Run: node seed-data/seed.js');
    return;
  }
  const restaurant = restaurants[0];
  console.log(`✅ Found: "${restaurant.name}" (${restaurant.cuisineType})\n`);

  // 3. Get menu
  console.log('Step 3: Get menu items...');
  const menu = await req('GET', `/api/restaurants/${restaurant._id}/menu`, null, token);
  if (!menu?.length) { console.log('⚠️  No menu items'); return; }
  const item = menu[0];
  console.log(`✅ Menu item: "${item.name}" @ ₹${item.price}\n`);

  // 4. Place order (triggers saga)
  console.log('Step 4: Place order (triggers OrderPlaced saga)...');
  const order = await req('POST', '/api/orders', {
    restaurantId: restaurant._id,
    items: [{ menuItemId: item._id, quantity: 2 }],
    deliveryAddress: '789 Whitefield, Bangalore',
  }, token);
  if (!order) return;
  console.log(`✅ Order placed! ID: ${order._id}`);
  console.log(`   Status: ${order.status} | Total: ₹${order.totalAmount}\n`);

  // 5. Wait for saga to complete
  console.log('Step 5: Waiting for saga (Payment + Delivery)...');
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    const updated = await req('GET', `/api/orders/${order._id}`, null, token);
    if (updated) {
      console.log(`   [${i+1}/10] Order status: ${updated.status}`);
      if (updated.status === 'CONFIRMED' || updated.status === 'CANCELLED') {
        console.log(`\n✅ Saga completed! Final status: ${updated.status}`);
        if (updated.status === 'CANCELLED') {
          console.log(`   Reason: ${updated.cancelReason}`);
        }
        break;
      }
    }
  }

  // 6. Check payment
  console.log('\nStep 6: Check payment record...');
  const payment = await req('GET', `/api/payments/order/${order._id}`, null, token);
  if (payment) {
    console.log(`✅ Payment: ${payment.status} | Method: ${payment.method} | Amount: ₹${payment.amount}`);
  }

  // 7. Check delivery
  console.log('\nStep 7: Check delivery assignment...');
  const delivery = await req('GET', `/api/deliveries/order/${order._id}`, null, token);
  if (delivery) {
    console.log(`✅ Delivery: ${delivery.status} | Driver: ${delivery.driverName || 'Not assigned'}`);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('🎯 View distributed traces at: http://localhost:16686');
  console.log('   Search for service: order-service');
  console.log('═══════════════════════════════════════════════');
}

runTest().catch(console.error);
