import React, { useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'
import { Select, Slider, ListBox, Label, Input, Button, Switch } from '@heroui/react'
import { useSettingsStore, ShortcutItem } from '../../store/settingsStore'
import { usePrivacyStore } from '../../store/privacyStore'
import { GetDefaultPaths, SelectDirectory } from '../../../wailsjs/go/main/App'

const SPECIAL_IDS = new Set(['favorite', 'recent', 'smartfolder'])

const shortcutMapping: Record<string, string> = {
  'desktop': 'Desktop',
  'downloads': 'Downloads',
  'documents': 'Documents',
  'pictures': 'Pictures',
  'music': 'Music',
  'videos': 'Videos',
}

import ChineseConvSettings from './ChineseConvSettings'

export default function GeneralSettings() {
  const {
    shortcuts, setShortcuts, loadFromBackend,
    doubleClickOpenMode, setDoubleClickOpenMode,
    thumbnailBudgetMB, setThumbnailBudgetMB,
    initialPathModePublic, setInitialPathModePublic,
    initialPathCustomPublic, setInitialPathCustomPublic,
    initialPathModePrivacy, setInitialPathModePrivacy,
    initialPathCustomPrivacy, setInitialPathCustomPrivacy,
    showParentDirInNav, setShowParentDirInNav,
  } = useSettingsStore()
  const privacyMode = usePrivacyStore((state) => state.state?.mode || 'public')
  const isPrivacy = privacyMode === 'privacy'
  const initialPathMode = isPrivacy ? initialPathModePrivacy : initialPathModePublic
  const initialPathCustom = isPrivacy ? initialPathCustomPrivacy : initialPathCustomPublic
  const setInitialPathMode = isPrivacy ? setInitialPathModePrivacy : setInitialPathModePublic
  const setInitialPathCustom = isPrivacy ? setInitialPathCustomPrivacy : setInitialPathCustomPublic

  const [items, setItems] = useState<ShortcutItem[]>([])
  const [defaultPaths, setDefaultPaths] = useState<Record<string, string>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [sliderValue, setSliderValue] = useState(thumbnailBudgetMB)

  useEffect(() => {
    setSliderValue(thumbnailBudgetMB)
  }, [thumbnailBudgetMB])

  useEffect(() => {
    loadFromBackend()
    GetDefaultPaths().then(setDefaultPaths)
  }, [])

  useEffect(() => {
    if (!dragId) {
      setItems(shortcuts)
    }
  }, [shortcuts, dragId])

  const toggleVisibility = (id: string) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    )
    setItems(newItems)
    setShortcuts(newItems)
  }

  const handlePathClick = async (id: string) => {
    const dir = await SelectDirectory()
    if (!dir) return
    const newItems = items.map(item =>
      item.id === id ? { ...item, path: dir } : item
    )
    setItems(newItems)
    setShortcuts(newItems)
  }

  const resolvePath = (item: ShortcutItem) => {
    if (SPECIAL_IDS.has(item.id)) return ''
    return item.path || defaultPaths[shortcutMapping[item.id]] || ''
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">导航栏顺序</h2>
      </div>

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={setItems}
        className="flex flex-col gap-2"
      >
        {items.map((item) => {
          const iconName = item.id === 'documents' ? 'document_line.svg' : item.id === 'pictures' ? 'pic_2_fill.svg' : item.icon
          const path = resolvePath(item)
          const isSpecial = SPECIAL_IDS.has(item.id)

          return (
            <Reorder.Item
              key={item.id}
              value={item}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => {
                setDragId(null)
                setShortcuts(items)
              }}
              animate={{
                scale: dragId === item.id ? 1.02 : 1
              }}
              transition={{ type: 'spring', stiffness: 700, damping: 40 }}
              className="flex items-center justify-between px-4 py-3 bg-sf-panel/80 hover:bg-sf-item rounded-xl group relative"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <img src={`/src/assets/icons/${iconName}`} className={`w-5 h-5 shrink-0 ${item.visible ? 'opacity-80' : 'opacity-40'}`} alt={item.name} />
                <span className={`font-medium shrink-0 w-20 ${item.visible ? 'text-gray-700' : 'text-gray-400'}`}>
                  {item.name}
                </span>
                {!isSpecial && (
                  <button
                    onClick={() => handlePathClick(item.id)}
                    className={`text-sm truncate max-w-full text-left ${item.visible ? 'text-gray-500 hover:text-blue-600' : 'text-gray-400'} pointer-events-auto`}
                    title={path}
                  >
                    {path}
                  </button>
                )}
              </div>

              <div className="flex items-center ml-4 relative z-10">
                <button
                  onClick={() => toggleVisibility(item.id)}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center pointer-events-auto"
                  title={item.visible ? '隐藏' : '显示'}
                >
                  <img
                    src={`/src/assets/icons/${item.visible ? 'eye_line.svg' : 'eye_close_line.svg'}`}
                    className={`w-5 h-5 ${item.visible ? 'opacity-70' : 'opacity-40'}`}
                    alt={item.visible ? 'Visible' : 'Hidden'}
                  />
                </button>
              </div>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">其他</h2>
        <div className="space-y-4">
          <div className="bg-sf-panel/80 rounded-xl p-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">双击文件打开方式</span>
            <Select
              selectedKey={doubleClickOpenMode}
              onSelectionChange={(key) => {
                const selected = Array.from(key as any)[0] || key
                setDoubleClickOpenMode(selected as 'inApp' | 'defaultProgram')
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
                  <ListBox.Item id="inApp" textValue="应用内打开" className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                    应用内打开
                  </ListBox.Item>
                  <ListBox.Item id="defaultProgram" textValue="使用默认程序打开" className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                    使用默认程序打开
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="bg-sf-panel/80 rounded-xl p-5">
            <Slider
              className="w-full max-w-md"
              minValue={16}
              maxValue={1024}
              step={1}
              value={sliderValue}
              onChange={(value) => {
                const mb = Array.isArray(value) ? value[0] : value
                setSliderValue(mb)
              }}
              onChangeEnd={(value) => {
                const mb = Array.isArray(value) ? value[0] : value
                setThumbnailBudgetMB(mb)
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-gray-700">高性能计算时的内存占用大小</Label>
                <Slider.Output className="text-sm text-gray-500">
                  {({ state }) => {
                    const pct = Math.round(((state.getThumbValue(0) as number) - 16) / (1024 - 16) * 100)
                    return `${pct}%`
                  }}
                </Slider.Output>
              </div>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </div>

          <div className="bg-sf-panel/80 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">初始路径</span>
              <Select
                value={initialPathMode}
                onChange={(value) => setInitialPathMode(value as 'last' | 'custom')}
                placeholder="请选择"
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
                    <ListBox.Item id="last" textValue="上次退出的位置" className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                      上次退出的位置
                    </ListBox.Item>
                    <ListBox.Item id="custom" textValue="自定义" className="rounded-lg text-sm font-medium text-gray-800 px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                      自定义
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {initialPathMode === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={initialPathCustom}
                  onChange={(e) => setInitialPathCustom(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onPress={async () => {
                    const dir = await SelectDirectory()
                    if (dir) setInitialPathCustom(dir)
                  }}
                >
                  浏览
                </Button>
              </div>
            )}
          </div>

          <div className="bg-sf-panel/80 rounded-xl p-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">导航栏显示上一级目录</span>
            <Switch isSelected={showParentDirInNav} onChange={setShowParentDirInNav}>
              {({ isSelected }) => (
                <Switch.Content>
                  <Switch.Control className={isSelected ? 'bg-green-500' : 'bg-gray-300'}>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              )}
            </Switch>
          </div>
        </div>
      </div>

      <ChineseConvSettings />
    </div>
  )
}
