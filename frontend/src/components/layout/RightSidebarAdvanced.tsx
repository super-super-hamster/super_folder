import React, { useEffect, useState } from 'react'
import { Select, ListBox } from '@heroui/react'
import TagPanel from './TagPanel'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { GetSimilarImageThresholds } from '../../../wailsjs/go/main/App'

const scopeOptions = [
  { id: 'current', name: '当前文件夹' },
  { id: 'subfolders', name: '包含子文件夹' }
]

const thresholdOrder = ['极度相似', '高度相似', '部分相似']

export default function RightSidebarAdvanced() {
  const { activeTabId, tabs, navigate } = useTabsStore()
  const { setSettingsOpen } = useUIStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath || 'C:\\'

  const [scope, setScope] = useState('current')
  const [thresholdName, setThresholdName] = useState('高度相似')
  const [thresholds, setThresholds] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    GetSimilarImageThresholds().then(setThresholds)
  }, [])

  const getRealFolderPath = () => {
    if (currentPath.startsWith('similar://')) {
      return currentPath.slice('similar://'.length).split('?')[0]
    }
    return currentPath
  }

  const handleFindSimilar = () => {
    if (!activeTab) return
    const folderPath = getRealFolderPath()
    const includeSubfolders = scope === 'subfolders'
    const threshold = thresholds?.[thresholdName] ?? 5
    const useMax = thresholdName === '极度相似'
    const query = new URLSearchParams({
      subfolders: includeSubfolders.toString(),
      threshold: threshold.toString(),
      useMax: useMax.toString()
    })
    const targetPath = `similar://${folderPath}?${query.toString()}`
    const replace = currentPath.startsWith('similar://')
    setSettingsOpen(false)
    navigate(targetPath, '相似图片', false, replace)
  }

  return (
    <div className="w-full flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="text-sm font-semibold text-gray-700">查找相似图片</div>

        <Select
          selectedKey={scope}
          onSelectionChange={(key) => {
            if (!key || key === 'all') return
            const selected = typeof key === 'string' ? key : Array.from(key as unknown as Set<string>)[0]
            if (selected) setScope(selected)
          }}
          className="w-full"
          aria-label="查找范围"
        >
          <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
            <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Select.Trigger>
          <Select.Popover className="border border-gray-200 shadow-lg rounded-xl p-1">
            <ListBox className="gap-1 p-0">
              {scopeOptions.map((opt) => (
                <ListBox.Item
                  key={opt.id}
                  id={opt.id}
                  textValue={opt.name}
                  className="rounded-lg text-sm font-medium text-gray-800 px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                >
                  {opt.name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          selectedKey={thresholdName}
          onSelectionChange={(key) => {
            if (!key || key === 'all') return
            const selected = typeof key === 'string' ? key : Array.from(key as unknown as Set<string>)[0]
            if (selected) setThresholdName(selected)
          }}
          className="w-full"
          aria-label="相似程度"
        >
          <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
            <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Select.Trigger>
          <Select.Popover className="border border-gray-200 shadow-lg rounded-xl p-1">
            <ListBox className="gap-1 p-0">
              {thresholds && thresholdOrder.map((name) => (
                <ListBox.Item
                  key={name}
                  id={name}
                  textValue={name}
                  className="rounded-lg text-sm font-medium text-gray-800 px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                >
                  {name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <button
          onClick={handleFindSimilar}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          开始查找
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <TagPanel />
      </div>
    </div>
  )
}
