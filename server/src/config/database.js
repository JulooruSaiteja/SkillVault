import mongoose from 'mongoose';
import config from './env.js';

/**
 * SkillVault Database Configuration
 * Manages MongoDB connection lifecycle, event listeners, and graceful teardown.
 */

let isConnected = false;

// Global connection events
mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  if (config.isDev) {
    console.warn('[Database] MongoDB disconnected.');
  }
});

/**
 * Connect to MongoDB using the configured MONGODB_URI.
 *
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }

  const uri = config.mongoUri;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in server configuration.');
  }

  try {
    const connection = await mongoose.connect(uri);
    isConnected = true;

    if (config.isDev) {
      console.log(`[Database] MongoDB connected: ${connection.connection.host}`);
    }

    return connection;
  } catch (err) {
    isConnected = false;
    console.error('[Database] Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

/**
 * Close MongoDB connection gracefully.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  isConnected = false;
}

/**
 * Get current database connection status.
 *
 * @returns {{ isConnected: boolean, readyState: number, uriConfigured: boolean }}
 */
export function getDatabaseStatus() {
  const ready = mongoose.connection.readyState === 1;
  return {
    isConnected: ready,
    readyState: mongoose.connection.readyState,
    uriConfigured: Boolean(config.mongoUri)
  };
}

export default {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus
};
