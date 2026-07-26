/**
 * Jest configuration for AI Ready Suite
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'mcp-servers/ai-ready-engine/engine/**/*.js',
    '!**/node_modules/**'
  ]
};
