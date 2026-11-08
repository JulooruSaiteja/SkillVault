#!/usr/bin/env node
/**
 * SkillVault Security Audit & Secret Scanner
 * Lightweight, cross-platform pre-commit and CI verification tool.
 * Scans working tree and staged files for credentials, private keys,
 * environment files, and secret patterns without leaking secret values.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('\n========================================');
console.log('  SkillVault: Security & Secret Audit');
console.log('========================================\n');

let issuesFound = 0;

function reportIssue(category, description, location) {
  issuesFound++;
  console.error(`  [SECURITY ALERT] [${category}] ${description}`);
  if (location) {
    console.error(`    Location: ${location}`);
  }
}

// 1. Check Git Tracked Files for Secrets & Env Files
try {
  const trackedFiles = execSync('git ls-files', { cwd: rootDir, encoding: 'utf-8' })
    .trim()
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const sensitiveTrackedPatterns = [
    { pattern: /(^|\/)\.env($|\.(?!example$)[^/]+$)/i, desc: 'Environment file with potential credentials' },
    { pattern: /\.(pem|key|p12|pfx|cer|crt)$/i, desc: 'Private key or certificate file' },
    { pattern: /(credentials|service-account.*|client_secret.*)\.json$/i, desc: 'Service account or credentials JSON' },
    { pattern: /\.(dump|bak|sql\.gz|sqlite|sqlite3)$/i, desc: 'Database dump or backup file' }
  ];

  for (const file of trackedFiles) {
    for (const { pattern, desc } of sensitiveTrackedPatterns) {
      if (pattern.test(file)) {
        reportIssue('Tracked Sensitive File', desc, file);
      }
    }
  }
} catch (err) {
  console.warn('  [WARN] Unable to inspect git tracked files:', err.message);
}

// 2. Secret Signatures in Working Tree Code Files
const SECRET_SIGNATURES = [
  {
    name: 'Google API Key',
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    isReal: (match) => !match.includes('placeholder') && !match.includes('example')
  },
  {
    name: 'Live MongoDB Connection with Password',
    regex: /mongodb(?:\+srv)?:\/\/[^\s:]+:[^\s@]+@(?!127\.0\.0\.1|localhost|example\.com)[^\s]+/gi,
    isReal: (match) => !match.includes('placeholder') && !match.includes('your_')
  },
  {
    name: 'Private Key Header',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    isReal: () => true
  },
  {
    name: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    isReal: (match) => !match.includes('EXAMPLE')
  },
  {
    name: 'GitHub Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    isReal: () => true
  }
];

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.cache', 'scratch']);
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.json', '.html', '.md', '.env', '.env.example']);

function scanDirectory(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else {
      const ext = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : '';
      if (!CODE_EXTENSIONS.has(ext) && !entry.name.startsWith('.env')) {
        continue;
      }
      if (entry.name === 'package-lock.json') {
        continue;
      }

      try {
        const content = readFileSync(fullPath, 'utf-8');
        for (const sig of SECRET_SIGNATURES) {
          const matches = content.match(sig.regex);
          if (matches) {
            const detected = matches.filter(sig.isReal);
            if (detected.length > 0) {
              reportIssue('Hardcoded Secret Signature', `${sig.name} detected (${detected.length} occurrence(s))`, fullPath);
            }
          }
        }
      } catch {}
    }
  }
}

scanDirectory(rootDir);

// 3. Optional Gitleaks Integration
try {
  execSync('gitleaks version', { stdio: 'ignore' });
  console.log('  [INFO] Gitleaks detected on system path. Running gitleaks audit...');
  try {
    execSync('gitleaks detect --source . --redact --no-banner', { cwd: rootDir, stdio: 'inherit' });
    console.log('  [PASS] Gitleaks scan passed cleanly.');
  } catch {
    issuesFound++;
    console.error('  [SECURITY ALERT] Gitleaks reported potential secrets in history.');
  }
} catch {
  // Gitleaks not installed; native scanner handles workspace
}

console.log('\n========================================');
if (issuesFound > 0) {
  console.error(`  Audit Complete: ${issuesFound} security issue(s) identified.`);
  console.error('  Please remediate identified secrets before pushing to GitHub.\n');
  process.exit(1);
} else {
  console.log('  Audit Complete: ALL CHECKS PASSED.');
  console.log('  No tracked secrets, credentials, or sensitive files found.\n');
  process.exit(0);
}
