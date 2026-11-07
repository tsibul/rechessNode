// Fails when a Vue component lacks a description, or has undocumented props/events.
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'vue-docgen-api'

const root = new URL('../src', import.meta.url).pathname
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.vue') ? [p] : []
  })

const problems = []
for (const file of walk(root)) {
  const doc = await parse(file)
  const rel = relative(root, file)
  if (!doc.description) problems.push(`${rel}: component has no description`)
  for (const p of doc.props ?? []) if (!p.description) problems.push(`${rel}: prop "${p.name}" is undocumented`)
  for (const e of doc.events ?? []) if (!e.description) problems.push(`${rel}: event "${e.name}" is undocumented`)
  for (const s of doc.slots ?? []) if (!s.description) problems.push(`${rel}: slot "${s.name}" is undocumented`)
}
if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n${problems.length} Vue documentation problem(s)`)
  process.exit(1)
}
console.log('Vue documentation check passed')
