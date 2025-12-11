module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!node_modules/**'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true
};
