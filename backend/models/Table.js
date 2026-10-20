const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true },
  capacity: { type: Number, default: 4 },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved'],
    default: 'Available'
  },
  foodReady: { type: Boolean, default: false },
  billRequested: { type: Boolean, default: false },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
