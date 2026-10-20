const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
require('dotenv').config();

const connectDB = require('../config/db');

const seedData = async (shouldExit = false) => {
  await connectDB();

  // --- Users ---
  const demoUsers = [
    { name: 'Demo Customer', email: 'customer@foodflow.com', password: 'password123', role: 'customer', phone: '9876543210' },
    { name: 'Demo Waiter', email: 'waiter@foodflow.com', password: 'password123', role: 'waiter', phone: '9876543211' },
    { name: 'Demo Kitchen', email: 'kitchen@foodflow.com', password: 'password123', role: 'kitchen', phone: '9876543212' },
    { name: 'Demo Delivery', email: 'delivery@foodflow.com', password: 'password123', role: 'delivery', phone: '9876543213' },
    { name: 'Demo Manager', email: 'manager@foodflow.com', password: 'password123', role: 'manager', phone: '9876543214' },
    { name: 'Demo Admin', email: 'admin@foodflow.com', password: 'password123', role: 'admin', phone: '9876543215' },
  ];
  const users = [];
  for (const demoUser of demoUsers) {
    let user = await User.findOne({ email: demoUser.email });
    if (!user) {
      user = await User.create(demoUser);
    } else if (!(await user.matchPassword(demoUser.password))) {
      user.password = demoUser.password;
      await user.save();
    }
    users.push(user);
  }
  console.log(`Seeded ${users.length} users`);

  // --- Restaurants ---
  const restaurantData = [
    {
      name: 'The Rustic Spatula',
      address: '12 MG Road, Bangalore, Karnataka 560001',
      cuisine: 'Italian',
      rating: 4.8,
      deliveryTime: '25-40 min',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
      isOpen: true
    },
    {
      name: 'Spice Garden',
      address: '45 Anna Salai, Chennai, Tamil Nadu 600002',
      cuisine: 'Indian',
      rating: 4.5,
      deliveryTime: '30-45 min',
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
      isOpen: true
    }
  ];
  const restaurants = [];
  for (const data of restaurantData) {
    let restaurant = await Restaurant.findOne({ name: data.name });
    if (!restaurant) restaurant = await Restaurant.create(data);
    restaurants.push(restaurant);
  }
  console.log(`Seeded ${restaurants.length} restaurants`);

  const [rusticSpatula, spiceGarden] = restaurants;

  // --- Menu Items: The Rustic Spatula ---
  const menuItems1 = [
    { restaurantId: rusticSpatula._id, name: 'Margherita Pizza', category: 'Pizza', price: 14.99, description: 'Fresh mozzarella, San Marzano tomatoes, and basil on a wood-fired crust.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Pepperoni Pizza', category: 'Pizza', price: 16.99, description: 'Spicy pepperoni, mozzarella, and signature tomato sauce.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Truffle Mushroom Risotto', category: 'Mains', price: 19.50, description: 'Creamy Arborio rice with wild mushrooms, parmesan, and white truffle oil.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Chicken Parmesan', category: 'Mains', price: 18.00, description: 'Crispy breaded chicken breast, marinara sauce, melted mozzarella and basil.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Calamari Fritti', category: 'Starters', price: 11.00, description: 'Crispy fried calamari served with zesty marinara dipping sauce.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Bruschetta al Pomodoro', category: 'Starters', price: 8.50, description: 'Toasted bread with fresh tomatoes, garlic, basil, and extra virgin olive oil.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Tiramisu', category: 'Desserts', price: 8.50, description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'Panna Cotta', category: 'Desserts', price: 7.00, description: 'Silky Italian cream dessert topped with mixed berry coulis.', isAvailable: true },
    { restaurantId: rusticSpatula._id, name: 'San Pellegrino', category: 'Beverages', price: 3.50, description: 'Sparkling Italian mineral water, 750ml.', isAvailable: true },
  ];

  // --- Menu Items: Spice Garden ---
  const menuItems2 = [
    { restaurantId: spiceGarden._id, name: 'Butter Chicken', category: 'Mains', price: 13.99, description: 'Tender chicken in a rich, creamy tomato-based sauce with aromatic spices.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Paneer Tikka Masala', category: 'Mains', price: 12.50, description: 'Grilled cottage cheese in a spiced tomato and onion gravy.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Dal Makhani', category: 'Mains', price: 10.00, description: 'Slow-cooked black lentils in a rich buttery tomato cream sauce.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Samosa (2 pcs)', category: 'Starters', price: 5.00, description: 'Crispy pastry filled with spiced potatoes and peas, served with mint chutney.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Chicken Seekh Kebab', category: 'Starters', price: 9.50, description: 'Minced chicken with herbs and spices, grilled on skewers over charcoal.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Garlic Naan', category: 'Starters', price: 3.00, description: 'Freshly baked leavened bread with garlic and butter from the tandoor.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Gulab Jamun', category: 'Desserts', price: 5.50, description: 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Rasmalai', category: 'Desserts', price: 6.00, description: 'Soft cottage cheese patties soaked in saffron-infused sweetened milk.', isAvailable: true },
    { restaurantId: spiceGarden._id, name: 'Mango Lassi', category: 'Beverages', price: 4.00, description: 'Chilled yogurt-based drink blended with fresh Alphonso mango pulp.', isAvailable: true },
  ];

  for (const item of [...menuItems1, ...menuItems2]) {
    const existingItem = await MenuItem.findOne({ restaurantId: item.restaurantId, name: item.name });
    if (!existingItem) await MenuItem.create(item);
  }
  console.log(`Seeded ${menuItems1.length + menuItems2.length} menu items`);

  // --- Tables ---
  const tables = Array.from({ length: 10 }, (_, i) => ({
    tableNumber: i + 1,
    capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
    status: 'Available',
    currentOrderId: null
  }));
  for (const table of tables) {
    const existingTable = await Table.findOne({ tableNumber: table.tableNumber });
    if (!existingTable) await Table.create(table);
  }
  console.log(`Seeded ${tables.length} tables`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo Login Credentials:');
  console.log('  customer@foodflow.com  | password123');
  console.log('  waiter@foodflow.com    | password123');
  console.log('  kitchen@foodflow.com   | password123');
  console.log('  delivery@foodflow.com  | password123');
  console.log('  manager@foodflow.com   | password123');
  console.log('  admin@foodflow.com     | password123');

  if (shouldExit) {
    process.exit(0);
  }
  return {
    usersCount: users.length,
    restaurantsCount: restaurants.length,
    menuItemsCount: menuItems1.length + menuItems2.length,
    tablesCount: tables.length
  };
};

if (require.main === module) {
  seedData(true).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = seedData;
