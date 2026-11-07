/** vue-docgen-cli: one Markdown file per component plus an index, into docs/generated/components. */
const path = require('path')

module.exports = {
  componentsRoot: 'src',
  components: '**/*.vue',
  outDir: path.resolve(__dirname, '../docs/generated/components'),
  getDestFile: (file, config) => path.join(config.outDir, file).replace(/\.vue$/, '.md'),
  apiOptions: { jsx: false }
}
