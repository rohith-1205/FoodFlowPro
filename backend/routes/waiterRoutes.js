const express = require('express');
const router = express.Router();
const {
  getWaiterTables,
  createWaiterOrder,
  getReadyOrders,
  serveOrder,
  calculateTableBill,
  settleTable
} = require('../controllers/waiterController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All waiter routes are protected and restricted to waiter, manager, admin roles
router.use(protect);
router.use(authorize('waiter', 'manager', 'admin'));

router.get('/tables', getWaiterTables);
router.post('/orders', createWaiterOrder);
router.get('/ready-orders', getReadyOrders);
router.patch('/orders/:id/serve', serveOrder);
router.post('/tables/:tableNumber/bill', calculateTableBill);
router.post('/tables/:tableNumber/settle', settleTable);

module.exports = router;
