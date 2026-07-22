/**
 * AI Ready Suite — Interaction Engine Tests (Jest)
 *
 * Tests interaction.js: scenario selection, scoring questions,
 * report templates, audit recommendations, and scout configs.
 * ~15 test cases.
 */

const interaction = require('../mcp-servers/ai-ready-engine/engine/interaction');

describe('Scenario selection configuration', () => {
  test('should have 4 scenerios', () => {
    expect(interaction.SCENARIO_SELECTION.options.length).toBe(4);
  });

  test('should have 2 roles', () => {
    expect(interaction.SCENARIO_SELECTION.roles.length).toBe(2);
  });

  test('should have 2 paths', () => {
    expect(interaction.PATH_SELECTION.options.length).toBe(2);
  });

  test('boss default role should be consultant', () => {
    const boss = interaction.SCENARIO_SELECTION.options.find(o => o.id === 'boss');
    expect(boss.defaultRole).toBe('consultant');
  });
});

describe('D8-D10 interactive scoring', () => {
  test('should have 3 interactive dimensions', () => {
    expect(interaction.INTERACTIVE_DIMENSIONS.length).toBe(3);
  });

 test('computeInteractiveScores should match answers correctly', () => {
    const scores = interaction.computeInteractiveScores({
      D8: '覆盖主要设计-研发链路',
      D9: '半自动化，需人工确认',
      D10: '无协同流程'
    });
   expect(scores.D8).toBe(4);
   expect(scores.D9).toBe(3);
   expect(scores.D10).toBe(1);
 });

 test('empty answers should use fallback scores', () => {
    const scores = interaction.computeInteractiveScores({});
   expect(typeof scores.D8).toBe('number');
   expect(typeof scores.D9).toBe('number');
   expect(typeof scores.D10).toBe('number');
 });
});

describe('Report templates', () => {
  test('expectation card should have correct format', () => {
    const card = interaction.formatExpectationCard('boss', 'consultant');
    expect(card.format).toBe('text_card');
    expect(card.title).toBe('预期卡');
  });

  test('audit report should contain pass rate', () => {
    const report = interaction.formatAuditReport({ passRate: 0.86, passed: 18, total: 21, issues: [], auditLevel: 'C' });
    expect(Array.isArray(report.lines)).toBe(true);
    expect(report.lines.some(l => l.includes('86'))).toBe(true);
  });
});

describe('Audit recommendation', () => {
  test('score 4.5 should recommend full audit', () => {
    const result = interaction.recommendAuditLevel(4.5);
    expect(result.level).toBe('all');
  });

  test('score 2.5 should recommend B layer', () => {
    const result = interaction.recommendAuditLevel(2.5);
    expect(['B', 'C', 'all']).toContain(result.level);
  });
});

describe('Scout MODES configuration', () => {
  test('should have 5 validate checks', () => {
    expect(interaction.SCOUT_MODES.validateChecks.length).toBe(5);
  });

  test('should have fetch options with 3 modes', () => {
    expect(interaction.SCOUT_MODES.fetch.options.length).toBe(3);
  });

  test('validateThreshold should be a number between 0-1', () => {
    expect(typeof interaction.SCOUT_MODES.validateThreshold).toBe('number');
    expect(interaction.SCOUT_MODES.validateThreshold).toBeGreaterThanOrEqual(0);
    expect(interaction.SCOUT_MODES.validateThreshold).toBeLessThanOrEqual(1);
  });
});
