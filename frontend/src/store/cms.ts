/**
 * Session of the CMS user: who is logged in and which sections he may see.
 * Permissions come from the backend (`/api/cms/me`), the UI only hides what
 * the backend would refuse anyway.
 * @module store/cms
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cmsApi, CmsUser, errorMessage, setUnauthorizedHandler } from '../cms/api'
import { visibleSections } from '../cms/registry'

export const useCmsStore = defineStore('cms', () => {
  const user = ref<CmsUser | null>(null)
  const checked = ref(false)
  const error = ref('')

  const permissions = computed(() => user.value?.permissions ?? [])
  const sections = computed(() => visibleSections(permissions.value))

  function can(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function reset(): void {
    user.value = null
  }

  setUnauthorizedHandler(reset)

  /** Restores the session from the cookie on page load. */
  async function restore(): Promise<void> {
    try {
      user.value = await cmsApi.me()
    } catch {
      user.value = null
    } finally {
      checked.value = true
    }
  }

  async function login(login: string, password: string): Promise<boolean> {
    error.value = ''
    try {
      user.value = await cmsApi.login(login, password)
      return true
    } catch (e) {
      error.value = errorMessage(e)
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await cmsApi.logout()
    } finally {
      user.value = null
    }
  }

  return { user, checked, error, permissions, sections, can, restore, login, logout, reset }
})
