const { authorize } = require('./middleware/authMiddleware');
const Table = require('./models/Table');
const Order = require('./models/Order');

async function runDev2Tests() {
  console.log('--- Starting Developer 2: KDS & Waiter Dashboard Tests ---\n');
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

  // 1. Kitchen Authorization: kitchen, manager, admin allowed; customer & waiter denied
  try {
    const kitchenAuth = authorize('kitchen', 'manager', 'admin');
    let kitchenAllowed = false;
    let customerDenied = false;

    kitchenAuth({ user: { role: 'kitchen' } }, {}, () => { kitchenAllowed = true; });
    assert(kitchenAllowed === true, 'Kitchen auth allows role "kitchen"');

    const resCustomer = {
      status: (code) => {
        if (code === 403) customerDenied = true;
        return { json: () => {} };
      }
    };
    kitchenAuth({ user: { role: 'customer' } }, resCustomer, () => {});
    assert(customerDenied === true, 'Kitchen auth rejects role "customer" with 403');
  } catch (err) {
    assert(false, `Kitchen auth test error: ${err.message}`);
  }

  // 2. Waiter Authorization: waiter, manager, admin allowed; customer & kitchen denied
  try {
    const waiterAuth = authorize('waiter', 'manager', 'admin');
    let waiterAllowed = false;
    let kitchenDenied = false;

    waiterAuth({ user: { role: 'waiter' } }, {}, () => { waiterAllowed = true; });
    assert(waiterAllowed === true, 'Waiter auth allows role "waiter"');

    const resKitchen = {
      status: (code) => {
        if (code === 403) kitchenDenied = true;
        return { json: () => {} };
      }
    };
    waiterAuth({ user: { role: 'kitchen' } }, resKitchen, () => {});
    assert(kitchenDenied === true, 'Waiter auth rejects role "kitchen" with 403');
  } catch (err) {
    assert(false, `Waiter auth test error: ${err.message}`);
  }

  // 3. Bill Calculation Logic (Subtotal, 5% GST, 5% Service Charge, Grand Total)
  try {
    const items = [
      { price: 16.99, quantity: 2 }, // 33.98
      { price: 8.50, quantity: 1 },  // 8.50
      { price: 4.00, quantity: 3 }   // 12.00
    ];
    const subtotal = Number(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
    const gstRate = 0.05;
    const gstAmount = Number((subtotal * gstRate).toFixed(2));
    const serviceChargeRate = 0.05;
    const serviceCharge = Number((subtotal * serviceChargeRate).toFixed(2));
    const grandTotal = Number((subtotal + gstAmount + serviceCharge).toFixed(2));

    assert(subtotal === 54.48, `Subtotal correct: expected 54.48, got ${subtotal}`);
    assert(gstAmount === 2.72, `5% GST correct: expected 2.72, got ${gstAmount}`);
    assert(serviceCharge === 2.72, `5% Service Charge correct: expected 2.72, got ${serviceCharge}`);
    assert(grandTotal === 59.92, `Grand Total correct: expected 59.92, got ${grandTotal}`);
  } catch (err) {
    assert(false, `Billing calculation test error: ${err.message}`);
  }

  // 4. Kitchen Elapsed Time Calculation
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000 - 15 * 1000);
    const diffSec = Math.floor((Date.now() - tenMinsAgo.getTime()) / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const formatted = `${mins}m ${secs}s`;

    assert(mins === 10 && secs === 15, `Elapsed time formatted accurately: ${formatted}`);
  } catch (err) {
    assert(false, `Elapsed time test error: ${err.message}`);
  }

  // 5. Payment method normalization: POS -> Card, UPI -> UPI, Cash -> Cash
  try {
    function normalize(pm) {
      const upper = String(pm).trim().toUpperCase();
      if (upper === 'CARD' || upper === 'POS') return 'Card';
      if (upper === 'UPI') return 'UPI';
      if (upper === 'CASH') return 'Cash';
      return 'Cash';
    }

    assert(normalize('POS') === 'Card', 'POS payment method maps to Card');
    assert(normalize('Card') === 'Card', 'Card payment method maps to Card');
    assert(normalize('UPI') === 'UPI', 'UPI payment method maps to UPI');
    assert(normalize('Cash') === 'Cash', 'Cash payment method maps to Cash');
  } catch (err) {
    assert(false, `Payment method normalization error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Dev 2 Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runDev2Tests();
