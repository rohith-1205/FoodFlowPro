const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  deliveryBoyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Available', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'],
    default: 'Available'
  },
  pickupAddress: {
    type: String,
    default: ''
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  currentCoordinates: {
    lat: {
      type: Number,
      default: 12.9716
    },
    lng: {
      type: Number,
      default: 77.5946
    }
  },
  estimatedDeliveryMinutes: {
    type: Number,
    default: 30
  },
  pickedUpAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);
