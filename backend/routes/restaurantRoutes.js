const express = require('express');
const router = express.Router();
const { getRestaurants, getRestaurantMenu } = require('../controllers/restaurantController');

router.get('/', getRestaurants);
router.get('/:id/menu', getRestaurantMenu);

module.exports = router;
