import { create } from 'zustand'

export interface TaskState {
  isRunning: boolean
  operation: 'copy' | 'cut' | 'permanent_delete' | ''
  progress: number
  isModalVisible: boolean
  taskData: any
  startTimer: any
  blockedAction: { action: string, timestamp: number } | null
  
  setTaskProgress: (data: any) => void
  setModalVisible: (visible: boolean) => void
  notifyBlockedAction: (action: string) => void
  clearTask: () => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  isRunning: false,
  operation: '',
  progress: 0,
  isModalVisible: false,
  taskData: null,
  startTimer: null,
  blockedAction: null,

  setTaskProgress: (data) => {
    const { isRunning, startTimer } = get()
    
    const progressVal = data.totalBytes > 0 
      ? (data.copiedBytes / data.totalBytes) * 100 
      : (data.totalFiles > 0 ? (data.processedFiles / data.totalFiles) * 100 : 0)

    if (!isRunning) {
      // First event for this task
      const timer = setTimeout(() => {
        set({ isModalVisible: true })
      }, 500)

      set({
        isRunning: true,
        operation: data.operation || 'copy',
        progress: progressVal,
        taskData: data,
        startTimer: timer
      })
    } else {
      set({
        progress: progressVal,
        taskData: data,
        operation: data.operation || get().operation
      })
    }
  },

  setModalVisible: (visible) => {
    set({ isModalVisible: visible })
  },

  notifyBlockedAction: (action) => {
    set({ blockedAction: { action, timestamp: Date.now() } })
  },

  clearTask: () => {
    const { startTimer } = get()
    if (startTimer) clearTimeout(startTimer)
    set({
      isRunning: false,
      operation: '',
      progress: 0,
      isModalVisible: false,
      taskData: null,
      startTimer: null
    })
  }
}))
