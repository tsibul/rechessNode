/**
 * Public site address from the `site.url` setting, used by the SEO preview.
 * Needs the `settings` permission, otherwise falls back to the empty string.
 * @module cms/siteUrl
 */
import { ref } from 'vue'
import { cmsApi } from './api'

const url = ref('')
let loaded = false

/**
 * Composable that builds public site URLs from the `site_url` setting.
 * @returns URL helpers.
 */
export function useSiteUrl() {
  if (!loaded) {
    loaded = true
    cmsApi
      .list('setting', { limit: 1, q: '', code: 'site.url' })
      .then((r) => { url.value = r.rows[0]?.value ?? '' })
      .catch(() => { url.value = '' })
  }
  return url
}
