/**
 * AI Ready Suite — 集成测试
 * 
 * 测试 MCP server 端到端的工具调用流程
 * 4 个集成测试用例
 */

const { computeScoring, computeQuickDiagnosis } = require('../mcp-servers/ai-ready-engine/engine/assessment');
const { auditDesignOutput } = require('../mcp-servers/ai-ready-engine/engine/auditor');
const { runPipeline } = require('../mcp-servers/ai-ready-engine/engine/pipeline');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    process.stdout.write('  ✅ ');
  } else {
    failed++;
    process.stdout.write('  ❌ ');
  }
  console.log(message);
}

console.log('\n=== AI Ready Suite — 集成测试 ===\n');

// ============================================================
// 用例 1: 完整评估管线（D0 → 维度评分 → 报告输出）
// ============================================================
console.log('\n--- 集成测试 1: 完整评估管线 ---');

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

// Run D0 pipeline first
const d0Result = runPipeline(sampleComponents, ['--color-primary', '--font-size-base'], true);

assert(
  d0Result.componentSummary.rawFiles === 9,
  'D0 管线：应有 9 个原始文件，实际: ' + d0Result.componentSummary.rawFiles
);

assert(
  d0Result.componentSummary.baseComponents >= 2,
  'D0 管线：基础组件数应 >= 2（Variant 归一化后），实际: ' + d0Result.componentSummary.baseComponents
);

assert(
  d0Result.componentSummary.iconsIdentified >= 2,
  'D0 管线：应识别至少 2 个图标，实际: ' + d0Result.componentSummary.iconsIdentified
);

assert(
  d0Result.dataQuality === 'full' || d0Result.dataQuality === 'partial',
  'D0 管线：数据质量应为 full 或 partial，实际: ' + d0Result.dataQuality
);

// Generate dimension scores from pipeline data
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

// Run scoring
const scoringResult = computeScoring(dimScores, d0Result.dataQuality, {
  jsonCompleteness: 100,
  descriptionCoverage: d0Result.completeness.descriptionCoverage,
  propCoverage: d0Result.completeness.propCoverage,
  tokenBindingVerified: d0Result.tokenBinding.bindingRate > 0.1
});

assert(
  scoringResult.overall >= 0 && scoringResult.overall <= 5,
  '评分结果 overall 应在 0-5 之间，实际: ' + scoringResult.overall
);

assert(
  scoringResult.scored.aiReadyLevel === 'L1' || scoringResult.scored.aiReadyLevel === 'L2' || scoringResult.scored.aiReadyLevel === 'L0',
  'AI Ready 等级应有效，实际: ' + scoringResult.scored.aiReadyLevel
);

assert(
  scoringResult.confidence.level === 'high' || scoringResult.confidence.level === 'medium',
  '信心指数应为 high 或 medium，实际: ' + scoringResult.confidence.level
);

console.log(`  → 评估结果：${scoringResult.overall}/5，等级 ${scoringResult.aiReadyLevel.level}，信心 ${scoringResult.confidence.percentage}%`);

// ============================================================
// 用例 2: 审计模式（C/B/A 三层）
// ============================================================
console.log('\n--- 集成测试 2: 审计模式 ---');

const auditResult = auditDesignOutput(
  '<Button type="primary" disabled>提交</Button>',
  { tokenDefined: true, hasSemanticMetadata: false, components: ['Button'], tokenBindings: ['--color-primary'] },
  'C'
);

assert(
  auditResult.auditLevel === 'C',
  '审计层级应为 C，实际: ' + auditResult.auditLevel
);

assert(
  auditResult.total > 0,
  '审计应产生至少 1 个检查项，实际: ' + auditResult.total
);

assert(
  Array.isArray(auditResult.issues),
  '审计 issues 应为数组，实际: ' + typeof auditResult.issues
);

console.log(`  → 审计结果：${auditResult.passRate * 100}% 通过率（${auditResult.passed}/${auditResult.total}）`);

// ============================================================
// 用例 3: 快速诊断 → 完整评估切换
// ============================================================
console.log('\n--- 集成测试 3: 快速诊断 → 完整评估 ---');

const quick = computeQuickDiagnosis({
  descriptionCoverage: 3,
  propQuality: 4,
  compositionRules: 2,
  businessRules: 1,
  tokenBinding: 3
});

assert(
  quick.overall >= 0 && quick.overall <= 5,
  '快速诊断结果应在 0-5 之间，实际: ' + quick.overall
);

// 模拟完整评估对快速诊断结果的细化
const fullFromQuick = computeScoring({
  D1: quick.scored.dimensions.D1 + 0.5,
  D2: quick.scored.dimensions.D2,
  D3: quick.scored.dimensions.D3,
  D4: 3.0,
  D5: quick.scored.dimensions.D5 + 0.5,
  D6: quick.scored.dimensions.D6 + 1.0,
  D7: quick.scored.dimensions.D7 + 0.5,
  D8: 2.0,
  D9: 1.0,
  D10: 1.0
}, 'partial');

assert(
  fullFromQuick.overall !== quick.overall,
  '完整评估评分应不同于快速诊断，quick: ' + quick.overall + ' full: ' + fullFromQuick.overall
);

console.log(`  → 快速诊断: ${quick.overall}/5 → 完整评估细化: ${fullFromQuick.overall}/5`);

// ============================================================
// 用例 4: 空/异常数据处理
// ============================================================
console.log('\n--- 集成测试 4: 空/异常数据 ---');

// 空数据管线
const emptyPipeline = runPipeline([], [], false);
assert(
  emptyPipeline.componentSummary.rawFiles === 0,
  '空数据管线 rawFiles 应为 0，实际: ' + emptyPipeline.componentSummary.rawFiles
);

assert(
  emptyPipeline.dataQuality === 'minimal',
  '空数据管线数据质量应为 minimal，实际: ' + emptyPipeline.dataQuality
);

// 空数据评分
const emptyScoring = computeScoring({}, 'minimal');
assert(
  emptyScoring.overall === 0,
  '空数据评分 overall 应为 0，实际: ' + emptyScoring.overall
);

console.log('  → 空数据处理正常');

// ============================================================
// 总结
// ============================================================
console.log('\n=== 总结 ===');
console.log(`通过: ${passed} / ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
