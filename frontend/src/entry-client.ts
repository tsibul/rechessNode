import { createApp } from './main'

// Client-side hydration
const { app, router, pinia } = await createApp()

// wait until router is ready before mounting to ensure hydration matches
router.isReady().then(() => {
  // Hydrate the app
  app.mount('#app', true) // `true` indicates hydration
}) 