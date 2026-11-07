/**
 * ESLint is used only to enforce JSDoc/TSDoc on the exported API (feeds TypeDoc and OpenAPI).
 * Run: `npm run docs:lint`. The rules do not touch code style.
 */
const tseslint = require('typescript-eslint')
const jsdoc = require('eslint-plugin-jsdoc')

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/__tests__/**', 'src/testing/**', 'src/db/migrations/**', 'src/db/seeds/**', 'src/models/**', 'src/repositories/**', 'src/types/**']
  },
  {
    files: ['**/*.ts'],
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
    },
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: { esm: true },
        require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: true, ArrowFunctionExpression: true, FunctionExpression: false },
        contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'TSEnumDeclaration', 'ExportNamedDeclaration > VariableDeclaration']
      }],
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': ['error', { definedTags: ['module', 'displayName', 'slot', 'example', 'route'] }],
      'jsdoc/no-types': 'error',
      'jsdoc/require-description': ['error', { contexts: ['any'] }]
    }
  }
]
