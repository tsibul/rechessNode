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
import { expirePending, startExpiryJob } from './services/emailConfirm'
import { uploadDir } from './routes/cms/uploads'

const PORT = process.env.PORT || 3001
// HOST=127.0.0.1 on the server keeps the backend reachable only through the local proxy.
// Unset: all addresses (so `localhost` works for both IPv4 and IPv6 in development).
const HOST = process.env.HOST

assertConfig()

failStalePublications()
  .catch((e) => console.error('Could not reset stale publications:', e))
  .finally(() => {
    const onListening = () => {
      console.log(`Server is running on port ${PORT}`)
      // Photos uploaded before WebP/AVIF conversion existed.
      // Orders not confirmed within 24 hours are cancelled (on start and every 10 minutes).
      void expirePending().catch((e) => console.error('Cancelling unconfirmed orders failed:', e))
      startExpiryJob()
      void ensureVariants(uploadDir()).catch((e) => console.error('Image conversion failed:', e))
    }
    const app = createApp()
    if (HOST) app.listen(Number(PORT), HOST, onListening)
    else app.listen(Number(PORT), onListening)
  })
