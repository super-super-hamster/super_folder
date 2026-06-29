import { useEffect } from 'react'
import { models } from '../../wailsjs/go/models'
import { useTabsStore } from '../store/tabsStore'
import { useBatchRenameStore } from '../store/batchRenameStore'
import { useSelectionStore } from '../store/selectionStore'

export function useBatchRenameTrigger(currentPath: string | undefined, files: models.FileInfo[]) {
  useEffect(() => {
    const handleBatchRename = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.files && detail.files.length > 0) {
        useBatchRenameStore.getState().setFiles(detail.files)

        if (currentPath) {
          useTabsStore.getState().navigate(currentPath + '\\批量重命名', '批量重命名', true)
        }
      } else {
        const selectedArr = Array.from(useSelectionStore.getState().selectedPaths)
        if (selectedArr.length > 1) {
          const selectedFiles = files.filter(f => selectedArr.includes(f.path))
          useBatchRenameStore.getState().setFiles(selectedFiles)
          if (currentPath) {
            useTabsStore.getState().navigate(currentPath + '\\批量重命名', '批量重命名', true)
          }
        }
      }
    }
    window.addEventListener('triggerBatchRename', handleBatchRename)
    return () => window.removeEventListener('triggerBatchRename', handleBatchRename)
  }, [files, currentPath])
}
