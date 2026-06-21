import { create } from 'zustand'

interface SelectionState {
  selectedPaths: Set<string>
  isSelectionMode: boolean
  toggleSelect: (path: string) => void
  selectOnly: (path: string) => void
  selectAll: (paths: string[]) => void
  setSelection: (paths: string[]) => void
  clearSelection: () => void
  setSelectionMode: (mode: boolean) => void
  toggleSelectionMode: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedPaths: new Set(),
  isSelectionMode: false,
  toggleSelect: (path) =>
    set((state) => {
      const newSet = new Set(state.selectedPaths)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return { selectedPaths: newSet }
    }),
  selectOnly: (path) => set({ selectedPaths: new Set([path]) }),
  selectAll: (paths) => set({ selectedPaths: new Set(paths), isSelectionMode: true }),
  setSelection: (paths) => set({ selectedPaths: new Set(paths) }),
  clearSelection: () => set({ selectedPaths: new Set(), isSelectionMode: false }),
  setSelectionMode: (mode) => set((state) => ({ isSelectionMode: mode, selectedPaths: mode ? state.selectedPaths : new Set() })),
  toggleSelectionMode: () => set((state) => {
    const nextMode = !state.isSelectionMode
    return { isSelectionMode: nextMode, selectedPaths: nextMode ? state.selectedPaths : new Set() }
  }),
}))
