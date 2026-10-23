import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const SALT_ROUNDS = 12;
export const COOKIE_NAME = 'token';

/**
 * Hash a plain-text password using bcrypt.
 *
 * @param {string} password - Raw password
 * @returns {Promise<string>} Salted bcrypt hash
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 *
 * @param {string} candidatePassword - Password to test
 * @param {string} hashedPassword - Stored hash
 * @returns {Promise<boolean>} True if match
 */
export async function comparePassword(candidatePassword, hashedPassword) {
  if (!candidatePassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, hashedPassword);
}

/**
 * Sign a JSON Web Token for an authenticated user.
 *
 * @param {object} payload - Claims to embed (e.g. { id, email, role })
 * @returns {string} Signed JWT
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn || '7d'
  });
}

/**
 * Verify and decode a JWT.
 *
 * @param {string} token - Raw JWT string
 * @returns {object} Decoded token payload
 */
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Generate standardized cookie options for JWT transmission.
 *
 * @returns {import('express').CookieOptions}
 */
export function getCookieOptions() {
  const isProd = config.isProd;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

export default {
  COOKIE_NAME,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  getCookieOptions
};
