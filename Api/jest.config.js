module.exports = {
  collectCoverageFrom: ['**/*/*.{js,jsx}', '!**/node_modules/**', '!**/coverage/**'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'package.json', 'package-lock.json'],
  coverageProvider: 'v8',
  globalSetup: '<rootDir>/test-dotenv.js',
  testMatch: ['**/specs/**/*.[jt]s?(x)', '**/?(*.)+(test).[tj]s?(x)'],
  // These template suites import auth helpers (e.g. genereteAuthToken) that do not exist in this template
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/specs/(auth|users|companies|s3)\\.test\\.js$'],
  moduleNameMapper: {
    '#node-web-compat': './node-web-compat-node.js'
  }
};
