const express = require('express');
const router = express.Router();
const {
  getAvailableDeliveries,
  acceptDelivery,
  getActiveDelivery,
  updateDeliveryStatus,
  updateDeliveryLocation,
  getDeliveryByOrderId
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All delivery routes require a valid authenticated user
router.use(protect);

// Endpoint accessible to customer and staff to track delivery info for an order
router.get('/order/:orderId', getDeliveryByOrderId);

// Delivery partner & manager operations
router.get('/available', authorize('delivery', 'manager', 'admin'), getAvailableDeliveries);
router.post('/accept/:orderId', authorize('delivery', 'manager', 'admin'), acceptDelivery);
router.get('/active', authorize('delivery', 'manager', 'admin'), getActiveDelivery);
router.patch('/status/:orderId', authorize('delivery', 'manager', 'admin'), updateDeliveryStatus);
router.post('/location/:orderId', authorize('delivery', 'manager', 'admin'), updateDeliveryLocation);

module.exports = router;
