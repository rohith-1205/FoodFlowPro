const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

const createReview = async (req, res) => {
  try {
    const { restaurantId, rating, comment } = req.body;
    if (!mongoose.isValidObjectId(restaurantId)) return res.status(400).json({ message: 'Invalid restaurant' });
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }
    if (!(await Restaurant.exists({ _id: restaurantId }))) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const review = await Review.create({
      restaurantId,
      customerId: req.user._id,
      rating: numRating,
      comment: comment || ''
    });

    // Update restaurant avg rating
    const reviews = await Review.find({ restaurantId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Restaurant.findByIdAndUpdate(restaurantId, { rating: parseFloat(avgRating.toFixed(1)) });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByRestaurant = async (req, res) => {
  try {
    const reviews = await Review.find({ restaurantId: req.params.restaurantId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviewsByRestaurant };
