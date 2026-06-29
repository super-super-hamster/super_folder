import { create } from 'zustand'

export type ModalType = 'progress' | 'conflict' | 'rename_conflict' | 'warning' | 'unsaved_warning' | 'permanent_delete_confirm' | 'delete_error' | 'batch_rename_conflict' | 'confirm' | null

interface ModalState {
  activeModal: ModalType
  modalData: any
  openModal: (type: ModalType, data?: any) => void
  closeModal: () => void
  updateModalData: (data: any) => void
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (type, data) => set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  updateModalData: (data) => set((state) => ({ modalData: { ...state.modalData, ...data } })),
}))
