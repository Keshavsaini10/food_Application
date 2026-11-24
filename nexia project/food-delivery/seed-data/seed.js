#!/usr/bin/env node
/**
 * MongoDB Seed Script
 * 
 * Seeds the food-delivery platform with sample data:
 * - 3 restaurants with menus
 * - 2 users with wallet balance
 * 
 * Usage: node seed-data/seed.js
 * Prereq: MongoDB running on localhost:27017
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';

async function seed() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // ── Users ───────────────────────────────────────────────
    const usersDb = client.db('food_users');
    await usersDb.collection('users').deleteMany({});

    const password = await bcrypt.hash('secret123', 10);
    const alice = { _id: new ObjectId(), name: 'Alice Johnson', email: 'alice@example.com', password, phone: '+91-9876543210', address: '123 MG Road, Bangalore', walletBalance: 1500, role: 'customer', isActive: true };
    const bob   = { _id: new ObjectId(), name: 'Bob Smith',    email: 'bob@example.com',   password, phone: '+91-9876543211', address: '456 Brigade Road, Bangalore', walletBalance: 500, role: 'customer', isActive: true };
    
    await usersDb.collection('users').insertMany([alice, bob]);
    console.log('✅ Seeded users: alice@example.com, bob@example.com (password: secret123)');

    // ── Restaurants ─────────────────────────────────────────
    const restDb = client.db('food_restaurants');
    await restDb.collection('restaurants').deleteMany({});
    await restDb.collection('menu_items').deleteMany({});

    const spiceGarden = {
      _id: new ObjectId(),
      name: 'Spice Garden',
      address: '15 Brigade Road, Bangalore',
      cuisineType: 'Indian',
      rating: 4.5,
      isOpen: true,
      estimatedDeliveryMinutes: 30,
      minimumOrder: 150,
      deliveryFee: 25,
      ownerId: '',
    };

    const pizzaParadise = {
      _id: new ObjectId(),
      name: 'Pizza Paradise',
      address: '88 Koramangala, Bangalore',
      cuisineType: 'Italian',
      rating: 4.3,
      isOpen: true,
      estimatedDeliveryMinutes: 25,
      minimumOrder: 200,
      deliveryFee: 30,
      ownerId: '',
    };

    const dragonWok = {
      _id: new ObjectId(),
      name: 'Dragon Wok',
      address: '22 Indiranagar, Bangalore',
      cuisineType: 'Chinese',
      rating: 4.1,
      isOpen: true,
      estimatedDeliveryMinutes: 35,
      minimumOrder: 180,
      deliveryFee: 20,
      ownerId: '',
    };

    await restDb.collection('restaurants').insertMany([spiceGarden, pizzaParadise, dragonWok]);

    // ── Menu Items ──────────────────────────────────────────
    const menuItems = [
      // Spice Garden
      { restaurantId: spiceGarden._id, name: 'Butter Chicken', price: 320, category: 'Main Course', description: 'Creamy tomato-based curry', available: true, isVegetarian: false, preparationTimeMinutes: 20 },
      { restaurantId: spiceGarden._id, name: 'Paneer Tikka', price: 280, category: 'Starters', description: 'Marinated cottage cheese grilled in tandoor', available: true, isVegetarian: true, preparationTimeMinutes: 15 },
      { restaurantId: spiceGarden._id, name: 'Dal Makhani', price: 220, category: 'Main Course', description: 'Slow-cooked black lentils', available: true, isVegetarian: true, preparationTimeMinutes: 25 },
      { restaurantId: spiceGarden._id, name: 'Garlic Naan', price: 60, category: 'Breads', description: 'Leavened bread with garlic', available: true, isVegetarian: true, preparationTimeMinutes: 10 },
      
      // Pizza Paradise
      { restaurantId: pizzaParadise._id, name: 'Margherita Pizza', price: 350, category: 'Pizza', description: 'Classic tomato, mozzarella, basil', available: true, isVegetarian: true, preparationTimeMinutes: 20 },
      { restaurantId: pizzaParadise._id, name: 'BBQ Chicken Pizza', price: 450, category: 'Pizza', description: 'Smoky BBQ chicken with onions', available: true, isVegetarian: false, preparationTimeMinutes: 22 },
      { restaurantId: pizzaParadise._id, name: 'Caesar Salad', price: 180, category: 'Salads', description: 'Romaine, parmesan, croutons', available: true, isVegetarian: true, preparationTimeMinutes: 8 },
      
      // Dragon Wok
      { restaurantId: dragonWok._id, name: 'Kung Pao Chicken', price: 340, category: 'Main Course', description: 'Spicy stir-fried chicken with peanuts', available: true, isVegetarian: false, preparationTimeMinutes: 18 },
      { restaurantId: dragonWok._id, name: 'Vegetable Fried Rice', price: 220, category: 'Rice', description: 'Wok-tossed rice with vegetables', available: true, isVegetarian: true, preparationTimeMinutes: 15 },
      { restaurantId: dragonWok._id, name: 'Hot & Sour Soup', price: 150, category: 'Soups', description: 'Classic tangy and spicy broth', available: true, isVegetarian: true, preparationTimeMinutes: 10 },
    ].map((item) => ({ ...item, _id: new ObjectId() }));

    await restDb.collection('menu_items').insertMany(menuItems);

    console.log('✅ Seeded 3 restaurants with menus');
    console.log('\n📋 Sample IDs for testing:');
    console.log(`   alice userId:          ${alice._id}`);
    console.log(`   Spice Garden ID:       ${spiceGarden._id}`);
    console.log(`   Butter Chicken itemId: ${menuItems[0]._id}`);
    console.log(`   Paneer Tikka itemId:   ${menuItems[1]._id}`);
    console.log('\n🚀 Try placing an order:');
    console.log(`   POST http://localhost:8000/api/orders`);
    console.log(`   Body: { "restaurantId": "${spiceGarden._id}", "items": [{ "menuItemId": "${menuItems[0]._id}", "quantity": 2 }] }`);

  } finally {
    await client.close();
  }
}

seed().catch(console.error);
