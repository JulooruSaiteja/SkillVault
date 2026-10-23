import config, { validateEnv } from './config/env.js';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

// ------------------------------------
// Validate required configuration
// ------------------------------------
validateEnv();

// ------------------------------------
// Start HTTP Server & Connect Database
// ------------------------------------
const PORT = config.port;

let server;

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  SkillVault Server`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Port:        ${PORT}`);
      console.log(`  CORS Origin: ${config.clientOrigin}`);
      console.log(`========================================\n`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err.message);
    process.exit(1);
  }
}

// ------------------------------------
// Graceful Shutdown
// ------------------------------------
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

startServer();
