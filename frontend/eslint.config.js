/**
 * ESLint is used only to enforce JSDoc/TSDoc on the exported TypeScript API (feeds TypeDoc).
 * Vue components are checked by `scripts/check-vue-docs.mjs`. Run: `npm run docs:lint`.
 */
import tseslint from 'typescript-eslint'
import jsdoc from 'eslint-plugin-jsdoc'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', '**/__tests__/**', 'src/types/**', '**/*.d.ts', 'src/data/content.json']
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
