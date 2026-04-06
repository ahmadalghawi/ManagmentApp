/**
 * Replaces Turbopack's hashed external module copies in .next/node_modules/
 * with lightweight proxies that redirect to the real packages in node_modules/.
 *
 * Why: Turbopack renames external packages (e.g. better-sqlite3 → better-sqlite3-90e2652d...)
 * and copies them into .next/node_modules/. But @electron/rebuild only rebuilds the real
 * node_modules/better-sqlite3/ — so the .next copy has a native binary compiled for the
 * wrong Node.js ABI. The proxy avoids the stale copy entirely.
 */
const fs = require('fs');
const path = require('path');

const nextNodeModules = path.join(__dirname, '..', '.next', 'node_modules');
if (!fs.existsSync(nextNodeModules)) {
  console.log('[fix-externals] No .next/node_modules found, skipping.');
  process.exit(0);
}

// Packages that have native binaries and need the proxy treatment
const nativePackages = ['better-sqlite3'];

fs.readdirSync(nextNodeModules).forEach(name => {
  for (const pkg of nativePackages) {
    if (name.startsWith(pkg + '-') && name !== pkg) {
      const dir = path.join(nextNodeModules, name);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name, main: 'index.js' })
      );
      fs.writeFileSync(
        path.join(dir, 'index.js'),
        `module.exports = require("${pkg}");\n`
      );
      console.log(`[fix-externals] ${name} -> proxy to ${pkg}`);
    }
  }
});
