import { defineStore } from 'pinia'
import axios from 'axios'

interface AuthState {
  isAuthenticated: boolean
  isCmsAuthenticated: boolean
  cookiesAccepted: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    isCmsAuthenticated: false,
    cookiesAccepted: false
  }),

  actions: {
    // Проверка авторизации по наличию токена в cookies
    checkAuth() {
      // Проверяем только наличие токена, его валидность проверится при запросах к API
      const hasAuthToken = document.cookie.includes('authToken=')
      this.isAuthenticated = hasAuthToken
      
      // Проверяем принятие cookies (должно быть в httpOnly cookies)
      const hasCookiesAccepted = document.cookie.includes('cookiesAccepted=')
      this.cookiesAccepted = hasCookiesAccepted
    },

    // Вход в CMS через логин/пароль
    async loginCms(username: string, password: string) {
      try {
        const response = await axios.post('/api/cms/login', { username, password })
        this.isCmsAuthenticated = true
        return true
      } catch (error) {
        this.isCmsAuthenticated = false
        throw error
      }
    },

    // Выход из CMS
    async logoutCms() {
      await axios.post('/api/cms/logout')
      this.isCmsAuthenticated = false
    },

    // Принятие cookies через API (сохранится в httpOnly cookies)
    async acceptCookies() {
      try {
        await axios.post('/api/cookies/accept', {}, { 
          withCredentials: true 
        })
        this.cookiesAccepted = true
      } catch (error) {
        console.error('Failed to accept cookies:', error)
      }
    }
  }
}) 