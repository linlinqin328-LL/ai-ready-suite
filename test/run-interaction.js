/**
 * AI Ready Suite — Interaction Engine 单元测试
 * 
 * 覆盖：场景选择、D8-D10 评分转换、报告模板、低信心维度构建
 */

const interaction = require('../mcp-servers/ai-ready-engine/engine/interaction');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) { passed++; process.stdout.write('  ✅ '); }
  else { failed++; failures.push(message); process.stdout.write('  ❌ '); }
  console.log(message);
}

console.log('\n=== AI Ready Suite — Interaction Engine 测试 ===\n');

// ============================================================
// 用例组 1: 场景选择配置
// ============================================================
console.log('\n--- 场景选择配置 (4) ---');

assert(
  interaction.SCENARIO_SELECTION.options.length === 4,
  'SCENARIO_SELECTION 应有 4 个场景，实际: ' + interaction.SCENARIO_SELECTION.options.length
);

assert(
  interaction.SCENARIO_SELECTION.roles.length === 2,
  'SCENARIO_SELECTION 应有 2 种角色，实际: ' + interaction.SCENARIO_SELECTION.roles.length
);

assert(
  interaction.PATH_SELECTION.options.length === 2,
  'PATH_SELECTION 应有 2 个路径，实际: ' + interaction.PATH_SELECTION.options.length
);

// 默认角色映射
const bossOption = interaction.SCENARIO_SELECTION.options.find(o => o.id === 'boss');
assert(
  bossOption.defaultRole === 'consultant',
  'boss 场景默认角色应为 consultant，实际: ' + bossOption.defaultRole
);

// ============================================================
// 用例组 2: D8-D10 交互式评分
// ============================================================
console.log('\n--- D8-D10 交互式评分 (4) ---');

assert(
  interaction.INTERACTIVE_DIMENSIONS.length === 3,
  '应有 3 个交互维度 (D8-D10)，实际: ' + interaction.INTERACTIVE_DIMENSIONS.length
);

// 验证权重总和
const d8d10Weight = interaction.INTERACTIVE_DIMENSIONS.reduce((s, d) => s + d.weight, 0);
assert(
  Math.abs(d8d10Weight - 0.10) < 0.001,
  'D8-D10 权重总和应为 0.10，实际: ' + d8d10Weight
);

// 验证 computeInteractiveScores
const scores = interaction.computeInteractiveScores({
  D8: '覆盖主要设计-研发链路',
  D9: '半自动化，需人工确认',
  D10: '无协同流程'
});
assert(
  scores.D8 === 4 && scores.D9 === 3 && scores.D10 === 1,
  'computeInteractiveScores 正确匹配: D8=' + scores.D8 + ' D9=' + scores.D9 + ' D10=' + scores.D10
);

// 空答案用 fallbackScore
const fallback = interaction.computeInteractiveScores({});
assert(
  fallback.D8 === 1.0 && fallback.D9 === 0.5 && fallback.D10 === 0.5,
  '空答案应使用 fallbackScore: D8=' + fallback.D8 + ' D9=' + fallback.D9 + ' D10=' + fallback.D10
);

// ============================================================
// 用例组 3: 报告模板
// ============================================================
console.log('\n--- 报告模板 (5) ---');

const mockScored = {
  aiReadyLevel: 'L2',
  aiReadyLevelLabel: 'AI 就绪',
  aiReadyLevelEmoji: '🟢',
  dimensions: { D1: 3.5, D2: 3.0, D3: 4.0, D4: 3.5, D5: 2.5, D6: 2.0, D7: 3.0, D8: 3.0, D9: 2.0, D10: 2.0 },
  levels: {
    'L1_component_standardization': { score: 3.5, weight: 0.20 },
    'L2_token_engineering': { score: 2.0, weight: 0.10 },
    'L3_semantic_intelligence': { score: 3.2, weight: 0.60 },
    'L4_ai_connectivity': { score: 3.0, weight: 0.05 },
    'L5_agent_collaboration': { score: 2.0, weight: 0.05 }
  }
};

const mockConfidence = { percentage: 85, level: 'medium', range: [75, 90] };
const mockROI = { currentLevel: 'L1', targetLevel: 'L2', estimatedEffort: '2-4 周', estimatedEffect: 'AI 可理解组件含义' };

const expectationCard = interaction.formatExpectationCard('boss', 'consultant');
assert(
  expectationCard.format === 'text_card' && expectationCard.title === '预期卡',
  '预期卡格式正确，format=' + expectationCard.format + ' title=' + expectationCard.title
);

const report = interaction.formatAssessmentReport(mockScored, 3.8, mockConfidence, mockROI, '2026-07-21');
assert(
  report.format === 'report_card' && report.lines.length > 5,
  '评估报告格式正确，lines=' + report.lines.length
);

const auditResult = {
  auditLevel: 'C', passRate: 0.86, passed: 18, failed: 3, total: 21, recommendation: '基本合格',
  issues: [
    { id: 'B1', name: '颜色硬编码', severity: 'high', detail: '发现 5 处硬编码颜色' },
    { id: 'C5', name: '组件名称正确', severity: 'medium', detail: '未知组件' },
    { id: 'C1', name: '属性值正确', severity: 'low', detail: '个别枚举值不规范' }
  ]
};
const auditReport = interaction.formatAuditReport(auditResult);
assert(
  auditReport.format === 'report_card' && auditReport.lines.includes('║  总体通过率：86%                      ║'),
  '审计报告格式正确，包含通过率'
);

const diagnoseCard = interaction.formatQuickDiagnosisCard(mockScored, 3.1);
assert(
  diagnoseCard.format === 'text_card' && diagnoseCard.title === '快速诊断速览卡',
  '快速诊断卡片格式正确'
);

// ============================================================
// 用例组 4: 审计层级推荐 + 低信心维度
// ============================================================
console.log('\n--- 审计推荐 + 低信心维度 (4) ---');

assert(
  interaction.recommendAuditLevel(4.5).level === 'all',
  '评分 4.5 推荐全量审计，实际: ' + interaction.recommendAuditLevel(4.5).level
);

assert(
  interaction.recommendAuditLevel(2.5).level === 'B',
  '评分 2.5 推荐 B 层，实际: ' + interaction.recommendAuditLevel(2.5).level
);

const detail = interaction.buildLowConfidenceDetail({ descriptionCoverage: 0.1, propCoverage: 10, tokenBindingVerified: false }, 0.3);
assert(
  detail.dimensions.length === 3,
  '低信心维度应有 3 个，实际: ' + detail.dimensions.length
);

const detail2 = interaction.buildLowConfidenceDetail({ descriptionCoverage: 0.8, propCoverage: 80, tokenBindingVerified: true }, 0.3);
assert(
  detail2.dimensions.length === 0,
  '高覆盖率应无低信心维度，实际: ' + detail2.dimensions.length
);

// ============================================================
// 用例组 5: Scout MODES 配置
// ============================================================
console.log('\n--- Scout MODES 配置 (2) ---');

assert(
  interaction.SCOUT_MODES.validateChecks.length === 5,
  'SCOUT_MODES 应有 5 项验证检查，实际: ' + interaction.SCOUT_MODES.validateChecks.length
);

assert(
  interaction.SCOUT_MODES.fetch.options.length === 3,
  'SCOUT_MODES 应有 3 种拉取模式，实际: ' + interaction.SCOUT_MODES.fetch.options.length
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
