const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const getRestaurants = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const query = { isOpen: true };
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingDishes = await MenuItem.distinct('restaurantId', {
        name: { $regex: escapedSearch, $options: 'i' },
        isAvailable: true
      });
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { cuisine: { $regex: escapedSearch, $options: 'i' } },
        { address: { $regex: escapedSearch, $options: 'i' } },
        { _id: { $in: matchingDishes } }
      ];
    }
    const restaurants = await Restaurant.find(query);
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRestaurantById = async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRestaurantMenu = async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const items = await MenuItem.find({ restaurantId: req.params.id, isAvailable: true });

    // Group by category
    const categorized = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ restaurant, menu: categorized, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRestaurants, getRestaurantById, getRestaurantMenu };
