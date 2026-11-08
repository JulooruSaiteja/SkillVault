import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User, Category, Skill, Playlist, Video } from '../src/models/index.js';

describe('Phase 4 Content Models and Schemas', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await disconnectDatabase();
  });

  describe('User Model', () => {
    it('should validate required fields for User', async () => {
      const user = new User({});
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error, 'Expected validation error for empty User');
      assert.ok(error.errors.name, 'Name should be required');
      assert.ok(error.errors.email, 'Email should be required');
      assert.ok(error.errors.password, 'Password should be required');
    });

    it('should enforce email format and role enum', async () => {
      const invalidUser = new User({
        name: 'Test Learner',
        email: 'invalid-email',
        password: 'password123',
        role: 'superadmin'
      });
      let error;
      try {
        await invalidUser.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.email, 'Email format should fail validation');
      assert.ok(error.errors.role, 'Role outside enum should fail validation');
    });

    it('should set default role to learner and isActive to true', async () => {
      const user = new User({
        name: 'Valid Learner',
        email: 'learner@example.com',
        password: 'password123'
      });
      await user.validate();
      assert.equal(user.role, 'learner');
      assert.equal(user.isActive, true);
    });

    it('should exclude password from toJSON output', () => {
      const user = new User({
        name: 'Hidden Pass',
        email: 'hidden@example.com',
        password: 'supersecretpassword'
      });
      const json = user.toJSON();
      assert.equal(json.password, undefined);
    });
  });

  describe('Category Model', () => {
    it('should require name and generate slug automatically', async () => {
      const category = new Category({
        name: 'Computer Science & Engineering',
        description: 'Core computing curriculum'
      });
      await category.validate();
      assert.equal(category.slug, 'computer-science-engineering');
      assert.equal(category.isActive, true);
      assert.equal(category.order, 0);
    });

    it('should enforce required name', async () => {
      const category = new Category({});
      let error;
      try {
        await category.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.name);
    });
  });

  describe('Skill Model', () => {
    it('should require name, slug, and parent Category', async () => {
      const skill = new Skill({});
      let error;
      try {
        await skill.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.name);
      assert.ok(error.errors.category);
    });

    it('should auto-generate slug and accept valid category reference', async () => {
      const catId = new mongoose.Types.ObjectId();
      const skill = new Skill({
        name: 'Data Structures & Algorithms',
        category: catId
      });
      await skill.validate();
      assert.equal(skill.slug, 'data-structures-algorithms');
      assert.equal(skill.category.toString(), catId.toString());
      assert.equal(skill.isActive, true);
    });
  });

  describe('Playlist Model', () => {
    it('should require title, slug, and skill reference', async () => {
      const playlist = new Playlist({});
      let error;
      try {
        await playlist.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.title);
      assert.ok(error.errors.skill);
    });

    it('should store external YouTube playlist ID separately from internal _id', async () => {
      const skillId = new mongoose.Types.ObjectId();
      const playlist = new Playlist({
        title: 'Mastering JavaScript Async',
        skill: skillId,
        externalYoutubePlaylistId: 'PLrSOXFDHBtfHJRzsgkbNP49_p7Ue6Zgqf'
      });
      await playlist.validate();
      assert.equal(playlist.slug, 'mastering-javascript-async');
      assert.equal(playlist.externalYoutubePlaylistId, 'PLrSOXFDHBtfHJRzsgkbNP49_p7Ue6Zgqf');
      assert.notEqual(playlist._id.toString(), playlist.externalYoutubePlaylistId);
    });
  });

  describe('Video Model', () => {
    it('should require title, skill, youtubeVideoId, and durationSeconds', async () => {
      const video = new Video({});
      let error;
      try {
        await video.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.title);
      assert.ok(error.errors.skill);
      assert.ok(error.errors.youtubeVideoId);
      assert.ok(error.errors.durationSeconds);
    });

    it('should reject negative durationSeconds', async () => {
      const skillId = new mongoose.Types.ObjectId();
      const video = new Video({
        title: 'Event Loop Deep Dive',
        skill: skillId,
        youtubeVideoId: '8aGhZQkoFbQ',
        durationSeconds: -10
      });
      let error;
      try {
        await video.validate();
      } catch (err) {
        error = err;
      }
      assert.ok(error.errors.durationSeconds);
    });

    it('should represent canonical duration in seconds and separate external YouTube video ID', async () => {
      const skillId = new mongoose.Types.ObjectId();
      const playlistId = new mongoose.Types.ObjectId();
      const video = new Video({
        title: 'Event Loop Deep Dive',
        skill: skillId,
        playlist: playlistId,
        order: 1,
        youtubeVideoId: '8aGhZQkoFbQ',
        durationSeconds: 1540
      });
      await video.validate();
      assert.equal(video.slug, 'event-loop-deep-dive');
      assert.equal(video.durationSeconds, 1540);
      assert.equal(video.youtubeVideoId, '8aGhZQkoFbQ');
      assert.notEqual(video._id.toString(), video.youtubeVideoId);
      assert.equal(video.playlist.toString(), playlistId.toString());
      assert.equal(video.hasTranscript, false);
      assert.equal(video.isActive, true);
    });

    it('should synchronize hasTranscript flag when transcript is present', async () => {
      const skillId = new mongoose.Types.ObjectId();
      const video = new Video({
        title: 'Closures and Lexical Scope',
        skill: skillId,
        youtubeVideoId: '12345678901',
        durationSeconds: 600,
        transcript: 'Welcome to this lesson on JavaScript closures and scope.'
      });
      await video.validate();
      assert.equal(video.hasTranscript, true);
    });
  });
});
