 # AI Ready Suite — 激活码生成使用说明
 
 ## 概述
 
 AI Ready Suite 使用 **HMAC + 过期时间** 的激活码体系。Pro 功能（完整评估、B/A 层审计、报告保存、历史对比）需要一个有效的激活码才能解锁。
 
 激活码是**一次性生成、分发给用户**的。本说明适用于你（插件所有者）在收到用户申请时如何生成并发放激活码。
 
 ---
 
 ## 如何生成激活码
 
 ### 0. 前提条件
 
 需要设置 `AI_READY_SECRET` 环境变量（**必须**与引擎中编译的 `ACTIVATION_SECRET` 一致）。
 
 验证是否已设置：
 
 ```bash
 echo $AI_READY_SECRET
 # 如果输出空，需要先设置
 ```
 
 ### 1. 快速生成（推荐）
 
 ```bash
 # 进入项目目录
 cd /Users/huolongguo/Documents/另一个她/ai-ready-suite
 
 # 生成 90 天激活码给某用户
 node tools/generate-key.js user@example.com 90
 
 # 生成 30 天激活码给微信用户
 node tools/generate-key.js wechat_name 30
 
 # 生成 365 天激活码
 node tools/generate-key.js vip_user@example.com 365
 ```
 
 输出示例：
 
 ```
   激活码: AIREADY-3e7f2b91-67e9d640
   用户标识: user@example.com
   有效期至: 2026-10-19（90 天）
   签发时间: 2026-07-21
 ```
 
 工具同时会输出一段**可直接复制发送给用户的消息模板**，非常方便。
 
 ---
 
 ## 用户如何激活
 
 当你把激活码发给用户后，用户的激活方式有两种：
 
 ### 方式 A：对话内激活（推荐）
 
 用户在 Codex 中：
 1. 说 **"激活 Pro"** 或 **"Activate Pro"**
 2. 粘贴你给的激活码
 
 引擎会自动验证、保存到本地 `pro-key.json`，然后 Pro 功能即可使用。
 
 ### 方式 B：环境变量激活
 
 用户可以在启动时设置：
 
 ```bash
 export AI_READY_KEY="AIREADY-xxxxxxxx-xxxxxxxx"
 ```
 
 ---
 
 ## 安全注意事项
 
 1. **不要公开激活码** — 虽然 HMAC 保证无法反向推导出 `AI_READY_SECRET`，但激活码本身在有效期内可用
 2. **`AI_READY_SECRET`** 不要提交到 GitHub，不要通过公开渠道分享
 3. **激活码内置过期时间** — 用户无法本地篡改（HMAC 签名校验失败）
 4. **更换密钥** 需要：改 `activation.js` 中的 fallback → 改 `AI_READY_SECRET` → 重建 `npm run build:all` → 重新发布
 
 ---
 
 ## 激活码格式说明
 
 ```
 AIREADY-{hmac_prefix}-{expiry_hex}
 ```
 
 - `AIREADY`：固定前缀
 - `hmac_prefix`：HMAC-SHA256 前 8 位 hex
 - `expiry_hex`：过期 Unix 时间戳的 16 进制编码
 
 示例：`AIREADY-3e7f2b91-67e9d640`
 
 ---
 
 ## 文件位置
 
 | 文件 | 路径 |
 |------|------|
 | 核心生成器 | `tools/generate-key.js` |
 | 包裹脚本 | `tools/gen-key.sh` |
 | 引擎校验 | `engine/activation.js` |
 | 单元测试 | `test/activation-key.test.js` |
 | 本地激活记录 | `dist/engine/pro-key.json` |
 | 使用指南 | `tools/ACTIVATION-GUIDE.md`（本文件） |
