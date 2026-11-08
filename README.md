# SkillVault

SkillVault is a curated video learning platform purpose-built for computer science, software engineering, data science, IT, and closely related computing disciplines.

---

## 1. Project Purpose & Scope

SkillVault helps learners systematically master technical subjects (e.g., Python, JavaScript, MERN stack, SQL, Data Analysis, System Design, and Database Concepts) through high-quality video content, structured concept learning paths, AI-generated grounded notes, and self-assessment quizzes.

SkillVault is **not** a general-purpose lifestyle or arts learning platform; it is strictly dedicated to computing and software development skills.

---

## 2. Intended Technology Stack

SkillVault is developed exclusively in **JavaScript**:
- **Frontend (`client/`)**: React (SPA), React Router, Context API, CSS / CSS Modules.
- **Backend (`server/`)**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: JWT stored in HttpOnly, Secure, SameSite cookies; `bcrypt` for password hashing.
- **AI Integrations**: Google Gemini API (executed strictly backend-side) for generating concept learning paths, grounded notes, and custom quizzes.
- **Video Playback**: YouTube IFrame Player API.

---

## 3. Project Structure

```text
SkillVault/
├── client/                     # Frontend React (Vite) application
│   ├── public/                 # Static public assets (favicon, robots.txt)
│   ├── src/
│   │   ├── assets/             # Media and icon assets
│   │   ├── components/         # Reusable UI components (Navbar, Footer)
│   │   ├── layouts/            # Page layouts and shells (Layout)
│   │   ├── pages/              # Route view pages (HomePage, VideoPage, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── context/            # React context providers
│   │   ├── services/           # Frontend API and external services (api.js)
│   │   ├── styles/             # Global CSS and styling modules (index.css)
│   │   ├── utils/              # Frontend helper functions
│   │   ├── App.jsx             # Main routing component
│   │   └── main.jsx            # Application entry point
│   ├── package.json            # Frontend dependencies and Vite scripts
│   └── vite.config.js          # Vite build configuration
├── server/                     # Backend Node.js / Express application
│   ├── src/
│   │   ├── config/             # Configuration (env validator, database connection)
│   │   ├── controllers/        # Request controllers and route handlers
│   │   ├── middleware/         # Custom Express middleware (errorHandler, etc.)
│   │   ├── models/             # Mongoose schemas and data models
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # Backend business logic and AI integrations
│   │   ├── utils/              # Backend utilities (ApiError, ApiResponse)
│   │   ├── validators/         # Request schema validation
│   │   ├── app.js              # Express application assembly
│   │   └── server.js           # Server startup and lifecycle management
│   ├── tests/                  # Backend unit and integration test suite
│   ├── .env.example            # Server environment variables template
│   └── package.json            # Server dependencies and scripts
├── scripts/                    # Project validation, build, and maintenance scripts
│   └── verify-project.js       # Automated end-to-end integrity check
├── docs/                       # Project specifications & architecture documentation
│   └── requirements_and_architecture.md
├── .env.example                # Documented root environment variable template
├── .gitignore                  # Git ignore rules for node_modules, secrets, logs, build artifacts
├── package.json                # Root package.json with npm workspaces and unified scripts
├── README.md                   # Project overview and setup instructions
└── SkillVault_Roadmap.md       # Central progress tracker and phase specifications
```

---

## 4. Setup and Environment Configuration

### Prerequisites
- Node.js (v18+ or latest LTS)
- npm or pnpm / yarn
- MongoDB (local instance or MongoDB Atlas cluster)

### Environment Variables
SkillVault uses environment variables for both server and client configurations. Template variables are provided in `.env.example`.

1. Copy `.env.example` to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the environment variables:
   - `PORT`: Backend server port (default: `5000`).
   - `NODE_ENV`: Set to `development` or `production`.
   - `CLIENT_ORIGIN`: Allowed origin for CORS (e.g., `http://localhost:5173`).
   - `MONGODB_URI`: MongoDB connection string.
   - `JWT_SECRET`: Secure secret key for signing JSON Web Tokens.
   - `GEMINI_API_KEY`: Google Gemini API key (backend only).
   - `VITE_API_BASE_URL`: Base API endpoint for the React client (e.g., `http://localhost:5000/api`).

> **Security Note**: Never commit `.env` or real secrets/credentials to version control. Keep all API keys and database credentials strictly server-side.

### Available Scripts

Run unified scripts from the root directory or directly inside each workspace:

| Command | Workspace | Description |
| :--- | :--- | :--- |
| `npm run dev:client` | `client` | Start frontend Vite development server (`http://localhost:5173`) |
| `npm run dev:server` | `server` | Start backend Express development server with `--watch` |
| `npm run build` | `client` | Build production frontend bundle |
| `npm test` | `server` | Run automated backend test suite with native `node:test` runner |
| `npm run verify` | Root | Run comprehensive project integrity and build checks |

---

## 5. Implementation Roadmap & Progress

SkillVault development follows a phased implementation plan documented in [`SkillVault_Roadmap.md`](./SkillVault_Roadmap.md). Implementation proceeds phase by phase only upon explicit request.
