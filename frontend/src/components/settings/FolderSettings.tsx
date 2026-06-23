import React, { useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'
import { useSettingsStore, ShortcutItem } from '../../store/settingsStore'
import { GetDefaultPaths } from '../../../wailsjs/go/main/App'

const FolderSettings = () => {
  const { shortcuts, setShortcuts, loadFromBackend } = useSettingsStore()
  const [items, setItems] = useState<ShortcutItem[]>([])
  const [defaultPaths, setDefaultPaths] = useState<Record<string, string>>({})
  const [dragId, setDragId] = useState<string | null>(null)

  useEffect(() => {
    loadFromBackend()
    GetDefaultPaths().then(setDefaultPaths)
  }, [])

  useEffect(() => {
    // Only initialize from shortcuts if not actively dragging
    if (!dragId) {
      setItems(shortcuts)
    }
  }, [shortcuts, dragId])

  const toggleVisibility = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    )
    setItems(newItems)
    setShortcuts(newItems)
  }

  const shortcutMapping: Record<string, string> = {
    'desktop': 'Desktop',
    'downloads': 'Downloads',
    'documents': 'Documents',
    'pictures': 'Pictures',
    'music': 'Music',
    'videos': 'Videos',
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">文件夹</h2>
      </div>

      <Reorder.Group 
        axis="y" 
        values={items} 
        onReorder={setItems}
        className="flex flex-col gap-2"
      >
        {items.map((item) => {
          // Force new icons for existing users who might have old ones cached
          const iconName = item.id === 'documents' ? 'document_line.svg' : item.id === 'pictures' ? 'pic_2_fill.svg' : item.icon
          const path = defaultPaths[shortcutMapping[item.id]] || ''

          return (
            <Reorder.Item 
              key={item.id}
              value={item}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => {
                setDragId(null)
                setShortcuts(items)
              }}
              animate={{ 
                scale: dragId === item.id ? 1.02 : 1 
              }}
              transition={{ type: 'spring', stiffness: 700, damping: 40 }}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl group relative"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 pointer-events-none">
                <img src={`/src/assets/icons/${iconName}`} className={`w-5 h-5 shrink-0 ${item.visible ? 'opacity-80' : 'opacity-40'}`} alt={item.name} />
                <span className={`font-medium shrink-0 w-16 ${item.visible ? 'text-gray-700' : 'text-gray-400'}`}>
                  {item.name}
                </span>
                <span className={`text-sm truncate max-w-full ${item.visible ? 'text-gray-500' : 'text-gray-400'}`} title={path}>
                  {path}
                </span>
              </div>
              
              <div className="flex items-center ml-4 relative z-10">
                <button 
                  onClick={() => toggleVisibility(item.id)}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center pointer-events-auto"
                  title={item.visible ? '隐藏' : '显示'}
                >
                  <img 
                    src={`/src/assets/icons/${item.visible ? 'eye_line.svg' : 'eye_close_line.svg'}`} 
                    className={`w-5 h-5 ${item.visible ? 'opacity-70' : 'opacity-40'}`} 
                    alt={item.visible ? 'Visible' : 'Hidden'} 
                  />
                </button>
              </div>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
    </div>
  )
}

export default FolderSettings
