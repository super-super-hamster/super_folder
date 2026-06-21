import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SortOption = 'name_asc' | 'name_desc' | 'time_asc' | 'time_desc'

interface UIState {
  isSearchFocused: boolean
  setSearchFocused: (focused: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  isSidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
  isSearchPanelOpen: boolean
  setSearchPanelOpen: (open: boolean) => void
  isRightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
  leftSidebarWidth: number
  setLeftSidebarWidth: (width: number) => void
  rightSidebarWidth: number
  setRightSidebarWidth: (width: number) => void
  refreshKey: number
  triggerRefresh: () => void
  scrollPositions: Record<string, number>
  setScrollPosition: (path: string, position: number) => void
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  recentSortOption: SortOption
  setRecentSortOption: (option: SortOption) => void
  isGrouped: boolean
  setIsGrouped: (grouped: boolean) => void
  scrollToPath: string | null
  setScrollToPath: (path: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSearchFocused: false,
      setSearchFocused: (focused) => set({ isSearchFocused: focused }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      isSidebarExpanded: false,
      setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
      isSearchPanelOpen: false,
      setSearchPanelOpen: (open) => set({ isSearchPanelOpen: open }),
      isRightSidebarOpen: false,
      setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
      leftSidebarWidth: 220,
      setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),
      rightSidebarWidth: 320,
      setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
      refreshKey: 0,
      triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
      scrollPositions: {},
      setScrollPosition: (path, position) => set((state) => ({
        scrollPositions: { ...state.scrollPositions, [path]: position }
      })),
      sortOption: 'name_asc',
      setSortOption: (option) => set({ sortOption: option }),
      recentSortOption: 'time_desc',
      setRecentSortOption: (option) => set({ recentSortOption: option }),
      isGrouped: true,
      setIsGrouped: (grouped) => set({ isGrouped: grouped }),
      scrollToPath: null,
      setScrollToPath: (path) => set({ scrollToPath: path })
    }),
    {
      name: 'filege-ui-storage',
      partialize: (state) => ({ 
        sortOption: state.sortOption, 
        isGrouped: state.isGrouped,
        leftSidebarWidth: state.leftSidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth
      }),
    }
  )
)
