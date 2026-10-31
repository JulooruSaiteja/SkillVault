import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Category } from '../src/models/Category.js';
import { Skill } from '../src/models/Skill.js';
import { Video } from '../src/models/Video.js';
import { User } from '../src/models/User.js';
import { Quiz, sanitizeQuizForLearner } from '../src/models/Quiz.js';
import { AiGlobalUsage } from '../src/models/AiGlobalUsage.js';
import { AiUserUsage } from '../src/models/AiUserUsage.js';
import { AI_FEATURES } from '../src/config/aiConfig.js';
import { signToken, hashPassword } from '../src/utils/token.js';
import { getUtcDayString } from '../src/utils/utcDate.js';
import { setGeminiClient, resetGeminiClient } from '../src/services/ai/geminiClient.js';
import {
  parseQuizResponse,
  buildQuizPrompt,
  createContentFingerprint
} from '../src/services/ai/quizService.js';
import { MockGeminiClient } from './helpers/mockGemini.js';

describe('Phase 13 AI Quiz Generation Endpoints and Evaluation Tests', () => {
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

  const sampleQuizData = {
    questions: [
      {
        questionText: 'Which data structure organizes data into strict rows and columns enforced by constraints?',
        options: ['Relational Table', 'Key-Value Map', 'Graph Node', 'Unordered Set'],
        correctOptionIndex: 0,
        explanation: 'Relational tables organize data into structured rows and columns governed by primary and foreign keys.'
      },
      {
        questionText: 'What is the primary function of a B-Tree index in relational storage?',
        options: ['Encrypting table data', 'Minimizing disk page lookups for search queries', 'Compressing video streams', 'Managing network sockets'],
        correctOptionIndex: 1,
        explanation: 'B-Tree indexes maintain a balanced search tree that drastically minimizes the disk page reads required to locate tuples.'
      },
      {
        questionText: 'What log structure guarantees durability in the Write-Ahead Logging (WAL) protocol?',
        options: ['Sequential append-only WAL log', 'Random-access memory buffer', 'Temporary swap file', 'Compressed gzip archive'],
        correctOptionIndex: 0,
        explanation: 'WAL writes changes sequentially to an append-only log before flushing dirty table pages to disk, ensuring recovery.'
      },
      {
        questionText: 'How does Multi-Version Concurrency Control (MVCC) prevent readers from blocking writers?',
        options: ['Exclusive table locking', 'Maintaining multiple tuple versions concurrently', 'Disabling transaction isolation', 'Enforcing serial one-by-one execution'],
        correctOptionIndex: 1,
        explanation: 'MVCC maintains historical versions of modified rows so readers view snapshots without blocking active writer transactions.'
      },
      {
        questionText: 'Which query access path reads table blocks directly from disk from start to finish?',
        options: ['Sequential scan', 'Index scan', 'Bitmap index scan', 'Tid scan'],
        correctOptionIndex: 0,
        explanation: 'A sequential scan reads all heap pages sequentially from start to end without consulting secondary indexes.'
      }
    ]
  };

  const sampleQuizJson = JSON.stringify(sampleQuizData);

  before(async () => {
    await connectDatabase();

    // Clean test artifacts
    const oldUsers = await User.find({ email: /quiztest_.*@skillvault\.local/ }).select('_id');
    const oldUserIds = oldUsers.map((u) => u._id);
    await Quiz.deleteMany({ generatedBy: { $in: oldUserIds } });
    await Video.deleteMany({ title: /\[QuizTest\]/ });
    await Skill.deleteMany({ name: /\[QuizTest\]/ });
    await Category.deleteMany({ name: /\[QuizTest\]/ });
    await User.deleteMany({ email: /quiztest_.*@skillvault\.local/ });
    await AiUserUsage.deleteMany({ user: { $in: oldUserIds } });

    // Seed test users
    const passwordHash = await hashPassword('Password123!');
    learner1 = await User.create({
      name: 'Quiz Learner One',
      email: 'quiztest_1@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token1 = signToken({ id: learner1._id, email: learner1.email, role: learner1.role });

    learner2 = await User.create({
      name: 'Quiz Learner Two',
      email: 'quiztest_2@skillvault.local',
      password: passwordHash,
      role: 'learner',
      isActive: true
    });
    token2 = signToken({ id: learner2._id, email: learner2.email, role: learner2.role });

    // Seed catalog fixtures
    category = await Category.create({
      name: '[QuizTest] Systems & Storage Architecture',
      description: 'Distributed storage, caching, and database query processing.'
    });

    skill = await Skill.create({
      name: '[QuizTest] Database Storage Engines',
      description: 'Internal mechanics of pages, tuples, indexes, and write buffers.',
      category: category._id
    });

    video1 = await Video.create({
      title: '[QuizTest] Lesson 1: Page Formats and Tuple Layout',
      description: 'Understanding disk pages, slotted page architecture, tuple headers, and WAL log structures.',
      youtubeVideoId: 'quiz_test_yt_01',
      durationSeconds: 1200,
      skill: skill._id,
      isActive: true
    });

    video2 = await Video.create({
      title: '[QuizTest] Lesson 2: B-Tree Index Mechanics',
      description: 'Balanced trees, root pages, intermediate nodes, leaf node pointers, and index range scans.',
      youtubeVideoId: 'quiz_test_yt_02',
      durationSeconds: 950,
      skill: skill._id,
      isActive: true
    });

    video3 = await Video.create({
      title: '[QuizTest] Lesson 3: Query Execution Pipelines',
      description: 'Volcano iterator model, hash joins, nested loop joins, and sort merge join tradeoffs.',
      youtubeVideoId: 'quiz_test_yt_03',
      durationSeconds: 1400,
      skill: skill._id,
      isActive: true
    });

    inactiveVideo = await Video.create({
      title: '[QuizTest] Obsolete Topic: Tape Drive Storage',
      description: 'Deprecated archive storage mechanisms.',
      youtubeVideoId: 'quiz_test_yt_inactive',
      durationSeconds: 500,
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
    await Quiz.deleteMany({ video: { $in: testVideoIds } });
    await Video.deleteMany({ _id: { $in: testVideoIds } });
    if (skill?._id) await Skill.deleteOne({ _id: skill._id });
    if (category?._id) await Category.deleteOne({ _id: category._id });
    if (learner1?._id || learner2?._id) {
      await User.deleteMany({ _id: { $in: [learner1._id, learner2._id] } });
    }
    const today = getUtcDayString();
    await AiGlobalUsage.deleteMany({ feature: AI_FEATURES.QUIZ, utcDay: today });

    await disconnectDatabase();
  });

  beforeEach(async () => {
    resetGeminiClient();
    setGeminiClient(new MockGeminiClient({ defaultResponse: { text: sampleQuizJson } }));
  });

  describe('Model Schema and Quiz Sanitization Unit Checks', () => {
    it('should sanitize quiz questions for learners, withholding answer keys and explanations', () => {
      const sanitized = sanitizeQuizForLearner(sampleQuizData);

      assert.strictEqual(sanitized.totalQuestions, 5);
      assert.strictEqual(sanitized.questions.length, 5);

      sanitized.questions.forEach((q, idx) => {
        assert.strictEqual(q.questionIndex, idx);
        assert.ok(q.questionText);
        assert.strictEqual(q.options.length, 4);
        // Security check: correctOptionIndex and explanation must be completely omitted
        assert.strictEqual(q.correctOptionIndex, undefined);
        assert.strictEqual(q.explanation, undefined);
      });
    });

    it('should reject malformed quiz responses with invalid question counts or option lengths', () => {
      // Missing questions
      assert.throws(() => parseQuizResponse('{}'), /missing "questions" array/);

      // Only 3 questions instead of 5
      assert.throws(
        () => parseQuizResponse(JSON.stringify({ questions: [sampleQuizData.questions[0]] })),
        /must contain exactly 5 questions/
      );

      // Question with 3 options instead of 4
      const invalidOptionsQuiz = {
        questions: sampleQuizData.questions.map((q, idx) =>
          idx === 0 ? { ...q, options: ['A', 'B', 'C'] } : q
        )
      };
      assert.throws(() => parseQuizResponse(JSON.stringify(invalidOptionsQuiz)), /must have exactly 4 options/);

      // Question with invalid correctOptionIndex
      const invalidIndexQuiz = {
        questions: sampleQuizData.questions.map((q, idx) =>
          idx === 0 ? { ...q, correctOptionIndex: 5 } : q
        )
      };
      assert.throws(() => parseQuizResponse(JSON.stringify(invalidIndexQuiz)), /invalid correctOptionIndex/);
    });

    it('should correctly parse valid markdown-wrapped JSON quiz responses', () => {
      const wrapped = '```json\n' + sampleQuizJson + '\n```';
      const parsed = parseQuizResponse(wrapped);
      assert.strictEqual(parsed.questions.length, 5);
      assert.strictEqual(parsed.questions[0].options.length, 4);
      assert.strictEqual(parsed.questions[0].correctOptionIndex, 0);
      assert.ok(parsed.questions[0].explanation);
    });
  });

  describe('GET /api/videos/:identifier/quiz', () => {
    it('should return 404 for a non-existent video identifier', async () => {
      const res = await fetch(`${baseUrl}/api/videos/non-existent-video-id/quiz`);
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    it('should return 404 for a soft-deactivated video lesson', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${inactiveVideo._id}/quiz`);
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    it('should return quiz=null and canGenerate=false when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.quiz, null);
      assert.strictEqual(data.data.canGenerate, false);
      assert.strictEqual(data.data.userQuota, null);
      assert.ok(data.data.globalQuota);
    });

    it('should return canGenerate=true for authenticated learner when quiz is not yet created', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.quiz, null);
      assert.strictEqual(data.data.canGenerate, true);
      assert.strictEqual(data.data.userQuota.allowed, true);
      assert.strictEqual(data.data.userQuota.used, 0);
      assert.strictEqual(data.data.userQuota.limit, 2);
    });
  });

  describe('POST /api/videos/:identifier/quiz (Generation & Caching)', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`, {
        method: 'POST'
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    it('should generate a 5-MCQ quiz via Gemini 3.1 Flash Lite and return sanitized questions', async () => {
      const mockGemini = new MockGeminiClient({
        defaultResponse: { text: sampleQuizJson }
      });
      setGeminiClient(mockGemini);

      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.cached, false);
      assert.ok(data.data.quiz);

      // Verify sanitized structure
      assert.strictEqual(data.data.quiz.totalQuestions, 5);
      assert.strictEqual(data.data.quiz.questions.length, 5);
      data.data.quiz.questions.forEach((q) => {
        assert.ok(q.questionText);
        assert.strictEqual(q.options.length, 4);
        assert.strictEqual(q.correctOptionIndex, undefined);
        assert.strictEqual(q.explanation, undefined);
      });

      // Verify Gemini was called exactly once with gemini-3.1-flash-lite
      assert.strictEqual(mockGemini.callCount, 1);
      assert.strictEqual(mockGemini.calls[0].model, 'gemini-3.1-flash-lite');
    });

    it('should return cached quiz on second request without re-invoking Gemini', async () => {
      const mockGemini = new MockGeminiClient({
        defaultResponse: { text: sampleQuizJson }
      });
      setGeminiClient(mockGemini);

      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.cached, true);
      assert.strictEqual(mockGemini.callCount, 0); // No API call because cached
    });

    it('should return cached sanitized quiz on GET /api/videos/:identifier/quiz', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz`, {
        headers: { Authorization: `Bearer ${token1}` }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.quiz);
      assert.strictEqual(data.data.canGenerate, false);
      assert.strictEqual(data.data.quiz.questions[0].correctOptionIndex, undefined);
    });

    it('should enforce user daily allowance of 2 quizzes per UTC day', async () => {
      const mockGemini = new MockGeminiClient({ defaultResponse: { text: sampleQuizJson } });
      setGeminiClient(mockGemini);

      // Generate 2nd quiz for learner1 on video2
      const res2 = await fetch(`${baseUrl}/api/videos/${video2._id}/quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(res2.status, 201);

      // Attempt 3rd generation on video3 -> must be rejected with 429
      const res3 = await fetch(`${baseUrl}/api/videos/${video3._id}/quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(res3.status, 429);
      const data3 = await res3.json();
      assert.strictEqual(data3.success, false);
      assert.match(data3.message, /daily limit of 2 practice quizzes/i);
    });

    it('should strictly reject generations with 429 when global daily budget (500 RPD) is exhausted', async () => {
      const today = getUtcDayString();
      // Set global attempts to 500
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.QUIZ, utcDay: today },
        { $set: { attempts: 500 } },
        { upsert: true }
      );

      const mockGemini = new MockGeminiClient({ defaultResponse: { text: sampleQuizJson } });
      setGeminiClient(mockGemini);

      // Learner 2 attempts generation on video3
      const res = await fetch(`${baseUrl}/api/videos/${video3._id}/quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` }
      });

      assert.strictEqual(res.status, 429);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /daily global AI quota for Quiz generation has been reached/i);
      assert.strictEqual(mockGemini.callCount, 0);

      // Reset global attempts
      await AiGlobalUsage.updateOne(
        { feature: AI_FEATURES.QUIZ, utcDay: today },
        { $set: { attempts: 2 } }
      );
    });
  });

  describe('POST /api/videos/:identifier/quiz/submit (Server-Side Evaluation & Scoring)', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: [0, 1, 0, 1, 0] })
      });
      assert.strictEqual(res.status, 401);
    });

    it('should return 404 when submitting answers for a video without an existing quiz', async () => {
      const res = await fetch(`${baseUrl}/api/videos/${video3._id}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ answers: [0, 1, 0, 1, 0] })
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /no quiz exists for this lesson/i);
    });

    it('should evaluate answers, calculate perfect score (5/5 marks), and reveal explanations', async () => {
      // Correct answers based on sampleQuizData: [0, 1, 0, 1, 0]
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({ answers: [0, 1, 0, 1, 0] })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.score, 5);
      assert.strictEqual(data.data.totalQuestions, 5);
      assert.strictEqual(data.data.scoreDisplay, '5/5 marks');
      assert.strictEqual(data.data.percentage, 100);

      // Verify each result contains evaluation details and explanations
      assert.strictEqual(data.data.results.length, 5);
      data.data.results.forEach((r, idx) => {
        assert.strictEqual(r.questionIndex, idx);
        assert.strictEqual(r.isCorrect, true);
        assert.strictEqual(r.selectedOption, sampleQuizData.questions[idx].correctOptionIndex);
        assert.strictEqual(r.correctOptionIndex, sampleQuizData.questions[idx].correctOptionIndex);
        assert.ok(r.explanation);
      });
    });

    it('should calculate partial score correctly (e.g. 3/5 marks) and accurately flag incorrect answers', async () => {
      // Submitting: Q0: 0 (correct), Q1: 3 (wrong), Q2: 0 (correct), Q3: 0 (wrong), Q4: 0 (correct) -> 3/5
      const res = await fetch(`${baseUrl}/api/videos/${video1._id}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({
          answers: [
            { questionIndex: 0, selectedOption: 0 },
            { questionIndex: 1, selectedOption: 3 },
            { questionIndex: 2, selectedOption: 0 },
            { questionIndex: 3, selectedOption: 0 },
            { questionIndex: 4, selectedOption: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.score, 3);
      assert.strictEqual(data.data.scoreDisplay, '3/5 marks');
      assert.strictEqual(data.data.percentage, 60);

      // Verify Q1 was marked incorrect
      assert.strictEqual(data.data.results[1].isCorrect, false);
      assert.strictEqual(data.data.results[1].selectedOption, 3);
      assert.strictEqual(data.data.results[1].correctOptionIndex, 1);
      assert.ok(data.data.results[1].explanation);

      // Verify Q3 was marked incorrect
      assert.strictEqual(data.data.results[3].isCorrect, false);
      assert.strictEqual(data.data.results[3].selectedOption, 0);
      assert.strictEqual(data.data.results[3].correctOptionIndex, 1);
    });

    it('should support slug-based video route and /api/quizzes alias route seamlessly', async () => {
      const res = await fetch(`${baseUrl}/api/quizzes/${video1.slug}`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.quiz);
    });
  });
});
