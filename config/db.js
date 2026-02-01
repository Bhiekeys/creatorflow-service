const mongoose = require('mongoose');

// Cache connection for serverless (Vercel) - reuse across warm invocations
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected
  if (cached.conn) {
    return cached.conn;
  }

  // Connection in progress, wait for it
  if (cached.promise) {
    return cached.promise;
  }

  try {
    cached.promise = mongoose.connect(process.env.MONGODB_URI);
    cached.conn = await cached.promise;
    console.log(`MongoDB Connected: ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error('Common fixes: Whitelist IP in MongoDB Atlas, check MONGODB_URI');
    throw error;
  }
};

module.exports = connectDB;