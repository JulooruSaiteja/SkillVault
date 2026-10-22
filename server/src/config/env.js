import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from server/ root
dotenv.config({ path: resolve(__dirname, '../../.env') });

/**
 * Required environment variables for SkillVault server.
 * Each entry maps the variable name to a human-readable description
 * used in the startup error message.
 */
const REQUIRED_VARS = {
  PORT: 'Server port number',
  CLIENT_ORIGIN: 'Allowed CORS origin (e.g. http://localhost:5173)',
  MONGODB_URI: 'MongoDB connection string',
  JWT_SECRET: 'Secret key for signing JSON Web Tokens',
  JWT_EXPIRES_IN: 'JWT expiration duration (e.g. 7d, 24h)',
  COOKIE_SECRET: 'Secret key for cookie signing'
};

/**
 * Validate that all required environment variables are defined.
 * Logs a clear list of missing variables and exits if any are absent.
 */
export function validateEnv() {
  const missing = [];

  for (const [key, description] of Object.entries(REQUIRED_VARS)) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(`  - ${key}: ${description}`);
    }
  }

  if (missing.length > 0) {
    console.error('\n========================================');
    console.error('  SKILLVAULT: Missing Required Configuration');
    console.error('========================================\n');
    console.error('The following environment variables are required but not set:\n');
    console.error(missing.join('\n'));
    console.error('\nCopy server/.env.example to server/.env and provide values.');
    console.error('See README.md for setup instructions.\n');
    process.exit(1);
  }
}

/**
 * Parsed and validated configuration object.
 * Access configuration values from this object rather than process.env directly.
 */
const config = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get isDev() {
    return this.nodeEnv === 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
  get port() {
    return parseInt(process.env.PORT, 10) || 5000;
  },
  get clientOrigin() {
    return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  },
  get mongoUri() {
    return process.env.MONGODB_URI;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d';
  },
  get cookieSecret() {
    return process.env.COOKIE_SECRET;
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY;
  }
};

export default config;
