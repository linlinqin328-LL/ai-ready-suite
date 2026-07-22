# AI Ready Suite — Quick Start

> From installation to your first report, approximately 10 minutes.

---

## 1. Installation

```bash
# Enter the plugin directory
cd ai-ready-suite

# Install MCP engine dependencies
cd mcp-servers/ai-ready-engine && npm install && cd ../..

# Verify installation
node test/run-assessment.js
node test/integration-test.js
```

If all tests pass (✅ 54/54), installation is complete.

---

## 2. First Experience: Assessment Mode (5 min)

### Prepare Data

Copy sample data to your workspace:

```bash
cp examples/sample-components.json /your/workspace/sample-components.json
```

### Start Assessment

Tell Codex:

> **"Evaluate the AI readiness of this component library"**

Or more directly:

> **"Assess the AI readiness of sample-components.json"**

### Conversation Flow

The engine will guide you through these steps:

| Step | What You Do | What Engine Does |
|------|-------------|-----------------|
| Scenario Selection | Choose purpose (report to boss / find gaps / planning / stakeholder) | Records scenario, recommends role |
| Path Selection | Choose Quick (5 min) or Full (20-30 min) | Shows time expectations |
| D0 Preprocessing | No action needed | Auto-analyzes data: classification / variant normalization / token binding |
| D1-D7 Review | Review suggested scores, adjust if needed | Shows auto-generated dimension scores |
| D8-D10 Q&A | Answer 3 questions | Guides with questions and calculates scores |
| Report Output | Get assessment results | Generates card report + JSON |

### Sample Output

```
╔══════════════════════════════════════════╗
║  AI Ready Assessment Report              ║
╠══════════════════════════════════════════╣
║  Score: 3.8 / 5 ⭐                       ║
║  Level: 🟢 L2 AI Ready                   ║
║  ...                                      ║
╚══════════════════════════════════════════╝
```

---

## 3. Audit Mode (3 min)

Prepare a code snippet or design output, then tell Codex:

> **"Audit this AI-generated code"**

Or use the sample data:

```
Paste the content of examples/sample-code-to-audit.js to Codex and say "Check this code quality"
```

The engine runs C/B/A layer checks (25 total), returns pass rate + issue list.

---

## 4. Scout Mode (2 min)

If you have component library JSON data, tell Codex:

> **"Scout this component library"**

The engine will: discover library → fetch data → validate quality (5 checks: count consistency, naming conventions, JSON parseability, component name uniqueness, Props definition completeness).

---

## 5. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Assessment returned nothing" | Check if data contains a `components` array |
| "MCP tool call failed" | Run `npm run test` to confirm engine is running |
| "All scores are 3.0" | Answer D1-D10 questions during the conversation |
| "Low confidence" | Add descriptions and Props definitions to your components |
| "Audit all failed" | Make sure code is valid component syntax; engine has built-in default component name fallback |
| "Scout validation failed" | Check that library data has `name`, `components`, and `tokens` fields |

---

## 6. Next Steps

- Run a full assessment with your own component library data
- Compare quick diagnosis vs full assessment results
- Edit `examples/sample-components.json` to test different data scenarios

 ## 7. Pro Features & Activation
 
 **Free features** (out of the box): Quick diagnosis, C-layer audit, basic scout functions, sample data demo.
 
 **Pro features** (activation code required): Full assessment (10 dimensions + ROI + confidence index), B/A layer audit, report saving, history comparison.
 
 ### Getting an Activation Code
 
 1. Email **3539739951@qq.com** and briefly describe your use case
 2. Or reach out via GitHub: https://github.com/linlinqin328-LL/AI-production-research
 3. Once received, tell Codex **"Activate Pro"** and paste the code — the engine saves it automatically
 
 ### In-Dialog Activation (No Config Editing)
 
 1. Tell Codex: **"Activate Pro"** or **"Activate AI Ready Suite"**
 2. Paste your activation code (format: `AIREADY-xxxx-xxxx`)
 3. Engine returns confirmation — Pro features available immediately
 
 > Activation code is saved to `pro-key.json` in the engine directory. This file will be deleted when uninstalling. Back it up if needed.

---

## 8. Uninstall

### Remove from Codex

1. Open Codex Settings → Plugin Manager
2. Find **AI Ready Suite**, click Remove
3. The plugin will no longer appear in the marketplace

### Delete Local Files

```bash
# After confirming the plugin directory path
rm -rf /path/to/ai-ready-suite
```

> **Note**: Back up your assessment reports and custom component lists before deleting. The plugin itself does not store user data, but custom modifications in `examples/` should be backed up manually.

 ### Activation Key Recovery
 
 If you backed up `pro-key.json`, simply place it back in the engine directory after reinstalling to restore Pro access.
 
 ### Verify Removal

```bash
# Check if the plugin directory has been cleared
ls /path/to/ai-ready-suite  # Should return "No such file or directory"
```
