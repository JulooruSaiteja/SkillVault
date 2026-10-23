import { ApiError } from '../utils/ApiError.js';
import { verifyToken, COOKIE_NAME } from '../utils/token.js';
import { User } from '../models/User.js';

/**
 * Extract JWT from request cookies or Authorization header.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  if (req.signedCookies && req.signedCookies[COOKIE_NAME]) {
    return req.signedCookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/**
 * Middleware: Require valid authenticated user session.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or account deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Require administrator role.
 * Must be preceded by requireAuth or ensure req.user exists.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin privileges required'));
  }
  next();
}

/**
 * Middleware: Optional authentication.
 * Attaches user to req.user if a valid token is present; proceeds without error otherwise.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      req.user = user && user.isActive ? user : null;
    } catch {
      req.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export default {
  extractToken,
  requireAuth,
  requireAdmin,
  optionalAuth
};
