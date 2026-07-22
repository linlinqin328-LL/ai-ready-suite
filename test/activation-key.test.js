/**
 * AI Ready Suite — Activation Key Tests (Jest)
 *
 * Tests validateKeyString with HMAC + expiry logic.
 * 5 test cases: valid, expired, invalid format, empty key, tampered HMAC.
 */

const { validateKeyString, ACTIVATION_SECRET } = require('../mcp-servers/ai-ready-engine/engine/activation');
const crypto = require('crypto');

/**
 * Generate a test activation key with a given expiry timestamp.
 * Matches tools/generate-key.js logic.
 */
function generateTestKey(expiryTimestamp) {
  const expiryHex = expiryTimestamp.toString(16);
  const hmac = crypto.createHmac('sha256', ACTIVATION_SECRET)
    .update('|' + expiryHex)
    .digest('hex');
  return `AIREADY-${hmac.slice(0, 8)}-${expiryHex}`;
}

describe('Activation key validation', () => {
  test('valid key should be accessible', () => {
    const future = Math.floor(Date.now() / 1000) + 86400 * 90; // 90 days from now
    const key = generateTestKey(future);
    expect(validateKeyString(key).accessible).toBe(true);
  });

  test('expired key should be rejected', () => {
    const past = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
    const key = generateTestKey(past);
    expect(validateKeyString(key).accessible).toBe(false);
  });

  test('invalid format key should be rejected', () => {
    expect(validateKeyString('not-a-key').accessible).toBe(false);
  });

  test('empty key should be rejected', () => {
    expect(validateKeyString('').accessible).toBe(false);
  });

  test('tampered HMAC should be rejected', () => {
    const future = Math.floor(Date.now() / 1000) + 86400 * 90;
    const key = generateTestKey(future);
    const tampered = key.replace(/^AIREADY-([^-]+)/, 'AIREADY-00000000');
    expect(validateKeyString(tampered).accessible).toBe(false);
  });
});
