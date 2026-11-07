/**
 * Price actually asked from the backend in the browser. The page carries the price of the
 * build; once the backend answers, the visible price and the JSON-LD `Offer` switch to this one.
 * @module data/livePrice
 */
import { ref } from 'vue'

/**
 * Current price loaded in the browser; null until loaded.
 */
export const livePrice = ref<number | null>(null)
