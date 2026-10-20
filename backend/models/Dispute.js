const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null
  },
  issueType: {
    type: String,
    enum: ['Cancellation', 'Refund Request', 'Quality Complaint', 'Delivery Delay', 'Review Moderation', 'Other'],
    default: 'Quality Complaint'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved', 'Rejected'],
    default: 'Open'
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
