/**
 * AI Ready Engine — MCP Server
 * 
 * Model Context Protocol 服务端，提供四个工具：
 * 1. assess_design_system — 评估设计系统 AI 就绪度
 * 2. audit_design_output — 审计 AI 生成质量
 * 3. scout_library — 侦察组件库（含真实验证逻辑）
 * 4. get_interaction_flow — 获取交互流程配置（场景/角色/提问/模板）
 * 
 * 编译后混淆，保护评分算法 IP。
 * 工具 5: save_report — 保存评估报告到本地文件
 * 工具 6: compare_reports — 对比两次评估报告
 */

const fs = require('fs');
const path = require('path');

const { computeScoring, computeQuickDiagnosis, computeConfidence } = require('./engine/assessment');
const TOOL_TIMEOUT_MS = 30000;
const { auditDesignOutput } = require('./engine/auditor');
const { runPipeline } = require('./engine/pipeline');
const interaction = require('./engine/interaction');
const { ACTIVATION_SECRET, validateKeyString, checkAccess } = require('./engine/activation');

// ============================================================
// 环境完整性检查 (Environment Integrity Check)
// ============================================================
const EXPECTED_FILES = [
    'index.js',
    'engine/assessment.js',
    'engine/auditor.js',
    'engine/pipeline.js',
    'engine/interaction.js'
 ];
const envOk = EXPECTED_FILES.every(f => fs.existsSync(path.join(__dirname, f)));
// When running from dist/, check relative to parent
const distOk = EXPECTED_FILES.every(f => fs.existsSync(path.join(__dirname, "../../" + f)));
if (!envOk && !distOk) {
  process.stderr.write('警告 (Warning): AI Ready Engine 环境不完整，缺少必要的 dist 文件。请执行 npm run build:all 重新构建。\n');
}

const PRO_GATE_MESSAGE = '\n━━━ AI Ready Suite Pro ━━━\n此功能需要 Pro 激活码。\n\n获取方式：\n发送邮件至 3539739951@qq.com\n\n安装后设置 AI_READY_KEY 环境变量即可解锁。\n';

/**
 * 需要 Pro 激活码的工具名称集合
 */
const PRO_TOOLS = new Set([
  'assess_design_system',
  'audit_design_output',
  'scout_library',
  'save_report',
 'compare_reports',
]);

/**
 * 需要 Pro 激活码的交互阶段
 */
const PRO_FLOW_PHASES = new Set([
  'd8_d10_questions',
  'binding_verification',
  'confidence_followup',
  'assessment_report',
  'audit_report',
  'scout_summary',
  'audit_recommendation'
]);

// ============================================================
// MCP 协议实现 — stdio JSON-RPC
// ============================================================

class McpServer {
  constructor() {
    this.tools = new Map();
    this.initialized = false;
    this.requestCounter = 0;
  }

  registerTool(name, description, inputSchema, handler) {
    this.tools.set(name, { name, description, inputSchema, handler });
  }

  async handleRequest(request) {
    this.requestCounter++;
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        this.initialized = true;
        return this._jsonRpc(id, {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'ai-ready-engine', version: '1.0.0' }
        });

      case 'notifications/initialized':
        return null;

      case 'tools/list':
        return this._jsonRpc(id, {
          tools: Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        });

      case 'tools/call':
        return this._handleToolCall(id, params);

      default:
        return this._jsonRpc(id, null, { code: -32601, message: `Method not found: ${method}` });
    }
  }

  async _handleToolCall(id, params) {
    const tool = this.tools.get(params.name);
    if (!tool) {
      return this._jsonRpc(id, null, { code: -32602, message: `工具 "${params.name}" 未注册。可用工具: ${Array.from(this.tools.keys()).join(", ")}` });
    }
    try {
      const args = params.arguments || {};
      if (params.name === 'assess_design_system' && !args.mode) {
        return this._jsonRpc(id, null, {
          code: -32602,
          message: '缺少必填参数: mode (quick|full)'
        });
      }

      // ============================================================
      // Pro 功能 Gate 检查
      // ============================================================
      const requiresPro = (() => {
        // 检查工具级别是否需要 Pro
        if (PRO_TOOLS.has(params.name)) {
          // 工具内细化：assess_design_system 的 quick 模式免费
          if (params.name === 'assess_design_system' && args.mode === 'quick') return false;
          // audit_design_output 的 C 层免费
          if (params.name === 'audit_design_output' && args.auditLevel === 'C') return false;
          // scout_library 的 discover 模式免费
          if (params.name === 'scout_library' && args.mode === 'discover') return false;
          return true;
        }
        // 检查交互阶段是否需要 Pro
        if (params.name === 'get_interaction_flow' && PRO_FLOW_PHASES.has(args.phase)) return true;
        return false;
      })();

      if (requiresPro) {
        const access = checkAccess(__dirname);
        if (!access.accessible) {
          return this._jsonRpc(id, null, {
            code: -32001,
            message: PRO_GATE_MESSAGE
          });
        }
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('工具执行超时 (30s)')), TOOL_TIMEOUT_MS)
      );
      const result = await Promise.race([tool.handler(args), timeoutPromise]);
      return this._jsonRpc(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (err) {
      const userMessage = err.message.includes('超时')
        ? err.message
        : `工具 "${params.name}" 执行失败: ${err.message}. 请检查输入数据格式后重试。`;
      return this._jsonRpc(id, null, { code: -32603, message: userMessage });
    }
  }

  _jsonRpc(id, result, error) {
    const response = { jsonrpc: '2.0', id };
    if (error) response.error = error;
    if (result) response.result = result;
    return response;
  }

  start() {
    const self = this;
    let buffer = '';

    process.stdin.on('data', async (data) => {
      buffer += data.toString();

      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line) continue;

        try {
          const request = JSON.parse(line);
          const response = await self.handleRequest(request);
          if (response) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        } catch (e) {
          process.stderr.write(`Parse error: ${e.message}\n`);
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });
  }
}

// ============================================================
// 工具定义
// ============================================================

const server = new McpServer();

// 工具 1: 评估设计系统 AI 就绪度
server.registerTool(
  'assess_design_system',
  '评估设计系统的 AI 就绪成熟度，输出带 scored 字段的 10 维度评估报告。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['quick', 'full'], description: '快速诊断(5 问题)或完整评估(10 维度)' },
      dimensionScores: { type: 'object', description: '各维度评分 (完整评估模式)：{ "D1": 3.5, "D2": 4.0, ... }', additionalProperties: { type: 'number' } },
      quickAnswers: { type: 'object', description: '快速诊断答案 (快速诊断模式)：{ "descriptionCoverage": 3, ... }', properties: { descriptionCoverage: { type: 'number' }, propQuality: { type: 'number' }, compositionRules: { type: 'number' }, businessRules: { type: 'number' }, tokenBinding: { type: 'number' } } },
      dataQuality: { type: 'string', enum: ['full', 'partial', 'minimal'], description: '数据质量等级' },
      preCheck: { type: 'object', description: 'D0 预检数据（可选，用于信心指数）', properties: { jsonCompleteness: { type: 'number' }, descriptionCoverage: { type: 'number' }, propCoverage: { type: 'number' }, tokenBindingVerified: { type: 'boolean' } } },
      components: { type: 'array', description: '原始组件数据（可选，传入后自动执行 D0 管线）', items: { type: 'object' } },
      variableNames: { type: 'array', description: 'Token 变量名列表（可选，用于 Token 绑定检测）', items: { type: 'string' } },
      hasAtlas: { type: 'boolean', description: '是否有 atlas 数据' }
    },
    required: ['mode']
  },
  async (args) => {
    let preCheckData = args.preCheck || null;
    if (args.components) {
      const d0Result = runPipeline(args.components, args.variableNames, args.hasAtlas || false);
      preCheckData = {
        jsonCompleteness: 100,
        descriptionCoverage: d0Result.completeness.descriptionCoverage,
        propCoverage: d0Result.completeness.propCoverage,
        tokenBindingVerified: d0Result.tokenBinding.bindingRate > 0.1
      };
      if (!args.dimensionScores) {
        const dimScores = autoScoreFromPipeline(d0Result);
        args.dimensionScores = dimScores;
      }
    }
    const dataQuality = args.dataQuality || (preCheckData ? 'partial' : 'minimal');

    let result;
    if (args.mode === 'quick' && args.quickAnswers) {
      result = computeQuickDiagnosis(args.quickAnswers);
    } else if (args.mode === 'full' && args.dimensionScores) {
      result = computeScoring(args.dimensionScores, dataQuality, preCheckData);
    } else {
      const defaultScores = { D1: 3.0, D2: 3.0, D3: 3.0, D4: 3.0, D5: 3.0, D6: 3.0, D7: 3.0, D8: 3.0, D9: 3.0, D10: 3.0 };
      result = computeScoring(defaultScores, dataQuality, preCheckData);
    }
    return {
      reportType: 'ai-ready-assessment',
      skillVersion: '2.1',
      assessmentDate: new Date().toISOString().split('T')[0],
      dataQuality,
      scored: result.scored,
      overall: result.overall,
      rawScore: result.rawScore,
      aiReadyLevel: result.aiReadyLevel,
      confidence: result.confidence,
      roi: result.roi
    };
  }
);

function autoScoreFromPipeline(d0) {
  const { completeness, tokenBinding, variantRatio } = d0;
  const d1 = Math.min(5, Math.max(0, 2.0 + (completeness.propCoverage > 50 ? 1.0 : 0) + (completeness.propCoverage > 20 ? 0.5 : 0)));
  const d2 = Math.min(5, Math.max(0, 3.0 + (variantRatio < 0.3 ? 1.5 : 0) + (completeness.childCoverage > 0.5 ? 0.5 : 0)));
  const d3 = Math.min(5, Math.max(0, completeness.descriptionCoverage * 5));
  const uiRatio = d0.componentSummary.uiComponentCount / d0.componentSummary.rawFiles;
  const d4 = Math.min(5, Math.max(0, 2.0 + uiRatio * 2));
  const d5 = Math.min(5, Math.max(0, 1.5 + (completeness.childCoverage > 0.3 ? 1.5 : 0) + (d0.componentSummary.variantInstances > 100 ? 1.0 : 0)));
  const d6a = tokenBinding.existenceRate * 5;
  const d6b = tokenBinding.bindingRate * 5;
  const d6 = Math.round((d6a * 0.5 + d6b * 0.5) * 10) / 10;
  return { D1: d1, D2: d2, D3: d3, D4: d4, D5: d5, D6: d6, D7: 1.0, D8: 1.0, D9: 0.5, D10: 0.5 };
}

// 工具 2: 审计 AI 生成质量
server.registerTool(
  'audit_design_output',
  '审计 AI 生成的设计/代码输出质量，执行 C/B/A 三层检查。',
  {
    type: 'object',
    properties: {
      code: { type: 'string', description: '待审计的代码/设计输出文本' },
      rules: { type: 'object', description: '设计系统规则配置', properties: { tokenDefined: { type: 'boolean' }, hasSemanticMetadata: { type: 'boolean' }, components: { type: 'array', items: { type: 'string' } }, tokenBindings: { type: 'array', items: { type: 'string' } } } },
      auditLevel: { type: 'string', enum: ['C', 'B', 'A', 'all'], description: '审计层级：C=基础, B=视觉, A=语义, all=全部' }
    },
    required: ['code', 'auditLevel']
  },
  async (args) => {
    return auditDesignOutput(args.code, args.rules || {}, args.auditLevel);
  }
);

// 工具 3: 侦察组件库（真实验证逻辑）
server.registerTool(
  'scout_library',
  '侦察组件库数据，输出结构化摘要和统计数据。支持 discover（发现库）、fetch（拉取数据）、validate（验证质量）三种模式。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['discover', 'fetch', 'validate'], description: '模式：discover=发现库, fetch=拉取数据, validate=验证质量' },
      libraryData: { type: 'object', description: '库数据（直接传入时跳过 MCP API 调用）', properties: { name: { type: 'string' }, components: { type: 'array', items: { type: 'object' } }, tokens: { type: 'array', items: { type: 'object' } }, metadata: { type: 'object' } } },
      cacheInfo: { type: 'object', description: '缓存状态信息' }
    },
    required: ['mode']
  },
  async (args) => {
    const libraryData = args.libraryData || { name: 'unknown', components: [], tokens: [] };

    if (args.mode === 'discover') {
      const count = libraryData.components ? libraryData.components.length : 0;
      const hasTokens = libraryData.tokens && libraryData.tokens.length > 0;
      return {
        libraries: [{
          name: libraryData.name || 'unknown',
          componentCount: count,
          tokenCount: libraryData.tokens ? libraryData.tokens.length : 0,
          status: count > 0 ? 'available' : 'empty',
          lastModified: libraryData.metadata?.lastModified || 'unknown'
        }],
        totalCount: count,
        hasTokens
      };
    }

    if (args.mode === 'fetch') {
      const d0 = runPipeline(libraryData.components || [], libraryData.tokens || [], false);
      return {
        name: libraryData.name || 'unknown',
        summary: d0.componentSummary,
        completeness: d0.completeness,
        tokenBinding: d0.tokenBinding,
        dataQuality: d0.dataQuality,
        classification: d0.classification
      };
    }

    if (args.mode === 'validate') {
      const components = libraryData.components || [];
      const tokens = libraryData.tokens || [];
      const meta = libraryData.metadata || {};
      const total = components.length;
      const threshold = interaction.SCOUT_MODES.validateThreshold;

      if (total === 0) {
        return { name: libraryData.name || 'unknown', validated: false, score: 0, checks: interaction.SCOUT_MODES.validateChecks.map(c => ({ id: c.id, name: c.name, passed: false, detail: '无组件数据' })) };
      }

      const expectedMin = meta.totalComponents || 0;
      const v1Passed = expectedMin === 0 || Math.abs(total - expectedMin) / Math.max(expectedMin, 1) < 0.2;
      const namePattern = /^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_/]*$/;
      const invalidNames = components.filter(c => !namePattern.test(c.name || ''));
      const v2Passed = invalidNames.length < Math.ceil(total * 0.1);
      const hasValidStructure = components.every(c => typeof c === 'object' && c !== null && c.name);
      const v3Passed = hasValidStructure;
      const names = components.map(c => c.name);
      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      const v4Passed = duplicates.length === 0;
      const withProps = components.filter(c => c.props && Object.keys(c.props).length > 0);
      const propCoverage = total > 0 ? withProps.length / total : 0;
      const v5Passed = propCoverage >= 0.3;

      const checks = [
        { id: 'V1', name: '数量一致性', passed: v1Passed, detail: v1Passed ? `${total} 个组件，数量正常` : `预期 ${expectedMin}，实际 ${total}` },
        { id: 'V2', name: '文件名规范性', passed: v2Passed, detail: v2Passed ? '所有组件名称合规' : `${invalidNames.length} 个非规范名称: ${invalidNames.slice(0, 3).map(c => c.name).join(', ')}` },
        { id: 'V3', name: 'JSON 可解析性', passed: v3Passed, detail: v3Passed ? '所有组件结构完整' : '存在结构不完整的组件对象' },
        { id: 'V4', name: '组件名唯一性', passed: v4Passed, detail: v4Passed ? `名称全部唯一 (${names.length} 个)` : `${duplicates.length} 个重复名称: ${duplicates.slice(0, 3).join(', ')}` },
        { id: 'V5', name: 'Props 定义完整性', passed: v5Passed, detail: v5Passed ? `Props 覆盖 ${(propCoverage * 100).toFixed(0)}%` : `Props 覆盖率仅 ${(propCoverage * 100).toFixed(0)}%，建议补充` }
      ];

      const passedCount = checks.filter(c => c.passed).length;
      const score = total > 0 ? passedCount / 5 : 0;

      return {
        name: libraryData.name || 'unknown',
        validated: score >= threshold,
        score: Math.round(score * 100) / 100,
        checks,
        summary: { total, passed: passedCount, failed: 5 - passedCount, propCoverage: Math.round(propCoverage * 100) },
        suggestions: checks.filter(c => !c.passed).map(c => `建议修复 ${c.name}: ${c.detail}`)
      };
    }

    return { mode: args.mode, message: 'Unknown mode' };
  }
);

// 工具 4: 获取交互流程配置
server.registerTool(
  'get_interaction_flow',
  '获取交互流程的结构化配置数据（场景/角色/提问/模板），SKILL 层据此编排对话，无需硬编码 prompt 文本。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['assessment', 'audit', 'scout'], description: '工作模式' },
      phase: {
        type: 'string',
        enum: ['scenario_selection', 'path_selection', 'd8_d10_questions', 'binding_verification', 'confidence_followup', 'expectation_card', 'assessment_report', 'audit_scope', 'audit_report', 'scout_summary', 'quick_diagnosis', 'audit_recommendation'],
        description: '交互阶段标识'
      },
      context: {
        type: 'object',
        description: '阶段上下文数据（可选，用于模板填充）',
        properties: {
          scenario: { type: 'string' }, role: { type: 'string' }, bindingRate: { type: 'number' },
          confidence: { type: 'object' }, scored: { type: 'object' }, overall: { type: 'number' },
          auditResult: { type: 'object' }, libraryName: { type: 'string' },
          componentSummary: { type: 'object' }, tokenBinding: { type: 'object' },
          dataQuality: { type: 'string' }, completeness: { type: 'object' },
          assessmentDate: { type: 'string' }, roi: { type: 'object' },
          assessmentScore: { type: 'number' },
          descriptionCoverage: { type: 'number' },
          propCoverage: { type: 'number' },
          tokenBindingVerified: { type: 'boolean' }
        }
      }
    },
    required: ['mode', 'phase']
  },
  async (args) => {
    const { mode, phase, context } = args;
    const ctx = context || {};

    switch (phase) {
      case 'scenario_selection':
        return { phase, mode, prompt: interaction.SCENARIO_SELECTION.prompt, promptKey: interaction.SCENARIO_SELECTION.promptKey, data: { options: interaction.SCENARIO_SELECTION.options.map(o => ({ id: o.id, text: o.text, description: o.description })), roles: interaction.SCENARIO_SELECTION.roles.map(r => ({ id: r.id, text: r.text, description: r.description, scenarios: r.scenarios })) } };
      case 'path_selection':
        return { phase, mode, prompt: interaction.PATH_SELECTION.prompt, promptKey: interaction.PATH_SELECTION.promptKey, data: { options: interaction.PATH_SELECTION.options.map(o => ({ id: o.id, text: o.text, description: o.description })) } };
      case 'd8_d10_questions':
        return { phase, mode, prompt: '接下来我需要了解几个关于 AI 连接和协作的情况：', data: { dimensions: interaction.INTERACTIVE_DIMENSIONS.map(d => ({ id: d.id, name: d.name, weight: d.weight, level: d.level, question: d.question, scoringGuide: d.scoringGuide.map(g => g.answer) })) } };
      case 'binding_verification':
        return { phase, mode, prompt: interaction.BINDING_VERIFICATION.promptTemplate.replace('{bindingRate}', (ctx.bindingRate * 100).toFixed(0)), data: { options: interaction.BINDING_VERIFICATION.options, adjustments: interaction.BINDING_VERIFICATION.confidenceAdjustments } };
      case 'confidence_followup': {
        const detail = interaction.buildLowConfidenceDetail({ descriptionCoverage: ctx.descriptionCoverage, propCoverage: ctx.propCoverage, tokenBindingVerified: ctx.tokenBindingVerified }, 0.3);
        const conf = ctx.confidence || {};
        return { phase, mode, prompt: interaction.CONFIDENCE_FOLLOWUP.promptTemplate.replace('{percentage}', (conf.percentage || 0).toString()).replace('{lowConfidenceDetails}', detail.dimensions.length > 0 ? detail.dimensions.map(d => '  - ' + d).join('\n') : '暂无低信心维度').replace('{suggestions}', detail.suggestions.length > 0 ? detail.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : '无补充建议'), data: { lowConfidenceDimensions: detail } };
      }
      case 'expectation_card':
        return { phase, mode, data: interaction.formatExpectationCard(ctx.scenario, ctx.role) };
      case 'assessment_report':
        return { phase, mode, data: interaction.formatAssessmentReport(ctx.scored, ctx.overall, ctx.confidence, ctx.roi, ctx.assessmentDate) };
      case 'audit_scope':
        return { phase, mode, prompt: interaction.AUDIT_SCOPE.prompt, promptKey: interaction.AUDIT_SCOPE.promptKey, data: { options: interaction.AUDIT_SCOPE.options.map(o => ({ id: o.id, text: o.text })), levels: interaction.AUDIT_SCOPE.levels.map(l => ({ id: l.id, name: l.name, requires: l.requires, description: l.description })), recommendation: ctx.assessmentScore !== undefined ? interaction.recommendAuditLevel(ctx.assessmentScore) : null } };
      case 'audit_report':
        return { phase, mode, data: interaction.formatAuditReport(ctx.auditResult) };
      case 'scout_summary':
        return { phase, mode, data: interaction.formatScoutReport(ctx.libraryName, ctx.componentSummary, ctx.completeness, ctx.tokenBinding, ctx.dataQuality) };
      case 'quick_diagnosis':
        return { phase, mode, data: interaction.formatQuickDiagnosisCard(ctx.scored, ctx.overall) };
      case 'audit_recommendation':
        return { phase, mode, data: { recommendation: ctx.assessmentScore !== undefined ? interaction.recommendAuditLevel(ctx.assessmentScore) : null } };
      default:
        return { phase, mode, message: 'Unknown phase: ' + phase };
    }
  }
);

// ============================================================
// 工具 5: save_report — 保存评估报告到本地文件
// ============================================================

server.registerTool(
  'save_report',
  '将评估/审计/侦察报告保存到本地文件系统。支持 JSON 和 TXT 格式。',
  {
    type: 'object',
    properties: {
      report: { type: 'object', description: '报告数据对象' },
      format: { type: 'string', enum: ['json', 'text'], description: '输出格式' },
      filename: { type: 'string', description: '文件名（可选，默认自动生成）' },
      outputPath: { type: 'string', description: '输出目录路径（可选，默认工作空间）' }
    },
    required: ['report', 'format']
  },
  async (args) => {
    const { report, format, filename, outputPath } = args;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultName = format === 'json' ? `ai-ready-report-${timestamp}.json` : `ai-ready-report-${timestamp}.txt`;
    const name = filename || defaultName;
    const dir = outputPath || process.cwd();
    const filePath = path.join(dir, name);

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const content = format === 'json' ? JSON.stringify(report, null, 2) : JSON.stringify(report, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
      // ---- 清理 /tmp/ 下的插件临时文件 ----
      try {
        const tmpDir = '/tmp';
        if (fs.existsSync(tmpDir)) {
          const tmpFiles = fs.readdirSync(tmpDir);
          const patterns = [/^ai-ready-/, /^real-data-test/];
          tmpFiles.forEach(f => {
            if (patterns.some(p => p.test(f))) {
              try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
            }
          });
        }
      } catch (_) {}
      return { saved: true, path: filePath, format, size: Buffer.byteLength(content, 'utf-8') };
    } catch (e) {
      return { saved: false, error: e.message, path: filePath };
    }
  }
);

// ============================================================
// 工具 6: compare_reports — 对比两次评估报告
// ============================================================

server.registerTool(
  'compare_reports',
  '对比当前评估与历史评估的差异，返回结构化对比结果。',
  {
    type: 'object',
    properties: {
      current: { type: 'object', description: '当前评估结果' },
      previous: { type: 'object', description: '历史评估结果' }
    },
    required: ['current', 'previous']
  },
  async (args) => {
    const { current, previous } = args;
    try {
      const result = interaction.compareReports(current, previous);
      return result;
    } catch (e) {
      return { hasDifferences: false, error: e.message, summary: '对比失败' };
    }
  }
);

// ============================================================
// 工具 7: set_activation_key — 对话内激活 Pro
// ============================================================

server.registerTool(
  'set_activation_key',
  '在对话中激活 Pro 功能。用户提供激活码后，引擎验证并保存到本地。',
  {
    type: 'object',
    properties: {
      key: { type: 'string', description: '激活码，格式 AIREADY-xxxxxxxx-xxxxxxxx' }
    },
    required: ['key']
  },
  async (args) => {
    const { key } = args;
    if (!key || typeof key !== 'string') {
      return { success: false, message: '激活码不能为空。' };
    }

    const result = validateKeyString(key.trim());
    if (!result.accessible) {
      return { success: false, message: result.message || '激活码无效或已过期。请通过 3539739951@qq.com 获取新的激活码。' };
    }

    // 检查是否已存储有效激活码（避免覆盖）
    const keyPath = path.join(__dirname, 'pro-key.json');
    try {
      if (fs.existsSync(keyPath)) {
        const saved = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        if (saved && saved.key) {
          const existing = validateKeyString(saved.key);
          if (existing.accessible) {
            return { success: true, message: '已激活，无需重复操作。Pro 功能可直接使用。', alreadyActivated: true };
          }
        }
      }
    } catch (_) { /* 忽略，继续覆盖 */ }

    // 写入文件
    try {
      fs.writeFileSync(keyPath, JSON.stringify({
        key: key.trim(),
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(parseInt(key.trim().split('-')[2], 16) * 1000).toISOString()
      }, null, 2), 'utf-8');
      return { success: true, message: '✅ Pro 已激活！现在可以使用完整评估、B/A 层审计、报告保存和历史对比功能。' };
    } catch (e) {
      return { success: false, message: '保存激活码失败：' + e.message };
    }
  }
);

// ============================================================
// 启动
// ============================================================

process.stderr.write('AI Ready Engine MCP Server starting...\n');
server.start();
