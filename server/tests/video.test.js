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

describe('Phase 9 Video Endpoints and YouTube Player Metadata', () => {
  let server;
  let baseUrl;

  let testUser;
  let userToken;

  let activeCategory;
  let activeSkill;
  let inactiveSkill;

  let activePlaylist;
  let video1;
  let video2;
  let standaloneVideo;
  let inactiveVideo;

  before(async () => {
    await connectDatabase();

    // Clean test artifacts
    const oldVideoUsers = await User.find({ email: 'videotester@skillvault.local' }).select('_id');
    await VideoProgress.deleteMany({ user: { $in: oldVideoUsers.map((u) => u._id) } });
    await Video.deleteMany({ title: /\[VideoTest\]/ });
    await Playlist.deleteMany({ title: /\[VideoTest\]/ });
    await Skill.deleteMany({ name: /\[VideoTest\]/ });
    await Category.deleteMany({ name: /\[VideoTest\]/ });
    await User.deleteMany({ email: 'videotester@skillvault.local' });

    // Create test user
    const passwordHash = await hashPassword('Password123!');
    testUser = await User.create({
      name: 'Video Tester',
      email: 'videotester@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    userToken = signToken({ id: testUser._id, email: testUser.email, role: testUser.role });

    // Create category and skills
    activeCategory = await Category.create({
      name: '[VideoTest] Software Architecture',
      description: 'System design, microservices, and databases',
      order: 1,
      isActive: true
    });

    activeSkill = await Skill.create({
      name: '[VideoTest] System Design',
      description: 'Scalability, load balancers, caching, and database sharding',
      category: activeCategory._id,
      order: 1,
      isActive: true
    });

    inactiveSkill = await Skill.create({
      name: '[VideoTest] Deactivated Skill',
      description: 'Legacy inactive skill',
      category: activeCategory._id,
      order: 99,
      isActive: false
    });

    // Create playlist
    activePlaylist = await Playlist.create({
      title: '[VideoTest] Distributed Systems Core',
      description: 'Curriculum covering consensus, partitioning, and replication',
      skill: activeSkill._id,
      order: 1,
      isActive: true
    });

    // Create constituent videos in activePlaylist
    video1 = await Video.create({
      title: '[VideoTest] Part 1: CAP Theorem & Consistency Models',
      description: 'Understanding tradeoffs between consistency and availability',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_cap_12345',
      durationSeconds: 1500,
      transcript: 'In distributed computing, the CAP theorem states...',
      order: 1,
      isActive: true
    });

    video2 = await Video.create({
      title: '[VideoTest] Part 2: Consistent Hashing Algorithms',
      description: 'Distributing load across dynamic nodes with minimal redistribution',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_hash_67890',
      durationSeconds: 1800,
      transcript: 'Consistent hashing solves the problem of rehashing...',
      order: 2,
      isActive: true
    });

    // Create standalone video (no playlist)
    standaloneVideo = await Video.create({
      title: '[VideoTest] Standalone: High-Performance Caching Patterns',
      description: 'Redis caching strategies and cache-aside patterns',
      skill: activeSkill._id,
      playlist: null,
      youtubeVideoId: 'yt_cache_11223',
      durationSeconds: 900,
      transcript: null, // Tests metadata fallback
      order: 1,
      isActive: true
    });

    // Create inactive video
    inactiveVideo = await Video.create({
      title: '[VideoTest] Deactivated Video Lesson',
      description: 'Obsolete content',
      skill: activeSkill._id,
      youtubeVideoId: 'yt_inactive_99999',
      durationSeconds: 600,
      order: 99,
      isActive: false
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    await VideoProgress.deleteMany({});
    await Video.deleteMany({ title: /\[VideoTest\]/ });
    await Playlist.deleteMany({ title: /\[VideoTest\]/ });
    await Skill.deleteMany({ name: /\[VideoTest\]/ });
    await Category.deleteMany({ name: /\[VideoTest\]/ });
    await User.deleteMany({ email: 'videotester@skillvault.local' });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  describe('GET /api/videos', () => {
    it('should list active videos and exclude deactivated ones', async () => {
      const res = await fetch(`${baseUrl}/videos`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.videos));

      const foundV1 = json.data.videos.find((v) => v._id === video1._id.toString());
      const foundInactive = json.data.videos.find((v) => v._id === inactiveVideo._id.toString());

      assert.ok(foundV1, 'Active video should be listed');
      assert.equal(foundInactive, undefined, 'Inactive video must be excluded');
    });

    it('should filter videos by playlist parameter', async () => {
      const res = await fetch(`${baseUrl}/videos?playlist=${activePlaylist._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.videos.length, 2);
      assert.equal(json.data.videos[0].title, video1.title);
      assert.equal(json.data.videos[1].title, video2.title);
    });
  });

  describe('GET /api/videos/:identifier', () => {
    it('should return video details by MongoDB _id with separate YouTube video ID', async () => {
      const res = await fetch(`${baseUrl}/videos/${video1._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.video._id, video1._id.toString());
      assert.equal(json.data.video.youtubeVideoId, 'yt_cap_12345');
      assert.equal(json.data.video.durationSeconds, 1500);
      assert.equal(json.data.video.hasTranscript, true);
      assert.ok(json.data.video.skill);
      assert.equal(json.data.video.skill.name, activeSkill.name);
      assert.ok(json.data.video.skill.category);
    });

    it('should return video details by URL slug', async () => {
      const res = await fetch(`${baseUrl}/videos/${video1.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.video._id, video1._id.toString());
    });

    it('should provide playlist context with previous and next navigation for playlist videos', async () => {
      const res = await fetch(`${baseUrl}/videos/${video1._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.data.playlistContext);
      assert.equal(json.data.playlistContext.totalVideos, 2);
      assert.equal(json.data.playlistContext.currentIndex, 0);
      assert.equal(json.data.playlistContext.previousVideo, null);
      assert.equal(json.data.playlistContext.nextVideo._id, video2._id.toString());

      // Check second video next/previous
      const res2 = await fetch(`${baseUrl}/videos/${video2._id}`);
      const json2 = await res2.json();
      assert.equal(json2.data.playlistContext.previousVideo._id, video1._id.toString());
      assert.equal(json2.data.playlistContext.nextVideo, null);
    });

    it('should handle standalone video without playlist context cleanly', async () => {
      const res = await fetch(`${baseUrl}/videos/${standaloneVideo._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.data.video.playlist, null);
      assert.equal(json.data.playlistContext, null);
      assert.equal(json.data.video.hasTranscript, false); // Tests metadata fallback
    });

    it('should return 404 for non-existent video identifier', async () => {
      const res = await fetch(`${baseUrl}/videos/non-existent-video-id-99999`);
      assert.equal(res.status, 404);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /not found/i);
    });

    it('should return 404 for soft-deactivated video', async () => {
      const res = await fetch(`${baseUrl}/videos/${inactiveVideo._id}`);
      assert.equal(res.status, 404);
    });

    it('should attach user progress when authenticated via optionalAuth', async () => {
      // Record progress for testUser on video1
      await VideoProgress.create({
        user: testUser._id,
        video: video1._id,
        lastPositionSeconds: 750,
        durationSeconds: 1500,
        isCompleted: false
      });

      const res = await fetch(`${baseUrl}/videos/${video1._id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.data.video.userProgress);
      assert.equal(json.data.video.userProgress.lastPositionSeconds, 750);
      assert.equal(json.data.video.userProgress.isCompleted, false);
    });
  });
});
