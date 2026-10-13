const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  cuisine: { type: String, required: true },
  rating: { type: Number, default: 4.5, min: 1, max: 5 },
  deliveryTime: { type: String, default: '30-45 min' },
  image: { type: String, default: '' },
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
