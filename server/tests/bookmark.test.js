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
import { Bookmark } from '../src/models/Bookmark.js';
import { signToken, hashPassword } from '../src/utils/token.js';

describe('Phase 11 Bookmarks Endpoints and Model Tests', () => {
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

    // Clean test artifacts scoped to BookmarkTest
    const oldUsers = await User.find({ email: /bookmark_test_.*@skillvault\.local/ }).select('_id');
    const oldUserIds = oldUsers.map((u) => u._id);
    await Bookmark.deleteMany({ user: { $in: oldUserIds } });
    await Video.deleteMany({ title: /\[BookmarkTest\]/ });
    await Playlist.deleteMany({ title: /\[BookmarkTest\]/ });
    await Skill.deleteMany({ name: /\[BookmarkTest\]/ });
    await Category.deleteMany({ name: /\[BookmarkTest\]/ });
    await User.deleteMany({ email: /bookmark_test_.*@skillvault\.local/ });

    // Seed test users
    const passwordHash = await hashPassword('Password123!');
    learner1 = await User.create({
      name: 'Bookmark Learner One',
      email: 'bookmark_test_1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token1 = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'Bookmark Learner Two',
      email: 'bookmark_test_2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token2 = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    // Seed category, skill, playlist
    category = await Category.create({
      name: '[BookmarkTest] Databases & Storage',
      description: 'Relational and NoSQL systems',
      order: 1,
      isActive: true
    });

    skill = await Skill.create({
      name: '[BookmarkTest] PostgreSQL Optimization',
      description: 'Indexing, query planning, vacuuming',
      category: category._id,
      order: 1,
      isActive: true
    });

    playlist = await Playlist.create({
      title: '[BookmarkTest] High-Performance SQL Track',
      description: 'Mastering execution plans and indexes',
      skill: skill._id,
      order: 1,
      isActive: true
    });

    video1 = await Video.create({
      title: '[BookmarkTest] Lesson 1: B-Tree Index Mechanics',
      description: 'How B-Trees operate under concurrent writes',
      skill: skill._id,
      playlist: playlist._id,
      youtubeVideoId: 'yt_btree_11111',
      durationSeconds: 900,
      order: 1,
      isActive: true
    });

    video2 = await Video.create({
      title: '[BookmarkTest] Lesson 2: Analyzing EXPLAIN ANALYZE',
      description: 'Cost estimations and buffer cache hit rates',
      skill: skill._id,
      playlist: playlist._id,
      youtubeVideoId: 'yt_explain_22222',
      durationSeconds: 1200,
      order: 2,
      isActive: true
    });

    video3 = await Video.create({
      title: '[BookmarkTest] Standalone: Vacuuming & MVCC Deep Dive',
      description: 'Transaction isolation and bloat prevention',
      skill: skill._id,
      playlist: null,
      youtubeVideoId: 'yt_mvcc_33333',
      durationSeconds: 1500,
      order: 3,
      isActive: true
    });

    inactiveVideo = await Video.create({
      title: '[BookmarkTest] Deprecated Storage Engine',
      description: 'Retired lesson content',
      skill: skill._id,
      youtubeVideoId: 'yt_retired_44444',
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
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const cleanUsers = await User.find({ email: /bookmark_test_.*@skillvault\.local/ }).select('_id');
    const cleanUserIds = cleanUsers.map((u) => u._id);
    await Bookmark.deleteMany({ user: { $in: cleanUserIds } });
    await Video.deleteMany({ title: /\[BookmarkTest\]/ });
    await Playlist.deleteMany({ title: /\[BookmarkTest\]/ });
    await Skill.deleteMany({ name: /\[BookmarkTest\]/ });
    await Category.deleteMany({ name: /\[BookmarkTest\]/ });
    await User.deleteMany({ email: /bookmark_test_.*@skillvault\.local/ });
    await disconnectDatabase();
  });

  it('1. should reject unauthenticated requests to bookmark endpoints (401)', async () => {
    const listRes = await fetch(`${baseUrl}/bookmarks`);
    assert.equal(listRes.status, 401);

    const addRes = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video1._id.toString() })
    });
    assert.equal(addRes.status, 401);

    const deleteRes = await fetch(`${baseUrl}/bookmarks/${video1._id}`, {
      method: 'DELETE'
    });
    assert.equal(deleteRes.status, 401);
  });

  it('2. should reject bookmarking non-existent or inactive video (404/400)', async () => {
    // Missing video identifier
    const noIdRes = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({})
    });
    assert.equal(noIdRes.status, 400);

    // Fake ObjectId
    const fakeRes = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: '66f1a2b3c4d5e6f7a8b9c0d9' })
    });
    assert.equal(fakeRes.status, 404);

    // Inactive video
    const inactiveRes = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: inactiveVideo._id.toString() })
    });
    assert.equal(inactiveRes.status, 404);
  });

  it('3. should bookmark active video successfully (201/200)', async () => {
    const res = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: video1._id.toString() })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.isBookmarked, true);
    assert.equal(body.data.bookmark.user.toString(), learner1._id.toString());
    assert.equal(body.data.bookmark.video.toString(), video1._id.toString());
  });

  it('4. should enforce unique compound index (user, video) with no duplicate records', async () => {
    // Attempt bookmarking video1 again
    const res = await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: video1._id.toString() })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.isBookmarked, true);

    const count = await Bookmark.countDocuments({
      user: learner1._id,
      video: video1._id
    });
    assert.equal(count, 1, 'Exactly one Bookmark record must exist per (user, video)');
  });

  it('5. should check bookmark status via GET /api/bookmarks/check/:identifier', async () => {
    // Bookmarked video
    const checkRes = await fetch(`${baseUrl}/bookmarks/check/${video1._id}`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(checkRes.status, 200);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.data.isBookmarked, true);
    assert.ok(checkBody.data.bookmarkId);

    // Unbookmarked video
    const checkRes2 = await fetch(`${baseUrl}/bookmarks/check/${video2._id}`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(checkRes2.status, 200);
    const checkBody2 = await checkRes2.json();
    assert.equal(checkBody2.data.isBookmarked, false);
    assert.equal(checkBody2.data.bookmarkId, null);
  });

  it('6. should list bookmarks ordered by newest first with populated metadata', async () => {
    // Bookmark video2 as well
    await fetch(`${baseUrl}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${token1}`
      },
      body: JSON.stringify({ videoId: video2._id.toString() })
    });

    const res = await fetch(`${baseUrl}/bookmarks`, {
      headers: { Cookie: `token=${token1}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalCount, 2);
    assert.equal(body.data.bookmarks.length, 2);

    // Newest first (video2 before video1)
    assert.equal(body.data.bookmarks[0].video._id.toString(), video2._id.toString());
    assert.equal(body.data.bookmarks[0].video.title, video2.title);
    assert.ok(body.data.bookmarks[0].video.skill);
    assert.equal(body.data.bookmarks[0].isArchived, false);

    assert.equal(body.data.bookmarks[1].video._id.toString(), video1._id.toString());
  });

  it('7. should isolate user bookmarks: learner2 cannot see learner1 bookmarks', async () => {
    const res = await fetch(`${baseUrl}/bookmarks`, {
      headers: { Cookie: `token=${token2}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.totalCount, 0);
    assert.equal(body.data.bookmarks.length, 0);

    // learner2 check on video1 is false
    const checkRes = await fetch(`${baseUrl}/bookmarks/check/${video1._id}`, {
      headers: { Cookie: `token=${token2}` }
    });
    assert.equal(checkRes.status, 200);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.data.isBookmarked, false);
  });

  it('8. should support video route aliases: POST, GET, DELETE /api/videos/:identifier/bookmark', async () => {
    // Bookmark video3 via slug
    const addRes = await fetch(`${baseUrl}/videos/${video3.slug}/bookmark`, {
      method: 'POST',
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(addRes.status, 201);
    const addBody = await addRes.json();
    assert.equal(addBody.data.isBookmarked, true);

    // Check status via video route
    const checkRes = await fetch(`${baseUrl}/videos/${video3._id}/bookmark`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(checkRes.status, 200);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.data.isBookmarked, true);

    // Remove bookmark via video route
    const deleteRes = await fetch(`${baseUrl}/videos/${video3._id}/bookmark`, {
      method: 'DELETE',
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.data.isBookmarked, false);
  });

  it('9. should reflect isBookmarked: true on GET /api/videos/:identifier when learner is authenticated', async () => {
    // video1 is bookmarked by learner1
    const res = await fetch(`${baseUrl}/videos/${video1._id}`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.video.isBookmarked, true);

    // video1 is NOT bookmarked by learner2
    const res2 = await fetch(`${baseUrl}/videos/${video1._id}`, {
      headers: { Cookie: `token=${token2}` }
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.data.video.isBookmarked, false);
  });

  it('10. should remove bookmark via DELETE /api/bookmarks/:identifier', async () => {
    const res = await fetch(`${baseUrl}/bookmarks/${video2._id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.isBookmarked, false);

    // Verify removed from list
    const listRes = await fetch(`${baseUrl}/bookmarks`, {
      headers: { Cookie: `token=${token1}` }
    });
    const listBody = await listRes.json();
    assert.equal(listBody.data.totalCount, 1);
    assert.equal(listBody.data.bookmarks[0].video._id.toString(), video1._id.toString());
  });

  it('11. should preserve soft-deactivated bookmarked video with isArchived: true', async () => {
    // Directly create a bookmark for video1, then soft-deactivate video1
    await Video.findByIdAndUpdate(video1._id, { isActive: false });

    const res = await fetch(`${baseUrl}/bookmarks`, {
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.totalCount, 1);
    assert.equal(body.data.bookmarks[0].isArchived, true);
    assert.equal(body.data.bookmarks[0].video.isActive, false);

    // Learner can still remove an archived bookmark cleanly
    const delRes = await fetch(`${baseUrl}/bookmarks/${video1._id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${token1}` }
    });
    assert.equal(delRes.status, 200);
  });
});
