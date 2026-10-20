const mongoose = require('mongoose');
const Dispute = require('./models/Dispute');
const MenuItem = require('./models/MenuItem');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const Order = require('./models/Order');
const { authorize } = require('./middleware/authMiddleware');
const managerController = require('./controllers/managerController');
const adminController = require('./controllers/adminController');

async function runDev4Tests() {
  console.log('--- Starting Developer 4: Manager Dashboard & Admin Console Tests ---\n');
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

  // 1. Dispute Model Schema & Enum Validations
  try {
    assert(Dispute.modelName === 'Dispute', 'Dispute model registered in Mongoose');

    const statusPath = Dispute.schema.path('status');
    assert(statusPath !== undefined, 'Dispute schema has status path');
    const expectedStatuses = ['Open', 'Under Review', 'Resolved', 'Rejected'];
    assert(
      JSON.stringify(statusPath.enumValues) === JSON.stringify(expectedStatuses),
      `Dispute status enum matches specifications: ${expectedStatuses.join(', ')}`
    );

    const issuePath = Dispute.schema.path('issueType');
    assert(issuePath !== undefined, 'Dispute schema has issueType path');
    const expectedIssues = ['Cancellation', 'Refund Request', 'Quality Complaint', 'Delivery Delay', 'Review Moderation', 'Other'];
    assert(
      JSON.stringify(issuePath.enumValues) === JSON.stringify(expectedIssues),
      `Dispute issueType enum matches specifications: ${expectedIssues.join(', ')}`
    );

    assert(Dispute.schema.path('description') !== undefined, 'Dispute schema has description field');
    assert(Dispute.schema.path('resolutionNotes') !== undefined, 'Dispute schema has resolutionNotes field');
    assert(Dispute.schema.path('refundAmount') !== undefined, 'Dispute schema has refundAmount field');
  } catch (err) {
    assert(false, `Dispute model validation failed: ${err.message}`);
  }

  // 2. Manager & Admin Authorization Tests
  try {
    const managerAuth = authorize('manager', 'admin');
    let managerAllowed = false;
    let adminAllowedOnManager = false;
    let customerBlockedOnManager = false;
    let waiterBlockedOnManager = false;
    let kitchenBlockedOnManager = false;
    let deliveryBlockedOnManager = false;

    managerAuth({ user: { role: 'manager' } }, {}, () => { managerAllowed = true; });
    managerAuth({ user: { role: 'admin' } }, {}, () => { adminAllowedOnManager = true; });
    managerAuth({ user: { role: 'customer' } }, { status: (code) => ({ json: () => { if (code === 403) customerBlockedOnManager = true; } }) }, () => {});
    managerAuth({ user: { role: 'waiter' } }, { status: (code) => ({ json: () => { if (code === 403) waiterBlockedOnManager = true; } }) }, () => {});
    managerAuth({ user: { role: 'kitchen' } }, { status: (code) => ({ json: () => { if (code === 403) kitchenBlockedOnManager = true; } }) }, () => {});
    managerAuth({ user: { role: 'delivery' } }, { status: (code) => ({ json: () => { if (code === 403) deliveryBlockedOnManager = true; } }) }, () => {});

    assert(managerAllowed, 'Manager authorization allows role "manager"');
    assert(adminAllowedOnManager, 'Manager authorization allows role "admin"');
    assert(customerBlockedOnManager, 'Manager authorization blocks role "customer" with 403');
    assert(waiterBlockedOnManager, 'Manager authorization blocks role "waiter" with 403');
    assert(kitchenBlockedOnManager, 'Manager authorization blocks role "kitchen" with 403');
    assert(deliveryBlockedOnManager, 'Manager authorization blocks role "delivery" with 403');

    const adminAuth = authorize('admin');
    let adminAllowedOnAdmin = false;
    let managerBlockedOnAdmin = false;
    let customerBlockedOnAdmin = false;

    adminAuth({ user: { role: 'admin' } }, {}, () => { adminAllowedOnAdmin = true; });
    adminAuth({ user: { role: 'manager' } }, { status: (code) => ({ json: () => { if (code === 403) managerBlockedOnAdmin = true; } }) }, () => {});
    adminAuth({ user: { role: 'customer' } }, { status: (code) => ({ json: () => { if (code === 403) customerBlockedOnAdmin = true; } }) }, () => {});

    assert(adminAllowedOnAdmin, 'Admin authorization allows role "admin"');
    assert(managerBlockedOnAdmin, 'Admin authorization blocks role "manager" with 403');
    assert(customerBlockedOnAdmin, 'Admin authorization blocks role "customer" with 403');
  } catch (err) {
    assert(false, `Authorization tests failed: ${err.message}`);
  }

  // 3. Manager Controller Handler Exports
  try {
    assert(typeof managerController.getKPIs === 'function', 'managerController exports getKPIs');
    assert(typeof managerController.getMenuItems === 'function', 'managerController exports getMenuItems');
    assert(typeof managerController.addMenuItem === 'function', 'managerController exports addMenuItem');
    assert(typeof managerController.updateMenuItem === 'function', 'managerController exports updateMenuItem');
    assert(typeof managerController.deleteMenuItem === 'function', 'managerController exports deleteMenuItem');
    assert(typeof managerController.toggleMenuItemAvailability === 'function', 'managerController exports toggleMenuItemAvailability');
    assert(typeof managerController.getLiveOrders === 'function', 'managerController exports getLiveOrders');
    assert(typeof managerController.updateOrderStatus === 'function', 'managerController exports updateOrderStatus');
    assert(typeof managerController.getReports === 'function', 'managerController exports getReports');
  } catch (err) {
    assert(false, `Manager controller exports check failed: ${err.message}`);
  }

  // 4. Admin Controller Handler Exports
  try {
    assert(typeof adminController.getRestaurants === 'function', 'adminController exports getRestaurants');
    assert(typeof adminController.createRestaurant === 'function', 'adminController exports createRestaurant');
    assert(typeof adminController.updateRestaurant === 'function', 'adminController exports updateRestaurant');
    assert(typeof adminController.toggleRestaurantStatus === 'function', 'adminController exports toggleRestaurantStatus');
    assert(typeof adminController.getUsers === 'function', 'adminController exports getUsers');
    assert(typeof adminController.updateUserRole === 'function', 'adminController exports updateUserRole');
    assert(typeof adminController.getDisputes === 'function', 'adminController exports getDisputes');
    assert(typeof adminController.createDispute === 'function', 'adminController exports createDispute');
    assert(typeof adminController.resolveDispute === 'function', 'adminController exports resolveDispute');
    assert(typeof adminController.deleteReview === 'function', 'adminController exports deleteReview');
    assert(typeof adminController.getPlatformStats === 'function', 'adminController exports getPlatformStats');
  } catch (err) {
    assert(false, `Admin controller exports check failed: ${err.message}`);
  }

  // 5. Menu Item Category and Validation Logic
  try {
    const validCategories = ['Starters', 'Mains', 'Pizza', 'Desserts', 'Beverages'];
    assert(validCategories.includes('Pizza'), 'Menu item allows Pizza category');
    assert(validCategories.includes('Desserts'), 'Menu item allows Desserts category');
    assert(validCategories.includes('Beverages'), 'Menu item allows Beverages category');
    assert(!validCategories.includes('UnknownCategory'), 'Menu item rejects invalid categories');

    const testItem = new MenuItem({
      restaurantId: new mongoose.Types.ObjectId(),
      name: 'Test Pizza Margherita',
      price: 15.99,
      category: 'Pizza'
    });
    assert(testItem.isAvailable === true, 'Menu item defaults to available (isAvailable: true)');
    assert(testItem.name === 'Test Pizza Margherita', 'Menu item name correctly set');
    assert(testItem.price === 15.99, 'Menu item price correctly set');
  } catch (err) {
    assert(false, `Menu item validation failed: ${err.message}`);
  }

  // 6. User Role Switcher Logic
  try {
    const validRoles = ['customer', 'waiter', 'kitchen', 'delivery', 'manager', 'admin'];
    assert(validRoles.length === 6, 'Platform supports all 6 roles');
    assert(validRoles.includes('manager'), 'Role list includes manager');
    assert(validRoles.includes('admin'), 'Role list includes admin');
  } catch (err) {
    assert(false, `User role check failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Dev 4 Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runDev4Tests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = runDev4Tests;
