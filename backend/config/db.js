const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Note: Add your MONGO_URI to a .env file later
    // await mongoose.connect(process.env.MONGO_URI, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });
    console.log('MongoDB connection established (simulated for initial setup).');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
