import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
  });
  logger.info('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    // SECURITY: log connection errors without leaking the connection string (which may contain credentials)
    logger.error('MongoDB connection error', { message: err.message });
  });
}
