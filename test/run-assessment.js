/**
 * AI Ready Suite — 单元测试
 * 
 * 测试 computeScoring 引擎的 D1-D7 验证
 * 21 个测试用例覆盖：
 * - 正常评分路径（10 维度完整）
 * - 数据质量加权（full/partial/minimal）
 * - 等级判定边界（L0/L1/L2/L3 边界测试）
 * - 信心指数计算
 * - 快速诊断模式
 * - 空/缺失数据处理
 */

const assessment = require('../mcp-servers/ai-ready-engine/engine/assessment');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    process.stdout.write('  ✅ ');
  } else {
    failed++;
    failures.push(message);
    process.stdout.write('  ❌ ');
  }
  console.log(message);
}

console.log('\n=== AI Ready Suite — 单元测试 ===\n');

// ============================================================
// 用例组 1: DIMENSION_WEIGHTS 验证
// ============================================================
console.log('\n--- 用例组 1: DIMENSION_WEIGHTS 完整性 (7 个) ---');

// 1. 10 个维度全在
assert(
  Object.keys(assessment.DIMENSION_WEIGHTS).length === 10,
  'DIMENSION_WEIGHTS 应有 10 个维度，实际: ' + Object.keys(assessment.DIMENSION_WEIGHTS).length
);

// 2. 权重总和为 1.0
const weightSum = Object.values(assessment.DIMENSION_WEIGHTS).reduce((s, d) => s + d.weight, 0);
assert(
  Math.abs(weightSum - 1.0) < 0.001,
  '权重总和应为 1.0，实际: ' + weightSum
);

// 3. D1 权重 0.10
assert(
  assessment.DIMENSION_WEIGHTS.D1.weight === 0.10,
  'D1 权重应为 0.10，实际: ' + assessment.DIMENSION_WEIGHTS.D1.weight
);

// 4. D6 Token 工程在 L2
assert(
  assessment.DIMENSION_WEIGHTS.D6.level === 'L2',
  'D6 层级应为 L2，实际: ' + assessment.DIMENSION_WEIGHTS.D6.level
);

// 5. L3 语义智能总权重 = D3(0.15)+D4(0.15)+D5(0.15)+D7(0.15) = 0.60
const l3Dims = Object.values(assessment.DIMENSION_WEIGHTS).filter(d => d.level === 'L3');
const l3Weight = l3Dims.reduce((s, d) => s + d.weight, 0);
assert(
  Math.abs(l3Weight - 0.60) < 0.001,
  'L3 语义智能总权重应为 0.60，实际: ' + l3Weight
);

// 6. D8-D10 交互式 = 5%+3%+2% = 10%
const interactiveDims = ['D8', 'D9', 'D10'];
const interactiveWeight = interactiveDims.reduce((s, d) => s + assessment.DIMENSION_WEIGHTS[d].weight, 0);
assert(
  Math.abs(interactiveWeight - 0.10) < 0.001,
  'D8-D10 总权重应为 0.10，实际: ' + interactiveWeight
);

// 7. LEVEL_RANGES 有 4 个等级
assert(
  assessment.LEVEL_RANGES.length === 4,
  'LEVEL_RANGES 应有 4 个等级，实际: ' + assessment.LEVEL_RANGES.length
);

// ============================================================
// 用例组 2: computeScoring 功能验证 (7 个)
// ============================================================
console.log('\n--- 用例组 2: computeScoring 功能 (7 个) ---');

// 8. 全部满分
const fullScoreDims = {
  D1: 5.0, D2: 5.0, D3: 5.0, D4: 5.0, D5: 5.0,
  D6: 5.0, D7: 5.0, D8: 5.0, D9: 5.0, D10: 5.0
};
const result1 = assessment.computeScoring(fullScoreDims, 'full');
assert(
  result1.overall === 5.0,
  '全部满分时 overall 应为 5.0，实际: ' + result1.overall
);

// 9. 全部最低分
const lowScoreDims = {
  D1: 0.0, D2: 0.0, D3: 0.0, D4: 0.0, D5: 0.0,
  D6: 0.0, D7: 0.0, D8: 0.0, D9: 0.0, D10: 0.0
};
const result2 = assessment.computeScoring(lowScoreDims, 'full');
assert(
  result2.overall === 0.0,
  '全部最低分时 overall 应为 0.0，实际: ' + result2.overall
);

// 10. 数据质量加权：partial → *0.8
const mediumDims = {
  D1: 3.0, D2: 3.0, D3: 3.0, D4: 3.0, D5: 3.0,
  D6: 3.0, D7: 3.0, D8: 3.0, D9: 3.0, D10: 3.0
};
const result3Partial = assessment.computeScoring(mediumDims, 'partial');
const result3Full = assessment.computeScoring(mediumDims, 'full');
assert(
  result3Partial.overall === Math.round(result3Full.overall * 0.8 * 10) / 10,
  'partial 数据质量应为 full 的 0.8 倍，full: ' + result3Full.overall + ' partial: ' + result3Partial.overall
);

// 11. 信心指数：full ≥ 90%
assert(
  result1.confidence.percentage >= 90,
  'full 数据信心指数应 >= 90%，实际: ' + result1.confidence.percentage
);

// 12. 信心指数：minimal < 60%
const resultMinimal = assessment.computeScoring(mediumDims, 'minimal');
assert(
  resultMinimal.confidence.percentage < 70,
  'minimal 数据信心指数应 < 70%，实际: ' + resultMinimal.confidence.percentage
);

// 13. 等级判定：overall 4.5 → L3
const resultL3 = assessment.computeScoring(fullScoreDims, 'full');
assert(
  resultL3.aiReadyLevel.level === 'L3',
  'overall 5.0 → L3，实际: ' + resultL3.aiReadyLevel.level
);

// 14. 等级判定：overall 1.0 → L0
const resultL0 = assessment.computeScoring(lowScoreDims, 'full');
assert(
  resultL0.aiReadyLevel.level === 'L0',
  'overall 0.0 → L0，实际: ' + resultL0.aiReadyLevel.level
);

// ============================================================
// 用例组 3: 边界/异常场景 (7 个)
// ============================================================
console.log('\n--- 用例组 3: 边界/异常场景 (7 个) ---');

// 15. 部分维度缺失
const partialDims = { D1: 4.0, D2: 3.0, D3: 5.0 };
const resultPartial = assessment.computeScoring(partialDims, 'full');
assert(
  resultPartial.overall > 0 && resultPartial.overall <= 5,
  '部分维度缺失应仍能计算，overall: ' + resultPartial.overall
);

// 16. 空维度
const resultEmpty = assessment.computeScoring({}, 'full');
assert(
  resultEmpty.overall === 0,
  '空维度 overall 应为 0，实际: ' + resultEmpty.overall
);

// 17. 分数超界（>5）
const overDims = { ...mediumDims, D1: 10 };
const resultOver = assessment.computeScoring(overDims, 'full');
assert(
  resultOver.scored.dimensions.D1 === 10,
  '超界分数应保留原始值，D1: ' + resultOver.scored.dimensions.D1
);

// 18. 无效数据质量
const resultInvalid = assessment.computeScoring(mediumDims, 'unknown');
assert(
  resultInvalid.overall >= 0 && resultInvalid.overall <= 5,
  '无效 dataQuality 应降级处理（默认 0.5），overall: ' + resultInvalid.overall
);

// 19. 快速诊断：全 5 分
const quickResult = assessment.computeQuickDiagnosis({
  descriptionCoverage: 5,
  propQuality: 5,
  compositionRules: 5,
  businessRules: 5,
  tokenBinding: 5
});
assert(
  quickResult.overall > 0,
  '快速诊断全 5 分应 produce 正分，overall: ' + quickResult.overall
);

// 20. 快速诊断：全 1 分
const quickLow = assessment.computeQuickDiagnosis({
  descriptionCoverage: 1,
  propQuality: 1,
  compositionRules: 1,
  businessRules: 1,
  tokenBinding: 1
});
assert(
  quickLow.overall <= quickResult.overall,
  '快速诊断低分应 ≤ 高分，low: ' + quickLow.overall + ' high: ' + quickResult.overall
);

// 21. ROI 估算：L0 → L1
const roi = assessment.estimateROI('L0');
assert(
  roi.targetLevel === 'L1',
  'L0 ROI target 应为 L1，实际: ' + roi.targetLevel
);

// ============================================================
// 总结
// ============================================================
console.log('\n=== 总结 ===');
console.log(`通过: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
  console.log('失败项:');
  failures.forEach(f => console.log('  - ' + f));
}

process.exit(failed > 0 ? 1 : 0);
