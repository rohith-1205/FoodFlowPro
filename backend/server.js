const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const { protect, authorize } = require('./middleware/authMiddleware');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);

// Import routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const waiterRoutes = require('./routes/waiterRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const seedData = require('./utils/seedData');
const Table = require('./models/Table');
const { setupSocketIO } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/delivery', deliveryRoutes);

// Tables route
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tables', error: err.message });
  }
});

// Seed route (for easy seeding via GET or POST)
app.all('/api/seed', async (req, res) => {
  try {
    const summary = await seedData(false);
    res.json({ message: 'Database seeded successfully!', summary });
  } catch (err) {
    res.status(500).json({ message: 'Seeding failed', error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FoodFlow Pro API is running' });
});

// Socket.io - Real-time communication & rooms
setupSocketIO(io);

// Expose io instance for use in other modules
app.set('io', io);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`FoodFlow Pro Server running on port ${PORT}`);
  });
});
