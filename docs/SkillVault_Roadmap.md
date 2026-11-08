# SkillVault Roadmap & Implementation Tracker

> **AUTHORIZATION POLICY**: This document serves as the single project specification and progress tracker. **Implementation of any phase is NOT authorized until that phase is explicitly requested by the user** (e.g., "Implement Phase 1"). Work sessions must inspect the repository, implement only the authorized phase, verify against acceptance criteria, update this roadmap with actual evidence, and stop.

---

## 1. Project Overview & Rules

- **Domain Scope**: Curated computing and technical skills only (Computer Science, Software Development, Data Science, IT, Databases, Web & Backend Development). Non-computing lifestyle or arts subjects are strictly out of scope.
- **Language Stack**: JavaScript throughout (Node.js/Express backend, React frontend). **No TypeScript** unless explicitly requested.
- **User Roles**: `learner` and `admin`. Role-based permissions are enforced server-side. Regular users cannot elevate themselves to admin.
- **Content Ingestion**: Hybrid model — initial catalog seeded via script, ongoing additions and curations managed by admins.
- **Transcripts**: Admin-provided or explicitly supplied transcript text. SkillVault does not assume YouTube automated captions are universally accessible. If transcript is unavailable, an approved fallback uses video description/metadata, with UI clearly displaying the source used.
- **Content Relationships**: A `Video` references a required `Skill` and an optional `Playlist`. YouTube IDs are stored separately from internal MongoDB `_id`s.
- **Session & Auth**: Passwords hashed with `bcrypt`. JWT stored in HttpOnly, Secure, SameSite cookies.
- **Deactivation Policy**: Soft deactivation (`isActive: false`) to preserve user history, bookmarks, notes, and quiz attempts. Inactive content is hidden from catalog browsing/search but retained in historical records.
- **Learning Path Rule**: An AI learning path is strictly an **ordered list of concepts/topics**, not a course, not lessons, not video assignments, and has no completion tracking.
- **Progress & Completion**: Unique `(user, video)` progress record. A video is marked complete when playback reaches at least **90%** of total duration. Playlist progress is dynamically calculated from completion of its constituent videos.
- **AI Integration**: Backend-only Google Gemini API calls. Correct quiz answer keys are kept on the server until submission. AI outputs (paths, notes, quizzes) are cached by entity ID, content fingerprint, prompt version, and difficulty.

---

## 2. Phase Tracker Summary

| Phase | Title | Status | Completion Date |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Finalize requirements and project rules | **Completed** | 2026-10-07 |
| **Phase 1** | Project foundation and repository setup | **Completed** | 2026-10-07 |
| **Phase 2** | React client setup | **Completed** | 2026-10-07 |
| **Phase 3** | Express server foundation | **Completed** | 2026-10-20 |
| **Phase 4** | MongoDB connection and content models | **Completed** | 2026-10-23 |
| **Phase 5** | Authentication and frontend session | **Completed** | 2026-10-23 |
| **Phase 6** | Categories and skills browsing | **Completed** | 2026-10-24 |
| **Phase 7** | Search | **Completed** | 2026-10-24 |
| **Phase 8** | Playlist pages and playlist progress display | **Completed** | 2026-10-24 |
| **Phase 9** | Individual video page and YouTube player | **Completed** | 2026-10-24 |
| **Phase 10** | Video progress, resume, and recent history | **Completed** | 2026-10-24 |
| **Phase 11** | Bookmarks | **Completed** | 2026-10-24 |
| **Phase 12** | AI notes generation | **Completed** | 2026-10-25 |
| **Phase 13** | AI quiz generation | **Completed** | 2026-10-25 |
| **Phase 14** | [Removed] Quiz attempt history | Removed | — |
| **Phase 15** | Learning progress, quiz statistics, and profile management | **Completed** | 2026-10-26 |
| **Phase 16** | Admin content management | **Completed** | 2026-10-26 |
| **Phase 17** | Validation, error handling, and UI completeness | **Completed** | 2026-10-27 |
| **Phase 18** | Security, accessibility, and responsive polish | **Completed** | 2026-10-27 |
| **Phase 19** | Full verification, deployment, and documentation | In Progress | — |

---

## 3. Phase Specifications and Detailed Status

### Phase 0 — Finalize requirements and project rules
- **Goal**: Record product decisions and governance rules before implementation begins.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Defined user roles: `learner` and `admin`.
  - [x] Defined content ingestion: Seeded + Admin-entered catalog.
  - [x] Defined transcript strategy: Admin-provided/explicit transcript text; metadata fallback with clear UI indication when transcript is missing.
  - [x] Defined canonical video-skill-playlist hierarchy: Video references Skill and optionally Playlist; separate YouTube external IDs.
  - [x] Defined token/session handling: HttpOnly, Secure, SameSite cookie with JWT.
  - [x] Defined content deactivation policy: Soft deactivation (`isActive: false`) preserving bookmarks, progress, notes, and quiz history.
  - [x] Defined AI caching strategy: Cached by entity ID, content fingerprint, prompt version, difficulty; stale on source change.
  - [x] Agreed rule on learning paths: Ordered topic/concept list only, not a course or tracker.
  - [x] Defined completion threshold: 90% of duration; playlist progress derived from video progress.
  - [x] Deliverables created: `SkillVault_Roadmap.md` and `docs/requirements_and_architecture.md`.
  - [x] Authorization policy stated: Implementation not authorized until explicitly requested per phase.
- **Evidence**:
  - `SkillVault_Roadmap.md` established as central tracker.
  - `docs/requirements_and_architecture.md` specifies all architecture and domain rules.

---

### Phase 1 — Project foundation and repository setup
- **Goal**: Create a clean foundation for client and server.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Git initialized.
  - [x] Root project structure created for `client/` and `server/`.
  - [x] Root `README.md` created with project purpose, stack, and structure.
  - [x] `.gitignore` ignores `node_modules`, env files (`.env*`), logs (`*.log`), and build output (`dist/`, `build/`).
  - [x] `.env.example` created with placeholder variable names only (no secrets).
  - [x] Lockfile policy confirmed for upcoming dependency installations.
- **Evidence**:
  - Git repository initialized via `git init`.
  - Directories `client/src/` and `server/src/` created with `.gitkeep`.
  - `.gitignore` and `.env.example` verified with dry-run Git file addition tests.
  - Root `README.md` created with full setup instructions.
  - No secrets present in git or documentation.

---

### Phase 2 — React client setup
- **Goal**: Create the runnable React frontend foundation.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] React app in `client/` using JavaScript and CSS.
  - [x] React Router configured with navigation shell and route placeholders (`/`, `/categories`, `/skills/:skillSlug`, `/playlists/:playlistId`, `/videos/:videoId`, `/search`, `/bookmarks`, `/dashboard`, `/profile`, `/login`, `/signup`, `*`).
  - [x] Central API client configuration using environment variables (`VITE_API_BASE_URL`).
  - [x] Reusable API request layer handling JSON, HttpOnly credentials, and standardized errors (`client/src/api/client.js`).
  - [x] Unknown routes render an accessible 404 Not Found view (`NotFoundPage.jsx`).
  - [x] Baseline responsive styles, dark computing theme, mobile navigation, and accessible `:focus-visible` states.
- **Evidence**:
  - Vite + React SPA created in `client/` with `package.json` and lockfile `package-lock.json`.
  - Production build verified via `npm run build` in `client/` (exited 0; bundled 49 modules).
  - Preview server started on port 4173 and confirmed responsive.
  - No backend secrets embedded in frontend build or configuration.

---

### Phase 3 — Express server foundation
- **Goal**: Create the runnable backend foundation.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Node.js & Express in `server/` with modular structure (routes, controllers, services, middleware, models, validators, config).
  - [x] JSON request parsing, request logging, security headers (Helmet), CORS, and rate limiting.
  - [x] Centralized error handler and uniform API response structure.
  - [x] Configuration validator reporting missing required environment variables at startup.
  - [x] Note: No `/api/health` route.
- **Evidence**:
  - Express server initialized in `server/` with ESM (`"type": "module"`), dependencies locked in `package-lock.json`.
  - Modular directory structure established: `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, `utils/`, `validators/`.
  - Security and traffic middleware active: Helmet headers (`nosniff`, `SAMEORIGIN`, CSP), Morgan logging, CORS restricted to configured origin, rate limiting (`200` req/15 min), 1MB body parser, cookie-parser.
  - Centralized error handler (`errorHandler.js`) and `ApiError` class returning uniform envelope `{ success: false, message, errors }`, sanitizing stack traces in production.
  - Uniform success response helper (`ApiResponse.js`) producing `{ success: true, message, data }`.
  - Startup environment validator (`config/env.js`) verified exiting with status 1 and error banner when required variables are missing.
  - Tested absence of `/api/health` route (confirmed returning 404).
  - Verified against regressions: `client/` production build succeeds cleanly (49 modules bundled).

---

### Phase 4 — MongoDB connection and content models
- **Goal**: Define database connection and core content data models.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Mongoose connection using server-only configuration (`config.mongoUri` via `connectDatabase`).
  - [x] Models for User, Category, Skill, Playlist, Video with validation, timestamps, and query indexes.
  - [x] Consistent slug and active/inactive soft-deactivation policy (`isActive: true` default, soft-filtering).
  - [x] Video references Skill and optionally Playlist; separate YouTube external IDs.
  - [x] Duration in seconds (`durationSeconds`) and transcript availability (`transcript`, `hasTranscript`) represented.
- **Evidence**:
  - Mongoose installed in `server/`, connection lifecycle and status helpers defined in `server/src/config/database.js`.
  - Server bootstrap updated in `server/src/server.js` to connect to MongoDB and disconnect during graceful shutdown.
  - Models created in `server/src/models/` for `User`, `Category`, `Skill`, `Playlist`, `Video` with strict validation, indexes, and timestamps.
  - URL-friendly slug generation utility implemented in `server/src/utils/slugify.js` and wired to pre-validate hooks across `Category`, `Skill`, `Playlist`, and `Video`.
  - Comprehensive unit and integration test suite (`models.test.js`, `models.integration.test.js`, `database.test.js`, `utils.test.js`) executed and passed (32 tests across 6 suites, 0 failures).
  - Client production build verified without regressions (49 modules bundled, exit code 0).

---

### Phase 5 — Authentication and frontend session
- **Goal**: User registration, login, logout, and session state.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Registration with validated name, normalized unique email, and bcrypt-hashed password.
  - [x] Login with generic invalid-credential messaging (`"Invalid email or password"`).
  - [x] Current-user endpoint (`/api/auth/me`).
  - [x] HttpOnly cookie JWT session management and logout.
  - [x] JWT verification and auth middleware (`requireAuth`, `requireAdmin`, `optionalAuth`).
  - [x] Frontend AuthContext, Login, Signup, protected routes (`ProtectedRoute`), navbar auth state.
  - [x] Role cannot be set to admin by users during registration or updates (forced strictly to `'learner'`).
- **Evidence**:
  - Installed `bcryptjs` and `jsonwebtoken` in `server/`.
  - Implemented token and password hashing utilities in `server/src/utils/token.js`.
  - Created authentication controller (`authController.js`) and mounted `/api/auth` router (`authRoutes.js`) for register, login, logout, and me endpoints.
  - Implemented session middleware (`requireAuth`, `requireAdmin`, `optionalAuth`) in `server/src/middleware/auth.js`.
  - Built frontend `AuthContext` (`AuthContext.jsx`), custom `useAuth` hook, and `ProtectedRoute` wrapper for secure views (`/dashboard`, `/profile`, `/bookmarks`).
  - Replaced login and signup placeholders with active forms featuring client-side validation, error alerts, and redirect handling.
  - Updated navbar to reflect real-time authentication state with user name badge, profile link, and sign-out action.
  - Full automated backend test suite (`auth.test.js` + unit/integration models and middleware) passed (46 tests in 20 suites, 0 failures).
  - Frontend production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`npm run verify`) passed all steps.

---

### Phase 6 — Categories and skills browsing
- **Goal**: Let learners explore the curated catalog.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Category listing endpoint (`GET /api/categories`, `GET /api/categories/:slug`) and UI.
  - [x] Skill listing endpoint (`GET /api/skills`, supporting `?category=slug_or_id`) and UI.
  - [x] Skill detail endpoint (`GET /api/skills/:slug`) and page.
  - [x] Category-to-skill navigation with breadcrumbs and linked cards/pills.
  - [x] Filter out inactive content for regular learners (`isActive: true` enforcement).
  - [x] Clear loading, error, and empty states on both category and skill views.
- **Evidence**:
  - Created category controller (`categoryController.js`) and routes (`categoryRoutes.js`) mounted at `/api/categories`.
  - Created skill controller (`skillController.js`) and routes (`skillRoutes.js`) mounted at `/api/skills`.
  - Integrated active-only filtering (`isActive: true`) across categories, skills, playlists, and videos.
  - Implemented interactive `CategoriesPage.jsx` with category cards, embedded skills, responsive layout, and empty/error states.
  - Implemented `SkillDetailPage.jsx` with breadcrumbs, skill overview, curated playlists grid, and video list with duration and transcript availability badges.
  - Updated `HomePage.jsx` to dynamically load active catalog domains with direct category and skill links.
  - Created reusable catalog seed script (`server/src/seeds/seedCatalog.js`) and npm script `seed`.
  - Automated test suite in `server/tests/catalog.test.js` verified 10 tests across all endpoints (total 56 tests in 25 suites pass, 0 failures).
  - Frontend production build verified (53 modules transformed, exit code 0).
  - Full project verification suite (`npm run verify`) passed all checks.

---

### Phase 7 — Search
- **Goal**: Search catalog for skills, playlists, and videos.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] `GET /api/search?q=...` across skills, playlists, and videos.
  - [x] Query validation and length bounds (2–100 characters; whitespace trimmed).
  - [x] Typed results with links/identifiers, type filtering, counts, and limit parameter.
  - [x] Inactive content excluded (`isActive: true` enforcement on items and parent relations).
  - [x] Search UI with loading, error, and no-results states, plus quick suggestion chips and tabbed filtering.
- **Evidence**:
  - Implemented `searchController.js` and mounted `searchRoutes.js` at `/api/search` in `server/src/app.js`.
  - Added query validation for required `q`, min length 2, max length 100, valid `type` filters (`all`, `skills`, `playlists`, `videos`), and `limit` capping (up to 50).
  - Added safe regex character escaping to prevent ReDoS / injection when searching titles and descriptions.
  - Excluded soft-deactivated content across skills, playlists, and videos.
  - Implemented rich `SearchPage.jsx` with input clearing, popular query suggestion pills, URL query synchronization via `useSearchParams`, filter tabs by content type with result badges, loading indicator, error alert with retry, and empty no-results state.
  - Automated test suite in `server/tests/search.test.js` verified 12 test assertions covering validation, bounds, multi-type search, inactive exclusion, limit, and regex safety (68 tests across 28 suites pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`npm run verify`) passed all checks.

---

### Phase 8 — Playlist pages and playlist progress display
- **Goal**: Show playlist details and constituent videos with aggregate progress.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Playlist listing and detail APIs (`GET /api/playlists`, `GET /api/playlists/:identifier`).
  - [x] Playlist view with ordered videos linking to shared video player route (`/videos/:videoId`).
  - [x] Completion calculated dynamically from user's video progress records (`(completed / total) * 100`).
  - [x] Empty playlist handles 0% or empty state cleanly without division-by-zero errors.
- **Evidence**:
  - Implemented `VideoProgress` Mongoose schema in `server/src/models/VideoProgress.js` with compound unique index on `(user, video)` and automatic 90% duration completion check.
  - Implemented `playlistController.js` and mounted `playlistRoutes.js` at `/api/playlists` in `server/src/app.js`.
  - Added support for both ObjectId and slug identifier lookups, skill filtering (`?skill=...`), and soft-deactivation filtering.
  - Added dynamic progress enrichment: for logged-in users, fetches `VideoProgress` for playlist constituent videos, marks `isCompleted`, and dynamically calculates overall playlist progress percentage.
  - Seeding: Added all 10 user-provided YouTube videos into structured curriculum playlists across SQL, Python, Web Development (HTML/CSS), Git & GitHub, and Data Analytics & BI in `server/src/seeds/seedCatalog.js`.
  - Implemented `PlaylistPage.jsx` with breadcrumbs, playlist header, progress bar (with authenticated progress and unauthenticated sign-in prompts), numbered lesson curriculum, duration, transcript badges, completion indicators, and clean empty state.
  - Automated test suite in `server/tests/playlist.test.js` verified 10 test assertions covering listing, filtering, slug and ID lookup, 404s, empty playlist handling, and dynamic progress computation (78 tests across 32 suites pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`npm run verify`) passed all checks.

---

### Phase 9 — Individual video page and YouTube player
- **Goal**: Reusable video player view.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Video detail view with embedded YouTube player, title, description, coverage, bookmark button, playlist context.
  - [x] Shell for notes, quiz, and progress controls.
  - [x] Graceful handling of unavailable, private, or deleted YouTube videos.
  - [x] Responsive layout (mobile, tablet, desktop).
- **Evidence**:
  - Implemented `videoController.js` and mounted `videoRoutes.js` at `/api/videos` in `server/src/app.js`.
  - Added support for both MongoDB ObjectId and slug lookups, skill and playlist filtering, and soft-deactivation enforcement.
  - Implemented playlist context retrieval returning sibling videos, lesson index, and previous/next lesson navigation metadata.
  - Implemented `VideoPage.jsx` with responsive 16:9 embedded YouTube iframe player (`https://www.youtube-nocookie.com/embed/...`) without redirecting away from SkillVault, lesson metadata, transcript availability badge, previous/next lesson buttons, playlist curriculum drawer, and shells for AI notes, quizzes, transcript, and bookmarks.
  - Added graceful fallback notice with direct external link if YouTube video is unavailable or embedding is restricted.
  - Automated test suite in `server/tests/video.test.js` verified 9 test assertions covering listing, filtering, slug and ID lookup, playlist context, standalone videos, 404s, and authenticated progress attachment (87 tests across 35 suites pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`npm run verify`) passed all checks.

---

### Phase 10 — Video progress, resume, and recent history
- **Goal**: Track playback position per learner and video.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] `VideoProgress` model with unique `(user, video)` constraint.
  - [x] Save progress and retrieve progress endpoints.
  - [x] Recent/continue-learning endpoint.
  - [x] Playback position saved periodically and on pause/end.
  - [x] 90% threshold marks video completed.
  - [x] Resume from last saved playback offset.
- **Evidence**:
  - Implemented `progressController.js` and mounted `progressRoutes.js` at `/api/progress` in `server/src/app.js` (`POST /api/progress`, `GET /api/progress/:identifier`, `GET /api/progress/recent`, `GET /api/progress/continue-learning`).
  - Added RESTful video progress route aliases in `server/src/routes/videoRoutes.js` (`POST /api/videos/:identifier/progress`, `GET /api/videos/:identifier/progress`).
  - Enforced authentication and learner isolation (`requireAuth`) ensuring users can only read and write their own progress records.
  - Validated payload inputs (non-negative position and duration, valid active video lookup).
  - Enforced 90% duration threshold (`lastPositionSeconds >= 0.9 * durationSeconds`) marking `isCompleted: true`, with non-regression guarantee preserving completion if a user rewinds.
  - Integrated YouTube IFrame Player API (`YT.Player`) in `VideoPage.jsx` with periodic saving every 5 seconds during playback, immediate saving on pause and video end, and unmount cleanup.
  - Implemented resume experience in `VideoPage.jsx` with an interactive "Resume from MM:SS" banner, "Start from beginning" control, and player offset seek.
  - Automated test suite in `server/tests/progress.test.js` verified 11 test assertions covering unauthenticated 401s, validation 400/404s, 90% completion logic, rewind non-regression, compound uniqueness, recent ordering, and video route aliases (total 98 tests across 36 suites pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 11 — Bookmarks
- **Goal**: Personal video saving.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Add, remove, and list bookmark endpoints.
  - [x] Unique `(user, video)` bookmark constraint.
  - [x] Bookmark toggle on video pages and dedicated bookmarks page.
  - [x] Graceful display if a bookmarked video is deactivated.
- **Evidence**:
  - Implemented `Bookmark` Mongoose schema in `server/src/models/Bookmark.js` with compound unique index on `{ user: 1, video: 1 }` and sorted query index on `{ user: 1, createdAt: -1 }`.
  - Implemented `bookmarkController.js` and mounted `bookmarkRoutes.js` at `/api/bookmarks` in `server/src/app.js` (`POST /api/bookmarks`, `GET /api/bookmarks`, `DELETE /api/bookmarks/:identifier`, `GET /api/bookmarks/check/:identifier`).
  - Added RESTful video route aliases on `server/src/routes/videoRoutes.js` (`POST /api/videos/:identifier/bookmark`, `DELETE /api/videos/:identifier/bookmark`, `GET /api/videos/:identifier/bookmark`).
  - Enforced learner authentication (`requireAuth`) and strict user data isolation across all bookmark endpoints.
  - Updated `videoController.js` (`getVideoById`) to attach `isBookmarked: Boolean` for authenticated users.
  - Implemented interactive bookmark toggle button on `VideoPage.jsx` with accessible ARIA states, active visual indicator, and double-click protection.
  - Implemented responsive `BookmarksPage.jsx` at `/bookmarks` with loading, error, empty, active cards, inline remove button, and playback progress bars.
  - Supported soft-deactivation policy: bookmarked videos marked `isActive: false` remain accessible in learner's bookmark collection with a prominent `⚠️ Archived / Retired Lesson` warning badge.
  - Automated test suite in `server/tests/bookmark.test.js` verified 11 test assertions covering unauthenticated 401s, 404/400 validation, creation, unique compound constraint, status check, descending chronological order, learner isolation, route aliases, and soft deactivation (total 109 tests across 37 suites pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Shared AI Infrastructure Foundation (Pre-Phase 12 & 13)
- **Status**: **Completed (Shared Foundation)** (Note: Phases 12 and 13 remain Not Started until authorized)
- **Deliverables**:
  - Reusable backend Gemini client configuration supporting `@google/genai` (`GoogleGenAI`).
  - Dual-model separation: `gemini-3.8-flash` for notes and `gemini-3.1-flash-lite` for quiz.
  - Concurrency-safe durable usage tracking backed by MongoDB (`AiGlobalUsage` and `AiUserUsage`).
  - Atomic attempt reservation enforcing daily global application budgets (20 attempts/UTC day for notes, 500 attempts/UTC day for quiz).
  - Attempt accounting ensuring every actual Gemini API attempt, including retries, reserves and consumes quota.
  - Per-user daily allowance tracking (1 successful notes/day, 2 successful quizzes/day).
  - Centralized error normalization (`AiError`), sensitive credential redaction, and mock testing harness (`MockGeminiClient`).
  - Automated test suite in `server/tests/ai.test.js` (24 test assertions passing, total 133 tests passing).

---

### Phase 12 — AI Notes Generation
- **Goal**: Generate learning notes using only the selected video's title and description.
- **Status**: **Completed**
- **Model & Configuration**:
  - Model: **Gemini 3.8 Flash** (`gemini-3.8-flash` via `@google/genai`).
  - API Credentials: Uses the shared Gemini API key (`GEMINI_API_KEY`), with a dedicated environment variable for the notes model (`GEMINI_NOTES_MODEL`).
- **Google AI Studio Quotas (Currently Observed)**:
  - **RPM**: 5 requests per minute.
  - **TPM**: 250,000 tokens per minute.
  - **RPD**: 20 requests per day.
  - *Quota Note*: These limits come from observed AI Studio dashboard figures. Current project quotas must be verified before deployment and documented if they differ.
- **Quota Budgets & Rate Limit Rules**:
  - **Global Daily Budget**: Maximum 20 Gemini API requests per day allocated for the notes model based on observed RPD, strictly respecting 5 RPM and 250,000 TPM limits.
  - **Attempt & Retry Accounting**: Reserve quota headroom where practical; count all actual Gemini API attempts, including retries, against global quota protection.
  - **Per-User Daily Allowance**: Each authenticated user is permitted **one successful notes generation per UTC day**, enforced strictly on the backend via the authenticated user's ID (`req.user._id`). Never rely on frontend-only checks.
  - **Independent Quota Control**: Exhaustion of the notes model budget disables notes generation for all users, but does not affect or disable quiz generation.
  - **Temporary Rate Limits**: Per-minute rate-limit errors (429 / RPM / TPM) are handled separately from daily exhaustion; transient minute-level limits do not disable notes generation for the entire day.
  - **Daily Reset**: SkillVault's usage counters reset at 00:00 UTC daily.
- **Input Grounding & Generation Rules**:
  - Grounding source: Input to Gemini is strictly the selected video's **title** and **description** only. The video description contains the topics covered and serves as the sole basis for notes.
  - **No transcripts**: The transcript feature is removed entirely from the AI notes workflow. Do not fetch, process, or use transcripts.
  - Structure: Structured notes containing a concise summary, key concepts, definitions where supported by title/description, and important takeaways.
  - Grounding constraint: Anti-hallucination constraint — do not invent information not supported by the video title and description.
  - Caching: Generated notes are cached in MongoDB by video ID and prompt/schema version to avoid unnecessary Gemini API calls.
- **Frontend & Button Behavior**:
  - "Generate Notes" button is disabled for all users when the global daily notes budget is exhausted.
  - "Generate Notes" button is disabled for an individual user when they have used their 1 daily generation allowance.
  - The UI displays a clear message explaining whether the user's personal limit or the global quota has been reached.
  - The button becomes available again after the applicable daily limit resets, provided model quota is available.
  - Gracefully handle API failures, temporary rate limits, invalid output, and daily quota exhaustion.
- **Acceptance Criteria**:
  - [x] Notes use only the selected video's title and description as grounding input.
  - [x] No transcript-related feature or dependency remains in the Phase 12 plan or workflow.
  - [x] Each authenticated user can successfully generate notes at most once per UTC day, enforced backend-side.
  - [x] No more than the configured global daily request budget (20 RPD with headroom/retry tracking) is sent to the notes model.
  - [x] Backend enforces global and per-user limits, and frontend reflects real-time availability with clear messaging.
  - [x] Notes generation becomes available again after the daily UTC reset, provided quota is available.
- **Evidence**:
  - Implemented `Note` Mongoose schema in `server/src/models/Note.js` with structured summary, key concepts, definitions, takeaways, content fingerprint, and unique index on `{ video: 1, promptVersion: 1 }`.
  - Implemented prompt generation and response parsing service in `server/src/services/ai/notesService.js` enforcing strict anti-hallucination grounding exclusively on video title and description.
  - Implemented `noteController.js` and mounted routes at `GET /api/videos/:identifier/notes`, `POST /api/videos/:identifier/notes`, and `/api/notes/:identifier`.
  - Integrated with shared AI infrastructure (`budgetService` and `aiExecutor`), reserving budget atomically before dispatch, enforcing 20 RPD global budget and 1 generation/UTC day per user allowance.
  - Implemented responsive, accessible AI Notes UI in `VideoPage.jsx` with real-time quota status, loading states, error alerts, and sign-in prompts.
  - Automated test suite in `server/tests/note.test.js` verified 14 test assertions covering unauthenticated 401s, 404 validation, generation, caching, route aliases, user allowance 429s, global budget 429s, retry accounting, and malformed 502s (total 147 backend tests pass, 0 failures).
  - Client production build verified cleanly (53 modules transformed, exit code 0).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 13 — AI Quiz Generation
- **Goal**: Generate a fixed five-question multiple-choice quiz using only the selected video's title and description.
- **Status**: **Completed**
- **Model & Configuration**:
  - Model: **Gemini 3.1 Flash Lite** (configured via `GEMINI_QUIZ_MODEL`).
  - API Credentials: Uses the shared Gemini API key (`GEMINI_API_KEY`).
- **Google AI Studio Quotas (Currently Observed)**:
  - **RPM**: 15 requests per minute.
  - **TPM**: 250,000 tokens per minute.
  - **RPD**: 500 requests per day.
- **Quota Budgets & Rate Limit Rules**:
  - **Global Daily Budget**: Maximum 500 Gemini API requests per day allocated for the quiz model based on observed RPD, respecting 15 RPM and 250,000 TPM limits.
  - **Attempt & Retry Accounting**: Atomic headroom reservation with retry tracking.
  - **Per-User Daily Allowance**: Each authenticated user is permitted **two successful quiz generations per UTC day**, enforced strictly on the backend using `req.user._id`.
  - **Independent Quota Control**: Exhaustion of quiz model budget does not affect or disable notes generation.
  - **Daily Reset**: Usage counters reset at 00:00 UTC daily.
- **Quiz Structure & Generation Rules**:
  - Grounding source: Exclusively the selected video's **title** and **description**; does not use transcripts.
  - Fixed length: Exactly **five multiple-choice questions (MCQs)** per quiz.
  - Options: Each question has exactly **four options**, with exactly **one correct answer**.
  - Validation: Validated against strict schema before presenting quiz to learner.
  - Security: Answer keys and explanations kept securely on backend until evaluation.
  - Scoring: Calculated on backend and formatted as **X/5 marks**, persisting to user's profile under `quizScores`.
- **Frontend & Button Behavior**:
  - "Generate Quiz" button dynamically disables when personal daily limit (2) or global budget (500) is reached.
  - UI displays clear status pills and quota feedback with real-time updates.
- **Acceptance Criteria**:
  - [x] Each quiz contains exactly five MCQs with four options and one correct answer per question.
  - [x] Quiz is generated exclusively from the selected video's title and description (no transcripts).
  - [x] Difficulty selectors (Easy/Medium/Hard) and 10-question options are completely removed.
  - [x] User receives an explanation of the correct answer after selecting an option; answer keys remain protected on backend until evaluation.
  - [x] Final score is calculated on the backend and displayed out of five marks (X/5 marks).
  - [x] Each authenticated user can successfully generate at most two quizzes per UTC day, enforced backend-side.
  - [x] Backend enforces the global daily request budget (500 RPD with headroom/retry tracking) and per-user allowance.
  - [x] Frontend reflects quota availability and the Generate Quiz button becomes available again after applicable resets.
- **Evidence**:
  - Implemented `Quiz` Mongoose schema in `server/src/models/Quiz.js` with 5-question validation constraint and content fingerprinting.
  - Implemented `quizService.js` in `server/src/services/ai/quizService.js` utilizing Gemini 3.1 Flash Lite with strict JSON schema validation.
  - Implemented `quizController.js` and mounted routes in `server/src/routes/quizRoutes.js` and aliases in `server/src/routes/videoRoutes.js`.
  - Enforced 2/day user quota and 500 RPD global budget in `server/src/services/ai/budgetService.js` and usage models (`AiUserUsage`, `AiGlobalUsage`).
  - Integrated full interactive quiz experience in `VideoPage.jsx` with real-time quota status, single-choice selection, instant feedback explanations, and X/5 score cards.
  - Automated test suite in `server/tests/quiz.test.js` verified 15 test assertions covering generation, caching, answer evaluation, score calculation, 429 quota exhaustion, and profile persistence.

---

### Phase 14 — Quiz attempt history [Removed]
- **Status**: Removed / Out of Scope
- **Scope & Specification**:
  - Phase 14 (Quiz attempt history) is removed entirely from the roadmap and implementation plan.
  - Do not implement a separate quiz attempt history feature, `QuizAttempt` collection, history views, or attempt detail inspection endpoints.
  - Do not introduce quiz attempt history into Phase 15.
  - Retained quiz statistics (total quizzes attempted and scores formatted as X/5 marks) are tracked directly under Phase 15.

---

### Phase 15 — Learning Progress, Quiz Statistics, and Profile Management
- **Goal**: Summarize learner activity, basic quiz statistics, and user account management.
- **Status**: **Completed**
- **Scope & Requirements**:
  - **Learning Progress**:
    - Continue learning (resume position).
    - Recently watched videos.
    - Completed videos (videos completed at >= 90% duration).
    - Playlist progress percentage.
  - **Quiz Statistics (Strictly Limited Scope)**:
    - Total number of quizzes attempted.
    - The score for each quiz, displayed out of five marks (X/5 marks).
    - *Explicit Scope Exclusion*: Do not add a separate quiz attempt history feature, detailed analytics, performance charts, weak-topic analytics, or additional quiz statistics.
  - **Profile Management**:
    - Allow users to view and update their name.
    - Allow users to change their password after verifying their current password.
    - Do not allow users to change their role through profile endpoints (strict server-side role immutability).
    - Enforce authentication, authorization, and validation on the backend.
- **Acceptance Criteria**:
  - [x] Dashboard displays continue learning, recently watched videos, completed videos, and playlist progress.
  - [x] Quiz statistics on dashboard are strictly limited to total quizzes attempted and individual quiz scores displayed as X/5 marks.
  - [x] No separate quiz attempt history, attempt detail views, or weak-topic analytics are introduced into Phase 15.
  - [x] Profile view allows updating name and changing password with current password verification.
  - [x] Backend enforces authentication, validation, learner isolation, and prevents role escalation.
- **Evidence**:
  - Added `quizScores` subdocument array to `User` model (`server/src/models/User.js`) storing video reference, title, score, and `scoreDisplay` ('X/5 marks').
  - Updated `quizController.js` (`submitVideoQuiz`) to persist evaluated quiz scores to the learner's profile upon submission.
  - Implemented profile update endpoints in `server/src/controllers/authController.js` and mounted at `PATCH /api/auth/profile` and `POST /api/auth/change-password` in `server/src/routes/authRoutes.js`:
    - Enforced name validation (2-50 characters) and strict role immutability, ensuring role elevation cannot occur.
    - Enforced current password verification against bcrypt hash and new password validation (minimum 6 characters).
  - Implemented consolidated dashboard controller (`server/src/controllers/dashboardController.js`) and mounted routes at `GET /api/dashboard` in `server/src/routes/dashboardRoutes.js`:
    - Computes continue-learning resume pointer, up to 10 recent progress items, list and count of completed lessons (>= 90% duration), and dynamic playlist progress percentages.
    - Computes strictly limited quiz statistics (`totalAttempted` and scores formatted as `X/5 marks`).
  - Added `updateProfile` and `changePassword` context methods in `client/src/context/AuthContext.jsx`.
  - Implemented rich, responsive `DashboardPage.jsx` (`/dashboard`) with metric summary cards, continue-learning spotlight banner, playlists in progress with dynamic progress bars, recently watched and completed lesson grids, and quiz statistics with `X/5 marks` score badges.
  - Implemented interactive `ProfilePage.jsx` (`/profile`) with account details, non-editable role badge, display name editing form, and current-password-verified password change form.
  - Resolved Mongoose connection pool teardown in `server/tests/quiz.test.js` by adding `disconnectDatabase()`.
  - Automated test suite in `server/tests/dashboard_profile.test.js` verified 12 test assertions covering unauthenticated 401s, name length bounds, role immutability, password validation and verification, dashboard aggregation, and quiz score persistence (all 177 tests across 58 suites in the project pass with 0 failures).
  - Client production build verified cleanly via `npm --prefix client run build` (53 modules transformed, exit code 0).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 16 — Admin content management
- **Goal**: Catalog curation interface for administrators.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Server-protected CRUD for categories, skills, playlists, and videos.
  - [x] Transcript editor / input for videos.
  - [x] Soft deactivation controls; prevent hard delete when user history references exist.
  - [x] Admin user list.
- **Evidence**:
  - Implemented administrative controller (`server/src/controllers/adminController.js`) providing:
    - Overview metrics (`GET /api/admin/stats`).
    - Full CRUD and soft deactivation toggle for Categories (`/api/admin/categories`).
    - Full CRUD and soft deactivation toggle for Skills (`/api/admin/skills`).
    - Full CRUD and soft deactivation toggle for Playlists (`/api/admin/playlists`).
    - Full CRUD and soft deactivation toggle for Videos (`/api/admin/videos`).
    - Dedicated transcript editor endpoint (`PATCH /api/admin/videos/:id/transcript`) with automatic synchronization of `hasTranscript` flag.
    - Soft deactivation controls and hard-delete prevention:
      - Blocks hard delete of videos if user history references exist (`VideoProgress`, `Bookmark`, `Note`, `Quiz`) with HTTP 409 Conflict.
      - Blocks hard delete of parent entities (categories, skills, playlists) when child entities reference them.
    - User accounts inspection endpoint (`GET /api/admin/users`) securely omitting password hashes, and user status toggle (`PATCH /api/admin/users/:id/toggle`) with self-deactivation lockout protection.
  - Mounted dedicated admin router (`server/src/routes/adminRoutes.js`) at `/api/admin` protected by `requireAuth` and `requireAdmin` middleware.
  - Built comprehensive administrative console (`client/src/pages/AdminPage.jsx`) at `/admin` featuring:
    - Overview stats cards (categories, skills, playlists, videos, users, transcripts).
    - Tabbed views for Categories, Skills, Playlists, Videos, and Users.
    - Create and Edit modal forms with client-side validation.
    - Inline transcript editor textarea.
    - Soft-deactivation toggle buttons and safe delete controls with conflict messaging.
    - User account table with role badges and suspend/reactivate toggles.
  - Configured protected route in `client/src/App.jsx` wrapped in `<ProtectedRoute adminOnly={true}>`.
  - Added "Admin" navigation link in `client/src/components/Navbar.jsx` visible exclusively to authenticated admin users.
  - Comprehensive automated test suite in `server/tests/admin.test.js` verified 24 test assertions covering:
    - 401 Unauthorized for guests and 403 Forbidden for learners.
    - Full CRUD for categories, skills, playlists, and videos.
    - Transcript editing and automatic `hasTranscript` flag updates.
    - Soft deactivation across all content types.
    - Relational delete prevention and user history deletion blocking (409 Conflict).
    - Admin user listing (no leaked passwords) and user account suspension.
    - All 201 backend tests across 65 suites in the repository pass with 0 failures.
  - Client production build verified cleanly via `npm --prefix client run build` (54 modules transformed, exit code 0).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 17 — Validation, error handling, and UI completeness
- **Goal**: Consistent behavior and feedback across app.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Consistent request validation and standardized error format.
  - [x] Loading, error, empty, retry states across all views.
  - [x] Safe server logs omitting secrets and passwords.
- **Evidence**:
  - Created centralized safe logging utility (`server/src/utils/logger.js`) that automatically sanitizes strings, objects, and Error stacks, redacting passwords (`password`, `currentPassword`, `newPassword`), JWT tokens, Bearer authorization tokens, Google/Gemini API keys (`AIza...`), query string credentials, and MongoDB connection strings.
  - Configured Morgan HTTP access logger in `server/src/app.js` with sanitized `:url` token to prevent accidental credential or token leakage in server access logs.
  - Updated Gemini raw error logging in `server/src/services/ai/geminiError.js` to scrub API keys and sensitive payload fragments.
  - Enhanced centralized error handler (`server/src/middleware/errorHandler.js`):
    - Automatically normalizes Mongoose `ValidationError` into HTTP 400 Bad Request with field-level `errors` array.
    - Automatically normalizes Mongoose `CastError` (e.g., malformed ObjectIds) into HTTP 400 Bad Request.
    - Automatically normalizes MongoDB `code: 11000` duplicate key index violations into HTTP 409 Conflict with descriptive field error messages.
    - Sanitizes error messages and stack traces in development, and strictly suppresses stack traces in production.
  - Audited and updated frontend views for complete loading, error, empty, and retry states:
    - Updated `HomePage.jsx` with prominent error banner and "Retry Loading" action alongside curated computing fallbacks.
    - Updated `SkillDetailPage.jsx` with a dedicated "Retry" action on error states.
    - Enhanced `AdminPage.jsx` feedback notification banner with direct "Retry" and dismiss controls for administrative operations.
    - Verified existing loading, error, empty, and retry states across `CategoriesPage.jsx`, `PlaylistPage.jsx`, `VideoPage.jsx`, `SearchPage.jsx`, `BookmarksPage.jsx`, `DashboardPage.jsx`, and `ProfilePage.jsx`.
  - Created comprehensive automated test suite (`server/tests/validation_errors.test.js`) verifying:
    - Standardized error response envelope formatting.
    - Mongoose `ValidationError` mapping to HTTP 400 with field errors.
    - Mongoose `CastError` mapping to HTTP 400.
    - MongoDB duplicate key `11000` mapping to HTTP 409 Conflict.
    - Malformed JSON body parsing mapping to HTTP 400 Bad Request.
    - 404 Route Not Found handling in standard response envelopes.
    - Deep secret sanitization across objects, bearer tokens, JWT tokens, Gemini API keys, query strings, and Mongo connection strings.
  - Automated test suite passed with 213 tests across 68 test suites in the repository with 0 failures (`npm --prefix server test`).
  - Production client build succeeded cleanly via Vite (`npm --prefix client run build`).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 18 — Security, accessibility, and responsive polish
- **Goal**: Security hardening and cross-device testing.
- **Status**: **Completed**
- **Acceptance Criteria**:
  - [x] Security audit (cookies, headers, CORS, rate limits, cross-user isolation).
  - [x] Accessible keyboard navigation and ARIA labels.
  - [x] Responsive polish on mobile, tablet, and desktop views.
- **Evidence**:
  - Enhanced Helmet security headers in `server/src/app.js`:
    - Enforced `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict security headers.
    - Configured `crossOriginResourcePolicy: { policy: 'cross-origin' }` and `crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }` to allow embedded YouTube iframes and privacy domains without resource blockage.
  - Hardened CORS configuration verifying allowed origins, credentials support (`access-control-allow-credentials: true`), and pre-flight OPTIONS support.
  - Implemented specialized brute-force rate limiter (`server/src/middleware/rateLimiters.js`) protecting sensitive authentication routes (`/api/auth/register`, `/api/auth/login`, `/api/auth/change-password`).
  - Audited cookie security flags in `server/src/utils/token.js`:
    - Verified `httpOnly: true`, `Path=/`, and `SameSite` flags on auth cookies.
  - Audited and verified learner isolation across progress, bookmarks, notes, profile management, and role immutability.
  - Added accessible keyboard navigation & ARIA labels:
    - Added accessible `<a href="#main-content" className="skip-to-content">Skip to main content</a>` in `Navbar.jsx` with dedicated focus styles.
    - Updated `AdminPage.jsx` modal dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="admin-modal-title"`, `aria-label="Close dialog"`, and global `Escape` key dismissal.
    - Updated `VideoPage.jsx` with full ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby`, `tabIndex={0}`).
  - Responsive polish and cross-device styling in `client/src/styles/index.css`:
    - Responsive navigation wrapping and mobile layout padding adjustments.
    - Enforced accessible minimum 44px touch targets on buttons for mobile devices (`max-width: 480px`).
    - Responsive card and single-column grid adjustments on narrow screens.
  - Comprehensive automated test suite (`server/tests/security_audit.test.js`) verifying security headers, CORS origin & methods, cookie security attributes, and cross-user data isolation.
  - Automated test suite passed with 224 tests across 73 test suites in the repository with 0 failures (`npm --prefix server test`).
  - Production client build succeeded cleanly via Vite (`npm --prefix client run build`).
  - Project integrity check (`node scripts/verify-project.js`) passed all checks.

---

### Phase 19 — Full verification, deployment, and documentation
- **Goal**: End-to-end verification and deployment readiness.
- **Status**: Not Started
- **Acceptance Criteria**:
  - Full 12-step end-to-end learner & admin verification.
  - Database index audit.
  - Production build and deployment guide.
  - Clean repository with documented configuration.
