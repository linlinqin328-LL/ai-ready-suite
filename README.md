# AI Ready Suite

> 评估设计系统的 AI 就绪成熟度、审计 AI 生成质量、侦察组件库数据 — 三位一体。
>
> **交互逻辑在引擎中（编译后混淆保护）** — 所有评分公式、交互问题、报告模板均在 `/mcp-servers/ai-ready-engine/engine/` 中，SKILL 层仅做编排。

## 快速开始（5 分钟上手）

```bash
# 1. 安装依赖
cd mcp-servers/ai-ready-engine && npm install && cd ../..

# 2. 运行测试确认一切正常
node test/run-assessment.js
node test/integration-test.js

# 3. 构建混淆版（上架用）
cd mcp-servers/ai-ready-engine && npm run build:all && cd ../..
```

**首次使用建议**：
1. 复制 `examples/sample-components.json` 到工作空间
2. 对 Codex 说：**"帮我评估一下这个组件库的 AI 就绪度"**
3. 观看引擎自动执行 D0 管线 → 展示维度评分 → 生成报告

> 详细的入门指南见 [QUICKSTART.md](QUICKSTART.md)，含完整对话流程和示例输出。

## 架构

```
ai-ready-suite/
├── .codex-plugin/plugin.json         # Plugin 清单
├── .mcp.json                         # MCP 服务器配置
├── QUICKSTART.md                     # 快速入门指南
├── skills/ai-ready-suite/SKILL.md    # 薄编排层（166 行，仅编排）
├── mcp-servers/ai-ready-engine/      # MCP 引擎（交互/评分/审计/侦察）
│   ├── index.js                      # MCP 服务端入口 + 4 个工具
│   ├── engine/
│   │   ├── interaction.js            # 交互引擎（场景/角色/提问/模板）
│   │   ├── assessment.js             # 评分引擎（公式/权重/信心指数）
│   │   ├── auditor.js                # 审计引擎（25 个真实检查函数）
│   │   └── pipeline.js               # 数据预处理管线
│   ├── schema/                       # JSON Schema
│   ├── dist/                         # 混淆编译版（发布用）
│   └── package.json
├── test/
│   ├── run-assessment.js             # 21 个单元测试
│   ├── integration-test.js           # 15 个集成测试
│   └── run-interaction.js            # 18 个交互引擎测试
├── examples/
│   ├── sample-components.json        # 示例组件数据
│   └── sample-code-to-audit.js       # 示例审计输入
├── version.json                      # 版本元信息
├── CHANGELOG.md                      # 版本日志
├── LICENSE                           # Proprietary
└── README.md
```

## 模式切换

| 你说 | 行为 | 引擎调用 |
|------|------|---------|
| "帮我评估一下设计系统的 AI 就绪度" | → 评估模式（3 种场景 x 2 种角色 x 2 种路径） | `assess_design_system` + `get_interaction_flow` |
| "审计一下这段 AI 生成的代码" | → 审计模式（C/B/A 三层，25 项检查） | `audit_design_output` + `get_interaction_flow` |
| "侦察一下这个组件库" | → 侦察模式（发现/拉取/验证） | `scout_library` + `get_interaction_flow` |

## 示例输出预览

### 评估报告

```
╔══════════════════════════════════════════╗
║  AI Ready 评估报告                        ║
╠══════════════════════════════════════════╣
║  评分：3.8 / 5 ⭐                        ║
║  等级：L2 AI 就绪                         ║
║  信心指数：85%                            ║
║  各层级得分：                              ║
║  component_standardization：3.5/5        ║
║  token_engineering：2.0/5                ║
║  semantic_intelligence：3.2/5            ║
║  ROI：从 L1 到 L2 约 2-4 周              ║
╚══════════════════════════════════════════╝
```

### 审计报告

```
╔══════════════════════════════════════════╗
║  AI 生成质量审计报告                       ║
╠══════════════════════════════════════════╣
║  总体通过率：86%                           ║
║  ✅ 18 / ❌ 3 / 总计 21                    ║
║  🔴 颜色硬编码, 间距未引用 Token            ║
║  🟡 图标使用不规范                          ║
╚══════════════════════════════════════════╝
```

### 侦察报告

```
📚 库侦察报告：Example Design System
───────────────
组件总量：45
  基础组件：32（Variant 归一化后）
  图标资产：8
Token 绑定率：80%
数据质量：full
```

> 实际运行截图将在上架前补充。

## IP 保护体系

| 层 | 保护措施 | 状态 |
|----|---------|------|
| 评分公式 | `engine/assessment.js` 编译后混淆 | ✅ |
| 交互逻辑 | `engine/interaction.js` 编译后混淆 | ✅ |
| 审计逻辑 | `engine/auditor.js` 编译后混淆 | ✅ |
| SKILL 层 | 仅编排，不含任何公式/文本/IP | ✅ |
| MCP 配置 | `.mcp.json` 指向 `dist/` 混淆版 | ✅ |
| LICENSE | Proprietary（禁止复制/再分发/逆向工程） | ✅ |
| 运行时 | `dist/` 目录发布，源码不暴露 | ✅ |

## 免费 & 商业服务

### 免费功能（安装即用）

- 快速诊断（5 分钟出速览卡）
- C 层审计（基础质量检查）
- 侦察模式 · 发现库（Discover）
- 样本数据演示
- 所有报告页脚包含联系方式

 ### Pro 功能
 
 完整评估（10 维度评分 + ROI + 信心指数）、B/A 层审计、报告保存、历史对比。
 
 **获取激活码**：发送邮件至 **3539739951@qq.com**，我会尽快回复。
 收到后在 Codex 对话中说 **"激活 Pro"**，粘贴激活码即可。
 
 你的反馈对我很重要，欢迎随时交流使用体验。

### 商业服务（按需定制）

基于此框架的实际落地需要结合团队规模、现有工具链和业务场景深度定制。如果你或你的团队对以下内容感兴趣，欢迎联系：

| 服务 | 说明 |
|------|------|
| **AI Ready 全面评估** | 结合团队工作流、现有工具链和设计系统成熟度的深度评估，交付可落地路线图 |
| **评估框架定制** | 根据企业设计系统定制评估维度、权重、评分标准，对接内部流程 |
| **AI 治理咨询** | 从评估到实施的全流程辅导，含团队培训、规范建立、工具选型 |
| **审计规则定制** | 根据企业设计规范定制 C/B/A 层审计规则，集成到 CI/CD |

**联系**: 3539739951@qq.com

## 隐私与数据

- **数据仅本地处理**：所有组件数据、代码、Token 配置均在本地 MCP 引擎中计算
- **评估结果归用户所有**：JSON 报告完全属于用户
- **无需联网**：除首次安装外完全离线可用

## 版本

当前：V1.0.0 — 详见 [CHANGELOG.md](CHANGELOG.md) 和 [version.json](version.json)

## 支持

- **邮件**: 3539739951@qq.com
- **GitHub**: https://github.com/linlinqin328-LL/AI-production-research
- **Pro 激活码**: 发送邮件至 3539739951@qq.com

## 许可

Proprietary — 详见 [LICENSE](LICENSE)。未经授权禁止复制、再分发或商业使用。
 
 ## 跨平台安装
 
 AI Ready Suite 的核心 MCP 服务器可以在所有支持 MCP 协议的 AI 工具中使用。以下是各平台的安装方式：
 
 ### Codex（本地安装）
 
 **个人 Marketplace（推荐）**：
 将仓库克隆到本地，然后在 Codex 的插件页面从个人 Marketplace 安装即可。
 
 ```bash
 git clone https://github.com/linlinqin328-LL/ai-ready-suite.git ~/plugins/ai-ready-suite
 ```
 
 Codex 中从个人 Marketplace 添加 `ai-ready-suite` 插件。
 
 **手动配置 `.mcp.json`**：
 ```json
 {
   "mcpServers": {
     "ai-ready-engine": {
       "command": "node",
       "args": ["<your-path>/ai-ready-suite/mcp-servers/ai-ready-engine/dist/index.js"]
     }
   }
 }
 ```
 
 ---
 
 ### Trae（字节跳动 AI IDE）
 
 Trae 支持通过 MCP 协议连接外部工具。在 Trae 中配置：
 
 1. 打开 Trae → 设置 → MCP 服务器 → 添加
 2. 填入以下配置：
 
 ```json
 {
   "mcpServers": {
     "ai-ready-engine": {
       "command": "node",
       "args": ["<your-path>/ai-ready-suite/mcp-servers/ai-ready-engine/dist/index.js"]
     }
   }
 }
 ```
 
 国内用户无需翻墙：[trae.com.cn](https://www.trae.com.cn)
 
 ---
 
 ### Cursor（AI 代码编辑器）
 
 在项目根目录创建 `.cursor/mcp.json`：
 
 ```json
 {
   "mcpServers": {
     "ai-ready-engine": {
       "command": "node",
       "args": ["<your-path>/ai-ready-suite/mcp-servers/ai-ready-engine/dist/index.js"]
     }
   }
 }
 ```
 
 重启 Cursor 后即可使用。
 
 ---
 
 ### 平台兼容总览
 
 | 平台 | MCP | 插件市场 | 国内访问 | 推荐安装方式 |
 |------|-----|---------|---------|------------|
 | Codex | ✅ | 个人市场 ✅ / 官方 ❌ | ⚠️ 需翻墙 | 个人 Marketplace |
 | Trae | ✅ | 有市场（适配中） | ✅ 直接访问 | 手动 MCP 配置 |
 | Cursor | ✅ | VS Code 市场 | ✅ 直接访问 | `.cursor/mcp.json` |
 
