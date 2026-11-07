/**
 * Entry point of the reChess backend: loads the environment and starts the server.
 * @module index
 */
import { config } from 'dotenv'

config()

import { createApp } from './app'
import { assertConfig } from './config'
import { failStalePublications } from './services/publish'
import { ensureVariants } from './services/images'
import { uploadDir } from './routes/cms/uploads'

const PORT = process.env.PORT || 3001
// Only the local proxy reaches the backend by default; set HOST=0.0.0.0 to open it.
const HOST = process.env.HOST || '127.0.0.1'

assertConfig()

failStalePublications()
  .catch((e) => console.error('Could not reset stale publications:', e))
  .finally(() => {
    createApp().listen(Number(PORT), HOST, () => {
      console.log(`Server is running on port ${PORT}`)
      // Photos uploaded before WebP/AVIF conversion existed.
      void ensureVariants(uploadDir()).catch((e) => console.error('Image conversion failed:', e))
    })
  })
