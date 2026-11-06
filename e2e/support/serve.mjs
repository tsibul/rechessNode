#!/usr/bin/env node
/**
 * Test web server standing in for nginx: serves the published site (`<SITE_TARGET>/current`, resolved on every
 * request, so a new publication shows at once), answers the dynamic routes with `app-shell.html`
 * and proxies /api and /uploads to the backend.
 */
import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const port = Number(process.env.E2E_SITE_PORT || 3100)
const api = new URL(process.env.E2E_API_URL || 'http://localhost:3101')
const target = path.resolve(process.env.SITE_TARGET)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon'
}

async function file(root, p) {
  try {
    const f = path.join(root, p)
    if (!f.startsWith(root)) return null
    const st = await fs.stat(f)
    return st.isFile() ? f : null
  } catch { return null }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    const p = http.request({ host: api.hostname, port: api.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers)
      r.pipe(res)
    })
    p.on('error', () => { res.writeHead(502); res.end('bad gateway') })
    req.pipe(p)
    return
  }
  let root
  try { root = await fs.realpath(path.join(target, 'current')) } catch { res.writeHead(503); return res.end('not published') }
  const clean = decodeURIComponent(url.pathname)
  const candidates = clean === '/' ? ['index.html'] : [clean, `${clean}.html`, path.join(clean, 'index.html')]
  let found = null
  for (const c of candidates) { found = await file(root, c); if (found) break }
  let status = 200
  if (!found) {
    if (/^\/(cart|order|cms)(\/|$)/.test(clean)) found = await file(root, 'app-shell.html')
    else { found = await file(root, '404.html'); status = 404 }
  }
  if (!found) { res.writeHead(404); return res.end('not found') }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(found)] || 'application/octet-stream' })
  res.end(await fs.readFile(found))
}).listen(port, () => console.log(`Site on ${port}`))
