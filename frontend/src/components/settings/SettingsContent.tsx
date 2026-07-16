import React from 'react'
import { useUIStore } from '../../store/uiStore'
import ScrollArea from '../common/ScrollArea'
import GeneralSettings from './GeneralSettings'
import CacheSettings from './CacheSettings'
import SearchPresetSettings from './SearchPresetSettings'
import TagSettings from './TagSettings'
import PrivacySettings from './PrivacySettings'

export default function SettingsContent() {
  const { activeSettingsTab } = useUIStore()

  return (
    <div className="sf-paper flex-1 rounded-lg border flex flex-col overflow-hidden relative">
      <ScrollArea className="flex-1 min-h-0 wails-no-drag" innerClassName="p-8">
        {activeSettingsTab === 'general' && <GeneralSettings />}
        {activeSettingsTab === 'privacy' && <PrivacySettings />}
        {activeSettingsTab === 'cache' && <CacheSettings />}
        {activeSettingsTab === 'search' && <SearchPresetSettings />}
        {activeSettingsTab === 'tag' && <TagSettings />}
      </ScrollArea>
    </div>
  )
}
