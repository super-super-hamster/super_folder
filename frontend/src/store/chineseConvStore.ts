import { create } from 'zustand'

export interface ChineseConvFile {
  path: string
  name: string
  ext: string
  status: 'pending' | 'converting' | 'success' | 'error'
}

export interface CustomPair {
  from: string
  to: string
}

export interface ChineseConvScheme {
  id: string
  name: string
  baseScheme: string
  pairs: CustomPair[]
}

interface ChineseConvState {
  files: ChineseConvFile[]
  baseScheme: string
  customSchemeId: string | null
  isProcessing: boolean
  isPaused: boolean
  addFiles: (paths: string[]) => void
  removeFile: (path: string) => void
  clear: () => void
  updateFileStatus: (path: string, status: ChineseConvFile['status']) => void
  setBaseScheme: (scheme: string) => void
  setCustomSchemeId: (id: string | null) => void
  setIsProcessing: (processing: boolean) => void
  setIsPaused: (paused: boolean) => void
}

const supportedExts = new Set(['.txt', '.epub'])

export const useChineseConvStore = create<ChineseConvState>((set, get) => ({
  files: [],
  baseScheme: 's2t',
  customSchemeId: null,
  isProcessing: false,
  isPaused: false,

  addFiles: (paths) => {
    const existing = new Set(get().files.map(f => f.path))
    const newFiles: ChineseConvFile[] = []
    for (const p of paths) {
      const lower = p.toLowerCase()
      const dot = lower.lastIndexOf('.')
      const ext = dot !== -1 ? lower.slice(dot) : ''
      if (!supportedExts.has(ext)) continue
      if (existing.has(p)) continue
      const namePart = p.split('\\').pop() || p
      const nameDot = namePart.lastIndexOf('.')
      const name = nameDot !== -1 ? namePart.slice(0, nameDot) : namePart
      newFiles.push({ path: p, name, ext, status: 'pending' })
      existing.add(p)
    }
    set(state => ({ files: [...state.files, ...newFiles] }))
  },

  removeFile: (path) => {
    set(state => ({ files: state.files.filter(f => f.path !== path) }))
  },

  clear: () => {
    set({ files: [], isProcessing: false, isPaused: false })
  },

  updateFileStatus: (path, status) => {
    set(state => ({
      files: state.files.map(f => f.path === path ? { ...f, status } : f)
    }))
  },

  setBaseScheme: (scheme) => set({ baseScheme: scheme }),
  setCustomSchemeId: (id) => set({ customSchemeId: id }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setIsPaused: (paused) => set({ isPaused: paused }),
}))
