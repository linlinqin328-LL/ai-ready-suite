# AI Ready Engine — MCP Server

MCP 服务端，为 AI Ready Suite 提供评分/审计/侦察计算能力。

## 工具

| 工具 | 说明 | 模式 |
|------|------|------|
| `assess_design_system` | 评估设计系统 AI 就绪度 | quick / full |
| `audit_design_output` | 审计 AI 生成质量 | C / B / A / all |
| `scout_library` | 侦察组件库数据 | discover / fetch / validate |

## 构建

```bash
# 开发模式（源码直接运行）
node index.js

# 生产模式（混淆编译后运行）
npm run build:all
node dist/index.js
```

## 架构

```
engine/
├── assessment.js    # 评分引擎（DIMENSION_WEIGHTS, computeScoring）
├── auditor.js       # 审计引擎（C/B/A 三层）
└── pipeline.js      # 数据预处理管线
```

⚠️ `assessment.js` 包含专有评分算法，混淆后发布。
