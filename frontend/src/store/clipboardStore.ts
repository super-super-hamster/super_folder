import { create } from 'zustand'
import { models } from '../../wailsjs/go/models'

interface ClipboardState {
  operation: 'copy' | 'cut' | null
  items: models.FileInfo[]
  capsuleKey: number
  copy: (items: models.FileInfo[]) => void
  cut: (items: models.FileInfo[]) => void
  clear: () => void
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  operation: null,
  items: [],
  capsuleKey: 0,
  copy: (items) => set((state) => ({ operation: 'copy', items, capsuleKey: state.capsuleKey + 1 })),
  cut: (items) => set((state) => ({ operation: 'cut', items, capsuleKey: state.capsuleKey + 1 })),
  clear: () => set({ operation: null, items: [] }),
}))
