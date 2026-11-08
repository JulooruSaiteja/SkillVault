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
import { signToken, hashPassword } from '../src/utils/token.js';

describe('Phase 10 Video Progress, Resume, and Recent History Endpoints', () => {
  let server;
  let baseUrl;

  let learner1;
  let token1;
  let learner2;
  let token2;

  let category;
  let skill;
  let playlist;
  let video1;
  let video2;
  let video3;
  let inactiveVideo;

  before(async () => {
    await connectDatabase();

    // Clean existing test data
    const oldProgressUsers = await User.find({ email: /progress_test_.*@skillvault\.local/ }).select('_id');
    await VideoProgress.deleteMany({ user: { $in: oldProgressUsers.map((u) => u._id) } });
    await Video.deleteMany({ title: /\[ProgressTest\]/ });
    await Playlist.deleteMany({ title: /\[ProgressTest\]/ });
    await Skill.deleteMany({ name: /\[ProgressTest\]/ });
    await Category.deleteMany({ name: /\[ProgressTest\]/ });
    await User.deleteMany({ email: /progress_test_.*@skillvault\.local/ });

    // Seed test users
    const passwordHash = await hashPassword('Password123!');
    learner1 = await User.create({
      name: 'Progress Learner One',
      email: 'progress_test_1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token1 = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'Progress Learner Two',
      email: 'progress_test_2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token2 = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    // Seed category & skill
    category = await Category.create({
      name: '[ProgressTest] Computer Science',
      description: 'Core fundamentals',
      order: 1,
      isActive: true
    });

    skill = await Skill.create({
      name: '[ProgressTest] Algorithms',
      description: 'Algorithmic problem solving',
      category: category._id,
      order: 1,
      isActive: true
    });

    playlist = await Playlist.create({
      title: '[ProgressTest] Data Structures Series',
      description: 'Arrays, Trees, Graphs',
      skill: skill._id,
      order: 1,
      isActive: true
    });

    video1 = await Video.create({
      title: '[ProgressTest] Lesson 1: Binary Search Trees',
      description: 'BST operations and balanced tree rotations',
      skill: skill._id,
      playlist: playlist._id,
      youtubeVideoId: 'yt_bst_11111',
      durationSeconds: 1000,
      order: 1,
      isActive: true
    });

    video2 = await Video.create({
      title: '[ProgressTest] Lesson 2: Graph Traversals DFS & BFS',
      description: 'Breadth-first and depth-first search',
      skill: skill._id,
      playlist: playlist._id,
      youtubeVideoId: 'yt_graph_22222',
      durationSeconds: 600,
      order: 2,
      isActive: true
    });

    video3 = await Video.create({
      title: '[ProgressTest] Standalone: Dynamic Programming',
      description: 'Memoization and tabulation',
      skill: skill._id,
      playlist: null,
      youtubeVideoId: 'yt_dp_33333',
      durationSeconds: 1200,
      order: 3,
      isActive: true
    });

    inactiveVideo = await Video.create({
      title: '[ProgressTest] Deactivated Lesson',
      description: 'Legacy content',
      skill: skill._id,
      youtubeVideoId: 'yt_inact_44444',
      durationSeconds: 500,
      order: 99,
      isActive: false
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const cleanUsers = await User.find({ email: /progress_test_.*@skillvault\.local/ }).select('_id');
    await VideoProgress.deleteMany({ user: { $in: cleanUsers.map((u) => u._id) } });
    await Video.deleteMany({ title: /\[ProgressTest\]/ });
    await Playlist.deleteMany({ title: /\[ProgressTest\]/ });
    await Skill.deleteMany({ name: /\[ProgressTest\]/ });
    await Category.deleteMany({ name: /\[ProgressTest\]/ });
    await User.deleteMany({ email: /progress_test_.*@skillvault\.local/ });
    await disconnectDatabase();
  });

  it('1. should reject unauthenticated requests to save and retrieve progress (401)', async () => {
    const saveRes = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video1._id.toString(), lastPositionSeconds: 100 })
    });
    assert.equal(saveRes.status, 401);

    const getRes = await fetch(`${baseUrl}/progress/${video1._id}`);
    assert.equal(getRes.status, 401);

    const recentRes = await fetch(`${baseUrl}/progress/recent`);
    assert.equal(recentRes.status, 401);
  });

  it('2. should reject invalid payloads (missing videoId, negative position, non-existent video)', async () => {
    // Missing position
    const resNoPos = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: video1._id.toString() })
    });
    assert.equal(resNoPos.status, 400);

    // Negative position
    const resNeg = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: video1._id.toString(), lastPositionSeconds: -10 })
    });
    assert.equal(resNeg.status, 400);

    // Non-existent video
    const fakeId = '66f1a2b3c4d5e6f7a8b9c0d1';
    const resNotFound = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: fakeId, lastPositionSeconds: 50 })
    });
    assert.equal(resNotFound.status, 404);

    // Deactivated video
    const resInactive = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: inactiveVideo._id.toString(), lastPositionSeconds: 50 })
    });
    assert.equal(resInactive.status, 404);
  });

  it('3. should save progress for active video and calculate partial completion (< 90%)', async () => {
    const res = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({
        videoId: video1._id.toString(),
        lastPositionSeconds: 450, // 450 / 1000 = 45%
        durationSeconds: 1000
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.progress.lastPositionSeconds, 450);
    assert.equal(body.data.progress.durationSeconds, 1000);
    assert.equal(body.data.progress.isCompleted, false);
    assert.equal(body.data.progress.progressPercentage, 45);
  });

  it('4. should retrieve saved progress via GET /api/progress/:videoId', async () => {
    const res = await fetch(`${baseUrl}/progress/${video1._id}`, {
      headers: { Cookie: `token=${token1}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.progress.lastPositionSeconds, 450);
    assert.equal(body.data.progress.durationSeconds, 1000);
    assert.equal(body.data.progress.isCompleted, false);
    assert.equal(body.data.progress.progressPercentage, 45);
  });

  it('5. should return default 0-progress for unwatched video', async () => {
    const res = await fetch(`${baseUrl}/progress/${video2._id}`, {
      headers: { Cookie: `token=${token1}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.progress.lastPositionSeconds, 0);
    assert.equal(body.data.progress.durationSeconds, 600);
    assert.equal(body.data.progress.isCompleted, false);
    assert.equal(body.data.progress.progressPercentage, 0);
  });

  it('6. should automatically mark isCompleted: true when reaching >= 90% duration threshold', async () => {
    // 900 / 1000 = 90% -> Completed
    const res = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({
        videoId: video1._id.toString(),
        lastPositionSeconds: 900
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.progress.isCompleted, true);
    assert.equal(body.data.progress.progressPercentage, 90);
  });

  it('7. should retain isCompleted: true if user rewinds back below 90%', async () => {
    const res = await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({
        videoId: video1._id.toString(),
        lastPositionSeconds: 120 // rewound to 12%
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.progress.lastPositionSeconds, 120);
    assert.equal(body.data.progress.isCompleted, true, 'isCompleted must remain true even when rewound');
  });

  it('8. should enforce unique compound constraint (user, video) with no duplicate records', async () => {
    const count = await VideoProgress.countDocuments({
      user: learner1._id,
      video: video1._id
    });
    assert.equal(count, 1, 'Only exactly 1 VideoProgress record must exist per (user, video)');
  });

  it('9. should retrieve recent/continue-learning queue in descending order of updatedAt', async () => {
    // Save progress on video3 as well
    await fetch(`${baseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({
        videoId: video3._id.toString(),
        lastPositionSeconds: 600, // 50%
        durationSeconds: 1200
      })
    });

    const res = await fetch(`${baseUrl}/progress/recent`, {
      headers: { Cookie: `token=${token1}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalCount, 2);
    assert.ok(Array.isArray(body.data.recent));
    assert.equal(body.data.recent.length, 2);

    // Most recently updated is video3
    assert.equal(body.data.recent[0].video._id.toString(), video3._id.toString());
    assert.equal(body.data.recent[0].video.title, video3.title);
    assert.ok(body.data.recent[0].video.skill);
    assert.equal(body.data.recent[0].progressPercentage, 50);

    // Older progress is video1
    assert.equal(body.data.recent[1].video._id.toString(), video1._id.toString());
    assert.equal(body.data.recent[1].isCompleted, true);

    // Verify alias /continue-learning works identically
    const aliasRes = await fetch(`${baseUrl}/progress/continue-learning`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(aliasRes.status, 200);
    const aliasBody = await aliasRes.json();
    assert.equal(aliasBody.data.totalCount, 2);
  });

  it('10. should support video route aliases: GET and POST /api/videos/:identifier/progress', async () => {
    // Save progress using video slug via /api/videos/:identifier/progress
    const saveRes = await fetch(`${baseUrl}/videos/${video2.slug}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({
        lastPositionSeconds: 300 // 300 / 600 = 50%
      })
    });
    assert.equal(saveRes.status, 200);
    const saveBody = await saveRes.json();
    assert.equal(saveBody.data.progress.lastPositionSeconds, 300);
    assert.equal(saveBody.data.progress.progressPercentage, 50);

    // Retrieve progress using video ID via /api/videos/:identifier/progress
    const getRes = await fetch(`${baseUrl}/videos/${video2._id}/progress`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.data.progress.lastPositionSeconds, 300);
    assert.equal(getBody.data.progress.isCompleted, false);
  });

  it('11. should isolate user progress: learner2 cannot see learner1 progress', async () => {
    const res = await fetch(`${baseUrl}/progress/${video1._id}`, {
      headers: { Cookie: `token=${token2}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // learner2 has not watched video1 yet -> default 0 progress
    assert.equal(body.data.progress.lastPositionSeconds, 0);
    assert.equal(body.data.progress.isCompleted, false);

    // learner2 recent list is empty
    const recentRes = await fetch(`${baseUrl}/progress/recent`, {
      headers: { Cookie: `token=${token2}` }
    });
    assert.equal(recentRes.status, 200);
    const recentBody = await recentRes.json();
    assert.equal(recentBody.data.totalCount, 0);
    assert.equal(recentBody.data.recent.length, 0);
  });
});
