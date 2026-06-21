import { create } from 'zustand'

export interface RenameState {
  isRenaming: boolean
  targetPath: string
  targetName: string
  rect: DOMRect | null
  startRename: (path: string, name: string, rect: DOMRect) => void
  endRename: () => void
}

export const useRenameStore = create<RenameState>((set) => ({
  isRenaming: false,
  targetPath: '',
  targetName: '',
  rect: null,
  startRename: (path, name, rect) => set({ isRenaming: true, targetPath: path, targetName: name, rect }),
  endRename: () => set({ isRenaming: false, targetPath: '', targetName: '', rect: null }),
}))
