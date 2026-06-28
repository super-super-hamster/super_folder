import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import FolderSettings from './FolderSettings'
import CacheSettings from './CacheSettings'
import SearchPresetSettings from './SearchPresetSettings'
import TagSettings from './TagSettings'

export default function SettingsContent() {
  const { activeSettingsTab } = useUIStore()

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto wails-no-drag p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSettingsTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeSettingsTab === 'folder' && <FolderSettings />}
            {activeSettingsTab === 'cache' && <CacheSettings />}
            {activeSettingsTab === 'search' && <SearchPresetSettings />}
            {activeSettingsTab === 'tag' && <TagSettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
