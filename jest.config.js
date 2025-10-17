export default {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.{js,cjs}',
    '**/__tests__/**/*.test.{js,cjs}'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/renderer/dialog-helper.js',
    '!node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs']
};