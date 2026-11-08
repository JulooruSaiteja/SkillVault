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

describe('Phase 8 Playlist Endpoints and Dynamic Progress Calculation', () => {
  let server;
  let baseUrl;

  let testUser;
  let userToken;

  let activeCategory;
  let activeSkill;
  let inactiveSkill;

  let activePlaylist;
  let emptyPlaylist;
  let inactivePlaylist;

  let video1;
  let video2;

  before(async () => {
    await connectDatabase();

    // Clean test artifacts
    const oldPlaylistUsers = await User.find({ email: 'playlist_tester@skillvault.local' }).select('_id');
    await VideoProgress.deleteMany({ user: { $in: oldPlaylistUsers.map((u) => u._id) } });
    await Video.deleteMany({ title: /\[PlaylistTest\]/ });
    await Playlist.deleteMany({ title: /\[PlaylistTest\]/ });
    await Skill.deleteMany({ name: /\[PlaylistTest\]/ });
    await Category.deleteMany({ name: /\[PlaylistTest\]/ });
    await User.deleteMany({ email: 'playlist_tester@skillvault.local' });

    // Create test user
    const passwordHash = await hashPassword('Password123!');
    testUser = await User.create({
      name: 'Playlist Tester',
      email: 'playlist_tester@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    userToken = signToken({ id: testUser._id, email: testUser.email, role: testUser.role });

    // Create category and skills
    activeCategory = await Category.create({
      name: '[PlaylistTest] Backend Systems',
      description: 'Distributed servers and relational databases',
      order: 1,
      isActive: true
    });

    activeSkill = await Skill.create({
      name: '[PlaylistTest] Relational Databases',
      description: 'PostgreSQL, MySQL, query execution, and transactions',
      category: activeCategory._id,
      order: 1,
      isActive: true
    });

    inactiveSkill = await Skill.create({
      name: '[PlaylistTest] Deactivated Database Skill',
      description: 'Legacy DB skill',
      category: activeCategory._id,
      order: 99,
      isActive: false
    });

    // Create playlists
    activePlaylist = await Playlist.create({
      title: '[PlaylistTest] Advanced SQL Mastery',
      description: 'From schema normalization to indexing and transactions',
      skill: activeSkill._id,
      externalYoutubePlaylistId: 'PL_PLAYLIST_TEST_1',
      order: 1,
      isActive: true
    });

    emptyPlaylist = await Playlist.create({
      title: '[PlaylistTest] Empty Database Series',
      description: 'A playlist with no active videos attached',
      skill: activeSkill._id,
      order: 2,
      isActive: true
    });

    inactivePlaylist = await Playlist.create({
      title: '[PlaylistTest] Inactive SQL Playlist',
      description: 'Soft-deactivated playlist',
      skill: activeSkill._id,
      order: 99,
      isActive: false
    });

    // Create constituent videos for activePlaylist
    video1 = await Video.create({
      title: '[PlaylistTest] Lesson 1: Schema Normalization & Boyce-Codd Form',
      description: 'First, second, and third normal forms.',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_pl_norm_101',
      durationSeconds: 1000,
      order: 1,
      isActive: true
    });

    video2 = await Video.create({
      title: '[PlaylistTest] Lesson 2: B-Tree Indexing and Query Optimization',
      description: 'Clustered and non-clustered indexes.',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_pl_index_102',
      durationSeconds: 2000,
      order: 2,
      isActive: true
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    await VideoProgress.deleteMany({});
    await Video.deleteMany({ title: /\[PlaylistTest\]/ });
    await Playlist.deleteMany({ title: /\[PlaylistTest\]/ });
    await Skill.deleteMany({ name: /\[PlaylistTest\]/ });
    await Category.deleteMany({ name: /\[PlaylistTest\]/ });
    await User.deleteMany({ email: 'playlist_tester@skillvault.local' });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  describe('GET /api/playlists', () => {
    it('should list active playlists and exclude deactivated ones', async () => {
      const res = await fetch(`${baseUrl}/playlists`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.playlists));

      const foundActive = json.data.playlists.find((p) => p._id === activePlaylist._id.toString());
      const foundInactive = json.data.playlists.find((p) => p._id === inactivePlaylist._id.toString());

      assert.ok(foundActive, 'Active playlist should be present');
      assert.equal(foundInactive, undefined, 'Inactive playlist must be excluded');
      assert.equal(foundActive.videosCount, 2);
      assert.equal(foundActive.totalDurationSeconds, 3000);
    });

    it('should filter playlists by skill parameter', async () => {
      const res = await fetch(`${baseUrl}/playlists?skill=${activeSkill.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      const matches = json.data.playlists.filter((p) => p.skill.slug === activeSkill.slug);
      assert.ok(matches.length >= 2);
    });
  });

  describe('GET /api/playlists/:identifier', () => {
    it('should return playlist details with ordered videos by _id', async () => {
      const res = await fetch(`${baseUrl}/playlists/${activePlaylist._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.playlist.title, '[PlaylistTest] Advanced SQL Mastery');
      assert.equal(json.data.videos.length, 2);

      // Verify curriculum ordering
      assert.equal(json.data.videos[0].title, video1.title);
      assert.equal(json.data.videos[1].title, video2.title);
    });

    it('should return playlist details by slug', async () => {
      const res = await fetch(`${baseUrl}/playlists/${activePlaylist.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.playlist._id, activePlaylist._id.toString());
    });

    it('should return 404 for non-existent playlist identifier', async () => {
      const res = await fetch(`${baseUrl}/playlists/non-existent-playlist-slug-9999`);
      assert.equal(res.status, 404);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /not found/i);
    });

    it('should return 404 for soft-deactivated playlist', async () => {
      const res = await fetch(`${baseUrl}/playlists/${inactivePlaylist._id}`);
      assert.equal(res.status, 404);
    });

    it('should handle empty playlists cleanly without division by zero errors', async () => {
      const res = await fetch(`${baseUrl}/playlists/${emptyPlaylist._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.videos.length, 0);
      assert.equal(json.data.stats.totalVideos, 0);
      assert.equal(json.data.stats.completedVideos, 0);
      assert.equal(json.data.stats.progressPercentage, 0);
      assert.equal(json.data.stats.totalDurationSeconds, 0);
    });
  });

  describe('Dynamic Progress Calculation', () => {
    it('should return 0% progress for unauthenticated visitor', async () => {
      const res = await fetch(`${baseUrl}/playlists/${activePlaylist._id}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.data.stats.completedVideos, 0);
      assert.equal(json.data.stats.progressPercentage, 0);
      assert.equal(json.data.videos[0].isCompleted, false);
      assert.equal(json.data.videos[1].isCompleted, false);
    });

    it('should calculate dynamic progress percentage for authenticated user with partial completion', async () => {
      // Mark video 1 as completed for testUser
      await VideoProgress.create({
        user: testUser._id,
        video: video1._id,
        lastPositionSeconds: 950,
        durationSeconds: 1000,
        isCompleted: true
      });

      const res = await fetch(`${baseUrl}/playlists/${activePlaylist._id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.data.stats.totalVideos, 2);
      assert.equal(json.data.stats.completedVideos, 1);
      assert.equal(json.data.stats.progressPercentage, 50); // 1 out of 2 = 50%
      assert.equal(json.data.stats.isCompleted, false);

      const v1 = json.data.videos.find((v) => v._id === video1._id.toString());
      const v2 = json.data.videos.find((v) => v._id === video2._id.toString());
      assert.equal(v1.isCompleted, true);
      assert.equal(v2.isCompleted, false);
    });

    it('should reflect 100% completion when all videos are completed', async () => {
      // Mark video 2 as completed as well
      await VideoProgress.create({
        user: testUser._id,
        video: video2._id,
        lastPositionSeconds: 1950,
        durationSeconds: 2000,
        isCompleted: true
      });

      const res = await fetch(`${baseUrl}/playlists/${activePlaylist._id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.data.stats.totalVideos, 2);
      assert.equal(json.data.stats.completedVideos, 2);
      assert.equal(json.data.stats.progressPercentage, 100);
      assert.equal(json.data.stats.isCompleted, true);
    });
  });
});
