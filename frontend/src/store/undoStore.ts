import { create } from 'zustand'

interface UndoState {
  message: string | null;
  type: 'success' | 'error' | null;
  key: number;
  showMessage: (msg: string, isError?: boolean) => void;
  clearMessage: () => void;
}

export const useUndoStore = create<UndoState>((set) => ({
  message: null,
  type: null,
  key: 0,
  showMessage: (msg: string, isError = false) => set((state) => ({
    message: msg,
    type: isError ? 'error' : 'success',
    key: state.key + 1
  })),
  clearMessage: () => set({ message: null, type: null })
}))
