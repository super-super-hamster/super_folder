import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GetConfig, SetConfig } from '../../wailsjs/go/main/App'

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

interface SettingsState {
  // Configs
  shortcuts: ShortcutItem[]
  setShortcuts: (items: ShortcutItem[]) => void
  searchPresets: SearchPreset[]
  setSearchPresets: (presets: SearchPreset[]) => void
  cacheLimitMB: number
  setCacheLimitMB: (limit: number) => void
  
  // Save/Load to backend
  loadFromBackend: () => Promise<void>
  saveShortcuts: () => Promise<void>
  saveSearchPresets: () => Promise<void>
}

const defaultShortcuts: ShortcutItem[] = [
  { id: 'desktop', name: '桌面', path: '', icon: 'computer_line.svg', visible: true },
  { id: 'downloads', name: '下载', path: '', icon: 'download_2_line.svg', visible: true },
  { id: 'documents', name: '文档', path: '', icon: 'document_line.svg', visible: true },
  { id: 'pictures', name: '图片', path: '', icon: 'pic_2_fill.svg', visible: true },
  { id: 'music', name: '音乐', path: '', icon: 'music_2_line.svg', visible: true },
  { id: 'videos', name: '视频', path: '', icon: 'video_line.svg', visible: true },
]

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
      cacheLimitMB: 1024, // default 1GB
      setCacheLimitMB: (limit) => set({ cacheLimitMB: limit }),
      
      loadFromBackend: async () => {
        try {
          const scJSON = await GetConfig("shortcuts")
          if (scJSON) {
            set({ shortcuts: JSON.parse(scJSON) })
          }
        } catch (e) { console.error("Failed to load shortcuts", e) }
        
        try {
          const spJSON = await GetConfig("searchPresets")
          if (spJSON) {
            set({ searchPresets: JSON.parse(spJSON) })
          }
        } catch (e) { console.error("Failed to load searchPresets", e) }
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
      }
    }),
    {
      name: 'filege-settings-storage',
      partialize: (state) => ({ 
        cacheLimitMB: state.cacheLimitMB 
      }),
    }
  )
)
