/**
 * Post-build script: prepares the standalone bundle for Electron packaging.
 *
 * 1. Copies .next/static and public/ into the standalone directory
 * 2. Proxies ALL copies of better-sqlite3 to the root node_modules version
 *    (which electron-builder rebuilds for Electron's Node ABI)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.error('[copy-standalone] .next/standalone not found! Ensure output: "standalone" in next.config.mjs');
  process.exit(1);
}

// 1. Copy .next/static → standalone/.next/static
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));
console.log('[copy-standalone] ✓ .next/static');

// 2. Copy public/ → standalone/public
copyDir(path.join(root, 'public'), path.join(standalone, 'public'));
console.log('[copy-standalone] ✓ public/');

// 3. Copy database/ → standalone/database
copyDir(path.join(root, 'database'), path.join(standalone, 'database'));
console.log('[copy-standalone] ✓ database/');

// 4. Proxy hashed Turbopack copies (.next/standalone/.next/node_modules/better-sqlite3-HASH)
const nextNM = path.join(standalone, '.next', 'node_modules');
const nativePkgs = ['better-sqlite3'];

if (fs.existsSync(nextNM)) {
  for (const entry of fs.readdirSync(nextNM)) {
    for (const pkg of nativePkgs) {
      if (entry.startsWith(pkg + '-') && entry !== pkg) {
        const dir = path.join(nextNM, entry);
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: entry, main: 'index.js' }));
        fs.writeFileSync(path.join(dir, 'index.js'), `module.exports = require("${pkg}");\n`);
        console.log(`[copy-standalone] ✓ Proxied ${entry} → ${pkg}`);
      }
    }
  }
}

// 5. Proxy standalone/node_modules/better-sqlite3 → root node_modules/better-sqlite3
//    The root copy is rebuilt for Electron by electron-builder (npmRebuild: true).
//    Path: from standalone/node_modules/PKG/ up 4 levels to app root, then into node_modules/PKG
for (const pkg of nativePkgs) {
  const pkgDir = path.join(standalone, 'node_modules', pkg);
  if (fs.existsSync(pkgDir)) {
    fs.rmSync(pkgDir, { recursive: true, force: true });
  }
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: pkg, main: 'index.js' }));
  // __dirname = standalone/node_modules/better-sqlite3/
  // ../../../../node_modules/better-sqlite3 = <app root>/node_modules/better-sqlite3
  fs.writeFileSync(
    path.join(pkgDir, 'index.js'),
    `const path = require('path');\nmodule.exports = require(path.join(__dirname, '..', '..', '..', '..', 'node_modules', '${pkg}'));\n`
  );
  console.log(`[copy-standalone] ✓ Proxied standalone ${pkg} → root node_modules/${pkg}`);
}

console.log('[copy-standalone] Done ✓');

// ── Utility ──────────────────────────────────────────────────────────────────
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
