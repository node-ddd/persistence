const baseConfig = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['json', 'lcov', 'clover'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};

module.exports = {
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      coverageDirectory: './coverage/unit',
    },
  ],
};
