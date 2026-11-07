const ESM_DEPS = 'htmlparser2|entities|domhandler|domutils|domelementtype|dom-serializer'

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Suites share one database; run them one at a time.
  maxWorkers: 1,
  roots: ['<rootDir>/src'],
  // `roots` is limited to src, so tests of git worktrees (.claude/worktrees) are never picked up.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Fails the run when a suite leaves rows in the shared database.
  // Mail never leaves the machine in tests: no SMTP, files go to a temporary folder.
  setupFiles: ['<rootDir>/src/testing/env.ts'],
  globalSetup: '<rootDir>/src/testing/globalSetup.ts',
  globalTeardown: '<rootDir>/src/testing/globalTeardown.ts',
  testMatch: [
    '**/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    // sanitize-html 2.18+ pulls in ESM-only packages (htmlparser2 12 and its family). Jest runs CommonJS, so
    // these few packages are compiled to CommonJS on the fly; the server itself loads them with require(esm).
    [`node_modules/(?:${ESM_DEPS})/.+\\.js$`]: ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', esModuleInterop: true }, diagnostics: false }]
  },
  transformIgnorePatterns: [`node_modules/(?!(?:${ESM_DEPS})/)`],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
    '!src/types/**/*'
  ]
} 