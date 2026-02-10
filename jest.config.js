module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/app.js',
    '!js/modals.js',
    '!js/treemap.js',
    '!js/beeswarm.js',
    '!js/circlepack.js',
    '!js/presets.js',
    '!js/bank-import.js',
    '!js/rates.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/tests/unit/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleDirectories: ['node_modules']
};
