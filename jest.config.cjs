module.exports = {
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
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs']
};