/**
 * Strips metadata and trailing bytes from images uploaded before upload cleaning existed.
 * JPEG and PNG only (rewritten at container level, pixels unchanged); WebP/AVIF copies are already made by
 * sharp without metadata and are left alone. Safe to repeat: a clean file is not touched again.
 *
 * Usage:
 *   npm run clean-uploads                          dry run: lists what would change, writes nothing
 *   npm run clean-uploads -- --write               rewrites files, originals are copied to a backup folder first
 *   npm run clean-uploads -- --dir /path/uploads   folder to process (default UPLOAD_DIR or ./uploads)
 *   npm run clean-uploads -- --write --backup /path  backup folder (default <dir>-backup-<timestamp>)
 *   npm run clean-uploads -- --write --no-backup   rewrite without a backup
 * @module scripts/clean-uploads
 */
import { config } from 'dotenv'
import { promises as fs } from 'fs'
import path from 'path'

config()

import { cleanImage } from '../services/imageClean'
import { detectImage, uploadDir } from '../routes/cms/uploads'

/** Result counters of one run. */
export interface CleanReport { checked: number; changed: number; bytesSaved: number; skipped: number; failed: string[]; backupDir: string | null }

/**
 * Cleans the JPEG/PNG files of one folder.
 * @param dir - Upload folder.
 * @param opts - Run options.
 * @param opts.write - Change files (false: only report).
 * @param opts.backupDir - Folder the originals are copied to before rewriting (null for none).
 * @param opts.log - Receives one line per changed or unreadable file.
 * @returns Counters and the names of files that could not be read as images.
 */
export async function cleanUploads(dir: string, opts: { write: boolean; backupDir: string | null; log?: (m: string) => void }): Promise<CleanReport> {
  const log = opts.log ?? (() => {})
  const report: CleanReport = { checked: 0, changed: 0, bytesSaved: 0, skipped: 0, failed: [], backupDir: null }
  for (const name of (await fs.readdir(dir)).sort()) {
    const file = path.join(dir, name)
    if (!(await fs.stat(file)).isFile() || name.endsWith('.tmp')) continue
    const buf = await fs.readFile(file)
    const kind = detectImage(buf)
    if (kind !== 'jpg' && kind !== 'png') { report.skipped++; continue }
    report.checked++
    let clean: Buffer
    try {
      clean = await cleanImage(buf, kind)
    } catch {
      report.failed.push(name)
      log(`unreadable, left as is: ${name}`)
      continue
    }
    if (clean.equals(buf)) continue
    report.changed++
    report.bytesSaved += buf.length - clean.length
    log(`${opts.write ? 'cleaned' : 'would clean'}: ${name} (${buf.length} -> ${clean.length} bytes)`)
    if (!opts.write) continue
    if (opts.backupDir) {
      await fs.mkdir(opts.backupDir, { recursive: true })
      await fs.copyFile(file, path.join(opts.backupDir, name))
      report.backupDir = opts.backupDir
    }
    const tmp = `${file}.tmp`
    await fs.writeFile(tmp, clean)
    await fs.rename(tmp, file)
  }
  return report
}

async function main() {
  const args = process.argv.slice(2)
  const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
  const dir = path.resolve(opt('--dir') || uploadDir())
  const write = args.includes('--write')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = write && !args.includes('--no-backup') ? path.resolve(opt('--backup') || `${dir}-backup-${stamp}`) : null
  console.log(`${write ? 'WRITE' : 'DRY RUN'}: ${dir}${backupDir ? `, backup: ${backupDir}` : write ? ', NO BACKUP' : ''}`)
  const r = await cleanUploads(dir, { write, backupDir, log: console.log })
  console.log(`checked ${r.checked}, ${write ? 'cleaned' : 'to clean'} ${r.changed}, ${r.bytesSaved} bytes less, unreadable ${r.failed.length}, other formats skipped ${r.skipped}`)
  if (!write && r.changed) console.log('Nothing was changed. Run again with --write to apply.')
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1 })
}
