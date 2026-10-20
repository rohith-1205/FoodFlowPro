const mongoose = require('mongoose');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Delivery = require('../models/Delivery');
const Restaurant = require('../models/Restaurant');
const { socketHelpers } = require('../socket');

// Helper to calculate elapsed time
const calculateElapsedTime = (createdAt) => {
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  return {
    formatted: `${minutes}m ${seconds}s`,
    minutes,
    seconds: diffSec
  };
};

/**
 * GET /api/kitchen/orders
 * Fetch all active incoming orders (status in ['Pending', 'Confirmed', 'Preparing'])
 * Includes items, quantities, special instructions, orderType, tableNumber, and order elapsed time.
 */
const getActiveKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['Pending', 'Confirmed', 'Preparing'] }
    })
      .populate('customerId', 'name phone email')
      .populate('restaurantId', 'name')
      .sort({ createdAt: 1 }); // Oldest first for kitchen FIFO ticket workflow

    const ordersWithElapsed = orders.map((order) => {
      const orderObj = order.toObject();
      const elapsed = calculateElapsedTime(order.createdAt);
      orderObj.elapsedTime = elapsed.formatted;
      orderObj.elapsedMinutes = elapsed.minutes;
      orderObj.elapsedSeconds = elapsed.seconds;
      return orderObj;
    });

    res.json(ordersWithElapsed);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch kitchen orders', error: error.message });
  }
};

/**
 * PATCH /api/kitchen/orders/:id/status
 * Update order status from 'Pending' -> 'Preparing' or 'Preparing' -> 'Ready'
 * When marked 'Ready' for dine-in, update Table status to indicate food is ready.
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Determine target status
    if (!status) {
      if (order.status === 'Pending' || order.status === 'Confirmed') {
        status = 'Preparing';
      } else if (order.status === 'Preparing') {
        status = 'Ready';
      } else {
        return res.status(400).json({
          message: `Cannot automatically transition order from status '${order.status}'`
        });
      }
    }

    // Validate valid next status
    const allowedStatuses = ['Preparing', 'Ready'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Kitchen can only transition to 'Preparing' or 'Ready'`
      });
    }

    order.status = status;
    await order.save();

    // When marked 'Ready' for dine-in, update Table status to indicate food is ready
    let updatedTable = null;
    if (status === 'Ready' && order.orderType === 'dine-in' && order.tableNumber) {
      updatedTable = await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { foodReady: true, currentOrderId: order._id, status: 'Occupied' },
        { new: true }
      );
    }

    // Emit real-time socket events
    const io = req.app.get('io');
    if (io) {
      // Developer 3 socket room broadcasts
      socketHelpers.broadcastOrderStatusUpdate(io, order);

      if (status === 'Ready') {
        if (order.orderType === 'delivery') {
          let delivery = await Delivery.findOne({ orderId: order._id });
          if (!delivery) {
            const restaurant = await Restaurant.findById(order.restaurantId);
            delivery = await Delivery.create({
              orderId: order._id,
              status: 'Available',
              pickupAddress: restaurant ? restaurant.address : 'Restaurant Kitchen',
              deliveryAddress: order.deliveryAddress,
              customerPhone: '',
              currentCoordinates: { lat: 12.9716, lng: 77.5946 }
            });
          }
          socketHelpers.broadcastReadyForDelivery(io, order, delivery);
        } else if (order.orderType === 'dine-in') {
          socketHelpers.broadcastTableReady(io, {
            orderId: order._id,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            items: order.items,
            table: updatedTable
          });
        }
      }

      // Backward compatible legacy events
      io.emit('order_status_updated', order);
      io.emit('kitchen_order_updated', order);
      if (status === 'Ready') {
        io.emit('food_ready', {
          orderId: order._id,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          items: order.items,
          table: updatedTable
        });
      }
      if (updatedTable) {
        io.emit('table_updated', updatedTable);
      }
    }

    const elapsed = calculateElapsedTime(order.createdAt);
    const orderObj = order.toObject();
    orderObj.elapsedTime = elapsed.formatted;
    orderObj.elapsedMinutes = elapsed.minutes;
    orderObj.elapsedSeconds = elapsed.seconds;

    res.json({
      message: `Order status updated to '${status}' successfully`,
      order: orderObj,
      table: updatedTable
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

module.exports = {
  getActiveKitchenOrders,
  updateOrderStatus
};
