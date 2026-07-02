import React from 'react'
import { useUIStore } from '../../store/uiStore'
import GeneralSettings from './GeneralSettings'
import CacheSettings from './CacheSettings'
import SearchPresetSettings from './SearchPresetSettings'
import TagSettings from './TagSettings'
import PrivacySettings from './PrivacySettings'

export default function SettingsContent() {
  const { activeSettingsTab } = useUIStore()

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto wails-no-drag p-8">
        {activeSettingsTab === 'general' && <GeneralSettings />}
        {activeSettingsTab === 'privacy' && <PrivacySettings />}
        {activeSettingsTab === 'cache' && <CacheSettings />}
        {activeSettingsTab === 'search' && <SearchPresetSettings />}
        {activeSettingsTab === 'tag' && <TagSettings />}
      </div>
    </div>
  )
}
