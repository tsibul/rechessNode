/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SSR: boolean
  /** API origin for the browser; empty means same origin (dev proxy or reverse proxy). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
