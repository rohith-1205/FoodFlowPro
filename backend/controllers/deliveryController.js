const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { socketHelpers } = require('../socket');

/**
 * Helper to ensure a Delivery document exists for a delivery order
 */
const ensureDeliveryForOrder = async (order) => {
  let delivery = await Delivery.findOne({ orderId: order._id });
  if (!delivery) {
    const restaurant = order.restaurantId ? await Restaurant.findById(order.restaurantId) : null;
    const pickupAddress = restaurant ? restaurant.address : 'Restaurant Kitchen';
    const deliveryAddress = order.deliveryAddress || 'Customer Address';
    const customerPhone = order.customerId?.phone || '';

    delivery = await Delivery.create({
      orderId: order._id,
      deliveryBoyId: null,
      status: 'Available',
      pickupAddress,
      deliveryAddress,
      customerPhone,
      currentCoordinates: { lat: 12.9716, lng: 77.5946 },
      estimatedDeliveryMinutes: 30
    });
  }
  return delivery;
};

/**
 * GET /api/delivery/available
 * List delivery orders that are ready or preparing with customer address and restaurant details.
 */
const getAvailableDeliveries = async (req, res) => {
  try {
    // Find all delivery orders that are Preparing or Ready and not yet delivered/cancelled
    const eligibleOrders = await Order.find({
      orderType: 'delivery',
      status: { $in: ['Preparing', 'Ready'] }
    })
      .populate('restaurantId', 'name address cuisine image rating')
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 });

    // Ensure delivery records exist for each eligible order
    for (const order of eligibleOrders) {
      await ensureDeliveryForOrder(order);
    }

    // Fetch deliveries that are 'Available' or unassigned
    const availableDeliveries = await Delivery.find({
      status: 'Available',
      deliveryBoyId: null
    })
      .populate({
        path: 'orderId',
        populate: [
          { path: 'restaurantId', select: 'name address cuisine image rating phone' },
          { path: 'customerId', select: 'name phone email' }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter out any where order might be cancelled or invalid
    const activeAvailable = availableDeliveries.filter(
      d => d.orderId && ['Preparing', 'Ready'].includes(d.orderId.status)
    );

    res.json(activeAvailable);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available deliveries', error: error.message });
  }
};

/**
 * POST /api/delivery/accept/:orderId
 * Assign order to the logged-in delivery partner.
 */
const acceptDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId)
      .populate('restaurantId', 'name address')
      .populate('customerId', 'name phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.orderType !== 'delivery') {
      return res.status(400).json({ message: 'Only delivery orders can be accepted' });
    }

    // Check if the delivery is already assigned to someone else
    let delivery = await Delivery.findOne({ orderId: order._id });
    if (!delivery) {
      delivery = await ensureDeliveryForOrder(order);
    }

    if (delivery.deliveryBoyId && String(delivery.deliveryBoyId) !== String(req.user._id)) {
      return res.status(400).json({ message: 'Order is already accepted by another delivery partner' });
    }

    delivery.deliveryBoyId = req.user._id;
    delivery.status = 'Assigned';
    if (!delivery.pickupAddress && order.restaurantId) {
      delivery.pickupAddress = order.restaurantId.address;
    }
    if (!delivery.deliveryAddress) {
      delivery.deliveryAddress = order.deliveryAddress;
    }
    if (!delivery.customerPhone && order.customerId) {
      delivery.customerPhone = order.customerId.phone;
    }
    await delivery.save();

    await delivery.populate([
      {
        path: 'orderId',
        populate: [
          { path: 'restaurantId', select: 'name address cuisine image phone' },
          { path: 'customerId', select: 'name phone email' }
        ]
      },
      { path: 'deliveryBoyId', select: 'name email phone' }
    ]);

    // Emit real-time socket events
    const io = req.app.get('io');
    if (io) {
      socketHelpers.broadcastOrderStatusUpdate(io, order, {
        deliveryStatus: 'Assigned',
        delivery
      });
      io.to(`order_${order._id}`).emit('delivery:assigned', {
        orderId: order._id,
        deliveryBoy: { name: req.user.name, phone: req.user.phone },
        delivery
      });
    }

    res.json({
      message: `Delivery for Order #${order._id.toString().slice(-6).toUpperCase()} accepted successfully!`,
      delivery
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept delivery', error: error.message });
  }
};

/**
 * GET /api/delivery/active
 * Get the currently assigned active delivery for the delivery partner.
 */
const getActiveDelivery = async (req, res) => {
  try {
    const activeDelivery = await Delivery.findOne({
      deliveryBoyId: req.user._id,
      status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] }
    })
      .populate({
        path: 'orderId',
        populate: [
          { path: 'restaurantId', select: 'name address cuisine image phone' },
          { path: 'customerId', select: 'name phone email' }
        ]
      })
      .populate('deliveryBoyId', 'name email phone')
      .sort({ updatedAt: -1 });

    if (!activeDelivery) {
      return res.json({ active: false, delivery: null });
    }

    res.json({ active: true, delivery: activeDelivery });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch active delivery', error: error.message });
  }
};

/**
 * PATCH /api/delivery/status/:orderId
 * Update status ('Picked Up' -> 'Out for Delivery' -> 'Delivered').
 * Triggers socket events and updates Order status.
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const validStatuses = ['Picked Up', 'Out for Delivery', 'Delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery record not found for this order' });
    }

    // Role check: must be assigned delivery boy or manager/admin
    const isAssigned = delivery.deliveryBoyId && String(delivery.deliveryBoyId) === String(req.user._id);
    const isPrivileged = ['manager', 'admin'].includes(req.user.role);
    if (!isAssigned && !isPrivileged) {
      return res.status(403).json({ message: 'You are not assigned to this delivery' });
    }

    // Update delivery status & timestamps
    delivery.status = status;
    if (status === 'Picked Up') {
      delivery.pickedUpAt = new Date();
    } else if (status === 'Delivered') {
      delivery.deliveredAt = new Date();
    }
    await delivery.save();

    // Synchronize Order status
    const order = await Order.findById(orderId);
    if (order) {
      if (status === 'Out for Delivery') {
        order.status = 'Out for Delivery';
      } else if (status === 'Delivered') {
        order.status = 'Delivered';
        if (order.paymentMethod === 'Cash') {
          order.paymentStatus = 'Paid';
        }
      }
      await order.save();
    }

    await delivery.populate([
      {
        path: 'orderId',
        populate: [
          { path: 'restaurantId', select: 'name address cuisine image' },
          { path: 'customerId', select: 'name phone email' }
        ]
      },
      { path: 'deliveryBoyId', select: 'name email phone' }
    ]);

    // Emit real-time socket events
    const io = req.app.get('io');
    if (io) {
      socketHelpers.broadcastOrderStatusUpdate(io, order, {
        deliveryStatus: status,
        delivery
      });
      io.to(`order_${orderId}`).emit('delivery:status_update', {
        orderId,
        status,
        delivery,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: `Delivery status updated to '${status}' successfully`,
      delivery,
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update delivery status', error: error.message });
  }
};

/**
 * POST /api/delivery/location/:orderId
 * Update current coordinates and broadcast via Socket.IO.
 */
const updateDeliveryLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng, speed, heading, simulated } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'Valid lat and lng numbers are required' });
    }

    const coordinates = { lat: latitude, lng: longitude };

    const delivery = await Delivery.findOneAndUpdate(
      { orderId },
      { $set: { currentCoordinates: coordinates, updatedAt: new Date() } },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery record not found' });
    }

    // Broadcast live location ping via Socket.IO
    const io = req.app.get('io');
    if (io) {
      socketHelpers.broadcastLocationPing(io, orderId, coordinates, {
        speed: speed || 24,
        heading: heading || 0,
        simulated: Boolean(simulated)
      });
    }

    res.json({
      success: true,
      message: 'Location updated and broadcast successfully',
      coordinates,
      orderId
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update delivery location', error: error.message });
  }
};

/**
 * GET /api/delivery/order/:orderId
 * Get delivery details for an order (used by tracking page)
 */
const getDeliveryByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    let delivery = await Delivery.findOne({ orderId })
      .populate('deliveryBoyId', 'name phone email')
      .populate({
        path: 'orderId',
        populate: [
          { path: 'restaurantId', select: 'name address cuisine image rating phone' },
          { path: 'customerId', select: 'name phone email' }
        ]
      });

    if (!delivery) {
      const order = await Order.findById(orderId)
        .populate('restaurantId', 'name address')
        .populate('customerId', 'name phone');
      if (order && order.orderType === 'delivery') {
        delivery = await ensureDeliveryForOrder(order);
        await delivery.populate([
          { path: 'deliveryBoyId', select: 'name phone email' },
          {
            path: 'orderId',
            populate: [
              { path: 'restaurantId', select: 'name address cuisine image' },
              { path: 'customerId', select: 'name phone email' }
            ]
          }
        ]);
      }
    }

    res.json(delivery || null);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch delivery record', error: error.message });
  }
};

module.exports = {
  getAvailableDeliveries,
  acceptDelivery,
  getActiveDelivery,
  updateDeliveryStatus,
  updateDeliveryLocation,
  getDeliveryByOrderId
};
