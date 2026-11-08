# SkillVault API Documentation

All API endpoints are prefixed with `/api` and return standardized JSON envelopes:
- Success: `{ success: true, data: ... }`
- Error: `{ success: false, message: ... }`

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and issue HttpOnly JWT cookie | No |
| `POST` | `/api/auth/logout` | Clear session cookie | Yes |
| `GET` | `/api/auth/me` | Fetch currently authenticated user session | Optional |
| `PATCH`| `/api/auth/profile` | Update learner display name | Yes |
| `PATCH`| `/api/auth/change-password` | Verify current password and set new password | Yes |

---

## 2. Catalog & Discovery

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/categories` | List active categories (optional `?includeSkills=true`) |
| `GET` | `/api/categories/:slug` | Retrieve single category by slug |
| `GET` | `/api/skills` | List all active skills |
| `GET` | `/api/skills/:slug` | Retrieve skill by slug with playlists & videos |
| `GET` | `/api/playlists/:id` | Retrieve playlist by ID or slug with video ordering |
| `GET` | `/api/videos/:id` | Retrieve video details, context, and transcript |
| `GET` | `/api/search` | Search skills, playlists, and videos (`?q=...&type=...`) |

---

## 3. Learner Progress & Bookmarks

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/progress/:videoId` | Get current playback progress | Yes |
| `POST` | `/api/progress/:videoId` | Heartbeat update playback position & percent | Yes |
| `PATCH`| `/api/progress/:videoId/complete` | Mark video completed | Yes |
| `GET` | `/api/bookmarks` | List user bookmarks | Yes |
| `POST` | `/api/bookmarks/:videoId` | Add video to user bookmarks | Yes |
| `DELETE`| `/api/bookmarks/:videoId` | Remove video from user bookmarks | Yes |

---

## 4. AI Notes & Quizzes (Google Gemini)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notes/:videoId` | Retrieve existing generated AI notes | Optional |
| `POST` | `/api/notes/:videoId/generate` | Generate structured technical notes | Yes |
| `GET` | `/api/quizzes/:videoId` | Retrieve practice quiz for video | Optional |
| `POST` | `/api/quizzes/:videoId/generate` | Generate 5-question multiple choice quiz | Yes |
| `POST` | `/api/quizzes/:videoId/submit` | Submit answers and receive score | Yes |

---

## 5. Dashboard & Administration

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Learner milestones, continue learning, and recent quizzes | Yes |
| `GET` | `/api/admin/overview` | Platform statistics and catalog counts | Yes (Admin) |
| `GET` | `/api/admin/videos` | List all videos with active/inactive status | Yes (Admin) |
| `POST` | `/api/admin/videos` | Add/curate video to catalog | Yes (Admin) |
| `PATCH`| `/api/admin/videos/:id` | Update video metadata or soft-deactivate | Yes (Admin) |
| `DELETE`| `/api/admin/videos/:id` | Delete/deactivate video | Yes (Admin) |
| `GET` | `/api/admin/users` | List registered learners | Yes (Admin) |
| `PATCH`| `/api/admin/users/:id/status`| Deactivate/reactivate learner account | Yes (Admin) |
