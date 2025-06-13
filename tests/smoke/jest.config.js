module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@chinmaymk/aikit$': '<rootDir>/../../src/index.ts',
  },
  testTimeout: 60000, // Longer timeout for real API calls
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  maxWorkers: 1, // Run tests sequentially to avoid rate limiting
};
