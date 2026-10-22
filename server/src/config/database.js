import config from './env.js';

/**
 * SkillVault Database Configuration
 * Manages MongoDB connection lifecycle, event listeners, and graceful teardown.
 */

let isConnected = false;

/**
 * Connect to MongoDB using the configured MONGODB_URI.
 * Dynamically resolves Mongoose when installed (Phase 4).
 *
 * @returns {Promise<any>}
 */
export async function connectDatabase() {
  if (isConnected) {
    return;
  }

  const uri = config.mongoUri;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in server configuration.');
  }

  try {
    // Attempt dynamic import of mongoose ODM
    const mongooseModule = await import('mongoose');
    const mongoose = mongooseModule.default || mongooseModule;

    const connection = await mongoose.connect(uri);
    isConnected = true;

    if (config.isDev) {
      console.log(`[Database] MongoDB connected: ${connection.connection.host}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[Database] MongoDB disconnected.');
    });

    return connection;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('[Database] Mongoose driver not yet installed (scheduled for Phase 4). Database module ready.');
      return null;
    }
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
  if (!isConnected) {
    return;
  }

  try {
    const mongooseModule = await import('mongoose');
    const mongoose = mongooseModule.default || mongooseModule;
    await mongoose.connection.close();
    isConnected = false;
    console.log('[Database] MongoDB connection closed.');
  } catch {
    isConnected = false;
  }
}

export function getDatabaseStatus() {
  return {
    isConnected,
    uriConfigured: Boolean(config.mongoUri)
  };
}

export default {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus
};
