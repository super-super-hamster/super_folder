import { useRef, useEffect, useState, useMemo } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { useSelectionStore } from '../../store/selectionStore'
import { useClipboardStore } from '../../store/clipboardStore'
import { useModalStore } from '../../store/modalStore'
import { useSettingsStore } from '../../store/settingsStore'
import { PasteFiles, DeleteToRecycleBin, GetLocalServerPort, GetLocalAuthToken, OpenFileWithDefault } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'
import { useVirtualizer } from '@tanstack/react-virtual'
import RenamePopover from './RenamePopover'
import FileListItem from './FileListItem'
import GroupFastScroller from './GroupFastScroller'
import SmartFolderCreatePanel from './SmartFolderCreatePanel'
import ConversionView from '../conversion/ConversionView'
import BatchRenameView from '../rename/BatchRenameView'
import { useContextMenuStore } from '../../store/contextMenuStore'
import { useRenameStore } from '../../store/renameStore'
import { useBatchRenameStore } from '../../store/batchRenameStore'
import { processFiles } from '../../utils/fileSorting'
import { ProgressCapsule } from '../common/ProgressCapsule'
import { useTaskStore } from '../../store/taskStore'
import { useDirectoryFiles } from '../../hooks/useDirectoryFiles'
import { useBatchRenameTrigger } from '../../hooks/useBatchRenameTrigger'
import { useFileListShortcuts } from '../../hooks/useFileListShortcuts'
import { useMarqueeSelection } from '../../hooks/useMarqueeSelection'

export default function FileList() {
  const { tabs, activeTabId, navigate } = useTabsStore()
  const { isRightSidebarOpen, setRightSidebarOpen, refreshKey, setSearchFocused, sortOption, recentSortOption, isGrouped, scrollToPath, setScrollToPath, searchQuery, searchFilter, viewMode } = useUIStore()
  const { selectedPaths, isSelectionMode, toggleSelect, selectOnly, selectAll, setSelection, toggleSelectionMode, clearSelection } = useSelectionStore()
  const { operation, items: clipboardItems, capsuleKey, copy, cut } = useClipboardStore()
  const { openMenu } = useContextMenuStore()
  const { startRename } = useRenameStore()
  const { setFiles: setBatchRenameFiles } = useBatchRenameStore()
  const { searchPresets, smartFolders, setSmartFolders, doubleClickOpenMode } = useSettingsStore()
  
  const [isCreatingSmartFolder, setIsCreatingSmartFolder] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const currentPath = activeTab?.currentPath

  const { files, setFiles, loading, fileTagColors, protectedPathMap, missingPreset } = useDirectoryFiles(currentPath)
  useBatchRenameTrigger(currentPath, files)

  const [localPort, setLocalPort] = useState<number | null>(null)
  const [localAuthToken, setLocalAuthToken] = useState<string>('')
  useEffect(() => {
    GetLocalServerPort().then(setLocalPort).catch(console.error)
    GetLocalAuthToken().then(setLocalAuthToken).catch(console.error)
  }, [])

  const [columns, setColumns] = useState(6)

  const shortcutCallbacks = useMemo(() => ({
    onSelectAll: () => {
      if (files.length > 0) {
        selectAll(files.map(f => f.path))
      }
    },
    onToggleSelectionMode: () => toggleSelectionMode(),
    onCopy: () => {
      const selectedFiles = files.filter(f => selectedPaths.has(f.path))
      if (selectedFiles.length > 0) {
        copy(selectedFiles)
        clearSelection()
      }
    },
    onCut: () => {
      const selectedFiles = files.filter(f => selectedPaths.has(f.path))
      if (selectedFiles.length > 0) {
        cut(selectedFiles)
        clearSelection()
      }
    },
    onPaste: () => {
      const { isRunning } = useTaskStore.getState()
      if (isRunning) {
        useTaskStore.getState().notifyBlockedAction('粘贴')
        return
      }
      if (clipboardItems.length > 0 && currentPath && operation) {
        PasteFiles(operation, clipboardItems.map(f => f.path), currentPath).catch(console.error)
      }
    },
    onDelete: (shiftKey: boolean) => {
      const { isRunning } = useTaskStore.getState()
      if (isRunning) {
        useTaskStore.getState().notifyBlockedAction('删除')
        return
      }
      const selectedFiles = Array.from(selectedPaths)
      if (selectedFiles.length > 0) {
        if (shiftKey) {
          useModalStore.getState().openModal('permanent_delete_confirm', { paths: selectedFiles })
        } else {
          setFiles(prev => prev.filter(f => !selectedPaths.has(f.path)))
          DeleteToRecycleBin(selectedFiles).then(() => {
            clearSelection()
            useUIStore.getState().triggerRefresh()
          }).catch(err => {
            console.error(err)
            useModalStore.getState().openModal('warning', { message: '删除失败: ' + err })
            useUIStore.getState().triggerRefresh()
          })
        }
      }
    },
    onRename: () => {
      if (currentPath?.endsWith('\\批量重命名')) {
        return
      }
      const selectedArr = Array.from(selectedPaths)
      if (selectedArr.length === 1) {
        const targetPath = selectedArr[0]
        const targetFile = files.find(f => f.path === targetPath)
        const el = document.getElementById(`file-${targetPath}`)
        if (targetFile && el) {
          startRename(targetPath, targetFile.name, el.getBoundingClientRect())
        }
      } else if (selectedArr.length > 1) {
        const selectedFiles = files.filter(f => selectedPaths.has(f.path))
        setBatchRenameFiles(selectedFiles)
        if (currentPath) {
          navigate(currentPath + '\\批量重命名', '批量重命名', true)
        }
      }
    },
    onSearchFocus: () => setSearchFocused(true)
  }), [files, selectedPaths, currentPath, clipboardItems, operation])

  useFileListShortcuts(shortcutCallbacks)

  // Update columns based on container width
  useEffect(() => {
    if (!scrollRef.current) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      const itemWidth = viewMode === 'album' ? 80 : 112
      const cols = Math.max(1, Math.floor((width - 48) / itemWidth))
      setColumns(cols)
    })
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [currentPath, viewMode])

  const effectiveColumns = viewMode === 'list' ? 1 : columns

  const listItems = useMemo(() => {
    const activeSortOption = currentPath === 'recent://' ? recentSortOption : sortOption
    const items = processFiles(files, activeSortOption, effectiveColumns, isGrouped, viewMode)
    
    return items
  }, [files, sortOption, recentSortOption, effectiveColumns, isGrouped, currentPath, viewMode])

  const flatFiles = useMemo(() => {
    const result: models.FileInfo[] = []
    listItems.forEach(item => {
      if (item.type === 'row') {
        result.push(...item.items)
      }
    })
    return result
  }, [listItems])

  const [lastClickedPath, setLastClickedPath] = useState<string | null>(null)

  const { isDragging, dragBox, dragSelectedPaths, onPointerDown: handlePointerDown } = useMarqueeSelection({ scrollRef, listItems, columns, viewMode })

  const rowVirtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      if (!listItems[index]) return 40
      if (listItems[index].type === 'header') return 45
      if (viewMode === 'list') return 40
      if (viewMode === 'album') {
        const rowItems = (listItems[index] as any).items as models.FileInfo[]
        return rowItems[0]?.isDir ? 112 : 80
      }
      return 144
    },
    getItemKey: (index) => {
      const item = listItems[index]
      if (item.type === 'header') return `header-${item.title}`
      return `row-${item.items[0]?.path || index}`
    },
    overscan: 2,
  })

  useEffect(() => {
    rowVirtualizer.measure()
  }, [viewMode, effectiveColumns])

  useEffect(() => {
    if (!scrollToPath) return
    if (listItems.length === 0) return
    const index = listItems.findIndex(i => i.type === 'row' && i.items?.some(f => f.path === scrollToPath))
    if (index >= 0) {
      requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(index, { align: 'center' })
      })
      setScrollToPath(null)
    }
  }, [scrollToPath, listItems, rowVirtualizer, setScrollToPath])

  useEffect(() => {
    if (scrollRef.current && currentPath && !loading) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = useUIStore.getState().scrollPositions[currentPath] || 0
        }
      }, 0)
    }
  }, [currentPath, files, loading])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (currentPath) {
      useUIStore.getState().setScrollPosition(currentPath, e.currentTarget.scrollTop)
    }
  }

  const handleFileClick = (e: React.MouseEvent, file: models.FileInfo) => {
    e.stopPropagation()

    if (isSelectionMode) {
      toggleSelect(file.path)
      setLastClickedPath(file.path)
      return
    }

    if (e.shiftKey && lastClickedPath) {
      const startIdx = flatFiles.findIndex(f => f.path === lastClickedPath)
      const endIdx = flatFiles.findIndex(f => f.path === file.path)
      if (startIdx !== -1 && endIdx !== -1) {
        const minIdx = Math.min(startIdx, endIdx)
        const maxIdx = Math.max(startIdx, endIdx)
        const pathsToSelect = flatFiles.slice(minIdx, maxIdx + 1).map(f => f.path)
        
        if (e.ctrlKey || e.metaKey) {
          const newSet = new Set(selectedPaths)
          pathsToSelect.forEach(p => newSet.add(p))
          setSelection(Array.from(newSet))
        } else {
          setSelection(pathsToSelect)
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelect(file.path)
    } else {
      selectOnly(file.path)
    }
    setLastClickedPath(file.path)
  }

  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, file: models.FileInfo) => {
    let pathsToDrag = [file.path]
    if (selectedPaths.has(file.path) && selectedPaths.size > 1) {
      pathsToDrag = Array.from(selectedPaths)
    } else if (!selectedPaths.has(file.path)) {
      selectOnly(file.path)
    }
    
    // Internal drag data
    e.dataTransfer.setData('application/json', JSON.stringify(pathsToDrag))
    
    // External drag data (DownloadURL trick for single file)
    if (pathsToDrag.length === 1 && !file.isDir && localPort) {
      const fileUrl = `http://127.0.0.1:${localPort}/file?path=${encodeURIComponent(file.path)}&token=${localAuthToken}`
      const downloadStr = `application/octet-stream:${file.name}:${fileUrl}`
      e.dataTransfer.setData('DownloadURL', downloadStr)
    }
    
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const handleDragOver = (e: React.DragEvent, file: models.FileInfo) => {
    if (!file.isDir) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverPath !== file.path) {
      setDragOverPath(file.path)
    }
  }

  const handleDragLeave = (e: React.DragEvent, file: models.FileInfo) => {
    if (dragOverPath === file.path) {
      setDragOverPath(null)
    }
  }

  const handleDrop = (e: React.DragEvent, file: models.FileInfo) => {
    e.preventDefault()
    setDragOverPath(null)
    if (!file.isDir) return

    try {
      const data = e.dataTransfer.getData('application/json')
      if (!data) return
      const draggedPaths: string[] = JSON.parse(data)
      
      if (draggedPaths.includes(file.path)) return
      if (useTaskStore.getState().isRunning) {
        useTaskStore.getState().notifyBlockedAction('移动')
        return
      }

      PasteFiles('cut', draggedPaths, file.path).catch(console.error)
      clearSelection()
    } catch (err) {
      console.error("Drop failed:", err)
    }
  }

  const handleDoubleClick = (file: models.FileInfo) => {
    if (file.path === '__create_smart_folder__') {
      if (searchPresets.length === 0) {
        useModalStore.getState().openModal('warning', { message: '请先在设置中创建一个搜索预设' })
        return
      }
      setIsCreatingSmartFolder(true)
      setTimeout(() => {
        const panel = document.getElementById('smart-folder-create-panel')
        if (panel) panel.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return
    }

    if (file.isDir) {
      useSelectionStore.getState().clearSelection()
      if (file.path.startsWith('smartfolder://')) {
        navigate(file.path, '虚拟文件夹', file.isDir)
        return
      }
      navigate(file.path, file.name, file.isDir)
      return
    }

    if (file.path.startsWith('smartfolder://')) {
      navigate(file.path, '虚拟文件夹', file.isDir)
      return
    }

    if (doubleClickOpenMode === 'defaultProgram') {
      OpenFileWithDefault(file.path).catch(console.error)
      return
    }

    navigate(file.path, file.name, file.isDir)
  }

  if (currentPath?.endsWith('\\转换')) {
    return <ConversionView />
  }

  if (currentPath?.endsWith('\\批量重命名')) {
    return <BatchRenameView />
  }

  if (!currentPath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 relative">
        请从左侧选择一个目录开始
        <button 
          onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer w-10 h-10 rounded-xl bg-transparent flex items-center justify-center text-gray-600 hover:bg-sf-item-hover/50 transition-colors"
        >
          <img 
            src={isRightSidebarOpen ? "/src/assets/icons/left_line.svg" : "/src/assets/icons/right_line.svg"} 
            className="w-5 h-5 opacity-70" 
            alt="Toggle Sidebar" 
          />
        </button>
      </div>
    )
  }

  return (
    <div 
      className="h-full w-full relative overflow-hidden flex flex-col" 
      onContextMenu={(e) => {
        e.preventDefault()
        if (currentPath && scrollRef.current) {
          openMenu(e.clientX, e.clientY, '', '', false, scrollRef.current.getBoundingClientRect())
        }
      }}
    >
      {viewMode === 'list' && (
        <div className={`grid ${isSelectionMode ? 'grid-cols-[20px_1fr_96px_128px]' : 'grid-cols-[1fr_96px_128px]'} items-center gap-4 pl-[40px] pr-10 py-2 border-b border-gray-200 bg-sf-panel/80 backdrop-blur shrink-0 text-xs font-semibold text-gray-500 wails-no-drag`}>
          {isSelectionMode && <div></div>}
          <div className="text-left">名称</div>
          <div className="text-right">大小</div>
          <div className="text-right">修改日期</div>
        </div>
      )}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-6 pt-4 no-scrollbar pb-20 relative"
        onPointerDown={handlePointerDown}
      >
      {loading ? (
        <div className="flex items-center justify-center h-36 text-gray-400">正在加载文件...</div>
      ) : files.length === 0 ? (
        <div className="flex justify-center text-gray-400 py-10">
          {missingPreset
            ? '该智能文件夹关联的搜索预设已被删除，无法使用'
            : '此文件夹为空'}
        </div>
      ) : (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Marquee Selection Box */}
          {dragBox && (
            <div
              style={{
                position: 'absolute',
                left: dragBox.left,
                top: dragBox.top,
                width: dragBox.width,
                height: dragBox.height,
                backgroundColor: 'rgba(156, 163, 175, 0.3)',
                border: '2px solid #4b5563',
                borderRadius: '12px',
                pointerEvents: 'none',
                zIndex: 50
              }}
            />
          )}

          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = listItems[virtualRow.index]

            if (item.type === 'header') {
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center px-4 pt-4 pb-2"
                >
                  <span className="text-sm font-semibold text-gray-500 mr-4 whitespace-nowrap">{item.title}</span>
                  <div className="h-px bg-gray-200/60 w-full"></div>
                </div>
              )
            }

            return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
                gap: viewMode === 'album' ? '0.25rem' : '1rem',
              }}
            >
              {Array.from({ length: effectiveColumns }).map((_, colIndex) => {
                const file = item.items[colIndex]
                if (!file) return <div key={colIndex} />

                return (
                  <FileListItem
                    key={file.path}
                    file={file}
                    isProtected={protectedPathMap[file.path] === true}
                    viewMode={viewMode}
                    isSelectionMode={isSelectionMode}
                    selectedPaths={selectedPaths}
                    dragSelectedPaths={dragSelectedPaths}
                    dragOverPath={dragOverPath}
                    fileTagColors={fileTagColors}
                    onClick={handleFileClick}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={(e, f) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openMenu(e.clientX, e.clientY, f.path, f.name, f.isDir, scrollRef.current?.getBoundingClientRect())
                    }}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onToggleSelect={toggleSelect}
                  />
                )
              })}
            </div>
            )
          })}
        </div>
      )}

      {/* Inline Smart Folder Creation Panel */}
      {isCreatingSmartFolder && currentPath === 'smartfolder://' && (
        <SmartFolderCreatePanel
          searchPresets={searchPresets}
          smartFolders={smartFolders}
          onSave={(folders) => {
            setSmartFolders(folders)
            setIsCreatingSmartFolder(false)
          }}
          onClose={() => setIsCreatingSmartFolder(false)}
        />
      )}

      </div>

      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer p-1 py-4 bg-transparent hover:bg-sf-item-hover/50 rounded-r-md transition-colors z-10"
        onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
      >
        <img 
          src={isRightSidebarOpen ? "/src/assets/icons/left_line.svg" : "/src/assets/icons/right_line.svg"} 
          className="w-4 h-4 text-gray-500" 
        />
      </div>

      <ProgressCapsule />

      <GroupFastScroller rowVirtualizer={rowVirtualizer} listItems={listItems} isGrouped={isGrouped} />

      <RenamePopover />

    </div>
  )
}
