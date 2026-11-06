/**
 * Photo upload. Type is detected from content, not from the client-supplied name or MIME.
 * @module routes/cms/uploads
 */
import { Router } from 'express'
import multer from 'multer'
import { randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAuth, requirePermission } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { wrap } from '../../utils/async'
import { makeVariants } from '../../services/images'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads'))
}

export function detectImage(buf: Buffer): 'jpg' | 'png' | 'webp' | 'avif' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12)
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return null
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })

export const cmsUploadsRouter = Router()

cmsUploadsRouter.post(
  '/',
  requireAuth,
  requirePermission('references', 'pages', 'seo', 'settings'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(new ApiError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.message))
      }
      next(err)
    })
  },
  wrap(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'File is required')
    const ext = detectImage(req.file.buffer)
    if (!ext) throw new ApiError(400, 'Unsupported image type')
    const name = `${randomBytes(16).toString('hex')}.${ext}`
    await fs.mkdir(uploadDir(), { recursive: true })
    const target = path.join(uploadDir(), name)
    await fs.writeFile(target, req.file.buffer, { flag: 'wx' })
    await makeVariants(target)
    res.status(201).json({ photo: name })
  })
)
