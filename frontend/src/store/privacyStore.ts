import { create } from 'zustand'
import { models } from '../../wailsjs/go/models'
import {
  GetPrivacyState,
  SetupPrivacyPassword,
  UnlockPrivacyMode,
  LockPrivacyMode,
  SetRestorePrivacyModeOnStartup,
  SetPathProtected,
  SetTagProtected,
  VerifyWindowsIdentityForPrivacyReset,
  ResetPrivacyPassword
} from '../../wailsjs/go/main/App'
import { useUIStore } from './uiStore'
import { useTagStore } from './tagStore'

type PrivacyDialogMode = 'setup' | 'unlock' | 'startupUnlock' | 'reset' | null

interface PrivacyStateStore {
  state: models.PrivacyState | null
  dialogMode: PrivacyDialogMode
  error: string
  loading: boolean
  load: () => Promise<void>
  openDialog: (mode: PrivacyDialogMode) => void
  closeDialog: () => void
  requestPrivacyMode: () => void
  lock: () => Promise<void>
  setup: (password: string, confirm: string) => Promise<void>
  unlock: (password: string) => Promise<void>
  setRestoreOnStartup: (enabled: boolean) => Promise<void>
  setPathProtected: (path: string, isDir: boolean, protectedState: boolean) => Promise<void>
  setTagProtected: (tagID: string, protectedState: boolean) => Promise<void>
  verifyWindowsReset: () => Promise<boolean>
  resetPassword: (password: string, confirm: string) => Promise<void>
}

const refreshFileViews = () => {
  useUIStore.getState().triggerRefresh()
}

const refreshPrivacyViews = () => {
  refreshFileViews()
  useTagStore.getState().triggerTagRefresh()
  useTagStore.getState().fetchGlobalTags()
}

export const usePrivacyStore = create<PrivacyStateStore>((set, get) => ({
  state: null,
  dialogMode: null,
  error: '',
  loading: false,
  load: async () => {
    const state = await GetPrivacyState()
    set({ state })
    if (state.shouldPromptRestore) {
      set({ dialogMode: 'startupUnlock', error: '' })
    }
  },
  openDialog: (mode) => set({ dialogMode: mode, error: '' }),
  closeDialog: () => set({ dialogMode: null, error: '' }),
  requestPrivacyMode: () => {
    const state = get().state
    set({ dialogMode: state?.hasPassword ? 'unlock' : 'setup', error: '' })
  },
  lock: async () => {
    const state = await LockPrivacyMode()
    set({ state, dialogMode: null, error: '' })
    refreshPrivacyViews()
  },
  setup: async (password, confirm) => {
    set({ loading: true, error: '' })
    try {
      const state = await SetupPrivacyPassword(password, confirm)
      set({ state, dialogMode: null })
      refreshPrivacyViews()
    } catch (e: any) {
      set({ error: `${e}` })
      throw e
    } finally {
      set({ loading: false })
    }
  },
  unlock: async (password) => {
    set({ loading: true, error: '' })
    try {
      const state = await UnlockPrivacyMode(password)
      set({ state, dialogMode: null })
      refreshPrivacyViews()
    } catch (e: any) {
      set({ error: `${e}` })
      throw e
    } finally {
      set({ loading: false })
    }
  },
  setRestoreOnStartup: async (enabled) => {
    const state = await SetRestorePrivacyModeOnStartup(enabled)
    set({ state })
  },
  setPathProtected: async (path, isDir, protectedState) => {
    await SetPathProtected(path, isDir, protectedState)
    refreshFileViews()
  },
  setTagProtected: async (tagID, protectedState) => {
    await SetTagProtected(tagID, protectedState)
    refreshPrivacyViews()
  },
  verifyWindowsReset: async () => {
    set({ loading: true, error: '' })
    try {
      return await VerifyWindowsIdentityForPrivacyReset()
    } catch (e: any) {
      set({ error: `${e}` })
      return false
    } finally {
      set({ loading: false })
    }
  },
  resetPassword: async (password, confirm) => {
    set({ loading: true, error: '' })
    try {
      const state = await ResetPrivacyPassword(password, confirm)
      set({ state, dialogMode: null })
      refreshPrivacyViews()
    } catch (e: any) {
      set({ error: `${e}` })
      throw e
    } finally {
      set({ loading: false })
    }
  }
}))
