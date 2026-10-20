const Delivery = require('../models/Delivery');

/**
 * Socket.IO Real-Time Engine Setup
 * Handles room joining for customer tracking, role-based channels,
 * and broadcasts order, delivery, and table events.
 */
function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Generic room joiner
    socket.on('join_room', (room) => {
      if (!room) return;
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} joined room: ${room}`);
      socket.emit('joined_room', { room, socketId: socket.id });
    });

    // Leave room
    socket.on('leave_room', (room) => {
      if (!room) return;
      socket.leave(room);
      console.log(`[Socket.IO] ${socket.id} left room: ${room}`);
      socket.emit('left_room', { room, socketId: socket.id });
    });

    // Customer order tracking room joiner: 'order_' + orderId
    socket.on('join_order', (orderId) => {
      if (!orderId) return;
      const roomName = `order_${orderId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] ${socket.id} joined order room: ${roomName}`);
      socket.emit('joined_order', { orderId, room: roomName });
    });

    // Role-based room joiner: 'role_' + role (kitchen, waiter, delivery, manager, admin)
    socket.on('join_role', (role) => {
      if (!role) return;
      const roomName = `role_${role}`;
      socket.join(roomName);
      console.log(`[Socket.IO] ${socket.id} joined role room: ${roomName}`);
      socket.emit('joined_role', { role, room: roomName });
    });

    // Real-Time Event: order:created -> broadcast to role_kitchen and role_manager
    socket.on('order:created', (order) => {
      io.to('role_kitchen').to('role_manager').emit('order:created', order);
      io.emit('new_order', order);
    });

    // Real-Time Event: order:status_update -> broadcast to order_${orderId} and relevant roles
    socket.on('order:status_update', (data) => {
      if (!data) return;
      const orderId = data.orderId || data._id;
      if (orderId) {
        io.to(`order_${orderId}`).emit('order:status_update', data);
      }
      io.to('role_kitchen')
        .to('role_waiter')
        .to('role_delivery')
        .to('role_manager')
        .emit('order:status_update', data);
      io.emit('order_status_updated', data);
    });

    // Real-Time Event: order:ready_for_delivery -> broadcast to role_delivery
    socket.on('order:ready_for_delivery', (data) => {
      io.to('role_delivery').to('role_manager').emit('order:ready_for_delivery', data);
      if (data && data.orderId) {
        io.to(`order_${data.orderId}`).emit('order:ready_for_delivery', data);
      }
    });

    // Real-Time Event: delivery:location_ping -> broadcast GPS coordinates to customer order room
    socket.on('delivery:location_ping', async (payload) => {
      if (!payload || !payload.orderId || !payload.coordinates) return;
      const { orderId, coordinates, speed, heading, simulated } = payload;
      const pingData = {
        orderId,
        coordinates,
        speed: speed || 24,
        heading: heading || 0,
        simulated: Boolean(simulated),
        timestamp: new Date().toISOString()
      };

      // Broadcast immediately to the customer live tracking page
      io.to(`order_${orderId}`).emit('delivery:location_ping', pingData);
      io.to(`order_${orderId}`).emit('delivery:location_update', pingData);

      // Async update Delivery document currentCoordinates
      try {
        await Delivery.findOneAndUpdate(
          { orderId },
          {
            $set: {
              currentCoordinates: coordinates,
              updatedAt: new Date()
            }
          }
        );
      } catch (err) {
        // Non-blocking error logging
        console.error(`[Socket.IO] Failed to update delivery coordinates in DB: ${err.message}`);
      }
    });

    // Real-Time Event: table:ready -> broadcast to role_waiter
    socket.on('table:ready', (data) => {
      io.to('role_waiter').to('role_manager').emit('table:ready', data);
      io.emit('food_ready', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Programmatic helper methods for controllers to trigger real-time events
 */
const socketHelpers = {
  broadcastOrderCreated(io, order) {
    if (!io) return;
    io.to('role_kitchen').to('role_manager').emit('order:created', order);
    io.emit('new_order', order);
    if (order.restaurantId) {
      io.to(`restaurant_${order.restaurantId}`).emit('order_created', order);
    }
  },

  broadcastOrderStatusUpdate(io, order, extra = {}) {
    if (!io || !order) return;
    const orderId = String(order._id || order.id || extra.orderId);
    const payload = {
      orderId,
      status: order.status,
      order,
      ...extra,
      timestamp: new Date().toISOString()
    };
    io.to(`order_${orderId}`).emit('order:status_update', payload);
    io.to('role_kitchen')
      .to('role_waiter')
      .to('role_delivery')
      .to('role_manager')
      .emit('order:status_update', payload);
    io.emit('order_status_updated', order);
  },

  broadcastReadyForDelivery(io, order, delivery) {
    if (!io || !order) return;
    const orderId = String(order._id || order.id);
    const payload = {
      orderId,
      order,
      delivery,
      status: 'Ready',
      timestamp: new Date().toISOString()
    };
    io.to('role_delivery').to('role_manager').emit('order:ready_for_delivery', payload);
    io.to(`order_${orderId}`).emit('order:ready_for_delivery', payload);
    io.to(`order_${orderId}`).emit('order:status_update', {
      orderId,
      status: 'Ready',
      order,
      delivery
    });
  },

  broadcastLocationPing(io, orderId, coordinates, meta = {}) {
    if (!io || !orderId || !coordinates) return;
    const payload = {
      orderId: String(orderId),
      coordinates,
      ...meta,
      timestamp: new Date().toISOString()
    };
    io.to(`order_${orderId}`).emit('delivery:location_ping', payload);
    io.to(`order_${orderId}`).emit('delivery:location_update', payload);
  },

  broadcastTableReady(io, data) {
    if (!io) return;
    io.to('role_waiter').to('role_manager').emit('table:ready', data);
    io.emit('food_ready', data);
  }
};

module.exports = {
  setupSocketIO,
  socketHelpers
};
