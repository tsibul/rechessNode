/**
 * Cookie consent state of the banner.
 * Stored in the `cookieConsent` cookie: `accepted` or `declined`. A refusal concerns only the analytics (Metrika, VK):
 * they start after `accepted`. The technical cookies (cart, order) work always, so nothing else depends on the answer.
 * @module services/consent
 */
import { ref } from 'vue'
import { startCounters } from './counters'

export type Consent = 'accepted' | 'declined' | null

const COOKIE = 'cookieConsent'

export const consent = ref<Consent>(null)
/** The banner shows until the visitor answers. */
export const bannerOpen = ref(false)

async function cookies() {
  return (await import('js-cookie')).default
}

async function store(value: 'accepted' | 'declined') {
  const Cookies = await cookies()
  Cookies.set(COOKIE, value, { expires: 365, path: '/', secure: location.protocol === 'https:', sameSite: 'Strict' })
  consent.value = value
}

/** Reads the cookie in the browser and opens the first question when there is no answer yet. */
export async function initConsent(): Promise<void> {
  const v = (await cookies()).get(COOKIE)
  consent.value = v === 'accepted' || v === 'declined' ? v : null
  bannerOpen.value = consent.value === null
}

export async function acceptCookies(): Promise<void> {
  await store('accepted')
  bannerOpen.value = false
  startCounters()
}

export async function declineCookies(): Promise<void> {
  await store('declined')
  bannerOpen.value = false
}
