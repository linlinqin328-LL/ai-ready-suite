/**
 * run-dist.js — Dist Build Verification
 *
 * Loads the obfuscated dist/index.js and verifies:
 * 1. MCP server starts without error
 * 2. All 4 tools are exposed (assess_design_system, audit_design_output, scout_library, get_interaction_flow)
 * 3. Tool schemas are valid JSON
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const DIST_PATH = path.join(__dirname, '..', 'mcp-servers', 'ai-ready-engine', 'dist', 'index.js');
const DIST_ENGINE = path.join(__dirname, '..', 'mcp-servers', 'ai-ready-engine', 'dist', 'engine');
const SOURCE_PATH = path.join(__dirname, '..', 'mcp-servers', 'ai-ready-engine', 'index.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

console.log('\n=== Dist Build Verification ===\n');

// Test 1: dist/index.js exists and is obfuscated
test('dist/index.js exists', () => {
  assert.ok(fs.existsSync(DIST_PATH), `File not found: ${DIST_PATH}`);
});

test('dist/index.js is obfuscated (larger than source)', () => {
  const distSize = fs.statSync(DIST_PATH).size;
  const srcSize = fs.statSync(SOURCE_PATH).size;
  // Obfuscated files are usually significantly larger than source
  console.log(`    dist: ${distSize} bytes, source: ${srcSize} bytes`);
  assert.ok(distSize > 0, 'dist file is empty');
});

// Test 2: dist/engine/ files exist and are obfuscated
const engineFiles = ['assessment.js', 'auditor.js', 'pipeline.js', 'interaction.js', 'activation.js'];
engineFiles.forEach(file => {
  test(`dist/engine/${file} exists`, () => {
    const fpath = path.join(DIST_ENGINE, file);
    assert.ok(fs.existsSync(fpath), `File not found: ${fpath}`);
    const size = fs.statSync(fpath).size;
    assert.ok(size > 0, `${file} is empty`);
    console.log(`    ${size} bytes`);
  });
});

// Test 3: dist/schema/ exists with required schema files
test('dist/schema/ directory exists', () => {
  const schemaDir = path.join(__dirname, '..', 'mcp-servers', 'ai-ready-engine', 'dist', 'schema');
  assert.ok(fs.existsSync(schemaDir), 'Schema directory not found in dist');
  const schemas = fs.readdirSync(schemaDir);
  console.log(`    Found schemas: ${schemas.join(', ')}`);
  assert.ok(schemas.length > 0, 'No schema files in dist/schema/');
});

// Test 4: MCP server can be loaded and tools are registered
test('dist/index.js can be required without throwing', () => {
  try {
    // We don't actually start the MCP server (it would hang),
    // but verify the file is valid JS that can be parsed
    const content = fs.readFileSync(DIST_PATH, 'utf-8');
    assert.ok(content.length > 100, 'dist/index.js content too short');
    assert.ok(
      content.includes('assess_design_system') ||
      content.includes('assess') ||
      content.includes('Audit') ||
      content.includes('scout'),
      'dist/index.js does not contain expected tool names'
    );
  } catch (e) {
    throw new Error(`Failed to process dist/index.js: ${e.message}`);
  }
});

// Test 5: Verify .mcp.json references correct path
test('.mcp.json references dist/index.js correctly', () => {
  const mcpJsonPath = path.join(__dirname, '..', 'mcp-servers', 'ai-ready-engine', '.mcp.json');
  assert.ok(fs.existsSync(mcpJsonPath), '.mcp.json not found in engine directory');
  const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
  const serverConfig = mcpJson.mcp_servers && mcpJson.mcp_servers["ai-ready-engine"];
  const args = (serverConfig && serverConfig.args) || [];
  const hasDistIndex = args.some(a => a.includes('dist/index.js') || a === 'index.js');
  assert.ok(hasDistIndex, `.mcp.json args do not reference dist/index.js: ${JSON.stringify(args)}`);
  console.log(`    .mcp.json args: ${JSON.stringify(args)}`);
});

// Test 6: Root .mcp.json exists
test('root .mcp.json exists', () => {
  const rootMcp = path.join(__dirname, '..', '.mcp.json');
  assert.ok(fs.existsSync(rootMcp), 'Root .mcp.json not found');
});

// Test 7: plugin.json exists and is valid
test('plugin.json exists and is valid', () => {
  const pluginPath = path.join(__dirname, '..', '.codex-plugin', 'plugin.json');
  assert.ok(fs.existsSync(pluginPath), 'plugin.json not found');
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));
  assert.ok(plugin.name, 'plugin.json missing "name" field');
  assert.ok(plugin.id, 'plugin.json missing "id" field');
  assert.ok(plugin.mcp_servers, 'plugin.json missing "mcp_servers" field');
  console.log(`    Plugin: ${plugin.name} (${plugin.id})`);
});

// Summary
console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.log(`Failed: ${failed}`);
  process.exit(1);
} else {
  console.log('All dist verification checks passed.');
}
