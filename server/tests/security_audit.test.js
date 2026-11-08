import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';
import config from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Bookmark } from '../src/models/Bookmark.js';
import { VideoProgress } from '../src/models/VideoProgress.js';
import { Video } from '../src/models/Video.js';
import { Skill } from '../src/models/Skill.js';
import { Category } from '../src/models/Category.js';
import { signToken, hashPassword } from '../src/utils/token.js';

describe('Phase 18 — Security Audit, Headers, Cookies, CORS, and Learner Isolation Tests', () => {
  let server;
  let baseUrl;

  let learner1;
  let learner1Token;
  let learner2;
  let learner2Token;
  let adminUser;
  let adminToken;

  let testCategory;
  let testSkill;
  let testVideo;

  before(async () => {
    await connectDatabase();

    // Clean previous security test fixtures
    await User.deleteMany({ email: /sec_.*@skillvault\.local/ });
    await VideoProgress.deleteMany({ 'meta.test': 'p18-sec' });
    await Video.deleteMany({ title: /\[P18SecTest\]/ });
    await Skill.deleteMany({ name: /\[P18SecTest\]/ });
    await Category.deleteMany({ name: /\[P18SecTest\]/ });

    const passwordHash = await hashPassword('TestSecPass123!');

    learner1 = await User.create({
      name: 'P18 Learner One',
      email: 'sec_learner1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    learner1Token = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'P18 Learner Two',
      email: 'sec_learner2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    learner2Token = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    adminUser = await User.create({
      name: 'P18 Admin User',
      email: 'sec_admin@skillvault.local',
      password: passwordHash,
      role: 'admin',
      isActive: true
    });
    adminToken = signToken({ id: adminUser._id, email: adminUser.email, role: adminUser.role });

    testCategory = await Category.create({
      name: '[P18SecTest] Cybersecurity & Networks',
      description: 'Security architectures and protocols',
      order: 1,
      isActive: true
    });

    testSkill = await Skill.create({
      name: '[P18SecTest] Cryptographic Protocols',
      description: 'TLS, HMAC, and public key infrastructure',
      category: testCategory._id,
      order: 1,
      isActive: true
    });

    testVideo = await Video.create({
      title: '[P18SecTest] TLS 1.3 Handshake Architecture',
      description: 'Detailed analysis of TLS 1.3 cryptographic session setup',
      youtubeVideoId: 'sec_dQw4w9WgXcQ',
      durationSeconds: 600,
      skill: testSkill._id,
      order: 1,
      isActive: true
    });

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    const testUserIds = [learner1?._id, learner2?._id, adminUser?._id].filter(Boolean);
    await Bookmark.deleteMany({ user: { $in: testUserIds } });
    await VideoProgress.deleteMany({ user: { $in: testUserIds } });
    await Video.deleteMany({ title: /\[P18SecTest\]/ });
    await Skill.deleteMany({ name: /\[P18SecTest\]/ });
    await Category.deleteMany({ name: /\[P18SecTest\]/ });
    await User.deleteMany({ _id: { $in: testUserIds } });

    await disconnectDatabase();
  });

  // =========================================================================
  // 1. HTTP Security Headers (Helmet)
  // =========================================================================
  describe('Security Headers Audit (Helmet)', () => {
    it('should set X-Content-Type-Options: nosniff', async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('should set X-Frame-Options: SAMEORIGIN', async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    });

    it('should set Cross-Origin-Resource-Policy and Opener-Policy headers', async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
      assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    });
  });

  // =========================================================================
  // 2. CORS Configuration
  // =========================================================================
  describe('CORS Configuration Audit', () => {
    it('should allow configured client origin with credentials', async () => {
      const res = await fetch(`${baseUrl}/api/categories`, {
        headers: { Origin: config.clientOrigin }
      });

      assert.equal(res.headers.get('access-control-allow-origin'), config.clientOrigin);
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });

    it('should respond to OPTIONS pre-flight requests with allowed methods and headers', async () => {
      const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'OPTIONS',
        headers: {
          Origin: config.clientOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });

      assert.equal(res.status, 204);
      assert.match(res.headers.get('access-control-allow-methods'), /GET.*POST.*PUT.*DELETE/i);
    });
  });

  // =========================================================================
  // 3. Cookie Security Audit
  // =========================================================================
  describe('Cookie Security Options', () => {
    it('should set HttpOnly and Path=/ on authentication token cookies', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sec_learner1@skillvault.local',
          password: 'TestSecPass123!'
        })
      });

      assert.equal(res.status, 200);
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie, 'Set-Cookie header should be present');
      assert.match(setCookie, /token=/);
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /Path=\//i);
      assert.match(setCookie, /SameSite=(Lax|Strict)/i);
    });
  });

  // =========================================================================
  // 4. Cross-User Data Isolation
  // =========================================================================
  describe('Cross-User Data Isolation', () => {
    it('should isolate video playback progress between learners', async () => {
      // Learner 1 records progress at 150 seconds
      await fetch(`${baseUrl}/api/videos/${testVideo._id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${learner1Token}`
        },
        body: JSON.stringify({ lastPositionSeconds: 150, durationSeconds: 600 })
      });

      // Learner 1 inspects progress -> 150
      const res1 = await fetch(`${baseUrl}/api/videos/${testVideo._id}/progress`, {
        headers: { Authorization: `Bearer ${learner1Token}` }
      });
      const data1 = await res1.json();
      assert.equal(data1.data?.progress?.lastPositionSeconds, 150);

      // Learner 2 inspects progress -> 0 (clean state, no cross-user bleed)
      const res2 = await fetch(`${baseUrl}/api/videos/${testVideo._id}/progress`, {
        headers: { Authorization: `Bearer ${learner2Token}` }
      });
      const data2 = await res2.json();
      assert.equal(data2.data?.progress?.lastPositionSeconds, 0);
      assert.equal(data2.data?.progress?.isCompleted, false);
    });

    it('should isolate bookmarks between learners', async () => {
      // Learner 1 bookmarks the video
      await fetch(`${baseUrl}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${learner1Token}`
        },
        body: JSON.stringify({ videoId: testVideo._id })
      });

      // Learner 2 bookmarks list should be empty
      const res2 = await fetch(`${baseUrl}/api/bookmarks`, {
        headers: { Authorization: `Bearer ${learner2Token}` }
      });
      const data2 = await res2.json();
      assert.equal(data2.data?.bookmarks?.length, 0);

      // Learner 2 attempts to delete Learner 1's bookmark -> safely isolated (not removed)
      const delRes = await fetch(`${baseUrl}/api/bookmarks/${testVideo._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${learner2Token}` }
      });
      const delData = await delRes.json();
      assert.equal(delRes.status, 200);
      assert.equal(delData.data?.removed, false);

      // Learner 1 bookmark remains intact
      const res1 = await fetch(`${baseUrl}/api/bookmarks`, {
        headers: { Authorization: `Bearer ${learner1Token}` }
      });
      const data1 = await res1.json();
      assert.equal(data1.data?.bookmarks?.length, 1);
    });

    it('should prevent learners from modifying role or elevating privileges', async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${learner1Token}`
        },
        body: JSON.stringify({ name: 'Hacked Name', role: 'admin' })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data?.user?.role, 'learner');

      // Verify in database that role is still learner
      const dbUser = await User.findById(learner1._id);
      assert.equal(dbUser.role, 'learner');
    });

    it('should strictly bar learners from administrative endpoints with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${learner1Token}` }
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Admin privileges required|Forbidden/i);
    });

    it('should reject unauthenticated requests to protected endpoints with 401', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Authentication required/i);
    });
  });
});
