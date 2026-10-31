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
import { Quiz } from '../src/models/Quiz.js';
import { signToken, hashPassword } from '../src/utils/token.js';

describe('Phase 15 Dashboard, Quiz Statistics, and Profile Management Tests', () => {
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
  let testQuiz;

  before(async () => {
    await connectDatabase();

    // Clean any previous test artifacts
    const oldUsers = await User.find({ email: /p15_.*@skillvault\.local/ }).select('_id');
    const oldUserIds = oldUsers.map((u) => u._id);
    await VideoProgress.deleteMany({ user: { $in: oldUserIds } });
    await Quiz.deleteMany({ generatedBy: { $in: oldUserIds } });
    await Video.deleteMany({ title: /\[P15Test\]/ });
    await Playlist.deleteMany({ title: /\[P15Test\]/ });
    await Skill.deleteMany({ name: /\[P15Test\]/ });
    await Category.deleteMany({ name: /\[P15Test\]/ });
    await User.deleteMany({ email: /p15_.*@skillvault\.local/ });

    // Seed test learners
    const passwordHash = await hashPassword('InitialPass123!');
    learner1 = await User.create({
      name: 'P15 Learner One',
      email: 'p15_learner1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true,
      quizScores: []
    });
    token1 = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'P15 Learner Two',
      email: 'p15_learner2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true,
      quizScores: []
    });
    token2 = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    // Seed catalog fixtures
    category = await Category.create({
      name: '[P15Test] Computer Science Core',
      description: 'Foundations of algorithms and runtime systems.'
    });

    skill = await Skill.create({
      name: '[P15Test] Operating Systems & Concurrency',
      description: 'Processes, threads, synchronization primitives, and virtual memory.',
      category: category._id
    });

    playlist = await Playlist.create({
      title: '[P15Test] OS Kernel Internals Track',
      description: 'Deep dive into virtual memory, scheduling, and file systems.',
      skill: skill._id,
      order: 1,
      isActive: true
    });

    video1 = await Video.create({
      title: '[P15Test] Lesson 1: Virtual Memory and Paging',
      description: 'Page tables, TLB hits and misses, and page fault handling.',
      youtubeVideoId: 'p15_yt_01',
      durationSeconds: 1000,
      skill: skill._id,
      playlist: playlist._id,
      order: 1,
      isActive: true
    });

    video2 = await Video.create({
      title: '[P15Test] Lesson 2: Thread Scheduling and Locks',
      description: 'Preemptive vs cooperative multitasking, mutexes, and spinlocks.',
      youtubeVideoId: 'p15_yt_02',
      durationSeconds: 1000,
      skill: skill._id,
      playlist: playlist._id,
      order: 2,
      isActive: true
    });

    video3 = await Video.create({
      title: '[P15Test] Lesson 3: File System Inodes and Extents',
      description: 'Directory entries, inode tables, and crash consistency with journaling.',
      youtubeVideoId: 'p15_yt_03',
      durationSeconds: 1000,
      skill: skill._id,
      playlist: playlist._id,
      order: 3,
      isActive: true
    });

    // Seed a 5-MCQ Quiz for video1
    testQuiz = await Quiz.create({
      video: video1._id,
      contentFingerprint: 'fp_p15_vm',
      promptVersion: 'v1',
      model: 'gemini-3.1-flash-lite',
      generatedBy: learner1._id,
      source: 'title_description',
      questions: [
        {
          questionText: 'What hardware component caches virtual-to-physical address translations?',
          options: ['TLB', 'L1 Data Cache', 'ALU', 'Branch Predictor'],
          correctOptionIndex: 0,
          explanation: 'The Translation Lookaside Buffer (TLB) caches recent page translations.'
        },
        {
          questionText: 'Which page replacement policy approximates LRU using a reference bit?',
          options: ['FIFO', 'Clock (Second Chance)', 'Random', 'Optimal'],
          correctOptionIndex: 1,
          explanation: 'The Clock algorithm uses a use-bit to approximate least-recently-used.'
        },
        {
          questionText: 'What happens when a referenced virtual page is not present in RAM?',
          options: ['Kernel panic', 'Page fault interrupt', 'Segment violation', 'Bus lock'],
          correctOptionIndex: 1,
          explanation: 'A page fault interrupt invokes the OS page fault handler to fetch the frame.'
        },
        {
          questionText: 'Multi-level page tables primarily save memory by doing what?',
          options: ['Compressing pages', 'Allocating page tables only for populated address spaces', 'Disabling swap', 'Sharing TLB entries'],
          correctOptionIndex: 1,
          explanation: 'Multi-level page tables omit sub-tables for unused ranges of the address space.'
        },
        {
          questionText: 'What is thrashing in virtual memory systems?',
          options: ['Rapid CPU switching', 'Spending excessive time swapping pages rather than executing', 'Cache line invalidation', 'Disk defragmentation'],
          correctOptionIndex: 1,
          explanation: 'Thrashing occurs when active working sets exceed physical memory capacity.'
        }
      ]
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

    const testVideoIds = [video1?._id, video2?._id, video3?._id].filter(Boolean);
    const testUsers = [learner1?._id, learner2?._id].filter(Boolean);

    await VideoProgress.deleteMany({ user: { $in: testUsers } });
    await Quiz.deleteMany({ video: { $in: testVideoIds } });
    await Video.deleteMany({ _id: { $in: testVideoIds } });
    if (playlist?._id) await Playlist.deleteOne({ _id: playlist._id });
    if (skill?._id) await Skill.deleteOne({ _id: skill._id });
    if (category?._id) await Category.deleteOne({ _id: category._id });
    await User.deleteMany({ _id: { $in: testUsers } });

    await disconnectDatabase();
  });

  // =========================================================================
  // 1. Profile Management Endpoints
  // =========================================================================
  describe('Profile Management (PATCH /api/auth/profile & POST /api/auth/change-password)', () => {
    it('should reject unauthenticated profile update with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker Name' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should validate name length on profile update (min 2, max 50 chars)', async () => {
      // Too short (<2)
      const resShort = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ name: ' ' })
      });
      assert.strictEqual(resShort.status, 400);

      // Too long (>50)
      const resLong = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ name: 'A'.repeat(51) })
      });
      assert.strictEqual(resLong.status, 400);
    });

    it('should update name successfully and strictly prevent role escalation', async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          role: 'admin' // Attempted role escalation must be ignored
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.user.name, 'Ada Lovelace');
      assert.strictEqual(data.data.user.role, 'learner'); // Must remain learner

      // Verify in database directly
      const refreshed = await User.findById(learner1._id);
      assert.strictEqual(refreshed.name, 'Ada Lovelace');
      assert.strictEqual(refreshed.role, 'learner');
    });

    it('should reject unauthenticated password change with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'InitialPass123!', newPassword: 'NewPassword123!' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should validate password length on password change (min 6 chars)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ currentPassword: 'InitialPass123!', newPassword: '123' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /at least 6 characters/i);
    });

    it('should reject password change when current password is wrong', async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /current password is incorrect/i);
    });

    it('should change password successfully when current password is verified', async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ currentPassword: 'InitialPass123!', newPassword: 'BrandNewSecurePass123!' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.match(data.message, /password changed successfully/i);

      // Verify login works with new password and fails with old password
      const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: learner1.email, password: 'InitialPass123!' })
      });
      assert.strictEqual(oldLogin.status, 401);

      const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: learner1.email, password: 'BrandNewSecurePass123!' })
      });
      assert.strictEqual(newLogin.status, 200);
    });
  });

  // =========================================================================
  // 2. Dashboard Overview & Quiz Statistics
  // =========================================================================
  describe('Learner Dashboard (GET /api/dashboard)', () => {
    it('should reject unauthenticated access with 401', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      assert.strictEqual(res.status, 401);
    });

    it('should return clean empty state for a learner with no activity', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.continueLearning, null);
      assert.strictEqual(data.data.recent.length, 0);
      assert.strictEqual(data.data.completed.length, 0);
      assert.strictEqual(data.data.totalCompleted, 0);
      assert.strictEqual(data.data.playlists.length, 0);
      assert.strictEqual(data.data.quizStats.totalAttempted, 0);
      assert.strictEqual(data.data.quizStats.scores.length, 0);
    });

    it('should aggregate continue learning, recent progress, completed videos, and playlist milestones', async () => {
      // 1. Seed video1 as completed (950s out of 1000s = 95% -> isCompleted: true)
      await VideoProgress.create({
        user: learner1._id,
        video: video1._id,
        lastPositionSeconds: 950,
        durationSeconds: 1000,
        isCompleted: true,
        updatedAt: new Date(Date.now() - 60000)
      });

      // 2. Seed video2 in progress (300s out of 1000s = 30% -> isCompleted: false)
      await VideoProgress.create({
        user: learner1._id,
        video: video2._id,
        lastPositionSeconds: 300,
        durationSeconds: 1000,
        isCompleted: false,
        updatedAt: new Date()
      });

      const res = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify continueLearning points to the active unfinished video (video2)
      assert.ok(data.data.continueLearning);
      assert.strictEqual(data.data.continueLearning.video.title, '[P15Test] Lesson 2: Thread Scheduling and Locks');
      assert.strictEqual(data.data.continueLearning.lastPositionSeconds, 300);
      assert.strictEqual(data.data.continueLearning.progressPercentage, 30);

      // Verify recent items
      assert.strictEqual(data.data.recent.length, 2);
      assert.strictEqual(data.data.recent[0].video.title, '[P15Test] Lesson 2: Thread Scheduling and Locks');
      assert.strictEqual(data.data.recent[1].video.title, '[P15Test] Lesson 1: Virtual Memory and Paging');

      // Verify completed items
      assert.strictEqual(data.data.totalCompleted, 1);
      assert.strictEqual(data.data.completed.length, 1);
      assert.strictEqual(data.data.completed[0].video.title, '[P15Test] Lesson 1: Virtual Memory and Paging');
      assert.strictEqual(data.data.completed[0].isCompleted, true);

      // Verify playlist progress (1 out of 3 constituent lessons completed = 33%)
      assert.strictEqual(data.data.playlists.length, 1);
      assert.strictEqual(data.data.playlists[0].title, '[P15Test] OS Kernel Internals Track');
      assert.strictEqual(data.data.playlists[0].totalVideos, 3);
      assert.strictEqual(data.data.playlists[0].completedVideos, 1);
      assert.strictEqual(data.data.playlists[0].progressPercentage, 33);
      assert.strictEqual(data.data.playlists[0].isFinished, false);
    });

    it('should persist quiz scores upon submission and reflect them in dashboard quiz statistics', async () => {
      // Learner 1 takes quiz on video1 (answers: [0, 1, 1, 1, 1] -> 0 is correct, 1 is correct, 1 is correct, 1 is correct, 1 is correct -> 5/5)
      const submitRes = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ answers: [0, 1, 1, 1, 1] })
      });

      assert.strictEqual(submitRes.status, 200);
      const submitData = await submitRes.json();
      assert.strictEqual(submitData.success, true);
      assert.strictEqual(submitData.data.scoreDisplay, '5/5 marks');

      // Fetch dashboard again
      const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(dashRes.status, 200);
      const dashData = await dashRes.json();

      // Check quiz statistics (Strictly limited scope: totalAttempted and X/5 marks)
      assert.strictEqual(dashData.data.quizStats.totalAttempted, 1);
      assert.strictEqual(dashData.data.quizStats.scores.length, 1);
      assert.strictEqual(dashData.data.quizStats.scores[0].score, 5);
      assert.strictEqual(dashData.data.quizStats.scores[0].totalQuestions, 5);
      assert.strictEqual(dashData.data.quizStats.scores[0].scoreDisplay, '5/5 marks');
      assert.strictEqual(dashData.data.quizStats.scores[0].videoTitle, '[P15Test] Lesson 1: Virtual Memory and Paging');
    });

    it('should maintain strict learner isolation for dashboard and statistics', async () => {
      // Learner 2's dashboard must remain empty and untouched by Learner 1's activity
      const res = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.totalCompleted, 0);
      assert.strictEqual(data.data.quizStats.totalAttempted, 0);
      assert.strictEqual(data.data.recent.length, 0);
    });
  });
});
