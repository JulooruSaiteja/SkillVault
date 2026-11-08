# SkillVault Implementation Guide & Architecture Record

This document records the exact implementation details, architectural patterns, data contracts, and verification procedures for **SkillVault**, a curated video learning platform purpose-built for computer science and computing disciplines.

---

## 1. System Architecture Overview

```
                      +-----------------------------------+
                      |      Client (React / Vite SPA)    |
                      |  - Dark Computing Design System   |
                      |  - React Router DOM Navigation    |
                      |  - AuthContext & useAuth Hook     |
                      |  - YouTube IFrame API Integration |
                      +-----------------+-----------------+
                                        | HTTP (CORS, HttpOnly Cookie)
                                        v
                      +-----------------+-----------------+
                      |   Backend (Node.js / Express ESM) |
                      |  - Helmet & Security Headers      |
                      |  - Centralized Error Normalization|
                      |  - Token & Cookie Authentication  |
                      |  - Safe Logger (Redacts Secrets)  |
                      |  - Google Gemini AI Integrations  |
                      +--------+------------------+-------+
                               |                  |
            MongoDB Driver     |                  | Google Gemini API
            (Mongoose ODM)     v                  v
                      +--------+-------+  +-------+-------+
                      | MongoDB System |  | Google Gemini |
                      | - Collections  |  | 3.8 Flash     |
                      | - Unique Index |  | 3.1 Flash Lite|
                      +----------------+  +---------------+
```

---

## 2. Technology Stack & Specifications

| Layer | Technology | Key Details & Packages |
| :--- | :--- | :--- |
| **Frontend** | React 18 (SPA) | Vite 5, React Router DOM v6, Context API, Vanilla CSS Design Tokens |
| **Backend** | Node.js (ESM) | Express 4, Cookie-Parser, CORS, Helmet, Express-Rate-Limit, Dotenv |
| **Database** | MongoDB | Mongoose 8/9 with schemas, compound indexes, soft-deactivation flags |
| **Authentication** | JWT & Bcrypt | `bcryptjs` password hashing, signed JWT in HttpOnly/Secure/SameSite cookies |
| **AI Integration** | Google Gemini | `@google/genai` (Gemini 3.8 Flash for Notes, Gemini 3.1 Flash Lite for Quizzes) |
| **Video Player** | YouTube API | YouTube IFrame Player API (`YT.Player`) with 16:9 responsive wrapper |
| **Testing** | Node.js Native Test | Native `node:test` runner with `--test-concurrency=1` and `assert/strict` |

---

## 3. Data Models & Database Schemas

### 3.1 User (`server/src/models/User.js`)
- **Fields:** `name` (String, 2-50 chars), `email` (String, unique, lowercase, trimmed), `password` (String, hashed with bcrypt), `role` (Enum: `'learner'`, `'admin'`, default: `'learner'`), `isActive` (Boolean, default: `true`).
- **Subdocuments:** `quizScores` array: `[{ video: ObjectId, videoTitle: String, score: Number, scoreDisplay: String, completedAt: Date }]`.
- **Security Rule:** Role cannot be escalated by users via public registration or profile edit endpoints; only admins can manage user status.

### 3.2 Category (`server/src/models/Category.js`)
- **Fields:** `name`, `slug` (unique), `description`, `icon`, `order`, `isActive` (soft-deactivation).

### 3.3 Skill (`server/src/models/Skill.js`)
- **Fields:** `name`, `slug` (unique), `category` (ref: Category), `description`, `icon`, `order`, `isActive`.

### 3.4 Playlist (`server/src/models/Playlist.js`)
- **Fields:** `title`, `slug` (unique), `skill` (ref: Skill), `description`, `order`, `externalYoutubePlaylistId`, `isActive`.

### 3.5 Video (`server/src/models/Video.js`)
- **Fields:** `title`, `slug` (unique), `skill` (ref: Skill, required), `playlist` (ref: Playlist, optional), `youtubeVideoId` (String), `description` (String), `durationSeconds` (Number), `order` (Number), `transcript` (String, optional), `hasTranscript` (Boolean, default: `false`), `isActive` (Boolean, default: `true`).

### 3.6 VideoProgress (`server/src/models/VideoProgress.js`)
- **Fields:** `user` (ref: User), `video` (ref: Video), `lastPositionSeconds` (Number), `durationSeconds` (Number), `isCompleted` (Boolean).
- **Index:** Compound unique index `{ user: 1, video: 1 }`.
- **90% Completion Rule:** Automatically computed when `lastPositionSeconds >= 0.9 * durationSeconds`. Once marked complete, rewinding does not reset completion.

### 3.7 Bookmark (`server/src/models/Bookmark.js`)
- **Fields:** `user` (ref: User), `video` (ref: Video), `createdAt`, `updatedAt`.
- **Index:** Compound unique index `{ user: 1, video: 1 }` and query index `{ user: 1, createdAt: -1 }`.
- **Soft-Delete Handling:** If bookmarked video is deactivated (`isActive: false`), the bookmark remains accessible with an "Archived / Retired Lesson" indicator.

### 3.8 Note (`server/src/models/Note.js`)
- **Fields:** `video` (ref: Video), `promptVersion` (String, 'v1'), `contentFingerprint` (SHA-256 hash), `groundingSource` ('metadata'), `summary` (String), `keyConcepts` (Array), `definitions` (Array), `takeaways` (Array).
- **Index:** Unique index `{ video: 1, promptVersion: 1 }`.

### 3.9 Quiz (`server/src/models/Quiz.js`)
- **Fields:** `video` (ref: Video), `contentFingerprint` (SHA-256 hash), `promptVersion` (String, 'v1'), `questions` (Array of exactly 5 question objects).
- **Question Structure:** `questionText` (String), `options` (Array of exactly 4 strings), `correctOptionIndex` (Number, 0-3), `explanation` (String).
- **Security Rule:** Correct answer keys and explanations are omitted on client retrieval and verified server-side on submission.

### 3.10 AI Usage Tracking (`AiUserUsage.js` & `AiGlobalUsage.js`)
- **Fields:** `date` (YYYY-MM-DD UTC), `feature` ('notes' or 'quiz'), `count` / `successfulRequests`.
- **Atomic Quotas:**
  - Notes: 1 successful generation per user per UTC day; 20 RPD global limit.
  - Quiz: 2 successful generations per user per UTC day; 500 RPD global limit.

---

## 4. API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new learner account.
- `POST /api/auth/login` — Sign in and receive HttpOnly cookie.
- `POST /api/auth/logout` — Clear auth cookie.
- `GET /api/auth/me` — Get current user session.
- `PATCH /api/auth/profile` — Update user name.
- `POST /api/auth/change-password` — Change password with current password verification.

### Catalog & Content Browsing
- `GET /api/categories` — List active categories.
- `GET /api/categories/:identifier` — Category details with constituent skills.
- `GET /api/skills` — List active skills.
- `GET /api/skills/:identifier` — Skill details with playlists and standalone videos.
- `GET /api/playlists/:identifier` — Playlist details with constituent videos and authenticated progress.
- `GET /api/videos` — List active videos with optional `?skill=` and `?playlist=` filters.
- `GET /api/videos/:identifier` — Video details with curriculum context and user progress.
- `GET /api/search?q=...` — Unified search across skills, playlists, and videos.

### Progress & Bookmarks
- `POST /api/progress` / `POST /api/videos/:identifier/progress` — Save playback position.
- `GET /api/progress/:identifier` — Retrieve video playback offset.
- `GET /api/progress/recent` — Continue-learning and recent watch history.
- `GET /api/bookmarks` — List learner's saved videos.
- `POST /api/bookmarks` / `POST /api/videos/:identifier/bookmark` — Add bookmark.
- `DELETE /api/bookmarks/:identifier` — Remove bookmark.
- `GET /api/bookmarks/check/:identifier` — Check video bookmark status.

### AI Features (Notes & Quizzes)
- `GET /api/videos/:identifier/notes` — Retrieve cached notes and quota status.
- `POST /api/videos/:identifier/notes` — Generate grounded notes using Gemini 3.8 Flash.
- `GET /api/videos/:identifier/quiz` — Retrieve cached quiz (without answer key) and quota status.
- `POST /api/videos/:identifier/quiz` — Generate practice quiz using Gemini 3.1 Flash Lite.
- `POST /api/videos/:identifier/quiz/submit` — Submit answers, receive explanations and X/5 score.

### Learner Dashboard
- `GET /api/dashboard` — Aggregated metrics: continue learning, recent videos, completed videos count, playlist progress bars, and quiz scores.

### Administration (`/api/admin`)
- `GET /api/admin/stats` — Overview metrics.
- `CRUD /api/admin/categories` — Category management.
- `CRUD /api/admin/skills` — Skill management.
- `CRUD /api/admin/playlists` — Playlist management.
- `CRUD /api/admin/videos` — Video management with soft-deactivation and relational delete locks.
- `PATCH /api/admin/videos/:id/transcript` — Dedicated transcript editor.
- `GET /api/admin/users` & `PATCH /api/admin/users/:id/toggle` — User inspection and account suspension.

---

## 5. Security, Error Handling & Logging

1. **Centralized Error Handling (`errorHandler.js`):**
   - Automatically maps Mongoose `ValidationError` &rarr; 400 with field errors.
   - Maps Mongoose `CastError` &rarr; 400.
   - Maps MongoDB `code: 11000` duplicate key &rarr; 409 Conflict.
   - Returns uniform envelope: `{ success: false, message: string, errors: array }`.
2. **Safe Logging (`logger.js`):**
   - Redacts passwords, JWT tokens, Bearer headers, Gemini API keys (`AIza...`), and MongoDB connection strings from stdout, Morgan logs, and error stacks.
3. **Security Headers & CORS:**
   - Helmet security headers with `crossOriginResourcePolicy: 'cross-origin'` and `crossOriginOpenerPolicy: 'same-origin-allow-popups'` allowing embedded YouTube playback.
   - CORS restricted to configured client origin with credentials support.
   - Brute-force rate limiting protecting authentication routes.

---

## 6. Seed Scripts & Verification

### Database Seeding
- **Catalog Seeding:** Run `npm run seed --workspace=server` to populate curated computing categories, skills, playlists, and 10 video lessons.
- **Admin Seeding:** Run `npm run seed:admin --workspace=server` to provision the administrator account (`gojo@email.com` / `infinity`).

### Verification Script
Run the automated project integrity check:
```bash
npm run verify
```
This runs:
1. Root, frontend, and backend structural checks.
2. The entire backend test suite (`node --test`).
3. The frontend production build (`vite build`).
