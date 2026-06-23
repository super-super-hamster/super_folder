import { create } from 'zustand'

export interface ContextMenuState {
  isVisible: boolean
  x: number
  y: number
  targetPath: string // If empty, it means clicked on empty space
  targetName: string
  isDir: boolean
  openMenu: (x: number, y: number, targetPath: string, targetName: string, isDir?: boolean) => void
  closeMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isVisible: false,
  x: 0,
  y: 0,
  targetPath: '',
  targetName: '',
  isDir: false,
  openMenu: (x, y, targetPath, targetName, isDir = false) => set({ isVisible: true, x, y, targetPath, targetName, isDir }),
  closeMenu: () => set({ isVisible: false }),
}))
