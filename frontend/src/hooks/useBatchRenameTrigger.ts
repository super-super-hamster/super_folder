import { useEffect } from 'react'
import { models } from '../../wailsjs/go/models'
import { useTabsStore } from '../store/tabsStore'
import { useBatchRenameStore } from '../store/batchRenameStore'
import { useSelectionStore } from '../store/selectionStore'

function parentPath(path: string) {
  const idx = path.lastIndexOf('\\')
  return idx > 0 ? path.slice(0, idx) : ''
}

export function useBatchRenameTrigger(currentPath: string | undefined, files: models.FileInfo[]) {
  useEffect(() => {
    const handleBatchRename = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.files && detail.files.length > 0) {
        useBatchRenameStore.getState().setFiles(detail.files)

        const basePath = parentPath(detail.files[0].path) || currentPath
        if (basePath) {
          useTabsStore.getState().navigate(basePath + '\\批量重命名', '批量重命名', true)
        }
      } else {
        const selectedArr = Array.from(useSelectionStore.getState().selectedPaths)
        if (selectedArr.length > 1) {
          const selectedFiles = files.filter(f => selectedArr.includes(f.path))
          useBatchRenameStore.getState().setFiles(selectedFiles)
          const basePath = parentPath(selectedFiles[0]?.path || '') || currentPath
          if (basePath) {
            useTabsStore.getState().navigate(basePath + '\\批量重命名', '批量重命名', true)
          }
        }
      }
    }
    window.addEventListener('triggerBatchRename', handleBatchRename)
    return () => window.removeEventListener('triggerBatchRename', handleBatchRename)
  }, [files, currentPath])
}
