const express = require('express');
const router = express.Router();
const { createReview, getReviewsByRestaurant } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReview);
router.get('/:restaurantId', getReviewsByRestaurant);

module.exports = router;
