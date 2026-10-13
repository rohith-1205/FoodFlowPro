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

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    if (orderType === 'dine-in') {
      const table = await Table.findOne({ tableNumber, status: 'Available' });
      if (!table) return res.status(400).json({ message: 'Table is unavailable' });
    }

    const order = await Order.create({
      customerId: req.user._id,
      restaurantId,
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount,
      totalAmount,
      paymentMethod,
      specialInstructions
    });

    // Update table status for dine-in
    if (orderType === 'dine-in' && tableNumber) {
      const table = await Table.findOneAndUpdate(
        { tableNumber, status: 'Available' },
        { status: 'Occupied', currentOrderId: order._id }
      );
      if (!table) {
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({ message: 'Table is unavailable' });
      }
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .populate('restaurantId', 'name cuisine image')
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
    if (String(order.customerId._id) !== String(req.user._id) && !staffRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById };
