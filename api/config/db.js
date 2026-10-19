import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      '[Database] MONGODB_URI is not set in environment variables. Running in disconnected/scaffold mode.'
    );
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = !!conn.connections[0].readyState;
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
  }
};

export const checkDBStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    isReady: stateCode === 1,
  };
};

export default connectDB;
