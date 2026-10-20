const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getKPIs,
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getLiveOrders,
  updateOrderStatus,
  getReports
} = require('../controllers/managerController');

// All Manager endpoints are protected for manager and admin
router.use(protect);
router.use(authorize('manager', 'admin'));

// Operational KPIs
router.get('/kpis', getKPIs);

// Menu CRUD
router.get('/menu', getMenuItems);
router.post('/menu', addMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.patch('/menu/:id/toggle', toggleMenuItemAvailability);

// Live Orders Monitor & Actions
router.get('/live-orders', getLiveOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// Sales & Operations Reports
router.get('/reports', getReports);

module.exports = router;
