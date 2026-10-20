const mongoose = require('mongoose');
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

/**
 * Ensure default tables 1-10 exist in database
 */
const ensureDefaultTables = async () => {
  const count = await Table.countDocuments();
  if (count < 10) {
    const existingTables = await Table.find().select('tableNumber');
    const existingSet = new Set(existingTables.map((t) => t.tableNumber));
    const toCreate = [];
    for (let i = 1; i <= 10; i++) {
      if (!existingSet.has(i)) {
        toCreate.push({
          tableNumber: i,
          capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          status: 'Available',
          currentOrderId: null,
          foodReady: false,
          billRequested: false
        });
      }
    }
    if (toCreate.length > 0) {
      await Table.insertMany(toCreate);
    }
  }
};

/**
 * GET /api/waiter/tables
 * Fetch all restaurant tables with status ('Available', 'Occupied', 'Reserved'),
 * active order ID, and items ordered.
 */
const getWaiterTables = async (req, res) => {
  try {
    await ensureDefaultTables();

    const tables = await Table.find()
      .populate({
        path: 'currentOrderId',
        select: 'items subtotal taxAmount totalAmount status paymentStatus paymentMethod specialInstructions createdAt isServed'
      })
      .sort({ tableNumber: 1 });

    const formattedTables = tables.map((t) => {
      const activeOrder = t.currentOrderId;
      const isFoodReady = Boolean(
        t.foodReady || (activeOrder && activeOrder.status === 'Ready' && !activeOrder.isServed)
      );

      // Determine floor plan display status
      let displayStatus = t.status;
      if (t.billRequested) {
        displayStatus = 'Bill Requested';
      } else if (isFoodReady) {
        displayStatus = 'Food Ready to Serve';
      } else if (t.status === 'Occupied') {
        displayStatus = 'Occupied';
      } else if (t.status === 'Reserved') {
        displayStatus = 'Reserved';
      } else {
        displayStatus = 'Available';
      }

      return {
        _id: t._id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: t.status, // Database status ('Available', 'Occupied', 'Reserved')
        displayStatus,    // UI badge status
        activeOrderId: activeOrder ? activeOrder._id : null,
        activeOrder: activeOrder || null,
        items: activeOrder ? activeOrder.items : [],
        foodReady: isFoodReady,
        billRequested: Boolean(t.billRequested),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    });

    res.json(formattedTables);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch waiter tables', error: error.message });
  }
};

/**
 * POST /api/waiter/orders
 * Allow waiter to take order directly at a table
 * (creates dine-in order, assigns table to 'Occupied').
 */
const createWaiterOrder = async (req, res) => {
  try {
    const { tableNumber, items, specialInstructions, restaurantId } = req.body;

    const parsedTableNum = parseInt(tableNumber, 10);
    if (isNaN(parsedTableNum) || parsedTableNum < 1) {
      return res.status(400).json({ message: 'Valid table number is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required in the order' });
    }

    // Determine restaurant ID
    let targetRestaurantId = restaurantId;
    if (!targetRestaurantId || !mongoose.isValidObjectId(targetRestaurantId)) {
      const defaultRestaurant = await Restaurant.findOne({ isOpen: true }) || await Restaurant.findOne();
      if (!defaultRestaurant) {
        return res.status(404).json({ message: 'No restaurant found to assign order to' });
      }
      targetRestaurantId = defaultRestaurant._id;
    }

    // Validate menu items & calculate totals
    const menuItemIds = items.map((i) => i.menuItemId).filter(Boolean);
    const validMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuMap = new Map(validMenuItems.map((m) => [String(m._id), m]));

    const processedItems = [];
    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Item quantities must be positive integers' });
      }

      const menuItem = menuMap.get(String(item.menuItemId));
      const price = menuItem ? menuItem.price : Number(item.price);
      const name = menuItem ? menuItem.name : item.name;

      if (!price || isNaN(price)) {
        return res.status(400).json({ message: `Invalid price for item: ${name || 'unknown'}` });
      }

      processedItems.push({
        menuItemId: menuItem ? menuItem._id : item.menuItemId,
        name: name || 'Menu Item',
        price: Number(price.toFixed(2)),
        quantity,
        specialInstructions: item.specialInstructions || ''
      });
    }

    const rawSubtotal = processedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotal = Number(rawSubtotal.toFixed(2));
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // Create the Order
    const order = await Order.create({
      customerId: req.user._id,
      restaurantId: targetRestaurantId,
      orderType: 'dine-in',
      tableNumber: parsedTableNum,
      items: processedItems,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'Pending',
      paymentStatus: 'Pending',
      paymentMethod: 'Cash',
      specialInstructions: specialInstructions || '',
      isServed: false
    });

    // Update or create Table to 'Occupied'
    const table = await Table.findOneAndUpdate(
      { tableNumber: parsedTableNum },
      {
        status: 'Occupied',
        currentOrderId: order._id,
        foodReady: false,
        billRequested: false
      },
      { upsert: true, new: true }
    );

    // Emit real-time socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', order);
      io.emit('table_updated', table);
    }

    res.status(201).json({
      message: `Order placed successfully for Table ${parsedTableNum}`,
      order,
      table
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create waiter order', error: error.message });
  }
};

/**
 * GET /api/waiter/ready-orders
 * Fetch all dine-in orders currently in status 'Ready' waiting to be served to tables.
 */
const getReadyOrders = async (req, res) => {
  try {
    const readyOrders = await Order.find({
      orderType: 'dine-in',
      status: 'Ready',
      isServed: { $ne: true }
    })
      .populate('restaurantId', 'name')
      .sort({ updatedAt: -1 });

    res.json(readyOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ready orders', error: error.message });
  }
};

/**
 * PATCH /api/waiter/orders/:id/serve
 * Mark order as served to the table.
 */
const serveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isServed = true;
    order.servedAt = new Date();
    await order.save();

    // Reset foodReady on the Table
    let table = null;
    if (order.tableNumber) {
      table = await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { foodReady: false },
        { new: true }
      );
    }

    // Emit real-time socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('order_served', order);
      if (table) {
        io.emit('table_updated', table);
      }
    }

    res.json({
      message: `Order #${order._id.toString().slice(-4).toUpperCase()} marked as served to Table ${order.tableNumber}`,
      order,
      table
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark order as served', error: error.message });
  }
};

/**
 * POST /api/waiter/tables/:tableNumber/bill
 * Calculate final bill breakdown (subtotal, 5% GST/tax, service charge, grand total).
 */
const calculateTableBill = async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber, 10);
    if (isNaN(tableNumber)) {
      return res.status(400).json({ message: 'Valid table number is required' });
    }

    let table = await Table.findOne({ tableNumber });
    let order = null;

    if (table && table.currentOrderId) {
      order = await Order.findById(table.currentOrderId);
    }

    // Fallback: search latest active dine-in order for this table
    if (!order) {
      order = await Order.findOne({
        tableNumber,
        orderType: 'dine-in',
        status: { $nin: ['Cancelled', 'Delivered'] }
      }).sort({ createdAt: -1 });
    }

    if (!order) {
      return res.status(404).json({ message: `No active order found for Table ${tableNumber}` });
    }

    const subtotal = Number(order.subtotal.toFixed(2));
    const gstRate = 0.05; // 5% GST
    const gstAmount = Number((subtotal * gstRate).toFixed(2));
    const serviceChargeRate = 0.05; // 5% Service Charge
    const serviceCharge = Number((subtotal * serviceChargeRate).toFixed(2));
    const grandTotal = Number((subtotal + gstAmount + serviceCharge).toFixed(2));

    // Mark table billRequested to true
    if (table) {
      table.billRequested = true;
      await table.save();
    } else {
      table = await Table.findOneAndUpdate(
        { tableNumber },
        { billRequested: true, status: 'Occupied' },
        { upsert: true, new: true }
      );
    }

    const billBreakdown = {
      tableNumber,
      orderId: order._id,
      items: order.items,
      subtotal,
      gstRate: '5%',
      gstAmount,
      serviceChargeRate: '5%',
      serviceCharge,
      grandTotal,
      billGeneratedAt: new Date()
    };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('bill_requested', { tableNumber, bill: billBreakdown });
      io.emit('table_updated', table);
    }

    res.json(billBreakdown);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate table bill', error: error.message });
  }
};

/**
 * POST /api/waiter/tables/:tableNumber/settle
 * Mark payment as completed (Cash/Card/UPI),
 * update order status to 'Delivered' / 'Completed',
 * and reset table status back to 'Available'.
 */
const settleTable = async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber, 10);
    const { paymentMethod } = req.body;

    if (isNaN(tableNumber)) {
      return res.status(400).json({ message: 'Valid table number is required' });
    }

    // Normalize payment method to Mongoose enum ['Card', 'UPI', 'Cash']
    let normalizedPayment = 'Cash';
    if (paymentMethod) {
      const pm = String(paymentMethod).trim().toUpperCase();
      if (pm === 'CARD' || pm === 'POS') normalizedPayment = 'Card';
      else if (pm === 'UPI') normalizedPayment = 'UPI';
      else if (pm === 'CASH') normalizedPayment = 'Cash';
    }

    let table = await Table.findOne({ tableNumber });
    let order = null;

    if (table && table.currentOrderId) {
      order = await Order.findById(table.currentOrderId);
    }

    if (!order) {
      order = await Order.findOne({
        tableNumber,
        orderType: 'dine-in',
        status: { $nin: ['Cancelled', 'Delivered'] }
      }).sort({ createdAt: -1 });
    }

    if (order) {
      order.status = 'Delivered';
      order.paymentStatus = 'Paid';
      order.paymentMethod = normalizedPayment;
      order.isServed = true;
      await order.save();
    }

    // Reset table status back to 'Available'
    if (table) {
      table.status = 'Available';
      table.currentOrderId = null;
      table.foodReady = false;
      table.billRequested = false;
      await table.save();
    } else {
      table = await Table.findOneAndUpdate(
        { tableNumber },
        { status: 'Available', currentOrderId: null, foodReady: false, billRequested: false },
        { upsert: true, new: true }
      );
    }

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      io.emit('table_settled', { tableNumber, orderId: order ? order._id : null });
      if (order) {
        io.emit('order_completed', order);
      }
      io.emit('table_updated', table);
    }

    res.json({
      message: `Table ${tableNumber} payment settled via ${normalizedPayment}. Table is now Available.`,
      table,
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to settle table', error: error.message });
  }
};

module.exports = {
  getWaiterTables,
  createWaiterOrder,
  getReadyOrders,
  serveOrder,
  calculateTableBill,
  settleTable
};
