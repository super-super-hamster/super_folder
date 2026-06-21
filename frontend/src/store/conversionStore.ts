import { create } from 'zustand'

export type ConversionStatus = 'pending' | 'converting' | 'success' | 'error'

export interface ConversionFile {
  path: string
  name: string
  ext: string
  status: ConversionStatus
}

interface ConversionState {
  files: ConversionFile[]
  targetFormat: string
  availableFormats: string[]
  isProcessing: boolean
  isPaused: boolean
  originalPath: string

  setFiles: (files: ConversionFile[]) => void
  setTargetFormat: (format: string) => void
  setAvailableFormats: (formats: string[]) => void
  setOriginalPath: (path: string) => void
  updateFileStatus: (path: string, status: ConversionStatus) => void
  removeFile: (path: string) => void
  clear: () => void

  setIsProcessing: (processing: boolean) => void
  setIsPaused: (paused: boolean) => void
}

export const useConversionStore = create<ConversionState>((set) => ({
  files: [],
  targetFormat: '',
  availableFormats: [],
  isProcessing: false,
  isPaused: false,
  originalPath: '',

  setFiles: (files) => set({ files }),
  setTargetFormat: (format) => set({ targetFormat: format }),
  setAvailableFormats: (formats) => set({ availableFormats: formats }),
  setOriginalPath: (path) => set({ originalPath: path }),

  updateFileStatus: (path, status) => set((state) => ({
    files: state.files.map(f => f.path === path ? { ...f, status } : f)
  })),

  removeFile: (path) => set((state) => ({
    files: state.files.filter(f => f.path !== path)
  })),

  clear: () => set({
    files: [],
    targetFormat: '',
    availableFormats: [],
    isProcessing: false,
    isPaused: false,
    originalPath: ''
  }),

  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setIsPaused: (paused) => set({ isPaused: paused })
}))
