import { create } from 'zustand'

export interface ContextMenuState {
  isVisible: boolean
  x: number
  y: number
  targetPath: string // If empty, it means clicked on empty space
  targetName: string
  openMenu: (x: number, y: number, targetPath: string, targetName: string) => void
  closeMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isVisible: false,
  x: 0,
  y: 0,
  targetPath: '',
  targetName: '',
  openMenu: (x, y, targetPath, targetName) => set({ isVisible: true, x, y, targetPath, targetName }),
  closeMenu: () => set({ isVisible: false }),
}))
