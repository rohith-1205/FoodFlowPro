const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, getTables } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.get('/tables', getTables);
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

module.exports = router;
