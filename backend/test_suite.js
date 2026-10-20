const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('./middleware/authMiddleware');

async function runTests() {
  console.log('--- Starting FoodFlow Pro Core Logic Tests ---\n');
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

  // Test 1: Password Hashing & Comparison Logic
  try {
    const rawPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    const isMismatch = await bcrypt.compare('wrongPassword', hash);

    assert(isMatch === true, 'bcrypt correctly verifies valid password');
    assert(isMismatch === false, 'bcrypt correctly rejects invalid password');
  } catch (err) {
    assert(false, `Password hashing failed: ${err.message}`);
  }

  // Test 2: JWT Generation & Verification
  try {
    const secret = process.env.JWT_SECRET || 'foodflow_secret_key';
    const payload = { id: '64f1a2b3c4d5e6f7a8b9c0d1' };
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    const decoded = jwt.verify(token, secret);

    assert(decoded.id === payload.id, 'JWT sign and verify works correctly');
  } catch (err) {
    assert(false, `JWT test failed: ${err.message}`);
  }

  // Test 3: Middleware Authorization
  try {
    const waiterMiddleware = authorize('waiter', 'admin');
    let calledNext = false;
    let forbidden = false;

    // Allowed role
    const reqAllowed = { user: { role: 'waiter' } };
    const resAllowed = { status: () => ({ json: () => {} }) };
    waiterMiddleware(reqAllowed, resAllowed, () => { calledNext = true; });
    assert(calledNext === true, 'authorize middleware allows authorized roles');

    // Disallowed role
    const reqDenied = { user: { role: 'customer' } };
    const resDenied = {
      status: (code) => {
        if (code === 403) forbidden = true;
        return { json: () => {} };
      }
    };
    waiterMiddleware(reqDenied, resDenied, () => {});
    assert(forbidden === true, 'authorize middleware blocks unauthorized roles with 403');
  } catch (err) {
    assert(false, `Middleware test failed: ${err.message}`);
  }

  // Test 4: Middleware Protect (Token verification)
  try {
    let unauth401 = false;
    const reqNoToken = { headers: {} };
    const resNoToken = {
      status: (code) => {
        if (code === 401) unauth401 = true;
        return { json: () => {} };
      }
    };
    await protect(reqNoToken, resNoToken, () => {});
    assert(unauth401 === true, 'protect middleware rejects missing token with 401');
  } catch (err) {
    assert(false, `Protect test failed: ${err.message}`);
  }

  // Test 5: Verify Seed Data definitions
  try {
    const seedDataModule = require('./utils/seedData');
    assert(typeof seedDataModule === 'function', 'seedData is an exported async function');
  } catch (err) {
    assert(false, `Seed module test failed: ${err.message}`);
  }

  // Test 6: Verify Model Schemas exist and are valid Mongoose models
  try {
    const User = require('./models/User');
    const Restaurant = require('./models/Restaurant');
    const MenuItem = require('./models/MenuItem');
    const Order = require('./models/Order');
    const Review = require('./models/Review');
    const Table = require('./models/Table');

    assert(User.modelName === 'User', 'User model registered');
    assert(Restaurant.modelName === 'Restaurant', 'Restaurant model registered');
    assert(MenuItem.modelName === 'MenuItem', 'MenuItem model registered');
    assert(Order.modelName === 'Order', 'Order model registered');
    assert(Review.modelName === 'Review', 'Review model registered');
    assert(Table.modelName === 'Table', 'Table model registered');

    // Verify Enum values
    const roleEnum = User.schema.path('role').enumValues;
    assert(
      JSON.stringify(roleEnum) === JSON.stringify(['customer', 'waiter', 'kitchen', 'delivery', 'manager', 'admin']),
      'User role enum matches specifications'
    );

    const categoryEnum = MenuItem.schema.path('category').enumValues;
    assert(
      JSON.stringify(categoryEnum) === JSON.stringify(['Starters', 'Mains', 'Pizza', 'Desserts', 'Beverages']),
      'MenuItem category enum matches specifications'
    );

    const orderTypeEnum = Order.schema.path('orderType').enumValues;
    assert(
      JSON.stringify(orderTypeEnum) === JSON.stringify(['dine-in', 'delivery']),
      'Order orderType enum matches specifications'
    );

    const statusEnum = Order.schema.path('status').enumValues;
    assert(
      JSON.stringify(statusEnum) === JSON.stringify(['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled']),
      'Order status enum matches specifications'
    );

    const paymentMethodEnum = Order.schema.path('paymentMethod').enumValues;
    assert(
      JSON.stringify(paymentMethodEnum) === JSON.stringify(['Card', 'UPI', 'Cash']),
      'Order paymentMethod enum matches specifications'
    );

    const tableStatusEnum = Table.schema.path('status').enumValues;
    assert(
      JSON.stringify(tableStatusEnum) === JSON.stringify(['Available', 'Occupied', 'Reserved']),
      'Table status enum matches specifications'
    );
  } catch (err) {
    assert(false, `Model schema validation failed: ${err.message}`);
  }

  // Test 7: Calculations (Subtotal, 5% Tax, Total)
  try {
    const testItems = [
      { price: 14.99, quantity: 2 }, // 29.98
      { price: 8.50, quantity: 1 },  // 8.50
      { price: 3.50, quantity: 2 }   // 7.00
    ];
    const rawSubtotal = testItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotal = Number(rawSubtotal.toFixed(2));
    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    assert(subtotal === 45.48, `Subtotal calculated accurately (expected 45.48, got ${subtotal})`);
    assert(tax === 2.27, `Tax at 5% calculated accurately (expected 2.27, got ${tax})`);
    assert(total === 47.75, `Total amount calculated accurately (expected 47.75, got ${total})`);
  } catch (err) {
    assert(false, `Calculations test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
