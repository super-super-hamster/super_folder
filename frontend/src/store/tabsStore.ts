import { create } from 'zustand'
import { guardUnsaved } from '../utils/navigationGuard'

export interface HistoryEntry {
  path: string
  isDir: boolean
}

export interface Tab {
  id: string
  title: string
  currentPath: string
  isDir: boolean
  history: HistoryEntry[] // Path history for back/forward
  historyIndex: number // Current index in the history
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string
  addTab: (path: string, title?: string, isDir?: boolean) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  navigate: (path: string, title?: string, isDir?: boolean) => void
  goBack: () => void
  goForward: () => void
  popCurrent: () => void
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [
    {
      id: 'default-tab',
      title: 'C:',
      currentPath: 'C:\\',
      isDir: true,
      history: [{ path: 'C:\\', isDir: true }],
      historyIndex: 0,
    },
  ],
  activeTabId: 'default-tab',
  addTab: (path, title, isDir = true) =>
    set((state) => {
      const parts = path.split('\\').filter(Boolean)
      const actualTitle = title || (parts.length > 0 ? parts[parts.length - 1] : path) || 'New Tab'
      const newTab: Tab = {
        id: Date.now().toString(),
        title: actualTitle,
        currentPath: path,
        isDir,
        history: [{ path, isDir }],
        historyIndex: 0,
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }
    }),
  removeTab: (id) =>
    guardUnsaved(() => set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      if (newTabs.length === 0) return state // Don't remove the last tab
      const activeTabId =
        state.activeTabId === id ? newTabs[newTabs.length - 1].id : state.activeTabId
      return { tabs: newTabs, activeTabId }
    })),
  setActiveTab: (id) => guardUnsaved(() => set({ activeTabId: id })),
  navigate: (path, title, isDir = true) =>
    guardUnsaved(() => set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId) {
          // Add to history and truncate future history
          const newHistory = tab.history.slice(0, tab.historyIndex + 1)
          newHistory.push({ path, isDir })
          return {
            ...tab,
            currentPath: path,
            isDir,
            title: title || path.split('\\').pop() || path,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          }
        }
        return tab
      })
      return { tabs }
    })),
  goBack: () =>
    guardUnsaved(() => set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.historyIndex > 0) {
          const newIndex = tab.historyIndex - 1
          const entry = tab.history[newIndex]
          return {
            ...tab,
            currentPath: entry.path,
            isDir: entry.isDir,
            historyIndex: newIndex,
            title: entry.path.split('\\').pop() || entry.path,
          }
        }
        return tab
      })
      return { tabs }
    })),
  popCurrent: () =>
    guardUnsaved(() => set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.history.length > 1) {
          const newHistory = tab.history.slice(0, tab.historyIndex)
          const newIndex = newHistory.length - 1
          const entry = newHistory[newIndex]
          return {
            ...tab,
            history: newHistory,
            currentPath: entry.path,
            isDir: entry.isDir,
            historyIndex: newIndex,
            title: entry.path.split('\\').pop() || entry.path,
          }
        }
        return tab
      })
      return { tabs }
    })),
  goForward: () =>
    guardUnsaved(() => set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.historyIndex < tab.history.length - 1) {
          const newIndex = tab.historyIndex + 1
          const entry = tab.history[newIndex]
          return {
            ...tab,
            currentPath: entry.path,
            isDir: entry.isDir,
            historyIndex: newIndex,
            title: entry.path.split('\\').pop() || entry.path,
          }
        }
        return tab
      })
      return { tabs }
    })),
}))
