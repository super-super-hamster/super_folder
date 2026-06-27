import { useRef, useEffect, useState, useMemo } from 'react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { Select, ListBox } from '@heroui/react'
import { useSelectionStore } from '../../store/selectionStore'
import { useClipboardStore } from '../../store/clipboardStore'
import { useModalStore } from '../../store/modalStore'
import { useTagStore } from '../../store/tagStore'
import { useSettingsStore } from '../../store/settingsStore'
import { ReadDir, PasteFiles, DeleteToRecycleBin, GetRecentItems, GetLocalServerPort, GetLocalAuthToken, GetTagsForFiles, SearchFiles, GetFavorites, SelectDirectory } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import folderAnim from '../../assets/anim/folder.json'
import documentAnim from '../../assets/anim/document.json'
import ContextMenu from './ContextMenu'
import RenamePopover from './RenamePopover'
import ConversionView from '../conversion/ConversionView'
import BatchRenameView from '../rename/BatchRenameView'
import { useContextMenuStore } from '../../store/contextMenuStore'
import { useRenameStore } from '../../store/renameStore'
import { useBatchRenameStore } from '../../store/batchRenameStore'
import { processFiles } from '../../utils/fileSorting'
import { ProgressCapsule } from '../common/ProgressCapsule'
import { useTaskStore } from '../../store/taskStore'

const AnimatedFolderIcon = ({ className = "w-16 h-16" }: { className?: string }) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current?.closest('.group')
    if (!parent) return

    const handleMouseEnter = () => {
      lottieRef.current?.setDirection(1)
      lottieRef.current?.play()
    }
    const handleMouseLeave = () => {
      lottieRef.current?.setDirection(-1)
      lottieRef.current?.play()
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div ref={containerRef} className={`${className} pointer-events-none`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={folderAnim}
        loop={false}
        autoplay={false}
      />
    </div>
  )
}

const AnimatedDocumentIcon = ({ className = "w-16 h-16" }: { className?: string }) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isHoveringRef = useRef(false)

  useEffect(() => {
    const parent = containerRef.current?.closest('.group')
    if (!parent) return

    const handleMouseEnter = () => {
      isHoveringRef.current = true
      lottieRef.current?.setDirection(1)
      const anim = lottieRef.current?.animationItem
      if (anim && anim.currentFrame >= anim.totalFrames - 1) {
        lottieRef.current?.goToAndPlay(0)
      } else {
        lottieRef.current?.play()
      }
    }
    
    const handleMouseLeave = () => {
      isHoveringRef.current = false
      lottieRef.current?.setDirection(1)
      lottieRef.current?.play()
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const handleEnterFrame = (e: any) => {
    if (isHoveringRef.current) return
    const anim = lottieRef.current?.animationItem
    if (!anim) return
    
    const current = e.currentTime
    const total = e.totalTime
    const half = total / 2

    // Stop at 50%
    if (current >= half && current < half + 2) {
      anim.pause()
    }
  }

  return (
    <div ref={containerRef} className={`${className} pointer-events-none`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={documentAnim}
        loop={false}
        autoplay={false}
        onEnterFrame={handleEnterFrame}
        onComplete={() => {
           if (isHoveringRef.current) {
             lottieRef.current?.goToAndPlay(0)
           }
        }}
      />
    </div>
  )
}

const ThumbnailImage = ({ path, alt }: { path: string, alt: string }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  
  useEffect(() => {
    const abortController = new AbortController()
    let objectUrl: string | null = null;
    
    const timer = setTimeout(() => {
      fetch(`/thumb?path=${encodeURIComponent(path)}`, { signal: abortController.signal })
        .then(res => {
          if (!res.ok) throw new Error('Failed to load')
          return res.blob()
        })
        .then(blob => {
          objectUrl = URL.createObjectURL(blob)
          setSrcUrl(objectUrl)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            setError(true)
          }
        })
    }, 150) // slightly longer debounce for fast scrolling

    return () => {
      clearTimeout(timer)
      abortController.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [path])
  
  return (
    <div className="w-16 h-16 relative overflow-hidden rounded-xl">
      {!loaded && !error && (
        <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse rounded-xl" />
      )}
      {!error && srcUrl ? (
        <img
          src={srcUrl}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true)
            setLoaded(true)
          }}
          className={`absolute inset-0 w-16 h-16 object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100">
          <img src="/src/assets/icons/pic_2_fill.svg" className="w-8 h-8 opacity-40" />
        </div>
      )}
    </div>
  )
}

const CapsuleNotification = ({ operation, count, onClear, capsuleKey }: { operation: 'copy'|'cut', count: number, onClear: () => void, capsuleKey: number }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  useEffect(() => {
    setIsCollapsed(false)
    const timer = setTimeout(() => setIsCollapsed(true), 2000)
    return () => clearTimeout(timer)
  }, [capsuleKey])

  const expanded = isHovered || !isCollapsed

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -50, opacity: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`absolute bottom-4 left-4 z-20 h-8 rounded-full text-xs font-medium text-white ${operation === 'cut' ? 'bg-yellow-500' : 'bg-green-500'} flex items-center justify-center overflow-hidden cursor-default`}
    >
      <motion.div
        animate={{ width: expanded ? 120 : 32 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center justify-center whitespace-nowrap h-full relative"
      >
        <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between w-full px-3"
          >
            <span>已{operation === 'cut' ? '剪切' : '复制'} {count} 项</span>
            <div 
              className="w-4 h-4 rounded-full hover:bg-white/30 flex items-center justify-center cursor-pointer flex-shrink-0 -mr-1"
              onClick={(e) => { e.stopPropagation(); onClear() }}
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center font-bold"
          >
            {count}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// Mock for pure browser testing
if (!(window as any).go) {
  (window as any).go = {
    main: {
      App: {
        GetLocalServerPort: async () => 0,
        GetFileTags: async () => [],
        AddTagToFile: async () => {},
        RemoveTagFromFile: async () => {},
        ReadDir: async () => [],
        GetTagsForFiles: async () => ({})
      }
    }
  }
}

// Ensure EventsOnMultiple is mocked
if (!(window as any).runtime) {
  (window as any).runtime = {
    EventsOnMultiple: () => {},
    EventsOff: () => {},
    BrowserOpenURL: () => {}
  }
}

export default function FileList() {
  const { tabs, activeTabId, navigate } = useTabsStore()
  const { isRightSidebarOpen, setRightSidebarOpen, refreshKey, setSearchFocused, sortOption, recentSortOption, isGrouped, scrollToPath, setScrollToPath, searchQuery, searchFilter, viewMode } = useUIStore()
  const { selectedPaths, isSelectionMode, toggleSelect, selectOnly, selectAll, setSelection, toggleSelectionMode, clearSelection } = useSelectionStore()
  const { operation, items: clipboardItems, capsuleKey, copy, cut } = useClipboardStore()
  const { openMenu } = useContextMenuStore()
  const { startRename } = useRenameStore()
  const { setFiles: setBatchRenameFiles } = useBatchRenameStore()
  const { searchPresets, smartFolders, setSmartFolders } = useSettingsStore()
  
  const [isCreatingSmartFolder, setIsCreatingSmartFolder] = useState(false)
  const [sfName, setSfName] = useState('')
  const [sfPaths, setSfPaths] = useState<string[]>([''])
  const [sfPresetId, setSfPresetId] = useState('')
  
  const [files, setFiles] = useState<models.FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleBatchRename = (e: Event) => {
      const detail = (e as CustomEvent).detail;
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
  }, [files])
  
  const [localPort, setLocalPort] = useState<number | null>(null)
  const [localAuthToken, setLocalAuthToken] = useState<string>('')
  useEffect(() => {
    GetLocalServerPort().then(setLocalPort).catch(console.error)
    GetLocalAuthToken().then(setLocalAuthToken).catch(console.error)
  }, [])

  const [fileTagColors, setFileTagColors] = useState<Record<string, string>>({})
  const { tagRefreshKey } = useTagStore()

  useEffect(() => {
    if (files.length === 0) {
      setFileTagColors({})
      return
    }
    const paths = files.map(f => f.path)
    GetTagsForFiles(paths).then(res => {
      const colors: Record<string, string> = {}
      for (const [path, tags] of Object.entries(res)) {
        if (tags && tags.length > 0) {
          colors[path] = tags[0].colorHex
        }
      }
      setFileTagColors(colors)
    }).catch(console.error)
  }, [files, tagRefreshKey])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const currentPath = activeTab?.currentPath

  const [columns, setColumns] = useState(6)
  const isImage = (ext: string) => ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext.toLowerCase())

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      const { isRunning } = useTaskStore.getState()

      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (files.length > 0) {
          selectAll(files.map(f => f.path))
        }
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey) {
        e.preventDefault()
        toggleSelectionMode()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        const selectedFiles = files.filter(f => selectedPaths.has(f.path))
        if (selectedFiles.length > 0) {
          copy(selectedFiles)
          clearSelection()
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        const selectedFiles = files.filter(f => selectedPaths.has(f.path))
        if (selectedFiles.length > 0) {
          cut(selectedFiles)
          clearSelection()
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        if (isRunning) {
          useTaskStore.getState().notifyBlockedAction('粘贴')
          return
        }
        if (clipboardItems.length > 0 && currentPath && operation) {
          PasteFiles(operation, clipboardItems.map(f => f.path), currentPath).catch(console.error)
        }
      } else if (e.key === 'Delete') {
        e.preventDefault()
        if (isRunning) {
          useTaskStore.getState().notifyBlockedAction('删除')
          return
        }
        const selectedFiles = Array.from(selectedPaths)
        if (selectedFiles.length > 0) {
          if (e.shiftKey) {
            useModalStore.getState().openModal('permanent_delete_confirm', { paths: selectedFiles })
          } else {
            // Optimistic update
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
      } else if (e.key === 'F2') {
        e.preventDefault()
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
      } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchFocused(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [files, selectedPaths, currentPath, clipboardItems, operation])

  // Update columns based on container width
  useEffect(() => {
    if (!scrollRef.current) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      const cols = Math.max(1, Math.floor((width - 48) / 120))
      setColumns(cols)
    })
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [currentPath])

  const effectiveColumns = viewMode === 'list' ? 1 : columns

  const listItems = useMemo(() => {
    const activeSortOption = currentPath === 'recent://' ? recentSortOption : sortOption
    const items = processFiles(files, activeSortOption, effectiveColumns, isGrouped)
    

    
    return items
  }, [files, sortOption, recentSortOption, effectiveColumns, isGrouped, currentPath])

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

  // --- MARQUEE SELECTION ---
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null)
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number, y: number } | null>(null)
  const [dragSelectedPaths, setDragSelectedPaths] = useState<Set<string>>(new Set())
  const lastMousePosRef = useRef<{ x: number, y: number } | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)
  const isCtrlPressedRef = useRef(false)

  const getContainerCoords = useCallback((clientX: number, clientY: number) => {
    if (!scrollRef.current) return { x: 0, y: 0 }
    const rect = scrollRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left - 24, // subtract px-6
      y: clientY - rect.top + scrollRef.current.scrollTop - 16 // subtract pt-4
    }
  }, [])

  const updateDragSelection = useCallback((currentPos: {x: number, y: number}, startPos: {x: number, y: number}) => {
    const boxLeft = Math.min(startPos.x, currentPos.x)
    const boxRight = Math.max(startPos.x, currentPos.x)
    const boxTop = Math.min(startPos.y, currentPos.y)
    const boxBottom = Math.max(startPos.y, currentPos.y)

    const newSelected = new Set<string>()
    let currentYOffset = 0
    const C_W = scrollRef.current?.clientWidth ? scrollRef.current.clientWidth - 48 : 0
    const cw = C_W > 0 ? (C_W - (columns - 1) * 8) / columns : 0

    for (let index = 0; index < listItems.length; index++) {
      const item = listItems[index]
      const size = item.type === 'header' ? 45 : 144
      const start = currentYOffset
      const end = start + size

      if (end >= boxTop && start <= boxBottom) {
        if (item.type === 'row') {
          for (let col = 0; col < columns; col++) {
            const file = item.items[col]
            if (!file) continue
            const itemLeft = col * (cw + 8)
            const itemRight = itemLeft + cw
            if (itemRight >= boxLeft && itemLeft <= boxRight) {
              newSelected.add(file.path)
            }
          }
        }
      }
      currentYOffset += size
    }
    setDragSelectedPaths(newSelected)
  }, [listItems, columns])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return // Only left click
    const target = e.target as HTMLElement
    if (target.closest('[draggable="true"]') || target.closest('button') || target.closest('input')) return

    // Don't prevent default here otherwise scrollbar might break. But if it's the empty space, we can.
    const isScrollbar = e.clientX > (scrollRef.current?.getBoundingClientRect().right || 0) - 20;
    if (isScrollbar) return;

    e.preventDefault()
    target.focus?.()
    
    const coords = getContainerCoords(e.clientX, e.clientY)
    setIsDragging(true)
    setDragStartPos(coords)
    setDragCurrentPos(coords)
    setDragSelectedPaths(new Set())
    isCtrlPressedRef.current = e.ctrlKey || e.metaKey

    if (!isCtrlPressedRef.current && !e.shiftKey && !useSelectionStore.getState().isSelectionMode) {
      clearSelection()
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  useEffect(() => {
    if (!isDragging || !dragStartPos) return

    const handlePointerMove = (e: PointerEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      const coords = getContainerCoords(e.clientX, e.clientY)
      setDragCurrentPos(coords)
      updateDragSelection(coords, dragStartPos)
    }

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false)
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current)
      
      setDragSelectedPaths(prev => {
        if (prev.size > 0) {
          const pathsToSelect = Array.from(prev)
          const finalSet = isCtrlPressedRef.current ? new Set(useSelectionStore.getState().selectedPaths) : new Set<string>()
          pathsToSelect.forEach(p => finalSet.add(p))
          useSelectionStore.getState().setSelection(Array.from(finalSet))
        }
        return new Set()
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    const scrollLoop = () => {
      if (!scrollRef.current || !lastMousePosRef.current) return
      const rect = scrollRef.current.getBoundingClientRect()
      const clientY = lastMousePosRef.current.y
      
      const SCROLL_MARGIN = 50
      const SCROLL_SPEED = 15
      
      let didScroll = false
      if (clientY < rect.top + SCROLL_MARGIN) {
        scrollRef.current.scrollTop -= SCROLL_SPEED
        didScroll = true
      } else if (clientY > rect.bottom - SCROLL_MARGIN) {
        scrollRef.current.scrollTop += SCROLL_SPEED
        didScroll = true
      }
      
      if (didScroll) {
        const coords = getContainerCoords(lastMousePosRef.current.x, lastMousePosRef.current.y)
        setDragCurrentPos(coords)
        updateDragSelection(coords, dragStartPos)
      }
      
      autoScrollRafRef.current = requestAnimationFrame(scrollLoop)
    }
    autoScrollRafRef.current = requestAnimationFrame(scrollLoop)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current)
    }
  }, [isDragging, dragStartPos, getContainerCoords, updateDragSelection])
  // --- END MARQUEE SELECTION ---
  
  const rowVirtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      if (!listItems[index]) return 40
      if (listItems[index].type === 'header') return 45
      return viewMode === 'list' ? 40 : 144
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
    if (scrollToPath && listItems.length > 0) {
      const index = listItems.findIndex(i => i.type === 'row' && i.items?.some(f => f.path === scrollToPath))
      if (index >= 0) {
        rowVirtualizer.scrollToIndex(index, { align: 'center' })
        setScrollToPath(null)
      }
    }
  }, [scrollToPath, listItems, rowVirtualizer, setScrollToPath])

  // Fast Scroller Logic
  const headerIndices = useMemo(() => {
    return listItems.map((item, idx) => item.type === 'header' ? idx : -1).filter(i => i !== -1)
  }, [listItems])

  const groups = useMemo(() => {
    return headerIndices.map(idx => (listItems[idx] as { title: string }).title)
  }, [headerIndices, listItems])

  const [isHoveringScroller, setIsHoveringScroller] = useState(false)
  const scrollerZoneRef = useRef<HTMLDivElement>(null)

  let currentGroupIndex = 0
  if (isGrouped && groups.length > 0) {
    const virtualItems = rowVirtualizer.getVirtualItems()
    if (virtualItems.length > 0) {
      let topIndex = virtualItems[0].index
      const scrollOffset = rowVirtualizer.scrollOffset || 0
      for (const item of virtualItems) {
        if (item.start + item.size > scrollOffset) {
          topIndex = item.index
          break
        }
      }

      for (let i = 0; i < headerIndices.length; i++) {
        if (headerIndices[i] <= topIndex) {
          currentGroupIndex = i
        } else {
          break
        }
      }
    }
  }

  const targetGroupRef = useRef<number>(0)
  const lastWheelTime = useRef<number>(0)

  useEffect(() => {
    const el = scrollerZoneRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isGrouped || groups.length === 0) return
      
      const virtualItems = rowVirtualizer.getVirtualItems()
      if (virtualItems.length === 0) return
      
      let topIndex = virtualItems[0].index
      const scrollOffset = rowVirtualizer.scrollOffset || 0
      for (const item of virtualItems) {
        if (item.start + item.size > scrollOffset) {
          topIndex = item.index
          break
        }
      }

      let currIdx = 0
      for (let i = 0; i < headerIndices.length; i++) {
        if (headerIndices[i] <= topIndex) currIdx = i
        else break
      }
      
      const now = Date.now()
      let nextIdx = targetGroupRef.current
      
      // If haven't scrolled fast recently, sync with current actual index
      if (now - lastWheelTime.current > 150) {
        nextIdx = currIdx
      }

      // accumulate detents. On some mice, deltaY is 100 per click. On touchpads it varies.
      if (e.deltaY > 0) {
        nextIdx = Math.min(nextIdx + 1, groups.length - 1)
      } else if (e.deltaY < 0) {
        nextIdx = Math.max(nextIdx - 1, 0)
      }

      if (nextIdx !== targetGroupRef.current || now - lastWheelTime.current > 150) {
        targetGroupRef.current = nextIdx
        rowVirtualizer.scrollToIndex(headerIndices[nextIdx], { align: 'start' })
      }
      
      lastWheelTime.current = now
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [isGrouped, groups.length, headerIndices, rowVirtualizer])

  let visibleGroups: { title: string, offset: number, index: number }[] = []
  if (isHoveringScroller && isGrouped) {
    for (let i = -2; i <= 2; i++) {
      const idx = currentGroupIndex + i
      if (idx >= 0 && idx < groups.length) {
        visibleGroups.push({ title: groups[idx], offset: i, index: idx })
      }
    }
  }

  const prevPathRef = useRef(currentPath)

  useEffect(() => {
    if (!currentPath || currentPath.endsWith('\\转换')) return
    let isMounted = true

    if (prevPathRef.current !== currentPath) {
      setLoading(true)
      setFiles([])
      prevPathRef.current = currentPath
    }

    let fetchPromise: Promise<models.FileInfo[]>
    
    let keyword = searchQuery ? searchQuery.trim() : ''
    let tags: string[] = []
    let tagLogic = 'OR'
    
    if (keyword.toLowerCase().includes('tag:')) {
      const parts = keyword.split('&')
      if (parts.length > 1) {
        tagLogic = 'AND'
        tags = parts.map(p => {
          const m = p.match(/tag:([^&\s]+)/i)
          return m ? m[1] : ''
        }).filter(Boolean)
        keyword = keyword.replace(/tag:([^&\s]+)/gi, '').replace(/&/g, '').trim()
      } else {
        const m = keyword.match(/tag:([^\s]+)/gi)
        if (m) {
          tags = m.map(t => t.split(':')[1])
          keyword = keyword.replace(/tag:([^\s]+)/gi, '').trim()
        }
      }
    }

    if (currentPath === 'smartfolder://') {
      // List all smart folders as virtual FileInfo items
      const virtualItems: models.FileInfo[] = smartFolders.map(sf => ({
        name: sf.name,
        path: `smartfolder://${sf.id}`,
        isDir: true,
        size: 0,
        modTime: '',
        ext: ''
      } as any))
      virtualItems.push({
        name: '创建',
        path: '__create_smart_folder__',
        isDir: false,
        size: 0,
        modTime: '',
        ext: ''
      } as any)
      fetchPromise = Promise.resolve(virtualItems)
    } else if (currentPath && currentPath.startsWith('smartfolder://') && currentPath !== 'smartfolder://') {
      const sfId = currentPath.replace('smartfolder://', '')
      const sf = smartFolders.find(f => f.id === sfId)
      if (sf) {
        const preset = searchPresets.find(p => p.id === sf.presetId)
        if (preset) {
          const req = {
            keyword: '',
            isRegex: preset.filter.isRegex || false,
            caseSensitive: preset.filter.isCaseSensitive || false,
            onlyFiles: preset.filter.type === 'file',
            onlyFolders: preset.filter.type === 'folder',
            extensions: preset.filter.extensions || [],
            excludedFolders: preset.filter.excludedFolders || [],
            tags: [],
            tagLogic: 'OR',
            maxDepth: 0,
            rootPath: '',
            rootPaths: sf.rootPaths,
            limit: 2000
          }
          fetchPromise = SearchFiles(req)
        } else {
          // Preset was deleted - return empty
          fetchPromise = Promise.resolve([])
        }
      } else {
        fetchPromise = Promise.resolve([])
      }
    } else if (currentPath && currentPath.startsWith('preset://')) {
      const presetId = currentPath.replace('preset://', '')
      const preset = searchPresets.find(p => p.id === presetId)
      if (preset) {
        const req = {
          keyword: '',
          isRegex: preset.filter.isRegex || false,
          caseSensitive: preset.filter.isCaseSensitive || false,
          onlyFiles: preset.filter.type === 'file',
          onlyFolders: preset.filter.type === 'folder',
          extensions: preset.filter.extensions || [],
          tags: [],
          tagLogic: 'OR',
          maxDepth: 0,
          rootPath: '',
          limit: 2000
        }
        fetchPromise = SearchFiles(req)
      } else {
        fetchPromise = Promise.resolve([])
      }
    } else if (searchQuery && searchQuery.trim() !== '') {
      const req = {
        keyword: keyword,
        isRegex: searchFilter?.isRegex || false,
        caseSensitive: searchFilter?.isCaseSensitive || false,
        onlyFiles: searchFilter?.type === 'file',
        onlyFolders: searchFilter?.type === 'folder',
        extensions: searchFilter?.extensions || [],
        tags: tags,
        tagLogic: tagLogic,
        maxDepth: 0,
        rootPath: currentPath,
        limit: 2000
      }
      fetchPromise = SearchFiles(req)
    } else if (currentPath === 'favorite://') {
      fetchPromise = GetFavorites()
    } else if (currentPath === 'recent://') {
      fetchPromise = GetRecentItems()
    } else if (currentPath?.endsWith('\\转换') || currentPath?.endsWith('\\批量重命名')) {
      fetchPromise = Promise.resolve([])
    } else {
      fetchPromise = ReadDir(currentPath)
    }

    fetchPromise
      .then((res) => {
        if (isMounted) setFiles(res || [])
      })
      .catch((err) => {
        console.error('Failed to fetch items:', err)
        if (isMounted) {
          setFiles([])
          useModalStore.getState().openModal('warning', { message: `读取目录失败: ${err}` })
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [currentPath, refreshKey])

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
      setSfName('')
      setSfPaths([''])
      setSfPresetId(searchPresets[0].id)
      setTimeout(() => {
        const panel = document.getElementById('smart-folder-create-panel')
        if (panel) panel.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return
    }
    if (file.path.startsWith('smartfolder://')) {
      navigate(file.path, '虚拟文件夹', file.isDir)
      return
    }
    navigate(file.path, file.name, file.isDir)
  }

  const getFileIcon = (file: models.FileInfo) => {
    if (file.path === '__create_smart_folder__') return 'add_line.svg'
    if (file.path.startsWith('smartfolder://')) return 'folder_virtual.svg'
    if (file.isDir) return 'folder_3_line.svg'
    const ext = file.ext.toLowerCase()
    switch (ext) {
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
        return 'pic_2_fill.svg'
      case '.mp4':
      case '.mkv':
      case '.avi':
        return 'video_line.svg'
      case '.mp3':
      case '.wav':
      case '.flac':
        return 'music_2_line.svg'
      case '.doc':
      case '.docx':
        return 'doc_line.svg'
      case '.pdf':
        return 'pdf_line.svg'
      case '.txt':
      case '.md':
        return 'document_line.svg'
      case '.zip':
      case '.rar':
      case '.7z':
        return 'folder_zip_line.svg'
      case '.go':
      case '.js':
      case '.ts':
      case '.tsx':
      case '.json':
      case '.c':
      case '.cpp':
      case '.java':
      case '.py':
      case '.html':
      case '.css':
        return 'file_code_line.svg'
      case '.xls':
      case '.xlsx':
      case '.csv':
        return 'xls_line.svg'
      case '.ppt':
      case '.pptx':
        return 'ppt_line.svg'
      default:
        return 'document_line.svg'
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '--'
    try {
      const date = new Date(dateValue)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    } catch {
      return '--'
    }
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
          className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer w-10 h-10 rounded-xl bg-transparent flex items-center justify-center text-gray-600 hover:bg-gray-200/50 transition-colors"
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
        if (currentPath) {
          openMenu(e.clientX, e.clientY, '', '')
        }
      }}
    >
      {viewMode === 'list' && (
        <div className={`grid ${isSelectionMode ? 'grid-cols-[20px_1fr_96px_128px]' : 'grid-cols-[1fr_96px_128px]'} items-center gap-4 pl-[40px] pr-10 py-2 border-b border-gray-200 bg-gray-50/80 backdrop-blur shrink-0 text-xs font-semibold text-gray-500 wails-no-drag`}>
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
          {currentPath?.startsWith('smartfolder://') && currentPath !== 'smartfolder://' && 
           !searchPresets.find(p => p.id === smartFolders.find(f => f.id === currentPath.replace('smartfolder://', ''))?.presetId)
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
          {isDragging && dragStartPos && dragCurrentPos && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(dragStartPos.x, dragCurrentPos.x),
                top: Math.min(dragStartPos.y, dragCurrentPos.y),
                width: Math.abs(dragCurrentPos.x - dragStartPos.x),
                height: Math.abs(dragCurrentPos.y - dragStartPos.y),
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
                gap: '0.5rem',
              }}
            >
              {Array.from({ length: effectiveColumns }).map((_, colIndex) => {
                const file = item.items[colIndex]
                if (!file) return <div key={colIndex} />

                const isSelected = selectedPaths.has(file.path) || dragSelectedPaths.has(file.path)

                return (
                  <div
                    id={`file-${file.path}`}
                    key={file.path}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragOver={(e) => handleDragOver(e, file)}
                    onDragLeave={(e) => handleDragLeave(e, file)}
                    onDrop={(e) => handleDrop(e, file)}
                    onClick={(e) => handleFileClick(e, file)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openMenu(e.clientX, e.clientY, file.path, file.name)
                    }}
                    onDoubleClick={() => handleDoubleClick(file)}
                    className={
                        viewMode === 'list' 
                        ? `grid ${isSelectionMode ? 'grid-cols-[20px_24px_1fr_96px_128px]' : 'grid-cols-[24px_1fr_96px_128px]'} items-center gap-4 px-4 h-[40px] w-full rounded-md transition-colors cursor-pointer group select-none relative ${dragOverPath === file.path ? 'bg-blue-100 ring-2 ring-blue-400' : isSelected ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-100/60'}`
                        : `flex flex-col items-center justify-start p-2 rounded-xl transition-colors cursor-pointer group select-none h-36 w-28 mx-auto relative ${dragOverPath === file.path ? 'bg-blue-100 ring-2 ring-blue-400' : isSelected ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-100'}`
                      }
                  >
                    {viewMode === 'list' ? (
                        <>
                          {isSelectionMode && (
                            <div className="flex items-center justify-center w-5 h-full" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                isSelected={selectedPaths.has(file.path)} 
                                onChange={() => toggleSelect(file.path)} 
                              >
                                <Checkbox.Content>
                                  <Checkbox.Control className="w-[18px] h-[18px] shadow-none border-2 border-gray-400 data-[selected=true]:border-blue-500 rounded-full">
                                    <Checkbox.Indicator />
                                  </Checkbox.Control>
                                </Checkbox.Content>
                              </Checkbox>
                            </div>
                          )}
                          <div className="w-6 h-6 flex items-center justify-center text-blue-900">
                            {file.isDir ? (
                              <AnimatedFolderIcon className="w-6 h-6" />
                            ) : getFileIcon(file) === 'document_line.svg' ? (
                              <AnimatedDocumentIcon className="w-6 h-6" />
                            ) : (
                              <img src={`/src/assets/icons/${getFileIcon(file)}`} className="w-5 h-5 object-contain" draggable={false} alt="file icon" />
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-700 truncate text-left" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-400 text-right">
                            {file.isDir ? '--' : formatSize(file.size)}
                          </div>
                          <div className="text-xs text-gray-400 text-right">
                            {formatDate(file.modTime)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center mb-2 text-blue-900 transition-transform relative">
                            {isImage(file.ext) ? (
                              <ThumbnailImage path={file.path} alt={file.name} />
                            ) : file.isDir ? (
                              <AnimatedFolderIcon />
                            ) : getFileIcon(file) === 'document_line.svg' ? (
                              <AnimatedDocumentIcon />
                            ) : (
                              <img
                                src={`/src/assets/icons/${getFileIcon(file)}`}
                                className="w-12 h-12 object-contain"
                                alt="icon"
                                draggable={false}
                              />
                            )}
                            
                            {fileTagColors[file.path] && (
                              <div className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{color: fileTagColors[file.path]}}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="h-10 w-full flex flex-col items-center justify-start overflow-hidden relative">
                            <span className="text-sm font-medium text-gray-700 text-center line-clamp-2 w-full px-1 break-all" title={file.name}>
                              {file.name}
                            </span>
                          </div>
      
                          {isSelectionMode && (
                            <div className="absolute bottom-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                isSelected={selectedPaths.has(file.path)} 
                                onChange={() => toggleSelect(file.path)} 
                              >
                                <Checkbox.Content>
                                  <Checkbox.Control className="w-[18px] h-[18px] shadow-none border-2 border-gray-400 data-[selected=true]:border-blue-500 rounded-full">
                                    <Checkbox.Indicator />
                                  </Checkbox.Control>
                                </Checkbox.Content>
                              </Checkbox>
                            </div>
                          )}
                        </>
                      )}
                  </div>
                )
              })}
            </div>
            )
          })}
        </div>
      )}

      {/* Inline Smart Folder Creation Panel */}
      {isCreatingSmartFolder && currentPath === 'smartfolder://' && (
        <div id="smart-folder-create-panel" className="bg-gray-100/50 rounded-xl p-6 mt-6 border border-gray-200 max-w-2xl mx-auto mb-8">
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">智能文件夹名称</div>
            <input 
              value={sfName} 
              onChange={(e) => setSfName(e.target.value)} 
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">选择文件夹</div>
            <div className="space-y-3">
              {sfPaths.map((path, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input 
                      value={path} 
                      onChange={(e) => {
                        const newPaths = [...sfPaths]
                        newPaths[idx] = e.target.value
                        setSfPaths(newPaths)
                      }} 
                      className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                      onClick={async () => {
                        const dir = await SelectDirectory()
                        if (dir) {
                          const newPaths = [...sfPaths]
                          newPaths[idx] = dir
                          setSfPaths(newPaths)
                        }
                      }}
                    >
                      <img src="/src/assets/icons/folder_3_line.svg" className="w-4 h-4 opacity-70" alt="select" />
                    </button>
                  </div>
                  {sfPaths.length > 1 && (
                    <button 
                      onClick={() => {
                        const newPaths = [...sfPaths]
                        newPaths.splice(idx, 1)
                        setSfPaths(newPaths)
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <img src="/src/assets/icons/close_line.svg" className="w-4 h-4" alt="delete" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setSfPaths([...sfPaths, ''])}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mt-2"
              >
                <img src="/src/assets/icons/add_line.svg" className="w-5 h-5 text-gray-600" alt="add" />
              </button>
            </div>
          </div>
          
          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-700 mb-2">选择搜索预设</div>
            <Select
              selectedKey={sfPresetId}
              onSelectionChange={(key) => {
                const selected = Array.from(key as any)[0] || key
                setSfPresetId(selected as string)
              }}
              className="w-64"
            >
              <Select.Trigger className="bg-[#e4e4e4] border-0 hover:bg-gray-300 transition-colors px-4 h-10 rounded-xl flex items-center justify-between group outline-none focus:ring-2 focus:ring-blue-500">
                <Select.Value className="text-sm text-gray-800" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-data-[open=true]:rotate-180 transition-transform">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </Select.Trigger>
              <Select.Popover className="bg-white rounded-xl border border-gray-100 overflow-hidden w-64 p-1 shadow-lg">
                <ListBox className="gap-1 p-0">
                  {searchPresets.map(preset => (
                    <ListBox.Item 
                      key={preset.id} 
                      id={preset.id} 
                      textValue={preset.name}
                      className="rounded-lg text-sm font-medium text-gray-700 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          
          <div className="flex w-full gap-3 pt-4 border-t border-gray-200/60 mt-4">
            <button 
              onClick={() => setIsCreatingSmartFolder(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              取消
            </button>
            <button 
              onClick={() => {
                if (!sfName.trim()) {
                  useModalStore.getState().openModal('warning', { message: '请输入名称' })
                  return
                }
                const validPaths = sfPaths.filter(p => p.trim() !== '')
                if (validPaths.length === 0) {
                  useModalStore.getState().openModal('warning', { message: '至少需要一个有效路径' })
                  return
                }
                if (!sfPresetId) {
                  useModalStore.getState().openModal('warning', { message: '请选择一个搜索预设' })
                  return
                }
                
                const newFolder = {
                  id: Date.now().toString(),
                  name: sfName,
                  rootPaths: validPaths,
                  presetId: sfPresetId
                }
                setSmartFolders([...smartFolders, newFolder])
                setIsCreatingSmartFolder(false)
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认
            </button>
          </div>
        </div>
      )}

      </div>

      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer p-1 py-4 bg-transparent hover:bg-gray-200/50 rounded-r-md transition-colors z-10"
        onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
      >
        <img 
          src={isRightSidebarOpen ? "/src/assets/icons/left_line.svg" : "/src/assets/icons/right_line.svg"} 
          className="w-4 h-4 text-gray-500" 
        />
      </div>

      <ProgressCapsule />

      {/* Fast Scroller Overlay */}
      {isGrouped && groups.length > 0 && (
        <div 
          ref={scrollerZoneRef}
          className="absolute right-0 top-0 bottom-0 w-16 z-20"
          onMouseEnter={() => setIsHoveringScroller(true)}
          onMouseLeave={() => setIsHoveringScroller(false)}
        >
          <AnimatePresence>
            {isHoveringScroller && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none"
              >
                {visibleGroups.map((g) => {
                  const isCenter = g.offset === 0
                  const opacity = isCenter ? 1 : (g.offset === 1 || g.offset === -1 ? 0.6 : 0.3)
                  const scale = isCenter ? 1.2 : 0.9
                  
                  return (
                    <div 
                      key={g.index}
                      className={`flex items-center justify-center transition-all duration-200 ${isCenter ? 'w-10 h-10 bg-gray-200 rounded-full font-bold text-gray-900 text-xl' : 'w-10 h-8 font-medium text-gray-700 text-lg'}`}
                      style={{ opacity, transform: `scale(${scale})` }}
                    >
                      {g.title.length > 2 ? g.title.substring(0, 2) : g.title}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <ContextMenu />
      <RenamePopover />

    </div>
  )
}
