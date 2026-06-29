import { useState } from 'react'
import { Select, ListBox } from '@heroui/react'
import { SelectDirectory } from '../../../wailsjs/go/main/App'
import { useModalStore } from '../../store/modalStore'

interface SmartFolder {
  id: string
  name: string
  rootPaths: string[]
  presetId: string
}

interface SearchPreset {
  id: string
  name: string
}

interface SmartFolderCreatePanelProps {
  searchPresets: SearchPreset[]
  smartFolders: SmartFolder[]
  onSave: (folders: SmartFolder[]) => void
  onClose: () => void
}

export default function SmartFolderCreatePanel({ searchPresets, smartFolders, onSave, onClose }: SmartFolderCreatePanelProps) {
  const [sfName, setSfName] = useState('')
  const [sfPaths, setSfPaths] = useState<string[]>([''])
  const [sfPresetId, setSfPresetId] = useState(searchPresets[0]?.id || '')

  const handleSave = () => {
    if (!sfName.trim()) {
      useModalStore.getState().openModal('warning', { message: '请输入名称' })
      return
    }
    const validPaths = sfPaths.filter(p => p.trim() !== '')
    if (validPaths.length === 0) {
      useModalStore.getState().openModal('warning', { message: '至少需要一个有效路径' })
      return
    }
    if (!sfPresetId) {
      useModalStore.getState().openModal('warning', { message: '请选择一个搜索预设' })
      return
    }

    const newFolder = {
      id: Date.now().toString(),
      name: sfName,
      rootPaths: validPaths,
      presetId: sfPresetId
    }
    onSave([...smartFolders, newFolder])
  }

  return (
    <div id="smart-folder-create-panel" className="bg-sf-panel/50 rounded-xl p-6 mt-6 border border-sf-border max-w-2xl mx-auto mb-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">名称</div>
        <input
          value={sfName}
          onChange={(e) => setSfName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">选择文件夹</div>
        <div className="space-y-3">
          {sfPaths.map((path, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={path}
                  onChange={(e) => {
                    const newPaths = [...sfPaths]
                    newPaths[idx] = e.target.value
                    setSfPaths(newPaths)
                  }}
                  className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={async () => {
                    const dir = await SelectDirectory()
                    if (dir) {
                      const newPaths = [...sfPaths]
                      newPaths[idx] = dir
                      setSfPaths(newPaths)
                    }
                  }}
                >
                  <img src="/src/assets/icons/folder_3_line.svg" className="w-4 h-4 opacity-70" alt="select" />
                </button>
              </div>
              {sfPaths.length > 1 && (
                <button
                  onClick={() => {
                    const newPaths = [...sfPaths]
                    newPaths.splice(idx, 1)
                    setSfPaths(newPaths)
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <img src="/src/assets/icons/close_line.svg" className="w-4 h-4" alt="delete" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setSfPaths([...sfPaths, ''])}
            className="w-8 h-8 flex items-center justify-center bg-sf-input hover:bg-sf-input-hover rounded-lg transition-colors mt-2"
          >
            <img src="/src/assets/icons/add_line.svg" className="w-5 h-5 text-gray-600" alt="add" />
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="text-sm font-semibold text-gray-700 mb-2">选择搜索预设</div>
        <Select
          selectedKey={sfPresetId}
          onSelectionChange={(key) => {
            const selected = Array.from(key as any)[0] || key
            setSfPresetId(selected as string)
          }}
          className="w-64"
        >
          <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-10 min-h-10 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
            <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-data-[open=true]:rotate-180 transition-transform">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Select.Trigger>
          <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-64 p-1">
            <ListBox className="gap-1 p-0">
              {searchPresets.map(preset => (
                <ListBox.Item
                  key={preset.id}
                  id={preset.id}
                  textValue={preset.name}
                  className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                >
                  {preset.name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="flex w-full gap-3 pt-4 border-t border-gray-200/60 mt-4">
        <button
          onClick={onClose}
          className="flex-1 bg-sf-input hover:bg-sf-input-hover text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认
        </button>
      </div>
    </div>
  )
}
