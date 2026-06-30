import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useState, useEffect } from 'react'
import { Input, Dropdown, Label, Header, Separator, Select, ListBox } from '@heroui/react'
import SimpleDatePicker from '../common/SimpleDatePicker'
import { parseSearchQuery, buildSearchQuery } from '../../utils/searchQuery'

export default function SearchPanel() {
  const { searchFilter, setSearchFilter, isSearchPanelOpen, searchSuggestions, selectedSuggestionIndex, searchQuery, searchPanelHeight, setSearchPanelHeight } = useUIStore()
  const { searchPresets } = useSettingsStore()
  const [isResizing, setIsResizing] = useState(false)
  const [isAddingExt, setIsAddingExt] = useState(false)
  const [extInput, setExtInput] = useState('')
  const [isAddingExclude, setIsAddingExclude] = useState(false)
  const [excludeInput, setExcludeInput] = useState('')

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // SearchPanel is top-aligned just under TopNav.
      // Easiest is just calculate height relative to current pointer position.
      // TopNav is ~64px height + 12px padding top.
      const searchPanelTop = 76 + 12 // TopNav + gap
      const newHeight = e.clientY - searchPanelTop
      const clampedHeight = Math.min(Math.max(newHeight, 150), 600)
      setSearchPanelHeight(clampedHeight)
    }
    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setSearchPanelHeight])

  const availableFilters = []
  if (!searchFilter.isCaseSensitive) availableFilters.push({ id: 'case', label: '区分大小写' })
  if (!searchFilter.isRegex) availableFilters.push({ id: 'regex', label: '正则表达式' })
  if (!searchFilter.isExcludeFolder) availableFilters.push({ id: 'exclude_folder', label: '排除文件夹' })
  if (!searchFilter.isSizeFilter) availableFilters.push({ id: 'size', label: '文件大小' })
  if (!searchFilter.isTimeFilter) availableFilters.push({ id: 'time', label: '修改时间' })
  if (!searchFilter.isImageShapeFilter) availableFilters.push({ id: 'image_shape', label: '图片形状' })
  if (searchFilter.type === 'all') {
    availableFilters.push({ id: 'file', label: '仅文件' })
    availableFilters.push({ id: 'folder', label: '仅文件夹' })
  }

  const handleAddFilter = (id: string) => {
    if (id === 'case') setSearchFilter({ isCaseSensitive: true })
    if (id === 'regex') setSearchFilter({ isRegex: true })
    if (id === 'file') setSearchFilter({ type: 'file' })
    if (id === 'folder') setSearchFilter({ type: 'folder' })
    if (id === 'exclude_folder') setSearchFilter({ isExcludeFolder: true })
    if (id === 'size') setSearchFilter({ isSizeFilter: true, minSize: null, maxSize: null })
    if (id === 'time') setSearchFilter({ isTimeFilter: true, minTime: null, maxTime: null })
    if (id === 'image_shape') setSearchFilter({ isImageShapeFilter: true, imageShape: 'square' })
  }

  const handleRemoveFilter = (id: string) => {
    if (id === 'case') setSearchFilter({ isCaseSensitive: false })
    if (id === 'regex') setSearchFilter({ isRegex: false })
    if (id === 'file' || id === 'folder') setSearchFilter({ type: 'all', extensions: [] })
    if (id === 'exclude_folder') setSearchFilter({ isExcludeFolder: false, excludedFolders: [] })
    if (id === 'size') setSearchFilter({ isSizeFilter: false, minSize: null, maxSize: null })
    if (id === 'time') setSearchFilter({ isTimeFilter: false, minTime: null, maxTime: null })
    if (id === 'image_shape') setSearchFilter({ isImageShapeFilter: false, imageShape: 'square' })
  }

  const submitExt = () => {
    if (extInput.trim()) {
      const newExts = extInput.split(',').map(e => {
        let ext = e.trim()
        if (ext && !ext.startsWith('.')) ext = '.' + ext
        return ext
      }).filter(e => e)
      
      const uniqueExts = Array.from(new Set([...searchFilter.extensions, ...newExts]))
      setSearchFilter({ extensions: uniqueExts })
      setExtInput('')
    }
    setIsAddingExt(false)
  }

  const submitExclude = () => {
    if (excludeInput.trim()) {
      const newExclude = excludeInput.trim()
      const uniqueExcludes = Array.from(new Set([...(searchFilter.excludedFolders || []), newExclude]))
      setSearchFilter({ excludedFolders: uniqueExcludes })
      setExcludeInput('')
    }
    setIsAddingExclude(false)
  }

  const handleRemoveExtension = (extToRemove: string) => {
    setSearchFilter({ extensions: searchFilter.extensions.filter(e => e !== extToRemove) })
  }

  const handleRemoveExclude = (folderToRemove: string) => {
    setSearchFilter({ excludedFolders: searchFilter.excludedFolders.filter(f => f !== folderToRemove) })
  }

  return (
    <motion.div 
      id="search-panel"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: isSearchPanelOpen ? searchPanelHeight : 0, opacity: isSearchPanelOpen ? 1 : 0 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: isResizing ? 0 : 0.2, ease: 'easeInOut' }}
      className="flex-shrink-0 wails-no-drag relative z-20"
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 w-full h-full flex flex-col">
        <div className="p-6 h-full flex">
        {/* Left Filter Panel */}
        <div className="w-[200px] border-r border-gray-300 pr-6 flex flex-col gap-3 overflow-y-auto">
          
          <AnimatePresence>
            {searchFilter.type === 'file' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between relative group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-gray-800 font-medium">仅文件</span>
                  <button onClick={() => handleRemoveFilter('file')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                    <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="w-full h-px bg-gray-200 my-2"></div>
                
                {searchFilter.extensions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {searchFilter.extensions.map(ext => (
                      <span key={ext} className="inline-flex items-center bg-white rounded-md px-1.5 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                        {ext}
                        <button onClick={() => handleRemoveExtension(ext)} className="ml-1 opacity-50 hover:opacity-100">
                          <img src="/src/assets/icons/close_line.svg" className="w-2 h-2" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-start">
                  {isAddingExt ? (
                    <Input 
                      autoFocus
                      value={extInput} 
                      onChange={(e: any) => setExtInput(e.target.value)} 
                      onKeyDown={(e: any) => { if (e.key === 'Enter') submitExt() }}
                      onBlur={submitExt}
                      placeholder="扩展名"
                      className="w-24 h-6 text-xs bg-white border border-gray-200 px-2 rounded-md"
                    />
                  ) : (
                    <button onClick={() => setIsAddingExt(true)} className="opacity-70 hover:opacity-100 text-sf-text-secondary text-lg leading-none transition-colors">
                      +
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {searchFilter.type === 'folder' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between relative group"
              >
                <span className="text-sm text-gray-800">仅文件夹</span>
                <button onClick={() => handleRemoveFilter('folder')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                  <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {searchFilter.isExcludeFolder && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between relative group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-gray-800 font-medium">排除文件夹</span>
                  <button onClick={() => handleRemoveFilter('exclude_folder')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                    <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="w-full h-px bg-gray-200 my-2"></div>
                
                {searchFilter.excludedFolders && searchFilter.excludedFolders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {searchFilter.excludedFolders.map(folder => (
                      <span key={folder} className="inline-flex items-center bg-white rounded-md px-1.5 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                        {folder}
                        <button onClick={() => handleRemoveExclude(folder)} className="ml-1 opacity-50 hover:opacity-100">
                          <img src="/src/assets/icons/close_line.svg" className="w-2 h-2" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-start">
                  {isAddingExclude ? (
                    <Input 
                      autoFocus
                      value={excludeInput} 
                      onChange={(e: any) => setExcludeInput(e.target.value)} 
                      onKeyDown={(e: any) => { if (e.key === 'Enter') submitExclude() }}
                      onBlur={submitExclude}
                      placeholder="文件夹名"
                      className="w-24 h-6 text-xs bg-white border border-gray-200 px-2 rounded-md"
                    />
                  ) : (
                    <button onClick={() => setIsAddingExclude(true)} className="opacity-70 hover:opacity-100 text-sf-text-secondary text-lg leading-none transition-colors">
                      +
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {searchFilter.isCaseSensitive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between relative group"
              >
                <span className="text-sm text-gray-800">区分大小写</span>
                <button onClick={() => handleRemoveFilter('case')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                  <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {searchFilter.isRegex && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between relative group"
              >
                <span className="text-sm text-gray-800">正则表达式</span>
                <button onClick={() => handleRemoveFilter('regex')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                  <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {searchFilter.isSizeFilter && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex flex-col relative group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-gray-800 font-medium">文件大小</span>
                  <button onClick={() => handleRemoveFilter('size')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                    <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-full h-px bg-gray-200 my-2"></div>
                <div className="flex flex-col items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={searchFilter.minSize ?? ''}
                    onChange={(e: any) => setSearchFilter({ minSize: e.target.value === '' ? null : Number(e.target.value) })}
                    onBlur={() => {
                      if (searchFilter.minSize != null && searchFilter.maxSize != null && searchFilter.minSize > searchFilter.maxSize) {
                        setSearchFilter({ maxSize: searchFilter.minSize })
                      }
                    }}
                    placeholder="最小"
                    className="w-full h-7 text-xs bg-white border border-gray-200 px-2 rounded-md [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-gray-400 text-xs">|</span>
                  <Input
                    type="number"
                    min={0}
                    value={searchFilter.maxSize ?? ''}
                    onChange={(e: any) => setSearchFilter({ maxSize: e.target.value === '' ? null : Number(e.target.value) })}
                    onBlur={() => {
                      if (searchFilter.maxSize != null && searchFilter.minSize != null && searchFilter.maxSize < searchFilter.minSize) {
                        setSearchFilter({ minSize: searchFilter.maxSize })
                      }
                    }}
                    placeholder="最大"
                    className="w-full h-7 text-xs bg-white border border-gray-200 px-2 rounded-md [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <Select
                  selectedKey={searchFilter.sizeUnit || 'MB'}
                  onSelectionChange={(key) => {
                    if (!key || key === 'all') return
                    const selected = [...(key as unknown as Set<string>)][0]
                    if (selected) setSearchFilter({ sizeUnit: selected as 'KB' | 'MB' | 'GB' })
                  }}
                  className="w-full mt-2"
                >
                  <Select.Trigger className="h-7 min-h-7 bg-white border border-gray-200 rounded-md px-2 text-xs shadow-none">
                    <Select.Value className="text-xs" />
                    <Select.Indicator className="text-gray-400" />
                  </Select.Trigger>
                  <Select.Popover className="border border-gray-200 shadow-lg rounded-xl p-1">
                    <ListBox>
                      {(['KB', 'MB', 'GB'] as const).map((unit) => (
                        <ListBox.Item
                          key={unit}
                          id={unit}
                          textValue={unit}
                          className="rounded-lg text-xs px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black cursor-pointer"
                        >
                          {unit}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </motion.div>
            )}

            {searchFilter.isTimeFilter && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex flex-col relative group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-gray-800 font-medium">修改时间</span>
                  <button onClick={() => handleRemoveFilter('time')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                    <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-full h-px bg-gray-200 my-2"></div>
                <div className="flex flex-col items-center gap-1">
                  <SimpleDatePicker
                    value={searchFilter.minTime}
                    onChange={(ts) => {
                      if (ts != null && searchFilter.maxTime != null && ts > searchFilter.maxTime) {
                        setSearchFilter({ minTime: ts, maxTime: ts })
                      } else {
                        setSearchFilter({ minTime: ts })
                      }
                    }}
                    ariaLabel="开始时间"
                  />
                  <span className="text-gray-400 text-xs">|</span>
                  <SimpleDatePicker
                    value={searchFilter.maxTime}
                    onChange={(ts) => {
                      if (ts != null && searchFilter.minTime != null && ts < searchFilter.minTime) {
                        setSearchFilter({ maxTime: ts, minTime: ts })
                      } else {
                        setSearchFilter({ maxTime: ts })
                      }
                    }}
                    ariaLabel="结束时间"
                  />
                </div>
              </motion.div>
            )}

            {searchFilter.isImageShapeFilter && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-100 rounded-xl px-4 py-2 flex flex-col relative group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-gray-800 font-medium">图片形状</span>
                  <button onClick={() => handleRemoveFilter('image_shape')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                    <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-full h-px bg-gray-200 my-2"></div>
                <Select
                  selectedKey={searchFilter.imageShape || 'square'}
                  onSelectionChange={(key) => {
                    if (!key || key === 'all') return
                    const selected = typeof key === 'string' ? key : Array.from(key as unknown as Set<string>)[0]
                    if (selected === 'square' || selected === 'landscape' || selected === 'portrait') {
                      setSearchFilter({ imageShape: selected })
                    }
                  }}
                  className="w-full"
                >
                  <Select.Trigger className="h-8 min-h-8 bg-white border border-gray-200 rounded-md px-2 shadow-none flex items-center justify-center">
                    <Select.Value className="text-xs">
                      {(value) => {
                        const iconMap: Record<string, string> = {
                          square: '/src/assets/icons/square_line.svg',
                          landscape: '/src/assets/icons/rectangle_line.svg',
                          portrait: '/src/assets/icons/rectangle_vertical_line.svg'
                        }
                        return <img src={iconMap[String(value)]} className="w-5 h-5" />
                      }}
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Popover className="border border-gray-200 shadow-lg rounded-xl p-1">
                    <ListBox>
                      {([
                        { id: 'square', icon: '/src/assets/icons/square_line.svg' },
                        { id: 'landscape', icon: '/src/assets/icons/rectangle_line.svg' },
                        { id: 'portrait', icon: '/src/assets/icons/rectangle_vertical_line.svg' }
                      ] as const).map((item) => (
                        <ListBox.Item
                          key={item.id}
                          id={item.id}
                          textValue={item.id}
                          className="rounded-lg px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black cursor-pointer"
                        >
                          <img src={item.icon} className="w-5 h-5" />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {(availableFilters.length > 0 || searchPresets.length > 0) && (
            <Dropdown>
              <Dropdown.Trigger>
                <span className="w-full flex items-center justify-center py-1 text-sf-text-secondary text-xl hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                  +
                </span>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="right top" className="min-w-[160px]">
                <Dropdown.Menu
                  onAction={(key) => {
                    const keyStr = String(key)
                    if (keyStr.startsWith('preset-')) {
                      const presetId = keyStr.replace('preset-', '')
                      const preset = searchPresets.find(p => p.id === presetId)
                      if (preset) setSearchFilter(preset.filter)
                    } else {
                      handleAddFilter(keyStr)
                    }
                  }}
                >
                  {availableFilters.map(filter => (
                    <Dropdown.Item key={filter.id} id={filter.id} textValue={filter.label}>
                      <Label>{filter.label}</Label>
                    </Dropdown.Item>
                  ))}
                  {searchPresets.length > 0 && availableFilters.length > 0 && (
                    <Separator />
                  )}
                  {searchPresets.length > 0 && (
                    <Dropdown.Section>
                      <Header>预设</Header>
                      {searchPresets.map(preset => (
                        <Dropdown.Item key={`preset-${preset.id}`} id={`preset-${preset.id}`} textValue={preset.name}>
                          <Label>{preset.name}</Label>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>

        {/* Right Info Area (History / Autocomplete) */}
        <div className="flex-1 pl-6 flex flex-col gap-1.5 pt-1">
          {searchSuggestions.map((sugg, idx) => {
            const isSelected = idx === selectedSuggestionIndex
            
            // Highlight text logic
            const matchLen = sugg.matchedPrefix.length
            const boldPart = sugg.text.substring(0, matchLen)
            const normalPart = sugg.text.substring(matchLen)

            return (
              <div
                key={idx}
                className={`flex items-center px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-gray-200/80' : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  const { tags, remarks, keyword } = parseSearchQuery(searchQuery)
                  if (sugg.type === 'prefix') {
                    useUIStore.getState().setSearchQuery(buildSearchQuery({ tags, remarks, keyword: sugg.text + ' ' }))
                  } else if (sugg.type === 'tag') {
                    const isChinese = keyword.trim().toLowerCase().startsWith('标签:')
                    const raw = `${isChinese ? '标签' : 'tag'}:${sugg.text}`
                    useUIStore.getState().setSearchQuery(buildSearchQuery({ tags: [...tags, raw], remarks, keyword: '' }))
                  }
                  useUIStore.getState().setSearchSuggestions([])
                  useUIStore.getState().setSelectedSuggestionIndex(-1)
                }}
              >
                <img 
                  src="/src/assets/icons/bookmark_fill.svg" 
                  className={`w-4 h-4 mr-3 ${isSelected ? 'opacity-100' : 'opacity-40'}`} 
                />
                <span className={`text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {sugg.type === 'tag' && <span className="opacity-50 mr-1">tag:</span>}
                  {boldPart && <span className="font-bold text-gray-900">{boldPart}</span>}
                  {normalPart}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[10px] text-gray-500 font-medium px-1.5 py-0.5 rounded">
                    Tab 补全
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </div>
      {/* Resizer Handle */}
      <div 
        className="h-3 w-full absolute -bottom-3 left-0 cursor-ns-resize z-50 wails-no-drag"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
      />
    </motion.div>
  )
}
