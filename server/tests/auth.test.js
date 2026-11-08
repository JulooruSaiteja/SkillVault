import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { signToken, hashPassword } from '../src/utils/token.js';
import { requireAdmin } from '../src/middleware/auth.js';

describe('Phase 5 Authentication Endpoints and Middleware', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectDatabase();
    await User.deleteMany({ email: /@auth-test\.com$/ });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/auth`;
  });

  after(async () => {
    await User.deleteMany({ email: /@auth-test\.com$/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new learner account and set HttpOnly cookie', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Learner',
          email: 'alice@auth-test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.name, 'Alice Learner');
      assert.equal(json.data.user.email, 'alice@auth-test.com');
      assert.equal(json.data.user.role, 'learner');
      assert.equal(json.data.user.password, undefined);

      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader, 'Expected set-cookie header');
      assert.ok(cookieHeader.includes('token='), 'Cookie should contain token');
      assert.ok(cookieHeader.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly');
    });

    it('should prevent privilege escalation: role cannot be set to admin during registration', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker User',
          email: 'hacker@auth-test.com',
          password: 'password123',
          role: 'admin' // Attempted privilege escalation
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.user.role, 'learner', 'Role must remain learner');

      // Verify in database
      const dbUser = await User.findOne({ email: 'hacker@auth-test.com' });
      assert.equal(dbUser.role, 'learner');
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Duplicate',
          email: 'alice@auth-test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 409);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('already exists'));
    });

    it('should reject invalid input with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A',
          email: 'invalid-email',
          password: '123'
        })
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.errors.length >= 3);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return session cookie', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@auth-test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.email, 'alice@auth-test.com');
      assert.equal(json.data.user.password, undefined);

      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader.includes('token='));
    });

    it('should return generic error message for incorrect password', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@auth-test.com',
          password: 'wrong_password'
        })
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.message, 'Invalid email or password');
    });

    it('should return generic error message for non-existent email', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@auth-test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.message, 'Invalid email or password');
    });

    it('should require email and password', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 Unauthorized when no cookie is sent', async () => {
      const res = await fetch(`${baseUrl}/me`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.message, 'Authentication required');
    });

    it('should return current user when valid cookie is provided', async () => {
      const user = await User.findOne({ email: 'alice@auth-test.com' });
      const token = signToken({ id: user._id, email: user.email, role: user.role });

      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `token=${token}`
        }
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.email, 'alice@auth-test.com');
      assert.equal(json.data.user.role, 'learner');
    });

    it('should accept Bearer token in Authorization header', async () => {
      const user = await User.findOne({ email: 'alice@auth-test.com' });
      const token = signToken({ id: user._id, email: user.email, role: user.role });

      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.user.id, user._id.toString());
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie', async () => {
      const res = await fetch(`${baseUrl}/logout`, { method: 'POST' });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.message, 'Signed out successfully');

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie);
      // Cleared cookie has expired date or empty value
      assert.ok(setCookie.includes('token=;') || setCookie.includes('Expires=Thu, 01 Jan 1970'));
    });
  });

  describe('Role-based Authorization Middleware (requireAdmin)', () => {
    it('should allow admin user to proceed', (t, done) => {
      const req = { user: { role: 'admin' } };
      const res = {};
      requireAdmin(req, res, (err) => {
        assert.equal(err, undefined);
        done();
      });
    });

    it('should reject learner user with 403 Forbidden', (t, done) => {
      const req = { user: { role: 'learner' } };
      const res = {};
      requireAdmin(req, res, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, 'Admin privileges required');
        done();
      });
    });
  });
});
