import React, { useEffect, useState } from 'react'
import { Select, ListBox } from '@heroui/react'
import { useSettingsStore } from '../../store/settingsStore'
import { GetThumbnailCacheSize, ClearThumbnailCache } from '../../../wailsjs/go/main/App'

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const limitOptions = [
  { label: '128 MB', value: 128 },
  { label: '256 MB', value: 256 },
  { label: '512 MB', value: 512 },
  { label: '1 GB', value: 1024 },
  { label: '2 GB', value: 2048 },
  { label: '5 GB', value: 5120 }
]

const CacheSettings = () => {
  const { cacheLimitMB, setCacheLimitMB } = useSettingsStore()
  const [currentSize, setCurrentSize] = useState<number>(0)
  const [isClearing, setIsClearing] = useState(false)

  const fetchSize = async () => {
    try {
      const size = await GetThumbnailCacheSize()
      setCurrentSize(size)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchSize()
    const interval = setInterval(fetchSize, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleClear = async () => {
    setIsClearing(true)
    try {
      await ClearThumbnailCache()
      await fetchSize()
    } catch (e) {
      console.error(e)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          缓存管理
        </h2>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">当前缓存占用</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{formatSize(currentSize)}</div>
          </div>
          <button 
            disabled={isClearing} 
            onClick={handleClear}
            className={`px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isClearing ? '清理中...' : '一键清空'}
          </button>
        </div>

        <div className="h-px bg-gray-200" />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">缓存上限</span>
            <Select
              selectedKey={cacheLimitMB.toString()}
              onSelectionChange={(key) => setCacheLimitMB(Number(key))}
              className="w-32"
            >
              <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
                <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </Select.Trigger>
              <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-32 p-1">
                <ListBox className="gap-1 p-0">
                  {limitOptions.map((opt) => (
                    <ListBox.Item 
                      key={opt.value}
                      id={opt.value.toString()}
                      textValue={opt.label}
                      className="rounded-lg text-sm font-medium text-gray-800 px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                    >
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheSettings
