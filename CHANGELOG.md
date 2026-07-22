# Changelog

## 1.0.0 (2026-07-21)

### 重大变更

- **架构重构**：从三个独立 Skill 整合为统一 Plugin 架构（方案 D 落地）
  - 单入口 SKILL（`skills/ai-ready-suite/SKILL.md`）→ 分支到三种模式
  - MCP Server（`ai-ready-engine`）提供评分/审计/侦察计算
  - 评分公式从 SKILL.md 移到 `engine/assessment.js`（编译后混淆保护 IP）
- **发布格式**：从 Codex Skill → Codex Plugin（`.codex-plugin/plugin.json` + `.mcp.json`）

### 新增

- MCP 引擎三个工具：`assess_design_system`, `audit_design_output`, `scout_library`
- 数据预处理管线：资产分类、Variant 归一化、Token 绑定检测
- 10 维度评分计算引擎（含权重公式、信心指数、等级判定）
- 审计引擎（C/B/A 三层审计标准主体框架）
- JS 混淆构建脚本（`npm run build:obfuscate` → `dist/` 目录）
- 单元测试（21 个）+ 集成测试（4 个）
- `version.json` + `CHANGELOG.md`

### 安全

- LICENSE 更换为 Proprietary（从 MIT 改）
- 核心评分算法移入 JS（`engine/assessment.js`），混淆后不可读
- SKILL.md 仅引用 MCP scored 输出，不再含评分公式

---

## 合并来源

### AI Ready Assessment Skill V2.1

- 10 维度评估框架
- 数据预处理管线（Variant 归一化、Icon 分离、Token 绑定检查）
- 信心指数系统 + D6b 人工验证交互
- 跨库对比 + 版本迁移指南

### AI 生成质量审计 V0.3

- C/B/A 三层审计标准
- 12 项基础检查 + 8 项视觉检查 + 5 项语义检查

### DSM Library Scout V2.0

- 库发现/拉取/验证流程
- 智能分批拉取策略
- 数据验证 + 可信度评分
