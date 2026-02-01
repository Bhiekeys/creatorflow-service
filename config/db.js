const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error('');
    console.error('Common fixes:');
    console.error('  1. Whitelist your IP in MongoDB Atlas:');
    console.error('     https://www.mongodb.com/docs/atlas/security-whitelist/');
    console.error('     Atlas → Network Access → Add IP Address (or 0.0.0.0/0 for dev)');
    console.error('  2. Check MONGODB_URI in backend/.env (correct cluster URL and password?)');
    console.error('');
    process.exit(1);
  }
};

module.exports = connectDB;