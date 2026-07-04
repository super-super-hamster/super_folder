import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GetConfig, SetConfig, SetThumbnailBudgetLimit } from '../../wailsjs/go/main/App'

export interface ShortcutItem {
  id: string
  name: string
  path: string
  icon: string
  visible: boolean
}

export interface SearchPreset {
  id: string
  name: string
  filter: {
    isCaseSensitive: boolean
    isRegex: boolean
    type: 'all' | 'file' | 'folder'
    extensions: string[]
    isExcludeFolder: boolean
    excludedFolders: string[]
  }
}

export interface ChineseConvScheme {
  id: string
  name: string
  baseScheme: string
  pairs: { from: string; to: string }[]
}

export interface SmartFolder {
  id: string
  name: string
  rootPaths: string[]
  presetId: string
}

interface SettingsState {
  // Configs
  shortcuts: ShortcutItem[]
  setShortcuts: (items: ShortcutItem[]) => void
  searchPresets: SearchPreset[]
  setSearchPresets: (presets: SearchPreset[]) => void
  chineseConvSchemes: ChineseConvScheme[]
  setChineseConvSchemes: (schemes: ChineseConvScheme[]) => void
  smartFolders: SmartFolder[]
  setSmartFolders: (folders: SmartFolder[]) => void
  cacheLimitMB: number
  setCacheLimitMB: (limit: number) => void
  cacheLimitEnabled: boolean
  setCacheLimitEnabled: (enabled: boolean) => void
  autoCleanPeriod: 'never' | 'daily' | 'weekly' | 'monthly'
  setAutoCleanPeriod: (period: 'never' | 'daily' | 'weekly' | 'monthly') => void
  doubleClickOpenMode: 'inApp' | 'defaultProgram'
  setDoubleClickOpenMode: (mode: 'inApp' | 'defaultProgram') => void
  thumbnailBudgetMB: number
  setThumbnailBudgetMB: (limit: number) => void
  initialPathModePublic: 'last' | 'custom'
  setInitialPathModePublic: (mode: 'last' | 'custom') => void
  initialPathCustomPublic: string
  setInitialPathCustomPublic: (path: string) => void
  initialPathModePrivacy: 'last' | 'custom'
  setInitialPathModePrivacy: (mode: 'last' | 'custom') => void
  initialPathCustomPrivacy: string
  setInitialPathCustomPrivacy: (path: string) => void

  // Save/Load to backend
  loadFromBackend: () => Promise<void>
  saveShortcuts: () => Promise<void>
  saveSearchPresets: () => Promise<void>
  saveChineseConvSchemes: () => Promise<void>
  saveSmartFolders: () => Promise<void>
  saveDoubleClickOpenMode: () => Promise<void>
  saveThumbnailBudgetMB: () => Promise<void>
  saveInitialPathModePublic: () => Promise<void>
  saveInitialPathCustomPublic: () => Promise<void>
  saveInitialPathModePrivacy: () => Promise<void>
  saveInitialPathCustomPrivacy: () => Promise<void>
}

const defaultShortcuts: ShortcutItem[] = [
  { id: 'desktop', name: '桌面', path: '', icon: 'computer_line.svg', visible: true },
  { id: 'downloads', name: '下载', path: '', icon: 'download_2_line.svg', visible: true },
  { id: 'documents', name: '文档', path: '', icon: 'document_line.svg', visible: true },
  { id: 'pictures', name: '图片', path: '', icon: 'pic_2_fill.svg', visible: true },
  { id: 'music', name: '音乐', path: '', icon: 'music_2_line.svg', visible: true },
  { id: 'videos', name: '视频', path: '', icon: 'video_line.svg', visible: true },
  { id: 'favorite', name: '收藏', path: 'favorite://', icon: 'star_line.svg', visible: true },
  { id: 'recent', name: '最近访问', path: 'recent://', icon: 'history_anticlockwise_line.svg', visible: true },
  { id: 'smartfolder', name: '虚拟文件夹', path: 'smartfolder://', icon: 'folder_virtual.svg', visible: true },
]

const specialItemDefaults: Record<string, ShortcutItem> = {
  favorite: { id: 'favorite', name: '收藏', path: 'favorite://', icon: 'star_line.svg', visible: true },
  recent: { id: 'recent', name: '最近访问', path: 'recent://', icon: 'history_anticlockwise_line.svg', visible: true },
  smartfolder: { id: 'smartfolder', name: '虚拟文件夹', path: 'smartfolder://', icon: 'folder_virtual.svg', visible: true },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      shortcuts: defaultShortcuts,
      setShortcuts: (items) => {
        set({ shortcuts: items })
        get().saveShortcuts()
      },
      searchPresets: [],
      setSearchPresets: (presets) => {
        set({ searchPresets: presets })
        get().saveSearchPresets()
      },
      chineseConvSchemes: [],
      setChineseConvSchemes: (schemes) => {
        set({ chineseConvSchemes: schemes })
        get().saveChineseConvSchemes()
      },
      smartFolders: [],
      setSmartFolders: (folders) => {
        set({ smartFolders: folders })
        get().saveSmartFolders()
      },
      cacheLimitMB: 1024, // default 1GB
      setCacheLimitMB: (limit) => set({ cacheLimitMB: limit }),
      cacheLimitEnabled: false,
      setCacheLimitEnabled: (enabled) => set({ cacheLimitEnabled: enabled }),
      autoCleanPeriod: 'never',
      setAutoCleanPeriod: (period) => set({ autoCleanPeriod: period }),
      doubleClickOpenMode: 'inApp',
      setDoubleClickOpenMode: (mode) => {
        set({ doubleClickOpenMode: mode })
        get().saveDoubleClickOpenMode()
      },
      thumbnailBudgetMB: 512,
      setThumbnailBudgetMB: (limit) => {
        const clamped = Math.min(1024, Math.max(16, Math.round(limit)))
        set({ thumbnailBudgetMB: clamped })
        get().saveThumbnailBudgetMB()
      },

      initialPathModePublic: 'last',
      setInitialPathModePublic: (mode) => {
        set({ initialPathModePublic: mode })
        get().saveInitialPathModePublic()
      },
      initialPathCustomPublic: '',
      setInitialPathCustomPublic: (path) => {
        set({ initialPathCustomPublic: path })
        get().saveInitialPathCustomPublic()
      },
      initialPathModePrivacy: 'last',
      setInitialPathModePrivacy: (mode) => {
        set({ initialPathModePrivacy: mode })
        get().saveInitialPathModePrivacy()
      },
      initialPathCustomPrivacy: '',
      setInitialPathCustomPrivacy: (path) => {
        set({ initialPathCustomPrivacy: path })
        get().saveInitialPathCustomPrivacy()
      },

      loadFromBackend: async () => {
        try {
          const scJSON = await GetConfig("shortcuts")
          if (scJSON) {
            const loaded = JSON.parse(scJSON) as ShortcutItem[]
            const existingIds = new Set(loaded.map(s => s.id))
            let migrated = false
            for (const id of Object.keys(specialItemDefaults)) {
              if (!existingIds.has(id)) {
                loaded.push(specialItemDefaults[id])
                migrated = true
              }
            }
            set({ shortcuts: loaded })
            if (migrated) {
              await SetConfig("shortcuts", JSON.stringify(loaded))
            }
          }
        } catch (e) { console.error("Failed to load shortcuts", e) }

        try {
          const spJSON = await GetConfig("searchPresets")
          if (spJSON) {
            set({ searchPresets: JSON.parse(spJSON) })
          }
        } catch (e) { console.error("Failed to load searchPresets", e) }

        try {
          const ccJSON = await GetConfig("chineseConvSchemes")
          if (ccJSON) {
            set({ chineseConvSchemes: JSON.parse(ccJSON) })
          }
        } catch (e) { console.error("Failed to load chineseConvSchemes", e) }

        try {
          const sfJSON = await GetConfig("smartFolders")
          if (sfJSON) {
            set({ smartFolders: JSON.parse(sfJSON) })
          }
        } catch (e) { console.error("Failed to load smartFolders", e) }

        try {
          const modeJSON = await GetConfig("doubleClickOpenMode")
          if (modeJSON) {
            set({ doubleClickOpenMode: JSON.parse(modeJSON) })
          }
        } catch (e) { console.error("Failed to load doubleClickOpenMode", e) }

        try {
          const budgetJSON = await GetConfig("thumbnailBudgetMB")
          if (budgetJSON) {
            const mb = JSON.parse(budgetJSON)
            const clamped = Math.min(1024, Math.max(16, Math.round(mb)))
            set({ thumbnailBudgetMB: clamped })
            SetThumbnailBudgetLimit(clamped).catch(console.error)
          } else {
            SetThumbnailBudgetLimit(get().thumbnailBudgetMB).catch(console.error)
          }
        } catch (e) { console.error("Failed to load thumbnailBudgetMB", e) }

        try {
          const modePublicJSON = await GetConfig("initialPathMode_public")
          if (modePublicJSON) {
            const mode = JSON.parse(modePublicJSON)
            if (mode === 'last' || mode === 'custom') {
              set({ initialPathModePublic: mode })
            }
          }
        } catch (e) { console.error("Failed to load initialPathMode_public", e) }

        try {
          const customPublicJSON = await GetConfig("initialPathCustom_public")
          if (customPublicJSON) {
            set({ initialPathCustomPublic: JSON.parse(customPublicJSON) })
          }
        } catch (e) { console.error("Failed to load initialPathCustom_public", e) }

        try {
          const modePrivacyJSON = await GetConfig("initialPathMode_privacy")
          if (modePrivacyJSON) {
            const mode = JSON.parse(modePrivacyJSON)
            if (mode === 'last' || mode === 'custom') {
              set({ initialPathModePrivacy: mode })
            }
          }
        } catch (e) { console.error("Failed to load initialPathMode_privacy", e) }

        try {
          const customPrivacyJSON = await GetConfig("initialPathCustom_privacy")
          if (customPrivacyJSON) {
            set({ initialPathCustomPrivacy: JSON.parse(customPrivacyJSON) })
          }
        } catch (e) { console.error("Failed to load initialPathCustom_privacy", e) }
      },
      
      saveShortcuts: async () => {
        try {
          await SetConfig("shortcuts", JSON.stringify(get().shortcuts))
        } catch (e) { console.error("Failed to save shortcuts", e) }
      },
      
      saveSearchPresets: async () => {
        try {
          await SetConfig("searchPresets", JSON.stringify(get().searchPresets))
        } catch (e) { console.error("Failed to save searchPresets", e) }
      },

      saveChineseConvSchemes: async () => {
        try {
          await SetConfig("chineseConvSchemes", JSON.stringify(get().chineseConvSchemes))
        } catch (e) { console.error("Failed to save chineseConvSchemes", e) }
      },
      
      saveSmartFolders: async () => {
        try {
          await SetConfig("smartFolders", JSON.stringify(get().smartFolders))
        } catch (e) { console.error("Failed to save smartFolders", e) }
      },

      saveDoubleClickOpenMode: async () => {
        try {
          await SetConfig("doubleClickOpenMode", JSON.stringify(get().doubleClickOpenMode))
        } catch (e) { console.error("Failed to save doubleClickOpenMode", e) }
      },

      saveThumbnailBudgetMB: async () => {
        try {
          const clamped = Math.min(1024, Math.max(16, Math.round(get().thumbnailBudgetMB)))
          set({ thumbnailBudgetMB: clamped })
          await SetConfig("thumbnailBudgetMB", JSON.stringify(clamped))
          await SetThumbnailBudgetLimit(clamped)
        } catch (e) { console.error("Failed to save thumbnailBudgetMB", e) }
      },

      saveInitialPathModePublic: async () => {
        try {
          await SetConfig("initialPathMode_public", JSON.stringify(get().initialPathModePublic))
        } catch (e) { console.error("Failed to save initialPathMode_public", e) }
      },

      saveInitialPathCustomPublic: async () => {
        try {
          await SetConfig("initialPathCustom_public", JSON.stringify(get().initialPathCustomPublic))
        } catch (e) { console.error("Failed to save initialPathCustom_public", e) }
      },

      saveInitialPathModePrivacy: async () => {
        try {
          await SetConfig("initialPathMode_privacy", JSON.stringify(get().initialPathModePrivacy))
        } catch (e) { console.error("Failed to save initialPathMode_privacy", e) }
      },

      saveInitialPathCustomPrivacy: async () => {
        try {
          await SetConfig("initialPathCustom_privacy", JSON.stringify(get().initialPathCustomPrivacy))
        } catch (e) { console.error("Failed to save initialPathCustom_privacy", e) }
      }
    }),
    {
      name: 'filege-settings-storage',
      partialize: (state) => ({ 
        cacheLimitMB: state.cacheLimitMB,
        cacheLimitEnabled: state.cacheLimitEnabled,
        autoCleanPeriod: state.autoCleanPeriod,
      }),
    }
  )
)
