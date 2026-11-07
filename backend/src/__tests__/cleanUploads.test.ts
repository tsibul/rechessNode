import sharp from 'sharp'
import os from 'os'
import path from 'path'
import { promises as fs } from 'fs'
import { cleanUploads } from '../scripts/clean-uploads'

describe('clean-uploads script', () => {
  let dir: string
  let backup: string
  let dirty: Buffer
  let pixels: Buffer
  beforeEach(async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rc-clean-'))
    dir = path.join(root, 'up')
    backup = path.join(root, 'bak')
    await fs.mkdir(dir)
    const src = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#336699' } })
      .withExif({ IFD0: { Copyright: 'secret-owner' } }).jpeg().toBuffer()
    pixels = await sharp(src).raw().toBuffer()
    dirty = Buffer.concat([src, Buffer.from('TRAILING')])
    await fs.writeFile(path.join(dir, 'a.jpg'), dirty)
    await fs.writeFile(path.join(dir, 'broken.png'), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]))
    await fs.writeFile(path.join(dir, 'a.webp'), await sharp(src).webp().toBuffer())
    await fs.writeFile(path.join(dir, 'note.txt'), 'x')
  })

  it('dry run changes nothing', async () => {
    const r = await cleanUploads(dir, { write: false, backupDir: null })
    expect(r).toMatchObject({ checked: 2, changed: 1, skipped: 2 })
    expect(r.failed).toEqual(['broken.png'])
    expect((await fs.readFile(path.join(dir, 'a.jpg'))).equals(dirty)).toBe(true)
  })

  it('write cleans, backs up the original, keeps pixels, and is idempotent', async () => {
    const r = await cleanUploads(dir, { write: true, backupDir: backup })
    expect(r.changed).toBe(1)
    const now = await fs.readFile(path.join(dir, 'a.jpg'))
    expect(now.includes('secret-owner') || now.includes('TRAILING')).toBe(false)
    expect((await sharp(now).raw().toBuffer()).equals(pixels)).toBe(true)
    expect((await fs.readFile(path.join(backup, 'a.jpg'))).equals(dirty)).toBe(true)
    expect((await fs.readdir(dir)).some((n) => n.endsWith('.tmp'))).toBe(false)
    const again = await cleanUploads(dir, { write: true, backupDir: backup })
    expect(again.changed).toBe(0)
  })
})
