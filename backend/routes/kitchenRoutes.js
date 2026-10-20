const express = require('express');
const router = express.Router();
const { getActiveKitchenOrders, updateOrderStatus } = require('../controllers/kitchenController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All kitchen routes are protected and restricted to kitchen, manager, admin roles
router.use(protect);
router.use(authorize('kitchen', 'manager', 'admin'));

router.get('/orders', getActiveKitchenOrders);
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
