/**
 * AI Ready Suite — 激活码生成工具
 * 
 * 使用说明：
 *   node tools/generate-key.js <邮箱/标识> <有效天数>
 * 
 * 示例：
 *   node tools/generate-key.js user@example.com 90
 *   node tools/generate-key.js 用户微信名 30
 * 
 * ⚠️ 此工具仅在本地运行，用于生成激活码分发给 Pro 用户。
 *    激活码请通过私信/邮件发送，不要公开。
 */

const crypto = require('crypto');

// ============================================================
// SECRET 从环境变量读取，不在源码中硬编码
// 设置方法：export AI_READY_SECRET="你的密钥"
// 密钥必须与 ai-ready-engine/engine/activation.js 中的 ACTIVATION_SECRET 一致
// ⚠️ 此 seed 仅用于客户端 gate，无法防止决心够大的逆向
//    但其目的是行为门槛（behavior gate），不是安全防线
// ============================================================
const ACTIVATION_SECRET = process.env.AI_READY_SECRET;
if (!ACTIVATION_SECRET) {
  console.error('❌ 错误：未设置 AI_READY_SECRET 环境变量');
  console.error('');
  console.error('设置方式：');
  console.error('  export AI_READY_SECRET="你的密钥"   # Mac/Linux');
  console.error('  set AI_READY_SECRET=你的密钥         # Windows');
  console.error('');
  console.error('密钥必须与 ai-ready-engine/engine/activation.js 中的 ACTIVATION_SECRET 一致。');
  process.exit(1);
}

function generateKey(identifier, days) {
  if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
    console.error('❌ 错误：标识不能为空');
    process.exit(1);
  }
  if (!days || typeof days !== 'number' || days < 1) {
    console.error('❌ 错误：有效天数必须 >= 1');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiryTimestamp = now + days * 86400;
  const expiryHex = expiryTimestamp.toString(16);

  // HMAC-SHA256(secret, identifier + "|" + expiryHex)
  const hmac = crypto.createHmac('sha256', ACTIVATION_SECRET)
    .update('|' + expiryHex)
    .digest('hex');

  // 取前 8 个 hex 字符（4 字节）
  const hmacPrefix = hmac.slice(0, 8);

  // 格式：AIREADY-{hmac_prefix}-{expiry_hex}
  const key = `AIREADY-${hmacPrefix}-${expiryHex}`;

  // 计算过期日期
  const expiryDate = new Date(expiryTimestamp * 1000);

  return {
    key,
    identifier: identifier.trim(),
    issuedAt: new Date().toISOString(),
    expiresAt: expiryDate.toISOString(),
    daysValid: days
  };
}

// ============================================================
// CLI 入口
// ============================================================

const [, , identifier, daysStr] = process.argv;

if (!identifier || !daysStr) {
  console.log('');
  console.log('AI Ready Suite — 激活码生成工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('用法:');
  console.log('  node tools/generate-key.js <邮箱/标识> <有效天数>');
  console.log('');
  console.log('示例:');
  console.log('  node tools/generate-key.js 3539739951@qq.com 90');
  console.log('  node tools/generate-key.js zhangsan_wechat 30');
  console.log('');
 console.log('发给用户时，告诉用户在对话中激活:');
 console.log('  对 Codex 说 "激活 Pro"，然后粘贴激活码');
  console.log('');
  process.exit(0);
}

const days = parseInt(daysStr, 10);
if (isNaN(days) || days < 1) {
  console.error('❌ 有效天数必须是正整数');
  process.exit(1);
}

const result = generateKey(identifier, days);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  AI Ready Suite — 激活码已生成');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`  激活码: ${result.key}`);
console.log('');
console.log(`  用户标识: ${result.identifier}`);
console.log(`  有效期至: ${result.expiresAt.slice(0, 10)}（${result.daysValid} 天）`);
console.log(`  签发时间: ${result.issuedAt.slice(0, 10)}`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  📌 发送给用户的信息模板:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`  AI Ready Suite Pro 激活码`);
console.log(`  激活码: ${result.key}`);
console.log(`  有效期: ${result.expiresAt.slice(0, 10)}`);
console.log('');
console.log(`  使用方法（对话内激活）：`);
console.log(`  1. 对 Codex 说 "激活 Pro" 或 "Activate Pro"`);
console.log(`  2. 粘贴激活码: ${result.key}`);
console.log('');
console.log('  或启动时设置环境变量：');
console.log(`  （备用：也可通过环境变量 AI_READY_KEY=${result.key} 启动）`);
console.log('');
