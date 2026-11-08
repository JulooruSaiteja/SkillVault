import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User, Category, Skill, Playlist, Video } from '../src/models/index.js';

describe('Phase 4 Database Integration and Relationship Tests', () => {
  before(async () => {
    await connectDatabase();
    // Clean up test collections
    await User.deleteMany({ email: /@integration-test\.com$/ });
    await Video.deleteMany({ title: /\[Test\]/ });
    await Playlist.deleteMany({ title: /\[Test\]/ });
    await Skill.deleteMany({ name: /\[Test\]/ });
    await Category.deleteMany({ name: /\[Test\]/ });
  });

  after(async () => {
    // Teardown test documents
    await User.deleteMany({ email: /@integration-test\.com$/ });
    await Video.deleteMany({ title: /\[Test\]/ });
    await Playlist.deleteMany({ title: /\[Test\]/ });
    await Skill.deleteMany({ name: /\[Test\]/ });
    await Category.deleteMany({ name: /\[Test\]/ });
    await disconnectDatabase();
  });

  it('should persist User and exclude password hash from default query projections', async () => {
    const user = await User.create({
      name: 'Integration User',
      email: 'user@integration-test.com',
      password: 'hashed_password_123'
    });

    assert.ok(user._id);
    assert.equal(user.role, 'learner');
    assert.equal(user.isActive, true);

    const fetched = await User.findById(user._id);
    assert.equal(fetched.password, undefined, 'Password should not be projected by default');
  });

  it('should persist Category, Skill, Playlist, Video and support population across relationships', async () => {
    // 1. Create Category
    const category = await Category.create({
      name: '[Test] Web Development',
      description: 'Full stack web development category'
    });
    assert.equal(category.slug, 'test-web-development');

    // 2. Create Skill referencing Category
    const skill = await Skill.create({
      name: '[Test] React Fundamentals',
      description: 'Modern frontend development with React',
      category: category._id
    });
    assert.equal(skill.slug, 'test-react-fundamentals');
    assert.equal(skill.category.toString(), category._id.toString());

    // 3. Create Playlist referencing Skill
    const playlist = await Playlist.create({
      title: '[Test] React Course 2026',
      description: 'Comprehensive playlist',
      skill: skill._id,
      externalYoutubePlaylistId: 'PL_TEST_PLAYLIST_123'
    });
    assert.equal(playlist.externalYoutubePlaylistId, 'PL_TEST_PLAYLIST_123');
    assert.notEqual(playlist._id.toString(), playlist.externalYoutubePlaylistId);

    // 4. Create Video referencing Skill and Playlist
    const video = await Video.create({
      title: '[Test] React Hooks in Depth',
      skill: skill._id,
      playlist: playlist._id,
      order: 1,
      youtubeVideoId: 'yt_hooks_vid_999',
      durationSeconds: 1200,
      transcript: 'In this video we will master useEffect and useState.'
    });
    assert.ok(video._id);
    assert.equal(video.hasTranscript, true);
    assert.equal(video.durationSeconds, 1200);
    assert.equal(video.youtubeVideoId, 'yt_hooks_vid_999');

    // 5. Query and populate
    const populatedVideo = await Video.findById(video._id)
      .populate('skill', 'name slug')
      .populate('playlist', 'title slug externalYoutubePlaylistId');

    assert.equal(populatedVideo.skill.name, '[Test] React Fundamentals');
    assert.equal(populatedVideo.playlist.title, '[Test] React Course 2026');
    assert.equal(populatedVideo.playlist.externalYoutubePlaylistId, 'PL_TEST_PLAYLIST_123');
  });

  it('should enforce soft deactivation policy without deleting data', async () => {
    const category = await Category.create({
      name: '[Test] Legacy Tech',
      description: 'Deprecated technology'
    });

    assert.equal(category.isActive, true);

    // Soft-deactivate
    category.isActive = false;
    await category.save();

    // Query active only
    const activeResult = await Category.findOne({ _id: category._id, isActive: true });
    assert.equal(activeResult, null, 'Inactive category should not appear in active queries');

    // Historical record is preserved
    const archivedResult = await Category.findById(category._id);
    assert.ok(archivedResult, 'Document must be retained in database');
    assert.equal(archivedResult.isActive, false);
  });
});
