import { create } from 'zustand'

export interface Tab {
  id: string
  title: string
  currentPath: string
  history: string[] // Path history for back/forward
  historyIndex: number // Current index in the history
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string
  addTab: (path: string, title?: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  navigate: (path: string, title?: string) => void
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
      history: ['C:\\'],
      historyIndex: 0,
    },
  ],
  activeTabId: 'default-tab',
  addTab: (path, title) =>
    set((state) => {
      const parts = path.split('\\').filter(Boolean)
      const actualTitle = title || (parts.length > 0 ? parts[parts.length - 1] : path) || 'New Tab'
      const newTab: Tab = {
        id: Date.now().toString(),
        title: actualTitle,
        currentPath: path,
        history: [path],
        historyIndex: 0,
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }
    }),
  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      if (newTabs.length === 0) return state // Don't remove the last tab
      const activeTabId =
        state.activeTabId === id ? newTabs[newTabs.length - 1].id : state.activeTabId
      return { tabs: newTabs, activeTabId }
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  navigate: (path, title) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId) {
          // Add to history and truncate future history
          const newHistory = tab.history.slice(0, tab.historyIndex + 1)
          newHistory.push(path)
          return {
            ...tab,
            currentPath: path,
            title: title || path.split('\\').pop() || path,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          }
        }
        return tab
      })
      return { tabs }
    }),
  goBack: () =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.historyIndex > 0) {
          const newIndex = tab.historyIndex - 1
          return {
            ...tab,
            currentPath: tab.history[newIndex],
            historyIndex: newIndex,
            title: tab.history[newIndex].split('\\').pop() || tab.history[newIndex],
          }
        }
        return tab
      })
      return { tabs }
    }),
  popCurrent: () =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.history.length > 1) {
          const newHistory = tab.history.slice(0, tab.historyIndex)
          const newIndex = newHistory.length - 1
          return {
            ...tab,
            history: newHistory,
            currentPath: newHistory[newIndex],
            historyIndex: newIndex,
            title: newHistory[newIndex].split('\\').pop() || newHistory[newIndex],
          }
        }
        return tab
      })
      return { tabs }
    }),
  goForward: () =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id === state.activeTabId && tab.historyIndex < tab.history.length - 1) {
          const newIndex = tab.historyIndex + 1
          return {
            ...tab,
            currentPath: tab.history[newIndex],
            historyIndex: newIndex,
            title: tab.history[newIndex].split('\\').pop() || tab.history[newIndex],
          }
        }
        return tab
      })
      return { tabs }
    }),
}))
