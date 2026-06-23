import React from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'

const SETTINGS_TABS = [
  { id: 'folder', name: '文件夹', icon: 'folder_line.svg' },
  { id: 'cache', name: '缓存', icon: 'database-2-line.svg' },
  { id: 'search', name: '搜索', icon: 'search_line.svg' },
  { id: 'tag', name: '标签', icon: 'bookmark_line.svg' }
] as const

export default function SettingsSidebar() {
  const { setSettingsOpen, activeSettingsTab, setActiveSettingsTab } = useUIStore()

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 py-4 overflow-hidden shrink-0 w-[220px]">
      <div className="flex-1 overflow-y-auto space-y-1 wails-no-drag px-2">
        {SETTINGS_TABS.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveSettingsTab(tab.id)}
            className={`flex items-center py-2 px-4 rounded-xl cursor-pointer transition-colors ${
              activeSettingsTab === tab.id ? 'bg-[#e8e8e8] text-gray-900 font-medium' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <img src={`/src/assets/icons/${tab.icon}`} alt={tab.name} className="w-6 h-6 shrink-0" />
            <span className="ml-3">{tab.name}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-auto px-2 wails-no-drag">
        <div 
          onClick={() => setSettingsOpen(false)}
          className="flex items-center py-2 px-4 rounded-xl hover:bg-gray-100 cursor-pointer text-gray-700 transition-colors"
        >
          <img src="/src/assets/icons/left_line.svg" alt="返回" className="w-6 h-6 shrink-0" />
          <span className="ml-3">返回</span>
        </div>
      </div>
    </div>
  )
}
