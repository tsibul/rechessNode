import { defineStore } from 'pinia'

/**
 * Pinia store of global app state (client or server rendering).
 */
export const useAppStore = defineStore('app', {
  state: () => ({
    isClient: false
  }),
  actions: {
    setIsClient(value: boolean) {
      this.isClient = value
    }
  }
}) 