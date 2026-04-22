export default {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [['@babel/preset-env', {
        targets: { node: 'current' },
        modules: 'auto'
      }]]
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^webextension-polyfill$': '<rootDir>/src/__tests__/__mocks__/webextension-polyfill.js',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.(js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/setup.js',
    '<rootDir>/src/__tests__/__mocks__/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/index.js',
    '!src/content/**',
    '!src/background/**',
    '!src/**/popup.{js,jsx}',
    '!src/**/settings.{js,jsx}',
    '!src/**/onboarding.{js,jsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 10000,
};