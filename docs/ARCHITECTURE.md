# SkillVault Architecture

This document describes the clean, beginner-friendly architecture and folder layout of the **SkillVault** project.

---

## 1. Monorepo Organization

SkillVault is organized as a lightweight monorepo using standard npm workspaces:

```text
SkillVault/
├── client/        # Frontend React SPA (Vite, React 18, React Router v6)
├── server/        # Backend API service (Node.js ES Modules, Express, Mongoose)
├── database/      # Database provisioning and seed scripts
├── docs/          # Project documentation and architectural records
└── scripts/       # Automation and integrity verification runners
```

Root scripts allow orchestrating client and server workloads effortlessly:
- `npm run dev` – Launch client dev server
- `npm run dev:server` – Launch backend server in watch mode
- `npm run build` – Compile production client bundle
- `npm run seed:admin` – Seed administrator user account
- `npm run verify` – Run complete project integrity verification

---

## 2. Frontend Layer (`client/src/`)

```text
client/src/
├── assets/                  # Brand assets, static SVGs, and images
│   ├── images/
│   └── icons/
├── components/              # Modular UI components
│   ├── common/              # Cross-cutting components (e.g. ProtectedRoute)
│   └── layout/              # Application layout shell (Navbar, Footer, Layout)
├── pages/                   # Application pages with colocated matching stylesheets
│   ├── Home.jsx / Home.css
│   ├── Login.jsx / Login.css
│   ├── Signup.jsx / Signup.css
│   ├── Auth.css             # Shared authentication styling
│   ├── Dashboard.jsx / Dashboard.css
│   ├── Categories.jsx / Categories.css
│   ├── SkillDetail.jsx / SkillDetail.css
│   ├── Playlist.jsx / Playlist.css
│   ├── Video.jsx / Video.css
│   ├── Bookmarks.jsx / Bookmarks.css
│   ├── Search.jsx / Search.css
│   ├── Profile.jsx / Profile.css
│   ├── Admin.jsx / Admin.css
│   └── NotFound.jsx / NotFound.css
├── routes/
│   └── AppRoutes.jsx        # Declarative routing and layout outlets
├── context/
│   └── AuthContext.jsx      # Session state and authentication operations
├── hooks/
│   └── useAuth.js           # Convenience consumer hook for AuthContext
├── services/
│   └── api.js               # Centralized HTTP client (fetch, credentials, ApiError)
├── styles/
│   └── index.css            # Global CSS variables, reset, and base typography
├── App.jsx                  # Root container providing AuthProvider
└── main.jsx                 # Vite application entry point
```

---

## 3. Backend Layer (`server/src/`)

The backend follows a layered MVC-service pattern using native ES modules (`"type": "module"`):

```text
server/src/
├── config/                  # Configuration, database connection, and environment parsing
│   ├── db.js / database.js
│   ├── env.js
│   └── aiConfig.js
├── routes/                  # Express REST router definitions
├── controllers/             # HTTP controllers handling requests and responses
├── models/                  # Mongoose models and schemas
├── middleware/              # Auth, role check, error normalization, and rate limiting
├── services/                # Business logic, Gemini AI client, and quota tracking
├── utils/                   # ApiError, ApiResponse, logger, and tokens
├── seeds/                   # Backward-compatibility proxies delegating to database/seeds
├── app.js                   # Express application setup
└── server.js                # HTTP listener and graceful shutdown
```

---

## 4. Database Layer (`database/seeds/`)

Independent database provisioning and catalog seed scripts reside at the root level under `database/`:
- `database/seeds/seedAdmin.js` – Provisions sole administrator credentials with bcrypt hashing.
- `database/seeds/seedCatalog.js` – Seeds computing categories, skills, playlists, and video catalog.
