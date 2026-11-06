import { defineStore } from 'pinia'

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