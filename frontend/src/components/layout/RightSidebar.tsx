import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import FilePreview from '../preview/FilePreview'
import RemarkPanel from '../preview/RemarkPanel'
import { useUIStore } from '../../store/uiStore'
import RightSidebarAdvanced from './RightSidebarAdvanced'

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState('预览')
  const { rightSidebarWidth, setRightSidebarWidth } = useUIStore()
  const [isResizing, setIsResizing] = useState(false)

  const tabs = ['预览', '信息', '高级']

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // Calculate width based on mouse X position
      // Left Sidebar is 64px, plus gaps, so the left edge of RightSidebar is around 88px.
      // e.clientX - 88 is the new width
      const newWidth = e.clientX - 88
      // Minimum width 200px, Maximum 800px
      const clampedWidth = Math.min(Math.max(newWidth, 200), 800)
      setRightSidebarWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setRightSidebarWidth])

  return (
    <div className="relative shrink-0 flex h-full">
      <motion.div 
        initial={{ opacity: 0, width: 0, marginLeft: 0 }}
        animate={{ opacity: 1, width: rightSidebarWidth, marginLeft: 0 }}
        exit={{ opacity: 0, width: 0, marginLeft: -12 }}
        transition={{ type: 'tween', duration: isResizing ? 0 : 0.2, ease: 'easeOut' }}
        className="h-full bg-white rounded-2xl shadow-panel flex flex-col shrink-0 overflow-hidden border border-gray-100 wails-no-drag select-text"
      >
      <div className="p-4">
        {/* Toggle Pill */}
        <div className="flex items-center bg-gray-100 rounded-full p-1 w-full justify-between">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-1.5 text-xs rounded-full transition-colors z-base ${
                activeTab === tab ? 'font-medium text-primary' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabRight"
                  className="absolute inset-0 bg-white rounded-full shadow-sm z-[-1]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-base">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start text-sm overflow-y-auto relative pb-4 pt-2 w-full no-scrollbar">
        {activeTab === '预览' && (
          <div className="w-full flex flex-col relative px-4 max-h-full min-h-0">
            <FilePreview />
            <RemarkPanel />
          </div>
        )}
        {activeTab === '信息' && (
          <div className="w-full flex flex-col p-4 text-gray-400">
            信息内容区
          </div>
        )}
        {activeTab === '高级' && (
          <RightSidebarAdvanced />
        )}
      </div>
    </motion.div>
    <div 
      className="w-3 h-full absolute -right-3 top-0 cursor-ew-resize z-50 wails-no-drag"
      onMouseDown={(e) => {
        e.preventDefault()
        setIsResizing(true)
      }}
    />
    </div>
  )
}
