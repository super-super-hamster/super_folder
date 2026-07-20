import { useEffect } from 'react'

export interface UseFileListShortcutsCallbacks {
  onSelectAll: () => void
  onToggleSelectionMode: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: (shiftKey: boolean) => void
  onRename: () => void
  onSearchFocus: () => void
  onNavigateSelection: (direction: 'up' | 'down' | 'left' | 'right') => void
}

export function useFileListShortcuts(callbacks: UseFileListShortcutsCallbacks) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        callbacks.onSelectAll()
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey) {
        e.preventDefault()
        callbacks.onToggleSelectionMode()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        callbacks.onCopy()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        callbacks.onCut()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        callbacks.onPaste()
      } else if (e.key === 'Delete') {
        e.preventDefault()
        callbacks.onDelete(e.shiftKey)
      } else if (e.key === 'F2') {
        e.preventDefault()
        callbacks.onRename()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        callbacks.onSearchFocus()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        callbacks.onNavigateSelection(e.key.slice(5).toLowerCase() as 'up' | 'down' | 'left' | 'right')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])
}
