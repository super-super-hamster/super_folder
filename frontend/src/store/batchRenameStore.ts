import { create } from 'zustand'
import { models } from '../../wailsjs/go/models'

interface BatchRenameState {
  files: models.FileInfo[]
  setFiles: (files: models.FileInfo[]) => void
  clearFiles: () => void
}

export const useBatchRenameStore = create<BatchRenameState>((set) => ({
  files: [],
  setFiles: (files) => set({ files }),
  clearFiles: () => set({ files: [] }),
}))
