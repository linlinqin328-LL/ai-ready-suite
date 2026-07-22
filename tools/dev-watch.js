/**
 * dev-watch.js — AI Ready Suite Development File Watcher
 *
 * Watches source files and auto-rebuilds `dist/` on changes.
 * Local CI/CD for development.
 *
 * Usage:
 *   npm run dev:watch
 *   # or directly: node tools/dev-watch.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENGINE_DIR = path.join(ROOT, 'mcp-servers', 'ai-ready-engine');

// Files/directories to watch for changes
const WATCH_PATHS = [
  path.join(ENGINE_DIR, 'index.js'),
  path.join(ENGINE_DIR, 'engine'),
  path.join(ENGINE_DIR, 'schema'),
  path.join(ROOT, 'skills', 'ai-ready-suite', 'SKILL.md'),
];

// Debounce timeout in ms
const DEBOUNCE_MS = 500;

let buildTimer = null;
let isBuilding = false;

function runBuild() {
  if (isBuilding) {
    console.log('[dev-watch] Build already in progress, queuing...');
    if (buildTimer) clearTimeout(buildTimer);
    buildTimer = setTimeout(runBuild, DEBOUNCE_MS);
    return;
  }

  isBuilding = true;
  const start = Date.now();
  console.log(`\n[dev-watch] 🔨 Building... (${new Date().toLocaleTimeString()})`);

  const child = spawn('npm', ['run', 'build:all'], {
    cwd: ENGINE_DIR,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    isBuilding = false;
    if (code === 0) {
      console.log(`[dev-watch] ✅ Build complete (${elapsed}s)`);
    } else {
      console.error(`[dev-watch] ❌ Build failed (${elapsed}s, exit ${code})`);
    }
  });
}

function watchDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`[dev-watch] ⚠️  Path does not exist, skipping: ${dirPath}`);
    return;
  }

  try {
    fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      if (filename.startsWith('.')) return; // skip hidden files
      console.log(`[dev-watch] 📁 Changed: ${filename}`);

      if (buildTimer) clearTimeout(buildTimer);
      buildTimer = setTimeout(runBuild, DEBOUNCE_MS);
    });
    console.log(`[dev-watch] 👀 Watching: ${dirPath}`);
  } catch (err) {
    console.error(`[dev-watch] ❌ Watch error for ${dirPath}: ${err.message}`);
  }
}

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   AI Ready Suite — Dev Watch             ║');
console.log('║   Auto-rebuilds dist/ on source changes  ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Watch each path
WATCH_PATHS.forEach(p => {
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    watchDir(p);
  } else {
    const parent = path.dirname(p);
    if (fs.existsSync(parent)) watchDir(parent);
  }
});

console.log('\n[dev-watch] Ready. Waiting for changes... (Ctrl+C to stop)\n');

// Initial build on start
runBuild();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[dev-watch] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[dev-watch] Shutting down...');
  process.exit(0);
});
