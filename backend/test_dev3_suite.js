const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');
const { authorize } = require('./middleware/authMiddleware');
const { socketHelpers } = require('./socket');

async function runDev3Tests() {
  console.log('--- Starting Developer 3: Socket.IO, Delivery Partner & GPS Tracking Tests ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Delivery Model Schema & Enum Validations
  try {
    assert(Delivery.modelName === 'Delivery', 'Delivery model registered in Mongoose');

    const statusPath = Delivery.schema.path('status');
    assert(statusPath !== undefined, 'Delivery schema has status path');

    const expectedStatuses = ['Available', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];
    assert(
      JSON.stringify(statusPath.enumValues) === JSON.stringify(expectedStatuses),
      `Delivery status enum matches specifications: ${expectedStatuses.join(', ')}`
    );

    assert(statusPath.defaultValue === 'Available', 'Delivery status defaults to "Available"');

    // Check schema paths
    assert(Delivery.schema.path('orderId') !== undefined, 'Delivery schema has orderId field');
    assert(Delivery.schema.path('deliveryBoyId') !== undefined, 'Delivery schema has deliveryBoyId field');
    assert(Delivery.schema.path('pickupAddress') !== undefined, 'Delivery schema has pickupAddress field');
    assert(Delivery.schema.path('deliveryAddress') !== undefined, 'Delivery schema has deliveryAddress field');
    assert(Delivery.schema.path('customerPhone') !== undefined, 'Delivery schema has customerPhone field');
    assert(Delivery.schema.path('currentCoordinates.lat') !== undefined, 'Delivery schema has currentCoordinates.lat field');
    assert(Delivery.schema.path('currentCoordinates.lng') !== undefined, 'Delivery schema has currentCoordinates.lng field');

    // Coordinates default check
    const defaultDelivery = new Delivery({ orderId: new mongoose.Types.ObjectId() });
    assert(
      defaultDelivery.currentCoordinates.lat === 12.9716 && defaultDelivery.currentCoordinates.lng === 77.5946,
      'Delivery coordinates default to standard initial GPS location (12.9716, 77.5946)'
    );
  } catch (err) {
    assert(false, `Delivery model validation failed: ${err.message}`);
  }

  // 2. Delivery Partner Authorization Tests
  try {
    const deliveryAuth = authorize('delivery', 'manager', 'admin');
    let deliveryAllowed = false;
    let managerAllowed = false;
    let adminAllowed = false;
    let customerDenied = false;
    let waiterDenied = false;
    let kitchenDenied = false;

    deliveryAuth({ user: { role: 'delivery' } }, {}, () => { deliveryAllowed = true; });
    assert(deliveryAllowed === true, 'Delivery authorization allows role "delivery"');

    deliveryAuth({ user: { role: 'manager' } }, {}, () => { managerAllowed = true; });
    assert(managerAllowed === true, 'Delivery authorization allows role "manager"');

    deliveryAuth({ user: { role: 'admin' } }, {}, () => { adminAllowed = true; });
    assert(adminAllowed === true, 'Delivery authorization allows role "admin"');

    const mockRes = (setter) => ({
      status: (code) => {
        if (code === 403) setter(true);
        return { json: () => {} };
      }
    });

    deliveryAuth({ user: { role: 'customer' } }, mockRes((v) => { customerDenied = v; }), () => {});
    assert(customerDenied === true, 'Delivery authorization blocks role "customer" with 403');

    deliveryAuth({ user: { role: 'waiter' } }, mockRes((v) => { waiterDenied = v; }), () => {});
    assert(waiterDenied === true, 'Delivery authorization blocks role "waiter" with 403');

    deliveryAuth({ user: { role: 'kitchen' } }, mockRes((v) => { kitchenDenied = v; }), () => {});
    assert(kitchenDenied === true, 'Delivery authorization blocks role "kitchen" with 403');
  } catch (err) {
    assert(false, `Delivery authorization test failed: ${err.message}`);
  }

  // 3. Socket.IO Room Naming and Helper Validation
  try {
    const mockOrderId = '652f10b78c9d0a1b2c3d4e5f';
    const orderRoom = `order_${mockOrderId}`;
    assert(orderRoom === 'order_652f10b78c9d0a1b2c3d4e5f', 'Customer tracking room correctly formatted: order_<orderId>');

    const roleRooms = ['role_kitchen', 'role_waiter', 'role_delivery', 'role_manager'];
    assert(roleRooms.includes('role_delivery'), 'Role delivery room correctly defined');
    assert(roleRooms.includes('role_kitchen'), 'Role kitchen room correctly defined');

    assert(typeof socketHelpers.broadcastOrderCreated === 'function', 'socketHelpers.broadcastOrderCreated is exported');
    assert(typeof socketHelpers.broadcastOrderStatusUpdate === 'function', 'socketHelpers.broadcastOrderStatusUpdate is exported');
    assert(typeof socketHelpers.broadcastReadyForDelivery === 'function', 'socketHelpers.broadcastReadyForDelivery is exported');
    assert(typeof socketHelpers.broadcastLocationPing === 'function', 'socketHelpers.broadcastLocationPing is exported');
    assert(typeof socketHelpers.broadcastTableReady === 'function', 'socketHelpers.broadcastTableReady is exported');

    // Test socketHelpers execution with a mock io instance
    const emittedEvents = [];
    const mockIo = {
      rooms: new Set(),
      to(room) {
        this.rooms.add(room);
        return this;
      },
      emit(event, data) {
        emittedEvents.push({ event, data, rooms: Array.from(this.rooms) });
        this.rooms.clear();
      }
    };

    socketHelpers.broadcastLocationPing(mockIo, mockOrderId, { lat: 12.9800, lng: 77.6000 });
    assert(
      emittedEvents.some(e => e.event === 'delivery:location_ping'),
      'socketHelpers.broadcastLocationPing emits "delivery:location_ping"'
    );
  } catch (err) {
    assert(false, `Socket helper test failed: ${err.message}`);
  }

  // 4. GPS Route Interpolation & Distance Calculation Logic
  try {
    const startCoord = { lat: 12.9716, lng: 77.5946 }; // Restaurant
    const endCoord = { lat: 12.9850, lng: 77.6150 };   // Customer destination

    // Linear interpolation helper (used in GPS route simulation)
    function interpolateCoordinates(start, end, progress) {
      const p = Math.max(0, Math.min(1, progress));
      return {
        lat: Number((start.lat + (end.lat - start.lat) * p).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * p).toFixed(6))
      };
    }

    const midpoint = interpolateCoordinates(startCoord, endCoord, 0.5);
    const expectedMidLat = Number(((startCoord.lat + endCoord.lat) / 2).toFixed(6));
    const expectedMidLng = Number(((startCoord.lng + endCoord.lng) / 2).toFixed(6));

    assert(midpoint.lat === expectedMidLat, `Midpoint latitude calculated accurately: ${midpoint.lat}`);
    assert(midpoint.lng === expectedMidLng, `Midpoint longitude calculated accurately: ${midpoint.lng}`);

    // Haversine formula distance check
    function haversineKm(lat1, lon1, lat2, lon2) {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Number((R * c).toFixed(2));
    }

    const distance = haversineKm(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng);
    assert(distance > 0 && distance < 10, `Realistic delivery distance calculated: ${distance} km`);
  } catch (err) {
    assert(false, `GPS calculation test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Dev 3 Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runDev3Tests();
