const mongoose = require('mongoose');

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless function executions in production (Vercel).
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  // If mongoose is already connected through default connection
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((m) => {
      console.log(`MongoDB Connected: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`Database connection error: ${error.message}`);
    // In serverless environments, do not exit process as it kills the lambda container
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
