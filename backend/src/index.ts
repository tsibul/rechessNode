/**
 * Entry point of the reChess backend: loads the environment and starts the server.
 * @module index
 */
import { config } from 'dotenv'

config()

import { createApp } from './app'
import { failStalePublications } from './services/publish'
import { ensureVariants } from './services/images'
import { uploadDir } from './routes/cms/uploads'

const PORT = process.env.PORT || 3001

failStalePublications()
  .catch((e) => console.error('Could not reset stale publications:', e))
  .finally(() => {
    createApp().listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
      // Photos uploaded before WebP/AVIF conversion existed.
      void ensureVariants(uploadDir()).catch((e) => console.error('Image conversion failed:', e))
    })
  })
