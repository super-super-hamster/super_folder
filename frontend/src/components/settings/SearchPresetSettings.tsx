import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, SearchPreset } from '../../store/settingsStore'

const SearchPresetSettings = () => {
  const { searchPresets, setSearchPresets } = useSettingsStore()
  const [isCreating, setIsCreating] = useState(false)
  const [presetName, setPresetName] = useState('')
  
  // Filter state for new preset
  const [filterState, setFilterState] = useState({
    isCaseSensitive: false,
    isRegex: false,
    type: 'all' as 'all' | 'file' | 'folder',
    extensions: [] as string[],
    isExcludeFolder: false,
    excludedFolders: [] as string[]
  })

  const [isAddingFilter, setIsAddingFilter] = useState(false)
  const [isAddingExt, setIsAddingExt] = useState(false)
  const [extInput, setExtInput] = useState('')
  const [isAddingExclude, setIsAddingExclude] = useState(false)
  const [excludeInput, setExcludeInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAddingFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const availableFilters = []
  if (!filterState.isCaseSensitive) availableFilters.push({ id: 'case', label: '区分大小写' })
  if (!filterState.isRegex) availableFilters.push({ id: 'regex', label: '正则表达式' })
  if (!filterState.isExcludeFolder) availableFilters.push({ id: 'exclude_folder', label: '排除文件夹' })
  if (filterState.type === 'all') {
    availableFilters.push({ id: 'file', label: '仅文件' })
    availableFilters.push({ id: 'folder', label: '仅文件夹' })
  }

  const handleAddFilter = (id: string) => {
    if (id === 'case') setFilterState(p => ({ ...p, isCaseSensitive: true }))
    if (id === 'regex') setFilterState(p => ({ ...p, isRegex: true }))
    if (id === 'file') setFilterState(p => ({ ...p, type: 'file' }))
    if (id === 'folder') setFilterState(p => ({ ...p, type: 'folder' }))
    if (id === 'exclude_folder') setFilterState(p => ({ ...p, isExcludeFolder: true }))
    setIsAddingFilter(false)
  }

  const handleRemoveFilter = (id: string) => {
    if (id === 'case') setFilterState(p => ({ ...p, isCaseSensitive: false }))
    if (id === 'regex') setFilterState(p => ({ ...p, isRegex: false }))
    if (id === 'file' || id === 'folder') setFilterState(p => ({ ...p, type: 'all', extensions: [] }))
    if (id === 'exclude_folder') setFilterState(p => ({ ...p, isExcludeFolder: false, excludedFolders: [] }))
  }

  const submitExt = () => {
    if (extInput.trim()) {
      const newExts = extInput.split(',').map(e => {
        let ext = e.trim()
        if (ext && !ext.startsWith('.')) ext = '.' + ext
        return ext
      }).filter(e => e)
      
      const uniqueExts = Array.from(new Set([...filterState.extensions, ...newExts]))
      setFilterState(p => ({ ...p, extensions: uniqueExts }))
      setExtInput('')
    }
    setIsAddingExt(false)
  }

  const submitExclude = () => {
    if (excludeInput.trim()) {
      const newExcludes = excludeInput.split(',').map(e => e.trim()).filter(e => e)
      const uniqueExcludes = Array.from(new Set([...filterState.excludedFolders, ...newExcludes]))
      setFilterState(p => ({ ...p, excludedFolders: uniqueExcludes }))
      setExcludeInput('')
    }
    setIsAddingExclude(false)
  }

  const handleRemoveExtension = (extToRemove: string) => {
    setFilterState(p => ({ ...p, extensions: p.extensions.filter(e => e !== extToRemove) }))
  }

  const handleRemoveExclude = (folderToRemove: string) => {
    setFilterState(p => ({ ...p, excludedFolders: p.excludedFolders.filter(f => f !== folderToRemove) }))
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filter: {
        isCaseSensitive: filterState.isCaseSensitive,
        isRegex: filterState.isRegex,
        type: filterState.type,
        extensions: filterState.extensions,
        isExcludeFolder: filterState.isExcludeFolder,
        excludedFolders: filterState.excludedFolders
      }
    }

    setSearchPresets([...searchPresets, newPreset])
    setIsCreating(false)
    setPresetName('')
    setFilterState({
      isCaseSensitive: false,
      isRegex: false,
      type: 'all',
      extensions: [],
      isExcludeFolder: false,
      excludedFolders: []
    })
  }

  const handleRemovePreset = (id: string) => {
    setSearchPresets(searchPresets.filter(p => p.id !== id))
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">搜索预设</h2>
      </div>

      <div className="flex flex-col gap-2">
        {searchPresets.length === 0 && !isCreating && (
          <div className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-xl">
            暂无预设
          </div>
        )}
        
        {searchPresets.map(preset => (
          <div key={preset.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl group">
            <span className="text-sm font-medium text-gray-800">{preset.name}</span>
            <button 
              onClick={() => handleRemovePreset(preset.id)}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all text-gray-400 hover:text-red-500"
              title="删除预设"
            >
              <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 opacity-50" alt="删除" />
            </button>
          </div>
        ))}

        <AnimatePresence>
          {isCreating ? (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 bg-gray-50 rounded-xl p-5 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">预设名称</span>
                <input 
                  type="text"
                  autoFocus
                  placeholder="例如：全部图片" 
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-lg outline-none focus:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all placeholder-gray-400"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">匹配规则</span>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {filterState.type === 'file' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#e4e4e4] rounded-xl px-4 py-2 flex items-start flex-col relative group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-gray-800 font-medium">仅文件</span>
                          <button onClick={() => handleRemoveFilter('file')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                            <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="w-full h-px bg-gray-200 my-2"></div>
                        {filterState.extensions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 w-full">
                            {filterState.extensions.map(ext => (
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
                            <input 
                              autoFocus
                              value={extInput} 
                              onChange={e => setExtInput(e.target.value)} 
                              onKeyDown={e => { if (e.key === 'Enter') submitExt() }}
                              onBlur={submitExt}
                              placeholder="请输入扩展名"
                              className="w-24 text-xs px-2 py-1 rounded bg-white border border-gray-200 outline-none text-gray-700"
                            />
                          ) : (
                            <button onClick={() => setIsAddingExt(true)} className="opacity-70 hover:opacity-100 text-[#1e3a8a] text-lg leading-none transition-colors">
                              +
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {filterState.type === 'folder' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#e4e4e4] rounded-xl px-4 py-2 flex items-center justify-between relative group"
                      >
                        <span className="text-sm text-gray-800">仅文件夹</span>
                        <button onClick={() => handleRemoveFilter('folder')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                          <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                        </button>
                      </motion.div>
                    )}

                    {filterState.isExcludeFolder && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#e4e4e4] rounded-xl px-4 py-2 flex items-start flex-col relative group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-gray-800 font-medium">排除文件夹</span>
                          <button onClick={() => handleRemoveFilter('exclude_folder')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                            <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="w-full h-px bg-gray-200 my-2"></div>
                        {filterState.excludedFolders.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 w-full">
                            {filterState.excludedFolders.map(folder => (
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
                            <input 
                              autoFocus
                              value={excludeInput} 
                              onChange={e => setExcludeInput(e.target.value)} 
                              onKeyDown={e => { if (e.key === 'Enter') submitExclude() }}
                              onBlur={submitExclude}
                              placeholder="逗号分隔"
                              className="w-24 text-xs px-2 py-1 rounded bg-white border border-gray-200 outline-none text-gray-700"
                            />
                          ) : (
                            <button onClick={() => setIsAddingExclude(true)} className="opacity-70 hover:opacity-100 text-[#1e3a8a] text-lg leading-none transition-colors">
                              +
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {filterState.isCaseSensitive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#e4e4e4] rounded-xl px-4 py-2 flex items-center justify-between relative group"
                      >
                        <span className="text-sm text-gray-800">区分大小写</span>
                        <button onClick={() => handleRemoveFilter('case')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                          <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                        </button>
                      </motion.div>
                    )}

                    {filterState.isRegex && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#e4e4e4] rounded-xl px-4 py-2 flex items-center justify-between relative group"
                      >
                        <span className="text-sm text-gray-800">正则表达式</span>
                        <button onClick={() => handleRemoveFilter('regex')} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                          <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {availableFilters.length > 0 && (
                    <div className="relative flex justify-start mt-1 w-full" ref={menuRef}>
                      <button 
                        onClick={() => setIsAddingFilter(!isAddingFilter)}
                        className="w-full flex items-center justify-center py-1 text-gray-600 text-xl bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors"
                      >
                        +
                      </button>
                      
                      <AnimatePresence>
                        {isAddingFilter && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                          >
                            <div className="flex flex-col p-1">
                              {availableFilters.map(filter => (
                                <button
                                  key={filter.id}
                                  onClick={() => handleAddFilter(filter.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#f0f4f8] hover:text-[#1e3a8a] rounded-lg transition-colors"
                                >
                                  {filter.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2 mt-2">
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="px-5 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors hover:bg-gray-300"
                >
                  取消
                </button>
                <button 
                  onClick={handleSavePreset} 
                  disabled={!presetName.trim()}
                  className="px-5 py-2 bg-green-500 text-white text-sm font-medium rounded-xl transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存预设
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2"
            >
              <button 
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center py-3 text-gray-500 hover:text-[#1e3a8a] hover:bg-gray-50 rounded-xl transition-colors border border-dashed border-gray-300 hover:border-[#1e3a8a]/50"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SearchPresetSettings
