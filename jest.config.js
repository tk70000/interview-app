const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@supabase|uuid|@octokit)/)'
  ],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/middleware.ts',
  ],
  // Ensure tests run successfully in CI
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  // Set timeout for CI environments
  testTimeout: 10000,
  // Configure for CI
  verbose: process.env.CI === 'true',
  // Exit cleanly
  forceExit: false,
  // Handle async operations properly
  detectOpenHandles: false,
  // Silent mode if desired in CI
  silent: false,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)