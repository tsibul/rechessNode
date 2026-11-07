// Writes one Markdown page per Vue component (props, events, slots) plus an index
// into docs/generated/components. Uses vue-docgen-api directly (no file watchers).
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { parse } from 'vue-docgen-api'

const root = new URL('../src', import.meta.url).pathname
const out = new URL('../../docs/generated/components', import.meta.url).pathname
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? (n === '__tests__' ? [] : walk(p)) : p.endsWith('.vue') ? [p] : []
  })
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const typeOf = (t) => (t?.name ? t.name : '')

rmSync(out, { recursive: true, force: true })
const index = []
for (const file of walk(root).sort()) {
  const doc = await parse(file)
  const rel = relative(root, file)
  const name = rel.replace(/\.vue$/, '')
  const md = [`# ${doc.displayName}`, '', `\`src/${rel}\``, '', doc.description ?? '', '']
  if (doc.props?.length) {
    md.push('## Props', '', '| Name | Type | Required | Description |', '| --- | --- | --- | --- |')
    for (const p of doc.props) md.push(`| \`${p.name}\` | \`${cell(typeOf(p.type))}\` | ${p.required ? 'yes' : 'no'} | ${cell(p.description)} |`)
    md.push('')
  }
  if (doc.events?.length) {
    md.push('## Events', '', '| Name | Description |', '| --- | --- |')
    for (const e of doc.events) md.push(`| \`${e.name}\` | ${cell(e.description)} |`)
    md.push('')
  }
  if (doc.slots?.length) {
    md.push('## Slots', '', '| Name | Description |', '| --- | --- |')
    for (const s of doc.slots) md.push(`| \`${s.name}\` | ${cell(s.description)} |`)
    md.push('')
  }
  const dest = join(out, `${name}.md`)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, md.join('\n'))
  index.push(`- [${doc.displayName}](${name}.md) — ${doc.description ?? ''} (\`src/${rel}\`)`)
}
writeFileSync(join(out, 'index.md'), ['# Vue components', '', ...index, ''].join('\n'))
console.log(`Vue components documented: ${index.length}`)
