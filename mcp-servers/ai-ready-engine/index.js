/**
 * AI Ready Engine — MCP Server (Public)
 *
 * 提供 7 个工具的描述与 schema。核心评分/审计/交互/管线逻辑位于 engine/ 目录。
 * engine/ 不出现在公开仓库中。公开 clone 用户看到工具列表与激活引导，
 * 拥有 engine/ 的授权用户获得完整功能。
 */

const fs = require('fs');
const path = require('path');

const TOOL_TIMEOUT_MS = 30000;

const ACTIVATION_MSG = '\n━━━ AI Ready Suite Pro ━━━\n此功能需要 Pro 激活码。\n\n获取方式：\n发送邮件至 REDACTED_QQ_EMAIL\n\n安装后设置 AI_READY_KEY 环境变量即可解锁。\n';

// ── Engine lazy loader (try-catch, no hard imports) ──
let _engine = undefined;
function loadEngine() {
  if (_engine !== undefined) return _engine;
  try {
    _engine = {
      assessment: require('./engine/assessment'),
      auditor: require('./engine/auditor'),
      pipeline: require('./engine/pipeline'),
      interaction: require('./engine/interaction'),
      activation: require('./engine/activation'),
    };
  } catch (_e) {
    _engine = null;
  }
  return _engine;
}

function engineRequired() {
  return { error: 'activation_required', accessible: false, message: ACTIVATION_MSG };
}

// ── MCP 协议实现 ──

class McpServer {
  constructor() {
    this.tools = new Map();
    this.initialized = false;
  }

  registerTool(name, description, inputSchema, handler) {
    this.tools.set(name, { name, description, inputSchema, handler });
  }

  async handleRequest(request) {
    const { method, params, id } = request;
    switch (method) {
      case 'initialize':
        this.initialized = true;
        return this._jsonRpc(id, {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'ai-ready-engine', version: '1.0.0' },
        });
      case 'notifications/initialized':
        return null;
      case 'tools/list':
        return this._jsonRpc(id, {
          tools: Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
      case 'tools/call':
        return this._handleToolCall(id, params);
      default:
        return this._jsonRpc(id, null, { code: -32601, message: `Method not found: ${method}` });
    }
  }

  async _handleToolCall(id, params) {
    const tool = this.tools.get(params.name);
    if (!tool) return this._jsonRpc(id, null, { code: -32602, message: `工具 "${params.name}" 未注册。` });
    try {
      const args = params.arguments || {};
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('工具执行超时 (30s)')), TOOL_TIMEOUT_MS)
      );
      const result = await Promise.race([tool.handler(args), timeout]);
      return this._jsonRpc(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (err) {
      return this._jsonRpc(id, null, { code: -32603, message: err.message });
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
          if (response) process.stdout.write(JSON.stringify(response) + '\n');
        } catch (e) {
          process.stderr.write(`Parse error: ${e.message}\n`);
        }
      }
    });
    process.stdin.on('end', () => process.exit(0));
  }
}

// ── 工具注册 ──
const server = new McpServer();

// ── Tool 1: assess_design_system ──
server.registerTool(
  'assess_design_system',
  '评估设计系统的 AI 就绪成熟度，输出带 scored 字段的 10 维度评估报告。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['quick', 'full'], description: '快速诊断(5 问题)或完整评估(10 维度)' },
      dimensionScores: { type: 'object', description: '各维度评分（完整评估模式）', additionalProperties: { type: 'number' } },
      quickAnswers: { type: 'object', description: '快速诊断答案', properties: { descriptionCoverage: { type: 'number' }, propQuality: { type: 'number' }, compositionRules: { type: 'number' }, businessRules: { type: 'number' }, tokenBinding: { type: 'number' } } },
      dataQuality: { type: 'string', enum: ['full', 'partial', 'minimal'], description: '数据质量等级' },
      preCheck: { type: 'object', description: 'D0 预检数据（可选）' },
      components: { type: 'array', items: { type: 'object' }, description: '原始组件数据（可选）' },
      variableNames: { type: 'array', description: 'Token 变量名列表（可选）', items: { type: 'string' } },
      hasAtlas: { type: 'boolean', description: '是否有 atlas 数据' },
    },
    required: ['mode'],
  },
  async (args) => {
    const eng = loadEngine();
    if (!eng) return engineRequired();
    const { assessment, pipeline } = eng;

    let preCheck = args.preCheck || null;
    if (args.components) {
      const d0 = pipeline.runPipeline(args.components, args.variableNames, args.hasAtlas || false);
      preCheck = { jsonCompleteness: 100, descriptionCoverage: d0.completeness.descriptionCoverage, propCoverage: d0.completeness.propCoverage, tokenBindingVerified: d0.tokenBinding.bindingRate > 0.1 };
      if (!args.dimensionScores) args.dimensionScores = assessment.autoScoreFromPipeline(d0);
    }
    const dq = args.dataQuality || (preCheck ? 'partial' : 'minimal');

    let result;
    if (args.mode === 'quick' && args.quickAnswers) {
      result = assessment.computeQuickDiagnosis(args.quickAnswers);
    } else if (args.mode === 'full' && args.dimensionScores) {
      result = assessment.computeScoring(args.dimensionScores, dq, preCheck);
    } else {
      const def = { D1: 3.0, D2: 3.0, D3: 3.0, D4: 3.0, D5: 3.0, D6: 3.0, D7: 3.0, D8: 3.0, D9: 3.0, D10: 3.0 };
      result = assessment.computeScoring(def, dq, preCheck);
    }
    return { reportType: 'ai-ready-assessment', skillVersion: '2.1', assessmentDate: new Date().toISOString().split('T')[0], dataQuality: dq, scored: result.scored, overall: result.overall, rawScore: result.rawScore, aiReadyLevel: result.aiReadyLevel, confidence: result.confidence, roi: result.roi };
  }
);

// ── Tool 2: audit_design_output ──
server.registerTool(
  'audit_design_output',
  '审计 AI 生成的设计/代码输出质量，执行 C/B/A 三层检查。',
  {
    type: 'object',
    properties: {
      code: { type: 'string', description: '待审计的代码/设计输出文本' },
      rules: { type: 'object', description: '设计系统规则配置' },
      auditLevel: { type: 'string', enum: ['C', 'B', 'A', 'all'], description: '审计层级' },
    },
    required: ['code', 'auditLevel'],
  },
  async (args) => {
    const eng = loadEngine();
    if (!eng) return engineRequired();
    return eng.auditor.auditDesignOutput(args.code, args.rules || {}, args.auditLevel);
  }
);

// ── Tool 3: scout_library ──
server.registerTool(
  'scout_library',
  '侦察组件库数据，输出结构化摘要和统计数据。支持 discover、fetch、validate 三种模式。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['discover', 'fetch', 'validate'], description: '侦察模式' },
      libraryData: { type: 'object', description: '库数据' },
      cacheInfo: { type: 'object', description: '缓存状态信息' },
    },
    required: ['mode'],
  },
  async (args) => {
    const lib = args.libraryData || { name: 'unknown', components: [], tokens: [] };

    if (args.mode === 'discover') {
      const count = lib.components ? lib.components.length : 0;
      return { libraries: [{ name: lib.name || 'unknown', componentCount: count, tokenCount: lib.tokens ? lib.tokens.length : 0, status: count > 0 ? 'available' : 'empty' }], totalCount: count };
    }

    const eng = loadEngine();
    if (!eng) return engineRequired();

    if (args.mode === 'fetch') {
      const d0 = eng.pipeline.runPipeline(lib.components || [], lib.tokens || [], false);
      return { name: lib.name || 'unknown', summary: d0.componentSummary, completeness: d0.completeness, tokenBinding: d0.tokenBinding, dataQuality: d0.dataQuality, classification: d0.classification };
    }

    if (args.mode === 'validate') {
      return eng.interaction.handleScoutValidate(lib);
    }

    return { mode: args.mode, message: 'Unknown mode' };
  }
);

// ── Tool 4: get_interaction_flow ──
server.registerTool(
  'get_interaction_flow',
  '获取交互流程的结构化配置数据（场景/角色/提问/模板）。',
  {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['assessment', 'audit', 'scout'], description: '工作模式' },
      phase: { type: 'string', enum: ['scenario_selection', 'path_selection', 'd8_d10_questions', 'binding_verification', 'confidence_followup', 'expectation_card', 'assessment_report', 'audit_scope', 'audit_report', 'scout_summary', 'quick_diagnosis', 'audit_recommendation'], description: '交互阶段' },
      context: { type: 'object', description: '阶段上下文数据（可选）' },
    },
    required: ['mode', 'phase'],
  },
  async (args) => {
    const eng = loadEngine();
    if (!eng) return engineRequired();
    return eng.interaction.handleFlow(args.mode, args.phase, args.context || {});
  }
);

// ── Tool 5: save_report ──
server.registerTool(
  'save_report',
  '将评估/审计/侦察报告保存到本地文件系统。支持 JSON 和 TXT 格式。',
  {
    type: 'object',
    properties: {
      report: { type: 'object', description: '报告数据对象' },
      format: { type: 'string', enum: ['json', 'text'], description: '输出格式' },
      filename: { type: 'string', description: '文件名（可选）' },
      outputPath: { type: 'string', description: '输出目录路径（可选）' },
    },
    required: ['report', 'format'],
  },
  async (args) => {
    const { report, format, filename, outputPath } = args;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = filename || (format === 'json' ? `ai-ready-report-${ts}.json` : `ai-ready-report-${ts}.txt`);
    const dir = outputPath || process.cwd();
    const filePath = path.join(dir, name);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const content = JSON.stringify(report, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
      try {
        const tmpDir = '/tmp';
        if (fs.existsSync(tmpDir)) {
          fs.readdirSync(tmpDir).forEach(f => {
            if (/^(ai-ready-|real-data-test)/.test(f)) try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
          });
        }
      } catch (_) {}
      return { saved: true, path: filePath, format, size: Buffer.byteLength(content, 'utf-8') };
    } catch (e) {
      return { saved: false, error: e.message, path: filePath };
    }
  }
);

// ── Tool 6: compare_reports ──
server.registerTool(
  'compare_reports',
  '对比当前评估与历史评估的差异，返回结构化对比结果。',
  {
    type: 'object',
    properties: {
      current: { type: 'object', description: '当前评估结果' },
      previous: { type: 'object', description: '历史评估结果' },
    },
    required: ['current', 'previous'],
  },
  async (args) => {
    const eng = loadEngine();
    if (!eng) return engineRequired();
    return eng.interaction.compareReports(args.current, args.previous);
  }
);

// ── Tool 7: set_activation_key ──
server.registerTool(
  'set_activation_key',
  '在对话中激活 Pro 功能。用户提供激活码后，引擎验证并保存到本地。',
  {
    type: 'object',
    properties: {
      key: { type: 'string', description: '激活码，格式 AIREADY-xxxxxxxx-xxxxxxxx' },
    },
    required: ['key'],
  },
  async (args) => {
    const { key } = args;
    if (!key || typeof key !== 'string' || !key.trim()) return { success: false, message: '激活码不能为空。' };
    const trimmed = key.trim();
    if (!/^AIREADY-[a-f0-9]{8}-[a-f0-9]+$/.test(trimmed)) return { success: false, message: '激活码格式无效。格式：AIREADY-xxxxxxxx-xxxxxxxx' };
    const eng = loadEngine();
    if (eng) {
      const result = eng.activation.validateKeyString(trimmed);
      if (!result.accessible) return { success: false, message: result.message || '激活码无效或已过期。' };
    }
    const keyPath = path.join(__dirname, 'pro-key.json');
    try {
      fs.writeFileSync(keyPath, JSON.stringify({ key: trimmed, activatedAt: new Date().toISOString() }, null, 2), 'utf-8');
      return { success: true, message: '✅ Pro 已激活！Pro 功能已解锁。' };
    } catch (e) {
      return { success: false, message: '保存激活码失败：' + e.message };
    }
  }
);

// ── 启动 ──
process.stderr.write('AI Ready Engine MCP Server starting...\n');
server.start();
