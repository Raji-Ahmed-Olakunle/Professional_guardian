const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 6+ uses sensible defaults; options kept for clarity if needed
    });
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

