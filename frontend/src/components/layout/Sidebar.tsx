import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useFavoriteStore } from '../../store/favoriteStore'
import { useTaskStore } from '../../store/taskStore'
import { GetDefaultPaths, GetDrives, ReadDir, OpenFileWithDefault, PasteFiles } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'
import { getFileIcon } from '../../utils/fileFormatting'

export default function Sidebar() {
  const { isSidebarExpanded, setSidebarExpanded, setSettingsOpen } = useUIStore()
  const { navigate, goBack, activeTabId, tabs } = useTabsStore()
  const { shortcuts, searchPresets, loadFromBackend, showParentDirInNav } = useSettingsStore()
  const { fetchFavorites } = useFavoriteStore()
  const [drives, setDrives] = useState<string[]>([])
  const [defaultPaths, setDefaultPaths] = useState<Record<string, string>>({})
  const [browseFiles, setBrowseFiles] = useState<models.FileInfo[]>([])
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    GetDrives().then(setDrives)
    GetDefaultPaths().then(setDefaultPaths)
    loadFromBackend()
    fetchFavorites()
  }, [])

  useEffect(() => {
    if (showParentDirInNav) {
      setSidebarExpanded(true)
    }
  }, [showParentDirInNav])

  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath

  const hasParent = (path: string | undefined): boolean => {
    if (!path || path.includes('://') || /^[A-Z]:\\$/i.test(path)) return false
    return path.lastIndexOf('\\') > 0
  }

  const getParentPath = (path: string): string => {
    const idx = path.lastIndexOf('\\')
    return idx > 0 ? path.slice(0, idx) : path
  }

  const getFileName = (path: string): string => {
    const idx = path.lastIndexOf('\\')
    return idx >= 0 ? path.slice(idx + 1) : path
  }

  const isBrowsing = showParentDirInNav && hasParent(currentPath)
  const parentPath = isBrowsing ? getParentPath(currentPath!) : ''

  useEffect(() => {
    if (isBrowsing) {
      ReadDir(parentPath).then(setBrowseFiles).catch(() => setBrowseFiles([]))
    } else {
      setBrowseFiles([])
    }
  }, [currentPath, showParentDirInNav])

  const handleNavigate = (path: string | undefined, name: string) => {
    if (path) {
      setSettingsOpen(false)
      navigate(path, name)
    }
  }

  const handleDotDot = () => {
    setSettingsOpen(false)
    const tab = tabs.find(t => t.id === activeTabId)
    if (tab && tab.historyIndex >= 0 && tab.history[tab.historyIndex]?.path === parentPath) {
      goBack()
    } else {
      navigate(parentPath, getFileName(parentPath))
    }
  }

  const handleBrowseClick = (file: models.FileInfo) => {
    if (file.isDir) {
      handleNavigate(file.path, file.name)
    } else {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
        OpenFileWithDefault(file.path)
        return
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        handleNavigate(file.path, file.name)
      }, 200)
    }
  }

  const handleDragStart = (e: React.DragEvent, file: models.FileInfo) => {
    const pathsToDrag = [file.path]
    e.dataTransfer.setData('application/json', JSON.stringify(pathsToDrag))
    e.dataTransfer.effectAllowed = 'move'
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
    } catch (err) {
      console.error("Drop failed:", err)
    }
  }

  const isItemActive = (path: string | undefined) => path && currentPath === path

  const shortcutMapping: Record<string, string> = {
    'desktop': 'Desktop',
    'downloads': 'Downloads',
    'documents': 'Documents',
    'pictures': 'Pictures',
    'music': 'Music',
    'videos': 'Videos',
  }

  const resolveIcon = (s: typeof shortcuts[0]) => {
    if (s.id === 'documents') return 'document_line.svg'
    if (s.id === 'pictures') return 'pic_2_fill.svg'
    return s.icon
  }

  const resolvePath = (s: typeof shortcuts[0]) => {
    return s.path || defaultPaths[shortcutMapping[s.id]]
  }

  const navItems = shortcuts.filter(s => s.visible).map(s => ({
    name: s.name,
    icon: resolveIcon(s),
    path: resolvePath(s)
  }))

  return (
    <motion.div
      className="flex flex-col h-full bg-white rounded-2xl shadow-panel border border-gray-100 wails-draggable py-4 overflow-hidden shrink-0"
      initial={false}
      animate={{ width: isSidebarExpanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => {
        if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current)
        expandTimeoutRef.current = setTimeout(() => setSidebarExpanded(true), 500)
      }}
      onMouseLeave={() => {
        if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current)
        if (!isBrowsing) {
          setSidebarExpanded(false)
        }
      }}
    >
      <div className="flex-1 overflow-y-auto space-y-1 wails-no-drag no-scrollbar">
        {isBrowsing ? (
          <>
            <div className="px-4 mx-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
              {getFileName(parentPath)}
            </div>

            <div
              onClick={handleDotDot}
              className="flex items-center py-2 rounded-lg cursor-pointer transition-colors px-4 mx-2 hover:bg-sf-item text-gray-700"
            >
              <img src="/src/assets/icons/left_line.svg" alt=".." className="w-5 h-5 shrink-0" />
              <span className="ml-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis">..</span>
            </div>

            {browseFiles
              .sort((a, b) => (a.isDir === b.isDir ? 0 : a.isDir ? -1 : 1))
              .map((file) => (
              <div
                key={file.path}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={(e) => handleDragOver(e, file)}
                onDragLeave={(e) => handleDragLeave(e, file)}
                onDrop={(e) => handleDrop(e, file)}
                onClick={() => handleBrowseClick(file)}
                className={`flex items-center py-2 rounded-lg cursor-pointer transition-colors px-4 mx-2 ${
                  dragOverPath === file.path ? 'bg-sf-selected/75' : ''
                } ${
                  isItemActive(file.path) ? 'bg-sf-panel/80 hover:bg-sf-item text-primary font-medium' : 'hover:bg-sf-item text-gray-700'
                }`}
              >
                <img src={`/src/assets/icons/${getFileIcon(file)}`} alt="" className="w-5 h-5 shrink-0" />
                <span className="ml-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            {navItems.map((item) => (
              <div
                key={item.name}
                onClick={() => handleNavigate(item.path, item.name)}
                className={`flex items-center py-2 rounded-lg cursor-pointer transition-colors ${
                  isSidebarExpanded ? 'px-4 mx-2' : 'justify-center mx-1'
                } ${
                  isItemActive(item.path) ? 'bg-sf-panel/80 hover:bg-sf-item text-primary font-medium' : 'hover:bg-sf-item text-gray-700'
                }`}
              >
                <img src={`/src/assets/icons/${item.icon}`} alt={item.name} className="w-6 h-6 shrink-0" />
                <motion.span
                  className="whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: isSidebarExpanded ? 1 : 0, 
                    width: isSidebarExpanded ? 'auto' : 0,
                    marginLeft: isSidebarExpanded ? 12 : 0
                  }}
                >
                  {item.name}
                </motion.span>
              </div>
            ))}

            {drives.length > 0 && (
              <div className="my-2 border-t border-gray-200/60 mx-2"></div>
            )}

            {drives.map((drive) => (
              <div
                key={drive}
                onClick={() => handleNavigate(drive, drive)}
                className={`flex items-center py-2 rounded-lg cursor-pointer transition-colors ${
                  isSidebarExpanded ? 'px-4 mx-2' : 'justify-center mx-1'
                } ${
                  isItemActive(drive) ? 'bg-sf-panel/80 hover:bg-sf-item text-primary font-medium' : 'hover:bg-sf-item text-gray-700'
                }`}
              >
                <img src="/src/assets/icons/hard_drive.svg" alt="Drive" className="w-6 h-6 shrink-0" />
                <motion.span
                  className="whitespace-nowrap overflow-hidden"
                  initial={false}
                  animate={{ 
                    opacity: isSidebarExpanded ? 1 : 0, 
                    width: isSidebarExpanded ? 'auto' : 0,
                    marginLeft: isSidebarExpanded ? 12 : 0
                  }}
                >
                  本地磁盘 ({drive.replace('\\', '')})
                </motion.span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="my-2 border-t border-gray-200/60 mx-2"></div>
      
      <div className="wails-no-drag">
        <div 
          onClick={() => setSettingsOpen(true)}
          className={`flex items-center py-2 rounded-lg hover:bg-sf-item cursor-pointer text-gray-700 transition-colors ${
          isSidebarExpanded ? 'px-4 mx-2' : 'justify-center mx-1'
        }`}>
          <img src="/src/assets/icons/settings_5_line.svg" alt="Settings" className="w-6 h-6 shrink-0" />
          <motion.span
            className="whitespace-nowrap overflow-hidden"
            initial={false}
            animate={{ 
              opacity: isSidebarExpanded ? 1 : 0, 
              width: isSidebarExpanded ? 'auto' : 0,
              marginLeft: isSidebarExpanded ? 12 : 0
            }}
          >
            设置
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}
