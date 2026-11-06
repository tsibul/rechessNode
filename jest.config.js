// `npm test` from the root runs the backend suites. Worktrees in .claude/worktrees
// lie outside `backend/src` and are not picked up.
module.exports = {
  verbose: true,
  projects: ['<rootDir>/backend'],
  testPathIgnorePatterns: ['<rootDir>/.claude/', '/node_modules/']
}
