/**
 * Web analytics: Yandex Metrika and VK. Numbers come from the CMS settings
 * (`counter.metrika`, `counter.vk`). Nothing is loaded before the visitor accepted cookies:
 * the cookie banner calls `startCounters()` on accept, a returning visitor starts them on load.
 * Google is not used.
 * @module services/counters
 */
import { getSetting } from '@/data/content'

/**
 * Name of the cookie that stores the consent choice.
 */
export const CONSENT_COOKIE = 'cookieConsent'

type Win = Window & Record<string, any>
let started = false

/**
 * Tells whether the visitor accepted cookies.
 * @returns True when accepted.
 */
export function hasConsent(): boolean {
  return typeof document !== 'undefined' && /(?:^|;\s*)cookieConsent=accepted(?:;|$)/.test(document.cookie)
}

function addScript(src: string, onload?: () => void): void {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  if (onload) s.onload = onload
  document.head.appendChild(s)
}

function startMetrika(id: string): void {
  const w = window as Win
  w.ym = w.ym || function (...args: unknown[]) { (w.ym.a = w.ym.a || []).push(args) }
  w.ym.l = Date.now()
  addScript('https://mc.yandex.ru/metrika/tag.js')
  w.ym(Number(id), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false })
}

function startVk(id: string): void {
  const w = window as Win
  if (/^VK-RTRG-/.test(id)) {
    // VK retargeting pixel
    addScript('https://vk.com/js/api/openapi.js?169', () => {
      w.VK?.Retargeting?.Init(id)
      w.VK?.Retargeting?.Hit()
    })
  } else {
    // top.mail.ru / VK counter with a numeric id
    const q = (w._tmr = w._tmr || [])
    q.push({ id, type: 'pageView', start: Date.now() })
    addScript('https://top-fwz1.mail.ru/js/code.js')
  }
}

/** Starts the counters once, only with consent and only for the numbers set in the CMS. */
export function startCounters(): void {
  if (started || typeof window === 'undefined' || !hasConsent()) return
  started = true
  const metrika = getSetting('counter.metrika').trim()
  const vk = getSetting('counter.vk').trim()
  if (/^\d+$/.test(metrika)) startMetrika(metrika)
  if (vk) startVk(vk)
}

/** Virtual page view after a route change (the first view is counted by the counter itself). */
export function trackPage(path: string): void {
  if (!started) return
  const w = window as Win
  const metrika = getSetting('counter.metrika').trim()
  if (/^\d+$/.test(metrika)) w.ym?.(Number(metrika), 'hit', path)
  if (w._tmr && !/^VK-RTRG-/.test(getSetting('counter.vk'))) {
    w._tmr.push({ id: getSetting('counter.vk').trim(), type: 'pageView', url: path, start: Date.now() })
  }
}
