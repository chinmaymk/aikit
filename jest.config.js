module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/smoke/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@chinmaymk/aikit$': '<rootDir>/src/index.ts',
    '^@chinmaymk/aikit/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 95,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        classNameTemplate: '{filepath}',
        outputDirectory: './coverage',
        outputName: 'junit.xml',
      },
    ],
  ],
};
