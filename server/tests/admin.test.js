import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Category } from '../src/models/Category.js';
import { Skill } from '../src/models/Skill.js';
import { Playlist } from '../src/models/Playlist.js';
import { Video } from '../src/models/Video.js';
import { User } from '../src/models/User.js';
import { VideoProgress } from '../src/models/VideoProgress.js';
import { Bookmark } from '../src/models/Bookmark.js';
import { Note } from '../src/models/Note.js';
import { Quiz } from '../src/models/Quiz.js';
import { signToken, hashPassword } from '../src/utils/token.js';

describe('Phase 16 Admin Content Management and Catalog Curation Tests', () => {
  let server;
  let baseUrl;

  let adminUser;
  let adminToken;
  let learnerUser;
  let learnerToken;

  let testCategory;
  let testSkill;
  let testPlaylist;
  let testVideo;

  before(async () => {
    await connectDatabase();

    // Clean any previous test artifacts
    const oldUsers = await User.find({ email: /p16_.*@skillvault\.local/ }).select('_id');
    const oldUserIds = oldUsers.map((u) => u._id);
    await VideoProgress.deleteMany({ user: { $in: oldUserIds } });
    await Bookmark.deleteMany({ user: { $in: oldUserIds } });
    await Video.deleteMany({ title: /\[P16AdminTest\]/ });
    await Playlist.deleteMany({ title: /\[P16AdminTest\]/ });
    await Skill.deleteMany({ name: /\[P16AdminTest\]/ });
    await Category.deleteMany({ name: /\[P16AdminTest\]/ });
    await User.deleteMany({ email: /p16_.*@skillvault\.local/ });

    // Seed test admin and learner
    const passwordHash = await hashPassword('AdminSecurePass123!');
    adminUser = await User.create({
      name: 'P16 System Admin',
      email: 'p16_admin@skillvault.local',
      password: passwordHash,
      role: 'admin',
      isActive: true
    });
    adminToken = signToken({ id: adminUser._id, email: adminUser.email, role: adminUser.role });

    learnerUser = await User.create({
      name: 'P16 Regular Learner',
      email: 'p16_learner@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    learnerToken = signToken({ id: learnerUser._id, email: learnerUser.email, role: learnerUser.role });

    // Seed base fixtures
    testCategory = await Category.create({
      name: '[P16AdminTest] Infrastructure & Cloud',
      description: 'Distributed computing and cloud systems.',
      order: 1,
      isActive: true
    });

    testSkill = await Skill.create({
      name: '[P16AdminTest] Kubernetes Cluster Architecture',
      description: 'Control plane, kubelet, etcd consensus, and pod networking.',
      category: testCategory._id,
      order: 1,
      isActive: true
    });

    testPlaylist = await Playlist.create({
      title: '[P16AdminTest] Production Kubernetes Track',
      description: 'Zero to production Kubernetes cluster administration.',
      skill: testSkill._id,
      order: 1,
      isActive: true
    });

    testVideo = await Video.create({
      title: '[P16AdminTest] Pod Scheduling & Node Affinity',
      description: 'Kube-scheduler evaluation pipeline, taints, and tolerations.',
      youtubeVideoId: 'p16_yt_admin_01',
      durationSeconds: 1200,
      skill: testSkill._id,
      playlist: testPlaylist._id,
      transcript: 'Welcome to this lesson on pod scheduling.',
      hasTranscript: true,
      order: 1,
      isActive: true
    });

    // Start ephemeral test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));

    const testUsers = [adminUser?._id, learnerUser?._id].filter(Boolean);
    await VideoProgress.deleteMany({ user: { $in: testUsers } });
    await Bookmark.deleteMany({ user: { $in: testUsers } });
    await Video.deleteMany({ title: /\[P16AdminTest\]/ });
    await Playlist.deleteMany({ title: /\[P16AdminTest\]/ });
    await Skill.deleteMany({ name: /\[P16AdminTest\]/ });
    await Category.deleteMany({ name: /\[P16AdminTest\]/ });
    await User.deleteMany({ _id: { $in: testUsers } });

    await disconnectDatabase();
  });

  // =========================================================================
  // 1. Role-Based Administrative Barrier Tests
  // =========================================================================
  describe('Administrative Access Control Barrier', () => {
    it('should reject unauthenticated requests to admin endpoints with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`);
      assert.strictEqual(res.status, 401);
    });

    it('should reject regular learners with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${learnerToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /admin privileges required/i);
    });

    it('should allow admin user to retrieve system stats', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.stats);
      assert.ok(data.data.stats.categories >= 1);
      assert.ok(data.data.stats.videos >= 1);
      assert.ok(data.data.stats.users >= 2);
    });
  });

  // =========================================================================
  // 2. Categories Administration CRUD
  // =========================================================================
  describe('Category Administration (CRUD, Slug & Deletion Safety)', () => {
    let createdCatId;

    it('should create a new category and automatically generate slug', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: '[P16AdminTest] High Performance Computing',
          description: 'Parallel architectures, MPI, and OpenMP',
          icon: '⚡',
          order: 5
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.category.name, '[P16AdminTest] High Performance Computing');
      assert.ok(data.data.category.slug.includes('high-performance-computing'));
      assert.strictEqual(data.data.category.isActive, true);
      createdCatId = data.data.category._id;
    });

    it('should reject creating duplicate category name with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: '[P16AdminTest] High Performance Computing'
        })
      });

      assert.strictEqual(res.status, 409);
    });

    it('should update category details', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${createdCatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          description: 'Updated description for HPC track'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.category.description, 'Updated description for HPC track');
    });

    it('should toggle category active status (soft deactivation)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${createdCatId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.category.isActive, false);

      // Toggle back to active
      const res2 = await fetch(`${baseUrl}/api/admin/categories/${createdCatId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.data.category.isActive, true);
    });

    it('should prevent hard-delete of category when child skills reference it', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${testCategory._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /cannot hard-delete category/i);
    });

    it('should allow hard-delete of category with no child skills', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${createdCatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify deletion in database
      const found = await Category.findById(createdCatId);
      assert.strictEqual(found, null);
    });
  });

  // =========================================================================
  // 3. Skills Administration CRUD
  // =========================================================================
  describe('Skill Administration (CRUD & References)', () => {
    let createdSkillId;

    it('should create a new skill under an existing category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: '[P16AdminTest] Linux eBPF Kernel Tracing',
          category: testCategory._id,
          description: 'Tracing syscalls, network sockets, and kernel functions with BPF',
          icon: '🐝'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.skill.name, '[P16AdminTest] Linux eBPF Kernel Tracing');
      assert.ok(data.data.skill.category);
      createdSkillId = data.data.skill._id;
    });

    it('should reject creating skill with non-existent category', async () => {
      const fakeId = new Category()._id;
      const res = await fetch(`${baseUrl}/api/admin/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: '[P16AdminTest] Orphan Skill',
          category: fakeId
        })
      });

      assert.strictEqual(res.status, 404);
    });

    it('should prevent hard-delete of skill with assigned playlist or video', async () => {
      const res = await fetch(`${baseUrl}/api/admin/skills/${testSkill._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /cannot hard-delete skill/i);
    });

    it('should allow hard-delete of skill with no assigned playlists or videos', async () => {
      const res = await fetch(`${baseUrl}/api/admin/skills/${createdSkillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const found = await Skill.findById(createdSkillId);
      assert.strictEqual(found, null);
    });
  });

  // =========================================================================
  // 4. Playlists Administration CRUD
  // =========================================================================
  describe('Playlist Administration (CRUD & Constraints)', () => {
    let createdPlId;

    it('should create a new playlist under an existing skill', async () => {
      const res = await fetch(`${baseUrl}/api/admin/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: '[P16AdminTest] Advanced Kubernetes Ingress & Service Mesh',
          description: 'Envoy, Istio, and gateway API',
          skill: testSkill._id,
          externalYoutubePlaylistId: 'PL_TEST_P16'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.playlist.title, '[P16AdminTest] Advanced Kubernetes Ingress & Service Mesh');
      createdPlId = data.data.playlist._id;
    });

    it('should prevent hard-delete of playlist with assigned videos', async () => {
      const res = await fetch(`${baseUrl}/api/admin/playlists/${testPlaylist._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /cannot hard-delete playlist/i);
    });

    it('should allow hard-delete of empty playlist', async () => {
      const res = await fetch(`${baseUrl}/api/admin/playlists/${createdPlId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const found = await Playlist.findById(createdPlId);
      assert.strictEqual(found, null);
    });
  });

  // =========================================================================
  // 5. Videos Administration, Transcripts & Deletion Safety
  // =========================================================================
  describe('Video Administration, Transcript Editor & History Deletion Safety', () => {
    let standaloneVideoId;

    it('should create a video and automatically set hasTranscript: true when transcript is supplied', async () => {
      const res = await fetch(`${baseUrl}/api/admin/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: '[P16AdminTest] Standalone eBPF Probes Overview',
          description: 'Attaching kprobes and tracepoints',
          youtubeVideoId: 'p16_yt_standalone',
          durationSeconds: 900,
          skill: testSkill._id,
          transcript: 'Full transcript text for eBPF probes overview lesson.'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.video.hasTranscript, true);
      assert.strictEqual(data.data.video.transcript, 'Full transcript text for eBPF probes overview lesson.');
      standaloneVideoId = data.data.video._id;
    });

    it('should update transcript via dedicated transcript editor endpoint', async () => {
      // 1. Clear transcript
      const clearRes = await fetch(`${baseUrl}/api/admin/videos/${standaloneVideoId}/transcript`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ transcript: '' })
      });

      assert.strictEqual(clearRes.status, 200);
      const clearData = await clearRes.json();
      assert.strictEqual(clearData.data.video.hasTranscript, false);
      assert.strictEqual(clearData.data.video.transcript, null);

      // 2. Supply updated transcript
      const updateRes = await fetch(`${baseUrl}/api/admin/videos/${standaloneVideoId}/transcript`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ transcript: 'Newly supplied admin transcript content.' })
      });

      assert.strictEqual(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.strictEqual(updateData.data.video.hasTranscript, true);
      assert.strictEqual(updateData.data.video.transcript, 'Newly supplied admin transcript content.');
    });

    it('should toggle video active status (soft deactivation)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/videos/${standaloneVideoId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.video.isActive, false);

      // Verify inactive video is excluded from regular public video endpoint
      const pubRes = await fetch(`${baseUrl}/api/videos/${standaloneVideoId}`);
      assert.strictEqual(pubRes.status, 404);

      // But still returned in admin listing
      const adminList = await fetch(`${baseUrl}/api/admin/videos`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const adminListData = await adminList.json();
      const foundInAdmin = adminListData.data.videos.find((v) => v._id === standaloneVideoId);
      assert.ok(foundInAdmin);
      assert.strictEqual(foundInAdmin.isActive, false);
    });

    it('CRITICAL: should PREVENT hard-delete of video when user history references exist (e.g. VideoProgress, Bookmark)', async () => {
      // Create user progress and bookmark on testVideo
      await VideoProgress.create({
        user: learnerUser._id,
        video: testVideo._id,
        lastPositionSeconds: 600,
        durationSeconds: 1200,
        isCompleted: false
      });

      await Bookmark.create({
        user: learnerUser._id,
        video: testVideo._id
      });

      // Attempt hard deletion by admin
      const delRes = await fetch(`${baseUrl}/api/admin/videos/${testVideo._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(delRes.status, 409);
      const delData = await delRes.json();
      assert.strictEqual(delData.success, false);
      assert.match(delData.message, /cannot hard-delete video/i);
      assert.match(delData.message, /user history references exist/i);
      assert.match(delData.message, /playback record/i);
      assert.match(delData.message, /bookmark/i);

      // Verify video is still intact in database
      const intact = await Video.findById(testVideo._id);
      assert.ok(intact);
    });

    it('should allow hard-delete of video when NO user history references exist', async () => {
      const delRes = await fetch(`${baseUrl}/api/admin/videos/${standaloneVideoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(delRes.status, 200);
      const found = await Video.findById(standaloneVideoId);
      assert.strictEqual(found, null);
    });
  });

  // =========================================================================
  // 6. User Administration
  // =========================================================================
  describe('User Administration', () => {
    it('should list all registered users without leaking password hashes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data.users));

      data.data.users.forEach((u) => {
        assert.ok(u.name);
        assert.ok(u.email);
        assert.ok(u.role);
        // Security check: password hash must NEVER be exposed
        assert.strictEqual(u.password, undefined);
      });
    });

    it('should toggle active status for a learner account', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${learnerUser._id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.user.isActive, false);

      // Verify deactivated learner cannot sign in
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: learnerUser.email, password: 'AdminSecurePass123!' })
      });
      assert.strictEqual(loginRes.status, 401);

      // Reactivate learner
      const res2 = await fetch(`${baseUrl}/api/admin/users/${learnerUser._id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.data.user.isActive, true);
    });

    it('should prevent admin from deactivating their own account (self-lockout prevention)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${adminUser._id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /cannot deactivate your own administrative account/i);
    });
  });
});
