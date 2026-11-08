#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('\n========================================');
console.log('  SkillVault: Project Integrity Check');
console.log('========================================\n');

let failed = false;

function check(label, fn) {
  try {
    process.stdout.write(`  [CHECK] ${label}... `);
    fn();
    console.log('PASS');
  } catch (err) {
    console.log('FAIL');
    console.error(`    -> ${err.message}`);
    failed = true;
  }
}

// 1. Structure Verification
check('Root and documentation files exist', () => {
  const rootFiles = [
    'package.json',
    '.gitignore',
    '.env.example',
    'README.md',
    'docs/SkillVault_Roadmap.md',
    'docs/IMPLEMENTATION.md',
    'docs/ARCHITECTURE.md',
    'docs/API_DOCUMENTATION.md'
  ];
  for (const file of rootFiles) {
    if (!existsSync(resolve(rootDir, file))) {
      throw new Error(`Missing root or doc file: ${file}`);
    }
  }
});

check('Frontend structure, pages, and components exist', () => {
  const clientFiles = [
    'client/package.json',
    'client/index.html',
    'client/vite.config.js',
    'client/public/favicon.svg',
    'client/public/robots.txt',
    'client/src/App.jsx',
    'client/src/main.jsx',
    'client/src/routes/AppRoutes.jsx',
    'client/src/components/layout/Layout.jsx',
    'client/src/components/layout/Layout.css',
    'client/src/components/layout/Navbar.jsx',
    'client/src/components/layout/Navbar.css',
    'client/src/components/layout/Footer.jsx',
    'client/src/components/layout/Footer.css',
    'client/src/components/common/ProtectedRoute.jsx',
    'client/src/components/common/ProtectedRoute.css',
    'client/src/pages/Home.jsx',
    'client/src/pages/Home.css',
    'client/src/pages/Login.jsx',
    'client/src/pages/Login.css',
    'client/src/pages/Signup.jsx',
    'client/src/pages/Signup.css',
    'client/src/pages/Auth.css',
    'client/src/pages/Dashboard.jsx',
    'client/src/pages/Dashboard.css',
    'client/src/pages/Categories.jsx',
    'client/src/pages/Categories.css',
    'client/src/pages/SkillDetail.jsx',
    'client/src/pages/SkillDetail.css',
    'client/src/pages/Playlist.jsx',
    'client/src/pages/Playlist.css',
    'client/src/pages/Video.jsx',
    'client/src/pages/Video.css',
    'client/src/pages/Bookmarks.jsx',
    'client/src/pages/Bookmarks.css',
    'client/src/pages/Search.jsx',
    'client/src/pages/Search.css',
    'client/src/pages/Profile.jsx',
    'client/src/pages/Profile.css',
    'client/src/pages/Admin.jsx',
    'client/src/pages/Admin.css',
    'client/src/pages/NotFound.jsx',
    'client/src/pages/NotFound.css',
    'client/src/styles/index.css',
    'client/src/services/api.js',
    'client/src/api/client.js'
  ];
  for (const file of clientFiles) {
    if (!existsSync(resolve(rootDir, file))) {
      throw new Error(`Missing client file: ${file}`);
    }
  }
});

check('Backend, database and config files exist', () => {
  const serverFiles = [
    'server/package.json',
    'server/src/server.js',
    'server/src/app.js',
    'server/src/config/env.js',
    'server/src/config/database.js',
    'server/src/config/db.js',
    'server/src/middleware/errorHandler.js',
    'server/src/utils/ApiError.js',
    'server/src/utils/ApiResponse.js',
    'database/seeds/seedAdmin.js',
    'database/seeds/seedCatalog.js',
    'server/src/seeds/seedAdmin.js',
    'server/src/seeds/seedCatalog.js'
  ];
  for (const file of serverFiles) {
    if (!existsSync(resolve(rootDir, file))) {
      throw new Error(`Missing backend/database file: ${file}`);
    }
  }
});

// 2. Unit and Integration Tests
check('Backend unit tests pass', () => {
  execSync('node --test tests/env.test.js tests/utils.test.js', {
    cwd: resolve(rootDir, 'server'),
    stdio: 'pipe',
    encoding: 'utf-8'
  });
});

// 3. Frontend Production Build
check('Frontend production build succeeds', () => {
  execSync('npm run build', {
    cwd: resolve(rootDir, 'client'),
    stdio: 'pipe',
    encoding: 'utf-8'
  });
});

console.log('\n========================================');
if (failed) {
  console.error('  Integrity Check: FAILED');
  console.log('========================================\n');
  process.exit(1);
} else {
  console.log('  Integrity Check: ALL CHECKS PASSED');
  console.log('========================================\n');
  process.exit(0);
}
