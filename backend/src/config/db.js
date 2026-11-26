import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let listenersRegistered = false;

export const connectDB = async () => {
  if (!listenersRegistered) {
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB runtime error');
    });
    listenersRegistered = true;
  }

  try {
    const conn = await mongoose.connect(config.db.uri);
    logger.info({ host: conn.connection.host }, 'MongoDB connected');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    process.exit(1);
  }
};
