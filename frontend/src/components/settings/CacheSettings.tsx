import React, { useEffect, useState } from 'react'
import { Select, ListBox, Switch } from '@heroui/react'
import { useSettingsStore } from '../../store/settingsStore'
import { useModalStore } from '../../store/modalStore'
import { GetThumbnailCacheSize, ClearThumbnailCache, AutoCleanThumbnailCache } from '../../../wailsjs/go/main/App'
import { formatSize } from '../../utils/fileFormatting'

const limitOptions = [
  { label: '128 MB', value: 128 },
  { label: '256 MB', value: 256 },
  { label: '512 MB', value: 512 },
  { label: '1 GB', value: 1024 },
  { label: '2 GB', value: 2048 },
  { label: '5 GB', value: 5120 }
]

const periodOptions = [
  { label: '从不', value: 'never' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

const CacheSettings = () => {
  const {
    cacheLimitMB,
    setCacheLimitMB,
    cacheLimitEnabled,
    setCacheLimitEnabled,
    autoCleanPeriod,
    setAutoCleanPeriod
  } = useSettingsStore()
  const [currentSize, setCurrentSize] = useState<number>(0)
  const [isClearing, setIsClearing] = useState(false)
  const [isTrimming, setIsTrimming] = useState(false)

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

  useEffect(() => {
    if (!cacheLimitEnabled || autoCleanPeriod === 'never') return
    const interval = setInterval(() => {
      AutoCleanThumbnailCache(cacheLimitMB).catch(console.error)
      fetchSize()
    }, 60000)
    return () => clearInterval(interval)
  }, [cacheLimitEnabled, autoCleanPeriod, cacheLimitMB])

  const handleClear = () => {
    useModalStore.getState().openModal('confirm', {
      message: '确定要清空所有缩略图缓存吗？此操作不可撤销。',
      confirmVariant: 'red',
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      onConfirm: async () => {
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
    })
  }

  const handleTrim = () => {
    useModalStore.getState().openModal('confirm', {
      message: '确定要清理缓存至低于上限吗？将自动删除旧缓存文件。',
      confirmVariant: 'green',
      confirmButtonText: '确认清理',
      cancelButtonText: '取消',
      onConfirm: async () => {
        setIsTrimming(true)
        try {
          await AutoCleanThumbnailCache(cacheLimitMB)
          await fetchSize()
        } catch (e) {
          console.error(e)
        } finally {
          setIsTrimming(false)
        }
      }
    })
  }

  const limitBytes = cacheLimitMB * 1024 * 1024
  const isOverLimit = currentSize > limitBytes

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">缓存管理</h2>
      </div>

      <div className="bg-sf-panel/80 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">当前缓存占用</span>
            <span className="text-2xl font-bold text-gray-900">{formatSize(currentSize)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={isClearing}
              onClick={handleClear}
              className={`px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isClearing ? '清理中...' : '一键清空'}
            </button>
            <button
              disabled={!cacheLimitEnabled || !isOverLimit || isTrimming}
              onClick={handleTrim}
              className={`px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition-colors ${(!cacheLimitEnabled || !isOverLimit || isTrimming) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isTrimming ? '清理中...' : '清空至低于上限'}
            </button>
          </div>
        </div>
      </div>

      <div className={`bg-sf-panel/80 rounded-xl p-5 space-y-4 transition-opacity ${!cacheLimitEnabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">缓存上限</span>
          <Select
            selectedKey={cacheLimitMB.toString()}
            onSelectionChange={(key) => {
              if (!key || key === 'all') return
              const selected = [...(key as unknown as Set<string>)][0]
              if (selected) setCacheLimitMB(Number(selected))
            }}
            isDisabled={!cacheLimitEnabled}
            className="w-32"
          >
            <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed">
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
          <Switch
            className="ml-auto"
            isSelected={cacheLimitEnabled}
            onChange={setCacheLimitEnabled}
            aria-label="启用缓存上限"
          >
            {({ isSelected }) => (
              <Switch.Content>
                <Switch.Control className={isSelected ? 'bg-green-500' : 'bg-gray-300'}>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            )}
          </Switch>
        </div>

        <div className={`flex items-center gap-4 ${!cacheLimitEnabled ? 'pointer-events-none' : ''}`}>
          <span className="text-sm font-medium text-gray-700">自动清理周期</span>
          <Select
            selectedKey={autoCleanPeriod}
            onSelectionChange={(key) => {
              if (!key || key === 'all') return
              const selected = [...(key as unknown as Set<string>)][0]
              if (selected) setAutoCleanPeriod(selected as 'never' | 'daily' | 'weekly' | 'monthly')
            }}
            isDisabled={!cacheLimitEnabled}
            className="w-32"
          >
            <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed">
              <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Select.Trigger>
            <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-32 p-1">
              <ListBox className="gap-1 p-0">
                {periodOptions.map((opt) => (
                  <ListBox.Item
                    key={opt.value}
                    id={opt.value}
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

        <p className="text-xs text-gray-500">开启后将在空闲时定时检查，若缓存超过上限则自动清理</p>
      </div>
    </div>
  )
}

export default CacheSettings
