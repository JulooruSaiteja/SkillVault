import config, { validateEnv } from './config/env.js';
import app from './app.js';

// ------------------------------------
// Validate required configuration
// ------------------------------------
validateEnv();

// ------------------------------------
// Start HTTP Server
// ------------------------------------
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  SkillVault Server`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  CORS Origin: ${config.clientOrigin}`);
  console.log(`========================================\n`);
});

// ------------------------------------
// Graceful Shutdown
// ------------------------------------
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  shutdown('UNCAUGHT_EXCEPTION');
});
