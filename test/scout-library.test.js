/**
 * AI Ready Suite — Scout Library Tests (Jest)
 *
 * Tests scout_library discover/fetch/validate modes.
 */

describe('Scout library tool', () => {
  let indexModule;

  beforeAll(() => {
    // The index.js exports scout logic through tool handlers
    // We test the validate logic via the interaction module
    indexModule = require('../mcp-servers/ai-ready-engine/engine/interaction');
  });

  test('SCOUT_MODES should have correct validate checks structure', () => {
    const checks = indexModule.SCOUT_MODES.validateChecks;
    expect(checks.length).toBe(5);
    expect(checks[0]).toHaveProperty('id');
    expect(checks[0]).toHaveProperty('name');
    expect(checks[0].id).toBe('V1');
  });

   test('SCOUT_MODES should have fetch options with 3 modes', () => {
     expect(indexModule.SCOUT_MODES.fetch.options.length).toBe(3);
     const ids = indexModule.SCOUT_MODES.fetch.options.map(o => o.id);
     expect(ids).toContain('single');
     expect(ids).toContain('batch');
     expect(ids).toContain('smart');
  });

  test('validateThreshold should be a number between 0 and 1', () => {
    const threshold = indexModule.SCOUT_MODES.validateThreshold;
    expect(typeof threshold).toBe('number');
    expect(threshold).toBeGreaterThanOrEqual(0);
    expect(threshold).toBeLessThanOrEqual(1);
  });
});
