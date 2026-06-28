import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SortOption = 'name_asc' | 'name_desc' | 'time_asc' | 'time_desc' | 'size_asc' | 'size_desc'

export interface SearchFilter {
  isCaseSensitive: boolean
  isRegex: boolean
  type: 'all' | 'file' | 'folder'
  extensions: string[]
  isExcludeFolder: boolean
  excludedFolders: string[]
}

export interface AutocompleteSuggestion {
  type: 'prefix' | 'tag'
  text: string
  matchedPrefix: string
}

export type ViewMode = 'grid' | 'list' | 'album'

interface UIState {
  isSearchFocused: boolean
  setSearchFocused: (focused: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchFilter: SearchFilter
  setSearchFilter: (filter: Partial<SearchFilter>) => void
  isSidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
  isSearchPanelOpen: boolean
  setSearchPanelOpen: (open: boolean) => void
  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  activeSettingsTab: 'folder' | 'cache' | 'search' | 'tag'
  setActiveSettingsTab: (tab: 'folder' | 'cache' | 'search' | 'tag') => void
  isRightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
  leftSidebarWidth: number
  setLeftSidebarWidth: (width: number) => void
  rightSidebarWidth: number
  setRightSidebarWidth: (width: number) => void
  searchPanelHeight: number
  setSearchPanelHeight: (height: number) => void
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
  searchSuggestions: AutocompleteSuggestion[]
  setSearchSuggestions: (suggestions: AutocompleteSuggestion[]) => void
  selectedSuggestionIndex: number
  setSelectedSuggestionIndex: (index: number) => void
  availableTags: string[]
  setAvailableTags: (tags: string[]) => void
  unsavedEditorPath: string | null
  setUnsavedEditorPath: (path: string | null) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isTerminalOpen: boolean
  setTerminalOpen: (open: boolean) => void
  terminalPanelHeight: number
  setTerminalPanelHeight: (height: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSearchFocused: false,
      setSearchFocused: (focused) => set({ isSearchFocused: focused }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchFilter: {
      isCaseSensitive: false,
      isRegex: false,
      type: 'all',
      extensions: [],
      isExcludeFolder: false,
      excludedFolders: []
    },
      setSearchFilter: (filter) => set((state) => ({ searchFilter: { ...state.searchFilter, ...filter } })),
      isSidebarExpanded: false,
      setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
      isSearchPanelOpen: false,
      setSearchPanelOpen: (open) => set({ isSearchPanelOpen: open }),
      isSettingsOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      isTerminalOpen: false,
      setTerminalOpen: (open) => set({ isTerminalOpen: open }),
      terminalPanelHeight: 250,
      setTerminalPanelHeight: (height) => set({ terminalPanelHeight: height }),
      activeSettingsTab: 'folder',
      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
      isRightSidebarOpen: false,
      setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
      leftSidebarWidth: 220,
      setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),
      rightSidebarWidth: 320,
      setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
      searchPanelHeight: 280,
      setSearchPanelHeight: (height) => set({ searchPanelHeight: height }),
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
      setScrollToPath: (path) => set({ scrollToPath: path }),
      searchSuggestions: [],
      setSearchSuggestions: (suggestions) => set({ searchSuggestions: suggestions }),
      selectedSuggestionIndex: -1,
      setSelectedSuggestionIndex: (index) => set({ selectedSuggestionIndex: index }),
      availableTags: [],
      setAvailableTags: (tags) => set({ availableTags: tags }),
      unsavedEditorPath: null,
      setUnsavedEditorPath: (path) => set({ unsavedEditorPath: path }),
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'filege-ui-storage',
      partialize: (state) => ({ 
        sortOption: state.sortOption, 
        isGrouped: state.isGrouped,
        leftSidebarWidth: state.leftSidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth,
        searchFilter: state.searchFilter,
        viewMode: state.viewMode
      }),
    }
  )
)
