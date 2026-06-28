import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useFavoriteStore } from '../../store/favoriteStore'
import { GetDefaultPaths, GetDrives } from '../../../wailsjs/go/main/App'

export default function Sidebar() {
  const { isSidebarExpanded, setSidebarExpanded, setSettingsOpen } = useUIStore()
  const { navigate, activeTabId, tabs } = useTabsStore()
  const { shortcuts, searchPresets, loadFromBackend } = useSettingsStore()
  const { fetchFavorites } = useFavoriteStore()
  const [drives, setDrives] = useState<string[]>([])
  const [defaultPaths, setDefaultPaths] = useState<Record<string, string>>({})

  useEffect(() => {
    GetDrives().then(setDrives)
    GetDefaultPaths().then(setDefaultPaths)
    loadFromBackend()
    fetchFavorites()
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath

  const shortcutMapping: Record<string, string> = {
    'desktop': 'Desktop',
    'downloads': 'Downloads',
    'documents': 'Documents',
    'pictures': 'Pictures',
    'music': 'Music',
    'videos': 'Videos',
  }

  const navItems = [
    ...shortcuts.filter(s => s.visible).map(s => ({
      name: s.name,
      icon: s.id === 'documents' ? 'document_line.svg' : s.id === 'pictures' ? 'pic_2_fill.svg' : s.icon,
      path: defaultPaths[shortcutMapping[s.id]]
    })),
    { name: '收藏', icon: 'star_fill.svg', path: 'favorite://' }, // Star icon
    { name: '最近访问', icon: 'history_anticlockwise_line.svg', path: 'recent://' },
    { name: '虚拟文件夹', icon: 'folder_virtual.svg', path: 'smartfolder://' },
  ]

  const handleNavigate = (path: string | undefined, name: string) => {
    if (path) {
      setSettingsOpen(false)
      navigate(path, name)
    }
  }

  const isItemActive = (path: string | undefined) => path && currentPath === path

  return (
    <motion.div
      className="flex flex-col h-full bg-white rounded-2xl shadow-panel border border-gray-100 wails-draggable py-4 overflow-hidden shrink-0"
      initial={false}
      animate={{ width: isSidebarExpanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
    >
      <div className="flex-1 overflow-y-auto space-y-1 wails-no-drag no-scrollbar">
        {navItems.map((item) => (
          <div
            key={item.name}
            onClick={() => handleNavigate(item.path, item.name)}
            className={`flex items-center py-2 rounded-lg cursor-pointer transition-colors ${
              isSidebarExpanded ? 'px-4 mx-2' : 'justify-center mx-1'
            } ${
              isItemActive(item.path) ? 'bg-gray-100 text-primary font-medium' : 'hover:bg-gray-50 text-gray-700'
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
              isItemActive(drive) ? 'bg-gray-100 text-primary font-medium' : 'hover:bg-gray-50 text-gray-700'
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


      </div>
      
      <div className="mt-auto wails-no-drag">
        <div 
          onClick={() => setSettingsOpen(true)}
          className={`flex items-center py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700 transition-colors ${
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
