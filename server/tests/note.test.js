import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Category } from '../src/models/Category.js';
import { Skill } from '../src/models/Skill.js';
import { Video } from '../src/models/Video.js';
import { User } from '../src/models/User.js';
import { Note } from '../src/models/Note.js';
import { AiGlobalUsage } from '../src/models/AiGlobalUsage.js';
import { AiUserUsage } from '../src/models/AiUserUsage.js';
import { AI_FEATURES } from '../src/config/aiConfig.js';
import { signToken, hashPassword } from '../src/utils/token.js';
import { getUtcDayString } from '../src/utils/utcDate.js';
import { setGeminiClient, resetGeminiClient } from '../src/services/ai/geminiClient.js';
import { MockGeminiClient } from './helpers/mockGemini.js';

describe('Phase 12 AI Notes Generation Endpoints and Caching Tests', () => {
  let server;
  let baseUrl;

  let learner1;
  let token1;
  let learner2;
  let token2;

  let category;
  let skill;
  let video1;
  let video2;
  let video3;
  let inactiveVideo;

  const sampleNotesJson = JSON.stringify({
    summary: 'A comprehensive lesson on relational database architecture and query optimization.',
    keyConcepts: [
      {
        concept: 'Relational Tables',
        explanation: 'Data organized into strict rows and columns enforced by primary key constraints.'
      },
      {
        concept: 'Indexing',
        explanation: 'B-tree index structures that drastically reduce disk lookups for search queries.'
      }
    ],
    definitions: [
      {
        term: 'Primary Key',
        definition: 'A unique identifier column that guarantees record uniqueness across a relational table.'
      }
    ],
    takeaways: [
      'Schema design directly dictates index performance and read scalability.',
      'Always profile query execution plans before adding composite indexes.'
    ]
  });

  before(async () => {
    await connectDatabase();

    // Clean test artifacts
    const oldUsers = await User.find({ email: /notetest_.*@skillvault\.local/ }).select('_id');
    const oldUserIds = oldUsers.map((u) => u._id);
    await Note.deleteMany({ generatedBy: { $in: oldUserIds } });
    await Video.deleteMany({ title: /\[NoteTest\]/ });
    await Skill.deleteMany({ name: /\[NoteTest\]/ });
    await Category.deleteMany({ name: /\[NoteTest\]/ });
    await User.deleteMany({ email: /notetest_.*@skillvault\.local/ });
    await AiUserUsage.deleteMany({ user: { $in: oldUserIds } });

    // Seed test users
    const passwordHash = await hashPassword('Password123!');
    learner1 = await User.create({
      name: 'Note Learner One',
      email: 'notetest_1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token1 = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'Note Learner Two',
      email: 'notetest_2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token2 = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    // Seed catalog fixtures
    category = await Category.create({
      name: '[NoteTest] Databases & Storage',
      description: 'Relational and distributed database systems.'
    });

    skill = await Skill.create({
      name: '[NoteTest] PostgreSQL Internals',
      description: 'Deep dive into relational storage and query engines.',
      category: category._id
    });

    video1 = await Video.create({
      title: '[NoteTest] Lesson 1: Storage Engine & Heap Architecture',
      description: 'Understanding tuples, table pages, WAL logs, and MVCC in modern relational databases.',
      youtubeVideoId: 'note_test_yt_01',
      durationSeconds: 1200,
      skill: skill._id,
      isActive: true
    });

    video2 = await Video.create({
      title: '[NoteTest] Lesson 2: B-Tree Indexing and Scan Types',
      description: 'Index scans, bitmap index scans, and sequential scan trade-offs for high-throughput queries.',
      youtubeVideoId: 'note_test_yt_02',
      durationSeconds: 900,
      skill: skill._id,
      isActive: true
    });

    video3 = await Video.create({
      title: '[NoteTest] Lesson 3: Query Execution and Cost Estimation',
      description: 'How database cost optimizers estimate I/O and CPU costs for nested loops and hash joins.',
      youtubeVideoId: 'note_test_yt_03',
      durationSeconds: 1500,
      skill: skill._id,
      isActive: true
    });

    inactiveVideo = await Video.create({
      title: '[NoteTest] Retired Lesson: Obsolete DBMS',
      description: 'Legacy concepts no longer in active use.',
      youtubeVideoId: 'note_test_yt_inactive',
      durationSeconds: 600,
      skill: skill._id,
      isActive: false
    });

    // Start ephemeral server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    resetGeminiClient();
    await new Promise((resolve) => server.close(resolve));

    const testVideoIds = [video1?._id, video2?._id, video3?._id, inactiveVideo?._id].filter(Boolean);
    await Note.deleteMany({ video: { $in: testVideoIds } });
    await Video.deleteMany({ _id: { $in: testVideoIds } });
    if (skill?._id) await Skill.deleteOne({ _id: skill._id });
    if (category?._id) await Category.deleteOne({ _id: category._id });
    if (learner1?._id || learner2?._id) {
      await User.deleteMany({ _id: { $in: [learner1._id, learner2._id] } });
      await AiUserUsage.deleteMany({ user: { $in: [learner1._id, learner2._id] } });
    }

    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Reset mock client and clean notes for clean assertions
    resetGeminiClient();
    setGeminiClient(new MockGeminiClient({ defaultResponse: { text: sampleNotesJson } }));
  });

  // =========================================================================
  // 1. GET /api/videos/:identifier/notes
  // =========================================================================
  describe('GET /api/videos/:identifier/notes', () => {
    it('should return 404 for non-existent video identifier', async () => {
      const res = await fetch(`${baseUrl}/api/videos/non-existent-video-99999/notes`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /not found/i);
    });

    it('should return 404 for soft-deactivated video', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${inactiveVideo._id}/notes`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('should return null notes and quota status for video without notes (unauthenticated)', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1.slug}/notes`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.notes, null);
      assert.equal(body.data.canGenerate, false, 'Unauthenticated user cannot generate');
      assert.equal(body.data.userQuota, null);
      assert.equal(typeof body.data.globalQuota.remaining, 'number');
      assert.equal(typeof body.data.globalQuota.isExhausted, 'boolean');
    });

    it('should report canGenerate: true for authenticated user when quota is available', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/notes`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.notes, null);
      assert.equal(body.data.canGenerate, true);
      assert.equal(body.data.userQuota.allowed, true);
      assert.equal(body.data.userQuota.limit, 1);
    });
  });

  // =========================================================================
  // 2. POST /api/videos/:identifier/notes (Generation & Caching)
  // =========================================================================
  describe('POST /api/videos/:identifier/notes', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/notes`, {
        method: 'POST'
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('should return 404 for non-existent video', async () => {
      const res = await fetch(`${baseUrl}/api/videos/non-existent-99999/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.equal(res.status, 404);
    });

    it('should successfully generate and cache notes using Gemini 3.8 Flash', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.cached, false);

      const note = body.data.notes;
      assert.ok(note);
      assert.equal(note.video, video1._id.toString());
      assert.match(note.summary, /relational database/i);
      assert.equal(note.keyConcepts.length, 2);
      assert.equal(note.definitions.length, 1);
      assert.equal(note.takeaways.length, 2);
      assert.equal(note.model, 'gemini-3.8-flash');
      assert.equal(note.source, 'title_description');
      assert.equal(note.promptVersion, 'v1');
      assert.ok(note.contentFingerprint);

      // Verify persisted in MongoDB
      const stored = await Note.findOne({ video: video1._id });
      assert.ok(stored);
      assert.equal(stored.summary, note.summary);
      assert.equal(stored.generatedBy.toString(), learner1._id.toString());
    });

    it('should return cached note immediately on subsequent requests without invoking Gemini (cached: true)', async () => {
      const mockClient = new MockGeminiClient();
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.cached, true);
      assert.equal(mockClient.callCount, 0, 'Gemini must NOT be called on a cache hit');
    });

    it('should support route alias: GET and POST /api/notes/:identifier', async () => {
      // GET alias
      const getRes = await fetch(`${baseUrl}/api/notes/${video1.slug}`);
      assert.equal(getRes.status, 200);
      const getBody = await getRes.json();
      assert.equal(getBody.success, true);
      assert.ok(getBody.data.notes);

      // POST alias for cached video
      const postRes = await fetch(`${baseUrl}/api/notes/${video1.slug}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.equal(postRes.status, 200);
      const postBody = await postRes.json();
      assert.equal(postBody.data.cached, true);
    });
  });

  // =========================================================================
  // 3. User Daily Allowance & Global Budget Enforcement
  // =========================================================================
  describe('User Allowance and Global Budget Enforcement', () => {
    it('should reject second generation by same user on a different video with 429 (User Daily Limit: 1)', async () => {
      // Learner 1 already generated video 1. Attempting video 2 must fail.
      const res = await fetch(`${baseUrl}/api/videos/${video2._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.equal(res.status, 429);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /daily limit of 1 notes generation/i);
    });

    it('should allow learner 2 to generate notes for video 2 (isolated user allowances)', async () => {
      // Learner 2 has not used their allowance yet
      const res = await fetch(`${baseUrl}/api/videos/${video2._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` }
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.cached, false);
    });

    it('should reject generation when global daily budget (20 RPD) is exhausted', async () => {
      // Simulate exhausting global budget of 20
      const today = getUtcDayString();
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.NOTES, utcDay: today },
        { $set: { attempts: 20, model: 'gemini-3.8-flash' } },
        { upsert: true }
      );

      // Create a fresh user for this test
      const freshHash = await hashPassword('Password123!');
      const freshLearner = await User.create({
        name: 'Fresh Learner',
        email: 'notetest_fresh@skillvault.local',
        password: freshHash,
        role: 'learner',
        isActive: true
      });
      const freshToken = signToken({ id: freshLearner._id, email: freshLearner.email, role: freshLearner.role });

      const res = await fetch(`${baseUrl}/api/videos/${video3._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` }
      });

      assert.equal(res.status, 429);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /daily global AI quota for Notes generation has been reached/i);

      // Cleanup fresh learner
      await User.deleteOne({ _id: freshLearner._id });
    });
  });

  // =========================================================================
  // 4. Provider Error Handling and Malformed Output
  // =========================================================================
  describe('Provider Error Handling and Sanitization', () => {
    it('should retry on transient 503 error and succeed if retry returns valid notes', async () => {
      // Reset global attempts to 0 so we have budget
      const today = getUtcDayString();
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.NOTES, utcDay: today },
        { $set: { attempts: 0 } }
      );

      // Clear video3 notes if any
      await Note.deleteOne({ video: video3._id });

      const mockClient = new MockGeminiClient({
        behaviorQueue: [
          MockGeminiClient.createProviderUnavailableError(), // 1st attempt fails with 503
          { text: sampleNotesJson }                           // 2nd attempt succeeds
        ]
      });
      setGeminiClient(mockClient);

      // Learner 2 has used 1 note on video 2. Reset learner 2's usage so they can test
      await AiUserUsage.deleteOne({ user: learner2._id, feature: AI_FEATURES.NOTES, utcDay: today });

      const res = await fetch(`${baseUrl}/api/videos/${video3._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` }
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(mockClient.callCount, 2, 'Should have executed 1 retry');
    });

    it('should return 502 with standardized envelope when AI returns malformed JSON', async () => {
      // Delete video3 note so we can try generating again
      await Note.deleteOne({ video: video3._id });
      const today = getUtcDayString();
      await AiUserUsage.deleteOne({ user: learner2._id, feature: AI_FEATURES.NOTES, utcDay: today });
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.NOTES, utcDay: today },
        { $set: { attempts: 0 } }
      );

      const mockClient = new MockGeminiClient({
        defaultResponse: { text: 'Sorry, I am unable to generate valid JSON right now.' }
      });
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/videos/${video3._id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` }
      });

      assert.equal(res.status, 502);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Failed to parse AI response as JSON/i);
    });
  });
});
