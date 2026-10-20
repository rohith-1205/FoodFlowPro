const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

const createOrder = async (req, res) => {
  try {
    const { restaurantId, orderType, tableNumber, deliveryAddress, items, paymentMethod, specialInstructions } = req.body;

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'No items in order' });
    if (items.some(item => !item || typeof item !== 'object')) {
      return res.status(400).json({ message: 'Invalid order item' });
    }
    if (!mongoose.isValidObjectId(restaurantId)) return res.status(400).json({ message: 'Invalid restaurant' });
    if (!['dine-in', 'delivery'].includes(orderType)) return res.status(400).json({ message: 'Invalid order type' });
    if (!['Card', 'UPI', 'Cash'].includes(paymentMethod)) return res.status(400).json({ message: 'Invalid payment method' });
    if (orderType === 'dine-in' && !tableNumber) return res.status(400).json({ message: 'Table number required for dine-in' });
    if (orderType === 'delivery' && !deliveryAddress) return res.status(400).json({ message: 'Delivery address required' });

    const restaurant = await Restaurant.findOne({ _id: restaurantId, isOpen: true });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found or closed' });

    const menuItemIds = items.map(item => item.menuItemId);
    if (menuItemIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid menu item' });
    }
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId,
      isAvailable: true
    });
    if (menuItems.length !== new Set(menuItemIds.map(String)).size) {
      return res.status(400).json({ message: 'One or more items are unavailable' });
    }

    const menuById = new Map(menuItems.map(item => [String(item._id), item]));
    const orderItems = [];
    for (const item of items) {
      const menuItem = menuById.get(String(item.menuItemId));
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: 'Item quantities must be positive whole numbers' });
      }
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || ''
      });
    }

    const rawSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotal = Number(rawSubtotal.toFixed(2));
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    if (orderType === 'dine-in') {
      const tableNum = parseInt(tableNumber, 10);
      if (isNaN(tableNum) || tableNum < 1) {
        return res.status(400).json({ message: 'Valid table number required for dine-in' });
      }
      let table = await Table.findOne({ tableNumber: tableNum });
      if (!table) {
        if (tableNum <= 50) {
          table = await Table.create({ tableNumber: tableNum, capacity: 4, status: 'Occupied' });
        } else {
          return res.status(400).json({ message: 'Table number must be between 1 and 50' });
        }
      }
    }

    const order = await Order.create({
      customerId: req.user._id,
      restaurantId,
      orderType,
      tableNumber: orderType === 'dine-in' ? parseInt(tableNumber, 10) : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash' ? 'Pending' : 'Paid',
      specialInstructions
    });

    // Update table status for dine-in
    if (orderType === 'dine-in' && tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: parseInt(tableNumber, 10) },
        { status: 'Occupied', currentOrderId: order._id }
      );
    }

    // Emit real-time notification if socket is available
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', order);
      io.to(`restaurant_${restaurantId}`).emit('order_created', order);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .populate('restaurantId', 'name cuisine image address')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name cuisine image address')
      .populate('customerId', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const staffRoles = ['waiter', 'kitchen', 'delivery', 'manager', 'admin'];
    if (String(order.customerId?._id) !== String(req.user._id) && !staffRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, getTables };
