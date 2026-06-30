import React, { useState } from 'react'
import { Select, ListBox, Switch } from '@heroui/react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { GetSimilarImageThresholds } from '../../../wailsjs/go/main/App'

const scopeOptions = [
  { id: 'current', name: '当前文件夹' },
  { id: 'subfolders', name: '包含子文件夹' }
]

export default function AdvancedSettings() {
  const { setSettingsOpen } = useUIStore()
  const { activeTabId, tabs, navigate } = useTabsStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath || 'C:\\'

  const [scope, setScope] = useState('current')
  const [thresholdName, setThresholdName] = useState('高度相似')
  const [thresholds, setThresholds] = useState<Record<string, number> | null>(null)

  React.useEffect(() => {
    GetSimilarImageThresholds().then(setThresholds)
  }, [])

  const handleFindSimilar = () => {
    if (!activeTab) return
    const includeSubfolders = scope === 'subfolders'
    const threshold = thresholds?.[thresholdName] ?? 12
    const query = new URLSearchParams({ subfolders: includeSubfolders.toString(), threshold: threshold.toString() })
    const targetPath = `similar://${currentPath}?${query.toString()}`
    setSettingsOpen(false)
    navigate(targetPath, '相似图片', false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">高级</h2>
      </div>

      <div className="bg-sf-panel/80 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">查找相似图片</h3>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 w-24">查找范围</span>
          <Select
            selectedKey={scope}
            onSelectionChange={(key) => {
              if (!key || key === 'all') return
              const selected = Array.from(key as unknown as Set<string>)[0]
              if (selected) setScope(selected)
            }}
            className="w-40"
          >
            <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
              <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Select.Trigger>
            <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-40 p-1">
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
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 w-24">相似程度</span>
          <Select
            selectedKey={thresholdName}
            onSelectionChange={(key) => {
              if (!key || key === 'all') return
              const selected = Array.from(key as unknown as Set<string>)[0]
              if (selected) setThresholdName(selected)
            }}
            className="w-40"
          >
            <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
              <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Select.Trigger>
            <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-40 p-1">
              <ListBox className="gap-1 p-0">
                {thresholds && Object.keys(thresholds).map((name) => (
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
        </div>

        <button
          onClick={handleFindSimilar}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          查找相似图片
        </button>
      </div>
    </div>
  )
}
