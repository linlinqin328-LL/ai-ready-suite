/**
 * AI Ready Suite — Unit Tests (Jest)
 *
 * Tests computeScoring engine's D1-D7 validation.
 * 21 test cases covering:
 * - Normal scoring path (10 dimensions)
 * - Data quality weighting (full/partial/minimal)
 * - Level boundary tests (L0/L1/L2/L3)
 * - Confidence index calculation
 * - Quick diagnosis mode
 * - Empty/missing data handling
 */

const assessment = require('../mcp-servers/ai-ready-engine/engine/assessment');

describe('DIMENSION_WEIGHTS integrity', () => {
  test('should have 10 dimensions', () => {
    expect(Object.keys(assessment.DIMENSION_WEIGHTS).length).toBe(10);
  });

  test('weight sum should be 1.0', () => {
    const weightSum = Object.values(assessment.DIMENSION_WEIGHTS).reduce((s, d) => s + d.weight, 0);
    expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.001);
  });

  test('D1 weight should be 0.10', () => {
    expect(assessment.DIMENSION_WEIGHTS.D1.weight).toBe(0.10);
  });

  test('D6 level should be L2', () => {
    expect(assessment.DIMENSION_WEIGHTS.D6.level).toBe('L2');
  });

  test('L3 semantic intelligence total weight should be 0.60', () => {
    const l3Weights = Object.values(assessment.DIMENSION_WEIGHTS)
      .filter(d => d.level === 'L3')
      .reduce((s, d) => s + d.weight, 0);
    expect(Math.abs(l3Weights - 0.60)).toBeLessThan(0.001);
  });

  test('D8-D10 total weight should be 0.10', () => {
    const d8d10Weight = ['D8', 'D9', 'D10']
      .map(k => assessment.DIMENSION_WEIGHTS[k])
      .filter(Boolean)
      .reduce((s, d) => s + d.weight, 0);
    expect(Math.abs(d8d10Weight - 0.10)).toBeLessThan(0.001);
  });

 test('LEVEL_RANGES should have 4 levels', () => {
    expect(assessment.LEVEL_RANGES.length).toBe(4);
 });
});

describe('computeScoring functionality', () => {
  test('full score should give overall 5.0', () => {
    const all5 = {};
    Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { all5[k] = 5; });
    const result = assessment.computeScoring(all5, 'full', {});
    expect(result.overall).toBe(5);
  });

  test('all zeros should give overall 0.0', () => {
    const all0 = {};
    Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { all0[k] = 0; });
    const result = assessment.computeScoring(all0, 'full', {});
    expect(result.overall).toBe(0);
  });

  test('partial data quality should be 0.8x of full', () => {
    const mid = {};
    Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { mid[k] = 3; });
    const full = assessment.computeScoring(mid, 'full', {}).overall;
    const partial = assessment.computeScoring(mid, 'partial', {}).overall;
    expect(partial).toBeCloseTo(full * 0.8, 2);
  });

  test('full data confidence should be >= 90%', () => {
    const result = assessment.computeScoring({}, 'full', {});
    expect(result.confidence.percentage).toBeGreaterThanOrEqual(90);
  });

  test('minimal data confidence should be < 70%', () => {
    const result = assessment.computeScoring({}, 'minimal', {});
    expect(result.confidence.percentage).toBeLessThan(70);
  });

 test('overall 5.0 should give L3 level', () => {
   const all5 = {};
   Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { all5[k] = 5; });
   const result = assessment.computeScoring(all5, 'full', {});
    expect(result.aiReadyLevel.level).toBe('L3');
 });

 test('overall 0.0 should give L0 level', () => {
   const all0 = {};
   Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { all0[k] = 0; });
   const result = assessment.computeScoring(all0, 'full', {});
    expect(result.aiReadyLevel.level).toBe('L0');
 });
});

describe('boundary / edge cases', () => {
  test('partial dimension scores should still compute', () => {
    const partial = { D1: 5, D2: 4, D3: 3 };
    const result = assessment.computeScoring(partial, 'full', {});
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(5);
  });

  test('empty dimensions should give overall 0', () => {
    const result = assessment.computeScoring({}, 'full', {});
    expect(result.overall).toBe(0);
  });

 test('over-range scores should preserve original values', () => {
   const over = {};
   Object.keys(assessment.DIMENSION_WEIGHTS).forEach(k => { over[k] = 10; });
   const result = assessment.computeScoring(over, 'full', {});
    expect(result.scored.dimensions.D1).toBe(10);
 });

  test('invalid dataQuality should degrade gracefully', () => {
    const result = assessment.computeScoring({}, 'invalid_quality', {});
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });

 test('quick diagnosis all 5s should produce positive score', () => {
    const result = assessment.computeQuickDiagnosis({
      descriptionCoverage: 5,
      propQuality: 5,
      compositionRules: 5,
      businessRules: 5,
      tokenBinding: 5
    });
   expect(result.overall).toBeGreaterThan(0);
 });

 test('quick diagnosis low score should be <= high score', () => {
    const low = assessment.computeQuickDiagnosis({
      descriptionCoverage: 1,
      propQuality: 1,
      compositionRules: 1,
      businessRules: 1,
      tokenBinding: 1
    });
    const high = assessment.computeQuickDiagnosis({
      descriptionCoverage: 5,
      propQuality: 5,
      compositionRules: 5,
      businessRules: 5,
      tokenBinding: 5
    });
   expect(low.overall).toBeLessThanOrEqual(high.overall);
 });

 test('L0 ROI target should be L1', () => {
    expect(assessment.estimateROI('L0').targetLevel).toBe('L1');
 });
});
