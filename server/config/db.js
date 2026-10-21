import mongoose from 'mongoose';

let connectionPromise;
// API middleware waits for connectivity; model initialization must be able to wait for the first connection.
mongoose.connection.on('disconnected', () => {
  connectionPromise = undefined;
});

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  await connectionPromise;
  return mongoose.connection;
};

export const checkDBStatus = () => ({
  state:
    ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ||
    'unknown',
  isReady: mongoose.connection.readyState === 1,
});
export default connectDB;
