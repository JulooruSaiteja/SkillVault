import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Category } from '../src/models/Category.js';
import { Skill } from '../src/models/Skill.js';
import { Playlist } from '../src/models/Playlist.js';
import { Video } from '../src/models/Video.js';

describe('Phase 6 Categories & Skills Browsing Endpoints', () => {
  let server;
  let baseUrl;

  let activeCategory;
  let inactiveCategory;
  let activeSkill;
  let inactiveSkill;
  let activePlaylist;
  let activeVideo;

  before(async () => {
    await connectDatabase();
    // Clean existing test data
    await Video.deleteMany({ title: /\[CatalogTest\]/ });
    await Playlist.deleteMany({ title: /\[CatalogTest\]/ });
    await Skill.deleteMany({ name: /\[CatalogTest\]/ });
    await Category.deleteMany({ name: /\[CatalogTest\]/ });

    // Seed test categories
    activeCategory = await Category.create({
      name: '[CatalogTest] Computer Science',
      description: 'Foundational computer science concepts and theory',
      order: 1,
      isActive: true
    });

    inactiveCategory = await Category.create({
      name: '[CatalogTest] Deprecated Systems',
      description: 'Legacy and deactivated category',
      order: 99,
      isActive: false
    });

    // Seed test skills
    activeSkill = await Skill.create({
      name: '[CatalogTest] Algorithms',
      description: 'Sorting, graphs, dynamic programming, and complexity',
      category: activeCategory._id,
      order: 1,
      isActive: true
    });

    inactiveSkill = await Skill.create({
      name: '[CatalogTest] Obsolete Assembly',
      description: 'Deactivated skill',
      category: activeCategory._id,
      order: 99,
      isActive: false
    });

    // Seed playlist and video for activeSkill
    activePlaylist = await Playlist.create({
      title: '[CatalogTest] Graph Algorithms in Python',
      description: 'BFS, DFS, Dijkstra, and Topological Sort',
      skill: activeSkill._id,
      externalYoutubePlaylistId: 'PL_CATALOG_TEST_1',
      order: 1,
      isActive: true
    });

    activeVideo = await Video.create({
      title: '[CatalogTest] Breadth-First Search Explained',
      skill: activeSkill._id,
      playlist: activePlaylist._id,
      youtubeVideoId: 'yt_bfs_123',
      durationSeconds: 900,
      transcript: 'In this video we explore BFS using queues.',
      order: 1,
      isActive: true
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    await Video.deleteMany({ title: /\[CatalogTest\]/ });
    await Playlist.deleteMany({ title: /\[CatalogTest\]/ });
    await Skill.deleteMany({ name: /\[CatalogTest\]/ });
    await Category.deleteMany({ name: /\[CatalogTest\]/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  describe('GET /api/categories', () => {
    it('should return active categories and exclude soft-deactivated ones', async () => {
      const res = await fetch(`${baseUrl}/categories`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.categories));

      const foundActive = json.data.categories.find((c) => c._id === activeCategory._id.toString());
      const foundInactive = json.data.categories.find((c) => c._id === inactiveCategory._id.toString());

      assert.ok(foundActive, 'Active category should be present');
      assert.equal(foundInactive, undefined, 'Inactive category must be filtered out');
    });

    it('should embed active skills when ?includeSkills=true is passed', async () => {
      const res = await fetch(`${baseUrl}/categories?includeSkills=true`);
      assert.equal(res.status, 200);

      const json = await res.json();
      const targetCategory = json.data.categories.find((c) => c._id === activeCategory._id.toString());
      assert.ok(targetCategory);
      assert.ok(Array.isArray(targetCategory.skills));

      const hasActiveSkill = targetCategory.skills.some((s) => s._id === activeSkill._id.toString());
      const hasInactiveSkill = targetCategory.skills.some((s) => s._id === inactiveSkill._id.toString());

      assert.equal(hasActiveSkill, true, 'Active skill should be embedded');
      assert.equal(hasInactiveSkill, false, 'Inactive skill should not be embedded');
      assert.equal(targetCategory.skillsCount, targetCategory.skills.length);
    });
  });

  describe('GET /api/categories/:slug', () => {
    it('should return active category details with its active skills', async () => {
      const res = await fetch(`${baseUrl}/categories/${activeCategory.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.category.slug, activeCategory.slug);
      assert.ok(Array.isArray(json.data.category.skills));
      assert.ok(json.data.category.skills.some((s) => s.slug === activeSkill.slug));
    });

    it('should return 404 for unknown category slug', async () => {
      const res = await fetch(`${baseUrl}/categories/non-existent-category`);
      assert.equal(res.status, 404);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('Category not found'));
    });

    it('should return 404 for soft-deactivated category slug', async () => {
      const res = await fetch(`${baseUrl}/categories/${inactiveCategory.slug}`);
      assert.equal(res.status, 404);
    });
  });

  describe('GET /api/skills', () => {
    it('should list active skills with populated category', async () => {
      const res = await fetch(`${baseUrl}/skills`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.skills));

      const foundActive = json.data.skills.find((s) => s._id === activeSkill._id.toString());
      const foundInactive = json.data.skills.find((s) => s._id === inactiveSkill._id.toString());

      assert.ok(foundActive, 'Active skill must be listed');
      assert.equal(foundInactive, undefined, 'Inactive skill must be filtered out');
      assert.ok(foundActive.category, 'Category should be populated');
      assert.equal(foundActive.category.slug, activeCategory.slug);
    });

    it('should filter skills by category slug query parameter', async () => {
      const res = await fetch(`${baseUrl}/skills?category=${activeCategory.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.data.skills.length >= 1);
      assert.ok(json.data.skills.every((s) => s.category.slug === activeCategory.slug));
    });
  });

  describe('GET /api/skills/:slug', () => {
    it('should return skill details with populated category, playlists, and videos', async () => {
      const res = await fetch(`${baseUrl}/skills/${activeSkill.slug}`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.skill.slug, activeSkill.slug);
      assert.equal(json.data.skill.category.slug, activeCategory.slug);

      assert.ok(Array.isArray(json.data.skill.playlists));
      assert.ok(json.data.skill.playlists.some((p) => p._id === activePlaylist._id.toString()));

      assert.ok(Array.isArray(json.data.skill.videos));
      assert.ok(json.data.skill.videos.some((v) => v._id === activeVideo._id.toString()));
    });

    it('should return 404 for unknown skill slug', async () => {
      const res = await fetch(`${baseUrl}/skills/non-existent-skill`);
      assert.equal(res.status, 404);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('Skill not found'));
    });

    it('should return 404 for deactivated skill', async () => {
      const res = await fetch(`${baseUrl}/skills/${inactiveSkill.slug}`);
      assert.equal(res.status, 404);
    });
  });
});
