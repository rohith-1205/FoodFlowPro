const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['Starters', 'Mains', 'Pizza', 'Desserts', 'Beverages'],
    required: true
  },
  isAvailable: { type: Boolean, default: true },
  image: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
