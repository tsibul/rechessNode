/**
 * Cookie consent state shared by the banner and the order form.
 * Stored in the `cookieConsent` cookie: `accepted` or `declined`. Analytics (Metrika, VK) start only after `accepted`.
 * An order needs the consent: without it the form asks to accept the cookies first.
 * @module services/consent
 */
import { ref } from 'vue'
import { startCounters } from './counters'

export type Consent = 'accepted' | 'declined' | null
/** What the banner shows: the first question, the warning after a refusal, or the question on the order form. */
export type BannerMode = 'ask' | 'declined' | 'order' | null

const COOKIE = 'cookieConsent'

export const consent = ref<Consent>(null)
export const bannerMode = ref<BannerMode>(null)
let pending: ((ok: boolean) => void) | null = null

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
  bannerMode.value = consent.value === null ? 'ask' : null
}

function settle(ok: boolean) {
  const done = pending
  pending = null
  done?.(ok)
}

export async function acceptCookies(): Promise<void> {
  await store('accepted')
  bannerMode.value = null
  startCounters()
  settle(true)
}

export async function declineCookies(): Promise<void> {
  await store('declined')
  bannerMode.value = 'declined'
  settle(false)
}

/** Closes the warning or the question on the order form without a change of the answer. */
export function closeBanner(): void {
  bannerMode.value = null
  settle(false)
}

/** For the order form: true at once with the consent, otherwise asks and waits for the answer. */
export function requireConsent(): Promise<boolean> {
  if (consent.value === 'accepted') return Promise.resolve(true)
  settle(false)
  bannerMode.value = 'order'
  return new Promise((resolve) => { pending = resolve })
}
