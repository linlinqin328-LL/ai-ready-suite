# AI Ready Suite

> Assess design system AI readiness maturity, audit AI-generated output quality, scout component library data — three capabilities in one.
>
> **All interaction logic lives in the engine (compiled + obfuscated)** — scoring formulas, interaction questions, report templates are in `/mcp-servers/ai-ready-engine/engine/`. The SKILL layer is orchestration only.

## Quick Start (5 min)

```bash
# 1. Install dependencies
cd mcp-servers/ai-ready-engine && npm install && cd ../..

# 2. Run tests to confirm everything is working
node test/run-assessment.js
node test/integration-test.js

# 3. Build obfuscated dist (for marketplace)
cd mcp-servers/ai-ready-engine && npm run build:all && cd ../..
```

**First-time use tips**:
1. Copy `examples/sample-components.json` to your workspace
2. Tell Codex: **"Evaluate the AI readiness of this component library"**
3. Watch the engine auto-run D0 pipeline → show dimension scores → generate report

> Detailed walkthrough at [QUICKSTART.en.md](QUICKSTART.en.md) with full conversation flow and sample output.

## Architecture

```
ai-ready-suite/
├── .codex-plugin/plugin.json         # Plugin manifest
├── .mcp.json                         # MCP server config
├── QUICKSTART.en.md                  # Quick start guide (English)
├── skills/ai-ready-suite/SKILL.md    # Thin orchestration layer (166 lines)
├── mcp-servers/ai-ready-engine/      # MCP engine (interaction/scoring/audit/scout)
│   ├── index.js                      # MCP server entry + 4 tools
│   ├── engine/
│   │   ├── interaction.js            # Interaction engine (scenarios/roles/questions/templates)
│   │   ├── assessment.js             # Scoring engine (formulas/weights/confidence)
│   │   ├── auditor.js                # Audit engine (25 real check functions)
│   │   └── pipeline.js               # Data preprocessing pipeline
│   ├── schema/                       # JSON Schemas
│   ├── dist/                         # Obfuscated build (published)
│   └── package.json
├── test/
│   ├── run-assessment.js             # 21 unit tests
│   ├── integration-test.js           # 15 integration tests
│   └── run-interaction.js            # 18 interaction engine tests
├── examples/
│   ├── sample-components.json        # Sample component data (18 components)
│   └── sample-code-to-audit.js       # Sample audit input
├── version.json                      # Version metadata
├── CHANGELOG.md                      # Version history
├── LICENSE                           # Proprietary
└── README.md
```

## Mode Switching

| You Say | Behavior | Engine Call |
|---------|----------|-------------|
| "Evaluate the AI readiness of this design system" | → Assessment mode (3 scenarios x 2 roles x 2 paths) | `assess_design_system` + `get_interaction_flow` |
| "Audit this AI-generated code" | → Audit mode (C/B/A layers, 25 checks) | `audit_design_output` + `get_interaction_flow` |
| "Scout this component library" | → Scout mode (discover/fetch/validate) | `scout_library` + `get_interaction_flow` |

## Sample Output Preview

### Assessment Report

```
╔══════════════════════════════════════════╗
║  AI Ready Assessment Report              ║
╠══════════════════════════════════════════╣
║  Score: 3.8 / 5 ⭐                       ║
║  Level: L2 AI Ready                      ║
║  Confidence: 85%                         ║
║  Dimension Scores:                       ║
║  component_standardization: 3.5/5       ║
║  token_engineering: 2.0/5               ║
║  semantic_intelligence: 3.2/5           ║
║  ROI: L1 → L2 approximately 2-4 weeks   ║
╚══════════════════════════════════════════╝
```

### Audit Report

```
╔══════════════════════════════════════════╗
║  AI Generation Quality Audit Report      ║
╠══════════════════════════════════════════╣
║  Overall Pass Rate: 86%                  ║
║  ✅ 18 / ❌ 3 / Total 21                 ║
║  🔴 Hardcoded colors, spacing not using tokens  ║
║  🟡 Icon usage not following guidelines          ║
╚══════════════════════════════════════════╝
```

### Scout Report

```
📚 Library Scout Report: Example Design System
───────────────
Total Components: 45
  Base Components: 32 (post Variant normalization)
  Icon Assets: 8
Token Binding Rate: 80%
Data Quality: full
```

> Actual screenshots will be added before marketplace submission.

## IP Protection

| Layer | Protection | Status |
|-------|-----------|--------|
| Scoring formulas | `engine/assessment.js` compiled + obfuscated | ✅ |
| Interaction logic | `engine/interaction.js` compiled + obfuscated | ✅ |
| Audit logic | `engine/auditor.js` compiled + obfuscated | ✅ |
| SKILL layer | Orchestration only, zero IP exposed | ✅ |
| MCP config | `.mcp.json` points to `dist/` (obfuscated build) | ✅ |
| LICENSE | Proprietary (no copy/redistribution/reverse engineering) | ✅ |
| Runtime | `dist/` directory published, source code never exposed | ✅ |

 ## Pro Features & Activation
 
 Full assessment (10 dimensions + ROI + confidence index), B/A layer audit, report saving, and history comparison.
 
 **Get an activation code**: Email **3539739951@qq.com** and I'll respond promptly.
 Once received, tell Codex **"Activate Pro"** and paste the code.
 
 Your feedback matters — feel free to share your experience.
 
 ## Commercial Services (Custom)
 
 Need custom services? Contact **3539739951@qq.com**:
 
### Commercial Services (Custom)

Need custom services? Contact **ai-ready-suite@imagine-forest.dev**:

| Service | Description |
|---------|-------------|
| **Custom Assessment Framework** | Tailor assessment dimensions, weights, scoring criteria, and report templates for your design system |
| **Enterprise Private Deployment** | Private deployment within your enterprise environment, integrated with internal toolchains |
| **AI Readiness Consulting** | Assessment + improvement roadmap + implementation coaching, with full deliverable report |
| **Custom Audit Rules** | Customize C/B/A layer audit rules based on your design system specifications |

## Privacy

- **Data processed locally only**: All component data, code, and token config are computed by the local MCP engine — nothing uploaded
- **Results belong to you**: Generated JSON reports are entirely yours
- **No internet required**: Fully offline after initial installation

## Version

Current: V1.0.0 — See [CHANGELOG.md](CHANGELOG.md) and [version.json](version.json)

 ## Support
 
 - **Email**: 3539739951@qq.com
 - **GitHub**: https://github.com/linlinqin328-LL/AI-production-research

## License

Proprietary — See [LICENSE](LICENSE). Unauthorized copying, redistribution, or commercial use is prohibited.
 
 ## Cross-Platform Installation
 
 The core MCP server of AI Ready Suite works in any AI tool that supports the MCP protocol. Below are installation instructions for each platform:
 
 ### Codex (Local Installation)
 
 **Personal Marketplace (Recommended)**:
 Clone the repository locally, then install from the Personal Marketplace in Codex's plugin page.
 
 ```bash
 git clone https://github.com/linlinqin328-LL/ai-ready-suite.git ~/plugins/ai-ready-suite
 ```
 
 Add `ai-ready-suite` from the Personal Marketplace in Codex.
 
 **Manual `.mcp.json` Configuration**:
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
 
 ### Trae (ByteDance AI IDE)
 
 Trae supports MCP protocol. Configure in Trae:
 
 1. Open Trae → Settings → MCP Servers → Add
 2. Paste the configuration:
 
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
 
 Accessible in China without VPN: [trae.com.cn](https://www.trae.com.cn)
 
 ---
 
 ### Cursor (AI Code Editor)
 
 Create `.cursor/mcp.json` in your project root:
 
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
 
 Restart Cursor to use.
 
 ---
 
 ### Platform Compatibility Matrix
 
 | Platform | MCP | Plugin Marketplace | Access in China | Recommended Setup |
 |----------|-----|-------------------|-----------------|-------------------|
 | Codex | ✅ | Personal ✅ / Official ❌ | ⚠️ VPN needed | Personal Marketplace |
 | Trae | ✅ | Available (adapting) | ✅ Direct | Manual MCP config |
 | Cursor | ✅ | VS Code marketplace | ✅ Direct | `.cursor/mcp.json` |
 
