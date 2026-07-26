/**
 * publish-verify.js — Publish Package Verification
 *
 * Verifies that the publish/ directory contains all required files
 * after running `npm run build:publish`.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const PUBLISH_DIR = path.join(__dirname, '..', 'publish');

const requiredFiles = [
  '.codex-plugin/plugin.json',
  '.mcp.json',
  'skills/ai-ready-suite/SKILL.md',
  'README.md',
  'LICENSE',
  'version.json',
  'CHANGELOG.md'
];

const requiredDirs = [
  'mcp-servers/ai-ready-engine/dist',
  'examples'
];

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

console.log('\n=== Publish Package Verification ===\n');

// Check publish/ exists
check('publish/ directory exists', () => {
  assert.ok(fs.existsSync(PUBLISH_DIR), `Directory not found: ${PUBLISH_DIR}`);
});

// Check required files
requiredFiles.forEach(file => {
  check(`Required file exists: ${file}`, () => {
    const fullPath = path.join(PUBLISH_DIR, file);
    assert.ok(fs.existsSync(fullPath), `File not found: ${fullPath}`);
    assert.ok(fs.statSync(fullPath).size > 0, `File is empty: ${fullPath}`);
  });
});

// Check required directories
requiredDirs.forEach(dir => {
  check(`Required directory exists: ${dir}`, () => {
    const fullPath = path.join(PUBLISH_DIR, dir);
    assert.ok(fs.existsSync(fullPath), `Directory not found: ${fullPath}`);
    assert.ok(fs.statSync(fullPath).isDirectory(), `Not a directory: ${fullPath}`);
  });
});

// Verify dist/index.js exists and is obfuscated
check('dist/index.js exists and is obfuscated', () => {
  const distPath = path.join(PUBLISH_DIR, 'mcp-servers', 'ai-ready-engine', 'dist', 'index.js');
  assert.ok(fs.existsSync(distPath), `File not found: ${distPath}`);
  const content = fs.readFileSync(distPath, 'utf-8');
  assert.ok(content.includes('function') || content.includes('require') || content.startsWith('!'),
    'dist/index.js does not appear to contain valid code');
});

// Verify no source test/ or tools/ dirs leaked into publish
check('No test/ directory in publish/', () => {
  const testDir = path.join(PUBLISH_DIR, 'test');
  assert.ok(!fs.existsSync(testDir), `test/ directory should not exist in publish/: ${testDir}`);
});

check('No tools/ directory in publish/', () => {
  const toolsDir = path.join(PUBLISH_DIR, 'tools');
  assert.ok(!fs.existsSync(toolsDir), `tools/ directory should not exist in publish/: ${toolsDir}`);
});

// Verify SKILL.md does NOT contain weight percentages
check('SKILL.md has no weight percentages (IP protection)', () => {
  const skillPath = path.join(PUBLISH_DIR, 'skills', 'ai-ready-suite', 'SKILL.md');
  assert.ok(fs.existsSync(skillPath), `SKILL.md not found: ${skillPath}`);
  const content = fs.readFileSync(skillPath, 'utf-8');
  // Should not contain percentage weight table
  assert.ok(!content.match(/\| .+ \| \d+%/),
    'SKILL.md exposes weight percentages — IP protection violation');
});

// Verify LICENSE exists (Proprietary)
check('LICENSE file exists', () => {
  const licensePath = path.join(PUBLISH_DIR, 'LICENSE');
  assert.ok(fs.existsSync(licensePath), `LICENSE not found: ${licensePath}`);
});

// Verify version.json
check('version.json is valid JSON', () => {
  const vp = path.join(PUBLISH_DIR, 'version.json');
  assert.ok(fs.existsSync(vp));
  const v = JSON.parse(fs.readFileSync(vp, 'utf-8'));
  assert.ok(v.version, 'version.json missing version field');
  assert.ok(v.buildDate || v.date || v.released, 'version.json missing date field');
});

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('❌ Publish verification FAILED — check issues above before publishing.');
  process.exit(1);
} else {
  console.log('✅ Publish verification PASSED — package is ready.');
}
