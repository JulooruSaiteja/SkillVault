import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  getCookieOptions,
  COOKIE_NAME
} from '../utils/token.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new learner account.
 * Note: Role cannot be elevated by the user; defaults strictly to 'learner'.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const errors = [];
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
    }

    if (errors.length > 0) {
      throw ApiError.badRequest('Validation failed', errors);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Hash password and strictly enforce learner role
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'learner', // Role cannot be set to admin by users
      isActive: true
    });

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return ApiResponse.created(res, 'Account registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log in to an existing account.
 * Enforces generic invalid-credential messaging for security.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Generic error message prevents account enumeration
    const genericAuthError = ApiError.unauthorized('Invalid email or password');

    if (!user || !user.isActive) {
      throw genericAuthError;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw genericAuthError;
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return ApiResponse.ok(res, 'Signed in successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log out and clear session cookie.
 */
export async function logout(req, res, next) {
  try {
    const { maxAge, ...clearOptions } = getCookieOptions();
    res.clearCookie(COOKIE_NAME, clearOptions);
    return ApiResponse.ok(res, 'Signed out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user profile.
 */
export async function getMe(req, res, next) {
  try {
    return ApiResponse.ok(res, 'Current user profile retrieved', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export default {
  register,
  login,
  logout,
  getMe
};
