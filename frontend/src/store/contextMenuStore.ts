import { create } from 'zustand'

export interface ContextMenuState {
  isVisible: boolean
  x: number
  y: number
  targetPath: string
  targetName: string
  isDir: boolean
  fileDirMap: Record<string, boolean>
  containerRect: DOMRect | null
  openMenu: (x: number, y: number, targetPath: string, targetName: string, isDir?: boolean, containerRect?: DOMRect | null, fileDirMap?: Record<string, boolean>) => void
  closeMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isVisible: false,
  x: 0,
  y: 0,
  targetPath: '',
  targetName: '',
  isDir: false,
  fileDirMap: {},
  containerRect: null,
  openMenu: (x, y, targetPath, targetName, isDir = false, containerRect = null, fileDirMap = {}) => set({ isVisible: true, x, y, targetPath, targetName, isDir, containerRect, fileDirMap }),
  closeMenu: () => set({ isVisible: false }),
}))
