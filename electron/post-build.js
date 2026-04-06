/**
 * Post electron-builder:
 * 1. Rebuild better-sqlite3 for Electron inside the packaged output directory
 * 2. Restore better-sqlite3 for system Node.js in the source so npm run dev works
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'dist', 'win-unpacked', 'resources', 'app');

if (!fs.existsSync(appDir)) {
  console.log('[post-build] No dist/win-unpacked found, skipping.');
  process.exit(0);
}

// 1. Rebuild better-sqlite3 for Electron inside the packaged app
console.log('[post-build] Rebuilding better-sqlite3 for Electron in packaged app...');
execFileSync('npx', ['@electron/rebuild', '-f', '-w', 'better-sqlite3'], {
  stdio: 'inherit',
  cwd: appDir,
  shell: true,
});

// 2. Restore for system Node.js in source so dev mode works
console.log('[post-build] Restoring better-sqlite3 for system Node.js...');
execFileSync('npm', ['rebuild', 'better-sqlite3'], {
  stdio: 'inherit',
  cwd: root,
  shell: true,
});

console.log('[post-build] Done.');
