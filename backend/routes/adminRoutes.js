const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  toggleRestaurantStatus,
  getUsers,
  updateUserRole,
  getDisputes,
  createDispute,
  resolveDispute,
  deleteReview,
  getPlatformStats
} = require('../controllers/adminController');

// All Admin routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Restaurant Management & Onboarding
router.get('/restaurants', getRestaurants);
router.post('/restaurants', createRestaurant);
router.put('/restaurants/:id', updateRestaurant);
router.patch('/restaurants/:id/toggle', toggleRestaurantStatus);

// User Management & Role Switcher
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);

// Customer Complaints, Disputes & Review Moderation
router.get('/disputes', getDisputes);
router.post('/disputes', createDispute);
router.patch('/disputes/:id', resolveDispute);
router.delete('/reviews/:id', deleteReview);

// Platform-wide Health & Activity Summary
router.get('/stats', getPlatformStats);

module.exports = router;
