/**
 * AI Ready Suite — Integration Tests (Jest)
 *
 * Tests end-to-end MCP server tool calling flow.
 * 15 test cases: full assessment pipeline, audit, quick diagnosis, empty data.
 */

const { computeScoring, computeQuickDiagnosis } = require('../mcp-servers/ai-ready-engine/engine/assessment');
const { auditDesignOutput } = require('../mcp-servers/ai-ready-engine/engine/auditor');
const { runPipeline } = require('../mcp-servers/ai-ready-engine/engine/pipeline');

const sampleComponents = [
  { name: 'Button/Primary', width: 80, height: 32, props: { type: 'primary', size: 'md' }, description: '主要操作按钮' },
  { name: 'Button/Default', width: 80, height: 32, props: { type: 'default', size: 'md' }, description: '' },
  { name: 'Button=primary', width: 80, height: 32, props: { type: 'primary' }, description: '' },
  { name: 'Button=default', width: 80, height: 32, props: { type: 'default' }, description: '' },
  { name: 'PlusIcon', width: 16, height: 16, props: {}, description: '' },
  { name: 'SearchIcon', width: 16, height: 16, props: {}, description: '' },
  { name: 'Card', width: 300, height: 200, children: [], props: { title: 'string' }, description: '卡片容器' },
  { name: 'Input', width: 200, height: 32, props: { placeholder: 'string', type: 'text' }, description: '输入框' },
  { name: 'Table', width: 900, height: 600, children: [], props: { columns: 'array', data: 'array' }, description: '数据表格' }
];

describe('Integration: Full assessment pipeline', () => {
  let d0Result;

  beforeAll(() => {
    d0Result = runPipeline(sampleComponents, ['--color-primary', '--font-size-base'], true);
  });

  test('D0 pipeline should have 9 raw files', () => {
    expect(d0Result.componentSummary.rawFiles).toBe(9);
  });

  test('D0 pipeline base components should be >= 2 (post variant normalization)', () => {
    expect(d0Result.componentSummary.baseComponents).toBeGreaterThanOrEqual(2);
  });

  test('D0 pipeline should identify at least 2 icons', () => {
    expect(d0Result.componentSummary.iconsIdentified).toBeGreaterThanOrEqual(2);
  });

  test('D0 pipeline data quality should be full or partial', () => {
    expect(['full', 'partial']).toContain(d0Result.dataQuality);
  });

  test('scoring overall should be between 0-5', () => {
    const dimScores = {
      D1: Math.min(5, 2.0 + (d0Result.completeness.propCoverage > 50 ? 1.0 : 0) + (d0Result.completeness.propCoverage > 20 ? 0.5 : 0)),
      D2: 3.5,
      D3: d0Result.completeness.descriptionCoverage * 5,
      D4: 3.0,
      D5: 2.5,
      D6: d0Result.tokenBinding.bindingRate * 5,
      D7: 1.5,
      D8: 2.0,
      D9: 1.0,
      D10: 1.0
    };
    const result = computeScoring(dimScores, d0Result.dataQuality, {
      jsonCompleteness: 100,
      descriptionCoverage: d0Result.completeness.descriptionCoverage,
      propCoverage: d0Result.completeness.propCoverage,
      tokenBindingVerified: d0Result.tokenBinding.bindingRate > 0.1
    });
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(5);
  });

  test('AI Ready level should be valid', () => {
    const dimScores = {
      D1: 2.5, D2: 3.5, D3: 2.0, D4: 3.0, D5: 2.5,
      D6: 1.0, D7: 1.5, D8: 2.0, D9: 1.0, D10: 1.0
    };
    const result = computeScoring(dimScores, d0Result.dataQuality, {});
    expect(['L0', 'L1', 'L2', 'L3']).toContain(result.scored.aiReadyLevel);
  });

  test('confidence should be high or medium', () => {
    const result = computeScoring({}, 'full', {});
    expect(['high', 'medium']).toContain(result.confidence.level);
  });
});

describe('Integration: Audit mode', () => {
  test('audit should produce C-level checks', () => {
    const result = auditDesignOutput(
      '<Button type="primary" disabled>提交</Button>',
      { tokenDefined: true, hasSemanticMetadata: false, components: ['Button'], tokenBindings: ['--color-primary'] },
      'C'
    );
    expect(result.auditLevel).toBe('C');
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.issues)).toBe(true);
  });
});

describe('Integration: Quick diagnosis → full assessment', () => {
  test('quick diagnosis should return a score between 0-5', () => {
    const quick = computeQuickDiagnosis({
      descriptionCoverage: 3, propQuality: 4, compositionRules: 2, businessRules: 1, tokenBinding: 3
    });
    expect(quick.overall).toBeGreaterThanOrEqual(0);
    expect(quick.overall).toBeLessThanOrEqual(5);
  });

  test('full assessment should differ from quick diagnosis', () => {
    const quick = computeQuickDiagnosis({
      descriptionCoverage: 3, propQuality: 4, compositionRules: 2, businessRules: 1, tokenBinding: 3
    });
    const full = computeScoring({
      D1: quick.scored.dimensions.D1 + 0.5, D2: quick.scored.dimensions.D2,
      D3: quick.scored.dimensions.D3, D4: 3.0,
      D5: quick.scored.dimensions.D5 + 0.5, D6: quick.scored.dimensions.D6 + 1.0,
      D7: quick.scored.dimensions.D7 + 0.5, D8: 2.0, D9: 1.0, D10: 1.0
    }, 'partial');
    expect(full.overall).not.toBe(quick.overall);
  });
});

describe('Integration: Empty/invalid data handling', () => {
  test('empty data pipeline should report 0 raw files', () => {
    const result = runPipeline([], [], false);
    expect(result.componentSummary.rawFiles).toBe(0);
  });

  test('empty data pipeline quality should be minimal', () => {
    const result = runPipeline([], [], false);
    expect(result.dataQuality).toBe('minimal');
  });

  test('empty data scoring overall should be 0', () => {
    const result = computeScoring({}, 'minimal');
    expect(result.overall).toBe(0);
  });
});
