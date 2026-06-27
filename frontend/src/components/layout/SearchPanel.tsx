import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@heroui/react'

export default function SearchPanel() {
  const { searchFilter, setSearchFilter, isSearchPanelOpen, searchSuggestions, selectedSuggestionIndex, searchQuery, searchPanelHeight, setSearchPanelHeight } = useUIStore()
  const { searchPresets } = useSettingsStore()
  const [isResizing, setIsResizing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isAddingExt, setIsAddingExt] = useState(false)
  const [extInput, setExtInput] = useState('')
  const [isAddingExclude, setIsAddingExclude] = useState(false)
  const [excludeInput, setExcludeInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAdding(false)
      }
    }
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

    document.addEventListener('mousedown', handleClickOutside)
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setSearchPanelHeight])

  const availableFilters = []
  if (!searchFilter.isCaseSensitive) availableFilters.push({ id: 'case', label: '区分大小写' })
  if (!searchFilter.isRegex) availableFilters.push({ id: 'regex', label: '正则表达式' })
  if (!searchFilter.isExcludeFolder) availableFilters.push({ id: 'exclude_folder', label: '排除文件夹' })
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
    setIsAdding(false)
  }

  const handleRemoveFilter = (id: string) => {
    if (id === 'case') setSearchFilter({ isCaseSensitive: false })
    if (id === 'regex') setSearchFilter({ isRegex: false })
    if (id === 'file' || id === 'folder') setSearchFilter({ type: 'all', extensions: [] })
    if (id === 'exclude_folder') setSearchFilter({ isExcludeFolder: false, excludedFolders: [] })
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
        <div className="w-[200px] border-r border-gray-300 pr-6 flex flex-col gap-3">
          
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
                    <button onClick={() => setIsAddingExt(true)} className="opacity-70 hover:opacity-100 text-[#1e3a8a] text-lg leading-none transition-colors">
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
                    <button onClick={() => setIsAddingExclude(true)} className="opacity-70 hover:opacity-100 text-[#1e3a8a] text-lg leading-none transition-colors">
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
          </AnimatePresence>

          {(availableFilters.length > 0 || searchPresets.length > 0) && (
            <div className="relative flex justify-center mt-1" ref={menuRef}>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="w-full flex items-center justify-center py-1 text-[#1e3a8a] text-xl hover:bg-gray-50 rounded-lg transition-colors"
              >
                +
              </button>
              
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-full top-0 ml-4 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="flex flex-col p-1 max-h-48 overflow-y-auto">
                      {availableFilters.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => handleAddFilter(filter.id)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#f0f4f8] hover:text-[#1e3a8a] rounded-lg transition-colors"
                        >
                          {filter.label}
                        </button>
                      ))}
                      {searchPresets.length > 0 && (
                        <>
                          {availableFilters.length > 0 && (
                            <div className="h-px bg-gray-200 mx-2 my-1" />
                          )}
                          <div className="px-3 py-1 text-[10px] text-gray-400 font-medium uppercase tracking-wider">预设</div>
                          {searchPresets.map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setSearchFilter(preset.filter)
                                setIsAdding(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#f0f4f8] hover:text-[#1e3a8a] rounded-lg transition-colors"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                  let newQuery = searchQuery
                  if (sugg.type === 'prefix') {
                    // Quick replace for tag:
                    newQuery = searchQuery.replace(new RegExp(sugg.matchedPrefix + '$', 'i'), 'tag:')
                  } else {
                    newQuery = searchQuery.replace(new RegExp('tag:' + sugg.matchedPrefix + '$', 'i'), `tag:${sugg.text} `)
                  }
                  useUIStore.getState().setSearchQuery(newQuery)
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
