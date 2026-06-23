import { useUIStore } from '../store/uiStore'
import { useModalStore } from '../store/modalStore'

export const guardUnsaved = (action: () => void) => {
  const { unsavedEditorPath, setUnsavedEditorPath } = useUIStore.getState()
  if (unsavedEditorPath) {
    useModalStore.getState().openModal('unsaved_warning', {
      onConfirm: () => {
        setUnsavedEditorPath(null)
        action()
      }
    })
  } else {
    action()
  }
}
