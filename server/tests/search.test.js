import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Category } from '../src/models/Category.js';
import { Skill } from '../src/models/Skill.js';
import { Playlist } from '../src/models/Playlist.js';
import { Video } from '../src/models/Video.js';

describe('Phase 7 Search Endpoints and Catalog Discovery', () => {
  let server;
  let baseUrl;

  let testCategory;
  let inactiveCategory;

  let activeSkill;
  let inactiveSkill;
  let activePlaylist;
  let inactivePlaylist;
  let activeVideo;
  let inactiveVideo;

  before(async () => {
    await connectDatabase();

    // Clean existing test artifacts
    await Video.deleteMany({ title: /\[SearchTest\]/ });
    await Playlist.deleteMany({ title: /\[SearchTest\]/ });
    await Skill.deleteMany({ name: /\[SearchTest\]/ });
    await Category.deleteMany({ name: /\[SearchTest\]/ });

    // Seed test categories
    testCategory = await Category.create({
      name: '[SearchTest] Computer Engineering',
      description: 'Computing hardware and software architectures',
      order: 1,
      isActive: true
    });

    inactiveCategory = await Category.create({
      name: '[SearchTest] Retired Systems',
      description: 'Inactive computing domain',
      order: 99,
      isActive: false
    });

    // Seed test skills
    activeSkill = await Skill.create({
      name: '[SearchTest] React Development',
      description: 'Modern component-driven web user interfaces with React and Redux',
      category: testCategory._id,
      icon: '⚛️',
      order: 1,
      isActive: true
    });

    inactiveSkill = await Skill.create({
      name: '[SearchTest] React Inactive Legacy',
      description: 'Deprecated React class components tutorial',
      category: testCategory._id,
      order: 2,
      isActive: false
    });

    // Seed playlists
    activePlaylist = await Playlist.create({
      title: '[SearchTest] Master React Full Course',
      description: 'From React hooks to fullstack architectures',
      skill: activeSkill._id,
      externalYoutubePlaylistId: 'PL_SEARCH_1',
      order: 1,
      isActive: true
    });

    inactivePlaylist = await Playlist.create({
      title: '[SearchTest] React Deprecated Playlist',
      description: 'Inactive playlist about React',
      skill: activeSkill._id,
      externalYoutubePlaylistId: 'PL_SEARCH_INACTIVE',
      order: 2,
      isActive: false
    });

    // Seed videos
    activeVideo = await Video.create({
      title: '[SearchTest] React Hooks Deep Dive',
      description: 'Explore useState, useEffect, and custom hooks in modern React',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_react_hooks_123',
      durationSeconds: 1200,
      transcript: 'Welcome to this React hooks deep dive lesson.',
      order: 1,
      isActive: true
    });

    inactiveVideo = await Video.create({
      title: '[SearchTest] React Inactive Video Lesson',
      description: 'Deactivated video lesson about React',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_react_inactive_456',
      durationSeconds: 600,
      order: 2,
      isActive: false
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    await Video.deleteMany({ title: /\[SearchTest\]/ });
    await Playlist.deleteMany({ title: /\[SearchTest\]/ });
    await Skill.deleteMany({ name: /\[SearchTest\]/ });
    await Category.deleteMany({ name: /\[SearchTest\]/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  describe('Validation and Query Bounds', () => {
    it('should reject missing search query with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/search`);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /parameter 'q' is required/i);
    });

    it('should reject query shorter than 2 characters with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/search?q=a`);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /at least 2 characters/i);
    });

    it('should reject query exceeding 100 characters with 400 Bad Request', async () => {
      const longQuery = 'x'.repeat(101);
      const res = await fetch(`${baseUrl}/search?q=${longQuery}`);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /cannot exceed 100 characters/i);
    });

    it('should reject invalid type filter with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/search?q=react&type=invalid_type`);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /invalid type filter/i);
    });
  });

  describe('Search Functionality and Typed Results', () => {
    it('should search across skills, playlists, and videos with type=all', async () => {
      const res = await fetch(`${baseUrl}/search?q=React`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.query, 'React');
      assert.ok(json.data.totalResults >= 3);
      assert.ok(json.data.results.skills.length >= 1);
      assert.ok(json.data.results.playlists.length >= 1);
      assert.ok(json.data.results.videos.length >= 1);

      // Verify skill item structure
      const skillItem = json.data.results.skills.find((s) => s.id === activeSkill._id.toString());
      assert.ok(skillItem);
      assert.equal(skillItem.type, 'skill');
      assert.equal(skillItem.name, '[SearchTest] React Development');
      assert.equal(skillItem.url, `/skills/${activeSkill.slug}`);
      assert.ok(skillItem.category);
      assert.equal(skillItem.category.name, '[SearchTest] Computer Engineering');

      // Verify playlist item structure
      const playlistItem = json.data.results.playlists.find((p) => p.id === activePlaylist._id.toString());
      assert.ok(playlistItem);
      assert.equal(playlistItem.type, 'playlist');
      assert.equal(playlistItem.title, '[SearchTest] Master React Full Course');
      assert.equal(playlistItem.url, `/playlists/${activePlaylist._id}`);
      assert.ok(playlistItem.skill);
      assert.equal(playlistItem.skill.name, '[SearchTest] React Development');

      // Verify video item structure
      const videoItem = json.data.results.videos.find((v) => v.id === activeVideo._id.toString());
      assert.ok(videoItem);
      assert.equal(videoItem.type, 'video');
      assert.equal(videoItem.title, '[SearchTest] React Hooks Deep Dive');
      assert.equal(videoItem.durationSeconds, 1200);
      assert.equal(videoItem.hasTranscript, true);
      assert.equal(videoItem.url, `/videos/${activeVideo._id}`);
      assert.ok(videoItem.skill);
    });

    it('should filter results by type=skills', async () => {
      const res = await fetch(`${baseUrl}/search?q=React&type=skills`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.results.skills.length >= 1);
      assert.equal(json.data.results.playlists.length, 0);
      assert.equal(json.data.results.videos.length, 0);
    });

    it('should filter results by type=playlists', async () => {
      const res = await fetch(`${baseUrl}/search?q=React&type=playlists`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.results.skills.length, 0);
      assert.ok(json.data.results.playlists.length >= 1);
      assert.equal(json.data.results.videos.length, 0);
    });

    it('should filter results by type=videos', async () => {
      const res = await fetch(`${baseUrl}/search?q=React&type=videos`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.results.skills.length, 0);
      assert.equal(json.data.results.playlists.length, 0);
      assert.ok(json.data.results.videos.length >= 1);
    });

    it('should exclude soft-deactivated content', async () => {
      const res = await fetch(`${baseUrl}/search?q=Inactive`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);

      // Verify none of the inactive test documents appear in results
      const foundInactiveSkill = json.data.results.skills.find((s) => s.id === inactiveSkill._id.toString());
      const foundInactivePlaylist = json.data.results.playlists.find((p) => p.id === inactivePlaylist._id.toString());
      const foundInactiveVideo = json.data.results.videos.find((v) => v.id === inactiveVideo._id.toString());

      assert.equal(foundInactiveSkill, undefined, 'Inactive skill must not be included');
      assert.equal(foundInactivePlaylist, undefined, 'Inactive playlist must not be included');
      assert.equal(foundInactiveVideo, undefined, 'Inactive video must not be included');
    });

    it('should respect the limit parameter', async () => {
      const res = await fetch(`${baseUrl}/search?q=React&limit=1`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.results.skills.length <= 1);
      assert.ok(json.data.results.playlists.length <= 1);
      assert.ok(json.data.results.videos.length <= 1);
    });

    it('should return empty results gracefully for non-matching queries', async () => {
      const res = await fetch(`${baseUrl}/search?q=nonexistentcomputingterm9999`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.totalResults, 0);
      assert.equal(json.data.results.skills.length, 0);
      assert.equal(json.data.results.playlists.length, 0);
      assert.equal(json.data.results.videos.length, 0);
    });

    it('should handle special regex characters safely without crashing', async () => {
      const res = await fetch(`${baseUrl}/search?q=[SearchTest]+(React)*?`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      // Valid response without 500 error or regex crash
      assert.ok(Array.isArray(json.data.results.skills));
    });
  });
});
