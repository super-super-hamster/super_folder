import { create } from 'zustand'

export interface ContextMenuState {
  isVisible: boolean
  x: number
  y: number
  targetPath: string
  targetName: string
  isDir: boolean
  containerRect: DOMRect | null
  openMenu: (x: number, y: number, targetPath: string, targetName: string, isDir?: boolean, containerRect?: DOMRect | null) => void
  closeMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isVisible: false,
  x: 0,
  y: 0,
  targetPath: '',
  targetName: '',
  isDir: false,
  containerRect: null,
  openMenu: (x, y, targetPath, targetName, isDir = false, containerRect = null) => set({ isVisible: true, x, y, targetPath, targetName, isDir, containerRect }),
  closeMenu: () => set({ isVisible: false }),
}))
