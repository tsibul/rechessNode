#!/usr/bin/env node
/**
 * Publication: builds the site into a new release folder and switches the live site to it
 * only when the build succeeded. A failed build leaves the current site untouched.
 *
 * Run by the backend as `PUBLISH_COMMAND` (see docs/API.md). Environment:
 *   API_URL         backend that gives the content (default http://localhost:3001)
 *   PUBLISH_TARGET  folder with `releases/` and the `current` link (default <repo>/site)
 *   KEEP_RELEASES   how many finished releases to keep (default 3)
 * The web server serves `<PUBLISH_TARGET>/current`.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.resolve(process.env.PUBLISH_TARGET || path.join(frontend, '..', 'site'))
const keep = Math.max(1, Number(process.env.KEEP_RELEASES) || 3)
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const release = path.join(target, 'releases', stamp)

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: frontend, stdio: 'inherit', env: { ...process.env, ...env } })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))))
  })
}

async function exists(p) {
  return fs.access(p).then(() => true, () => false)
}

try {
  await fs.mkdir(path.join(target, 'releases'), { recursive: true })
  await run(path.join(frontend, 'node_modules', '.bin', 'vite-ssg'), ['build'], {
    BUILD_OUT_DIR: release,
    REQUIRE_API: '1',
    API_URL: process.env.API_URL || 'http://localhost:3001'
  })
  for (const f of ['index.html', 'sitemap.xml', 'robots.txt', 'app-shell.html']) {
    if (!(await exists(path.join(release, f)))) throw new Error(`Build is incomplete: ${f} is missing`)
  }
  // Atomic switch: a new link is renamed over the old one.
  const link = path.join(target, 'current')
  const tmp = path.join(target, `.current-${stamp}`)
  await fs.symlink(path.relative(target, release), tmp)
  await fs.rename(tmp, link)
  const old = (await fs.readdir(path.join(target, 'releases'))).sort().reverse().slice(keep)
  for (const name of old) await fs.rm(path.join(target, 'releases', name), { recursive: true, force: true })
  console.log(`Published ${stamp} -> ${link}`)
} catch (e) {
  console.error(`Publication failed, the current site is unchanged: ${e.message}`)
  await fs.rm(release, { recursive: true, force: true })
  process.exit(1)
}
