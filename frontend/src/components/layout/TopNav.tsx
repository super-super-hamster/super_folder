import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { Minimize, Maximize as AppMaximize, Close, GetGlobalTags } from '../../../wailsjs/go/main/App'
import { WindowToggleMaximise, WindowIsMaximised } from '../../../wailsjs/runtime/runtime'
import { useRef, useState, useEffect } from 'react'
import { Checkbox } from '@heroui/react'
import DynamicBreadcrumb from './DynamicBreadcrumb'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import upAnim from '../../assets/anim/up.json'
import downAnim from '../../assets/anim/down.json'
import leftAnim from '../../assets/anim/left.json'
import rightAnim from '../../assets/anim/right.json'
import refreshAnim from '../../assets/anim/refresh.json'

const AnimatedClickIcon = ({ animData, className }: { animData: any, className?: string }) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current?.parentElement
    if (!parent) return

    const handleClick = () => {
      lottieRef.current?.goToAndPlay(0, true)
    }

    parent.addEventListener('click', handleClick)
    return () => parent.removeEventListener('click', handleClick)
  }, [animData])

  return (
    <div ref={containerRef} className={className || "w-full h-full pointer-events-none flex items-center justify-center"}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animData}
        loop={false}
        autoplay={false}
      />
    </div>
  )
}

export default function TopNav() {
  const { 
    isSearchFocused, setSearchFocused, 
    searchQuery, setSearchQuery, 
    triggerRefresh, 
    sortOption, setSortOption, 
    recentSortOption, setRecentSortOption, 
    isGrouped, setIsGrouped, 
    isSearchPanelOpen, setSearchPanelOpen,
    searchSuggestions, setSearchSuggestions,
    selectedSuggestionIndex, setSelectedSuggestionIndex,
    availableTags, setAvailableTags,
    viewMode, setViewMode
  } = useUIStore()
  
  const { tabs, activeTabId, setActiveTab, addTab, removeTab, goBack, goForward } = useTabsStore()

  useEffect(() => {
    GetGlobalTags().then((res) => {
      if (res) {
        setAvailableTags(res.map(t => t.name))
      }
    }).catch(e => console.error(e))
  }, [])

  let parsedKeyword = searchQuery
  const parsedTags: string[] = []
  if (parsedKeyword.toLowerCase().includes('tag:')) {
    const parts = parsedKeyword.split('&')
    if (parts.length > 1) {
      parts.forEach(p => {
        const m = p.match(/tag:([^&\s]+)/i)
        if (m) parsedTags.push(`tag:${m[1]}`)
      })
      parsedKeyword = parsedKeyword.replace(/tag:([^&\s]+)/gi, '').replace(/&/g, '').trimStart()
    } else {
      const m = parsedKeyword.match(/tag:([^\s]+)/gi)
      if (m) {
        m.forEach(t => parsedTags.push(t))
        parsedKeyword = parsedKeyword.replace(/tag:([^\s]+)/gi, '').trimStart()
      }
    }
  }
  const tags = parsedTags
  const inputValue = parsedKeyword

  const updateSearchQuery = (newTags: string[], newKeyword: string) => {
    const query = newTags.length > 0 
      ? newTags.join(' & ') + (newKeyword ? ' ' + newKeyword : '')
      : newKeyword
    setSearchQuery(query)
  }

  const handleRemoveTag = (index: number) => {
    const newTags = [...tags]
    newTags.splice(index, 1)
    updateSearchQuery(newTags, inputValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    let newKeyword = val
    let newTags = [...tags]

    const tagMatch = val.match(/(tag:[^\s]+)\s$/i)
    if (tagMatch) {
      newTags.push(tagMatch[1])
      newKeyword = val.replace(tagMatch[1] + ' ', '')
    }

    updateSearchQuery(newTags, newKeyword)

    const typed = newKeyword.trim().toLowerCase()
    let suggestions: any[] = []
    
    if (typed === 't' || typed === 'ta' || typed === 'tag') {
      suggestions.push({ type: 'prefix', text: 'tag:', matchedPrefix: typed })
    } else if (typed.startsWith('tag:')) {
      const tagPrefix = typed.slice(4)
      const matches = availableTags.filter(t => t.toLowerCase().includes(tagPrefix))
      suggestions = matches.map(t => ({ type: 'tag', text: t, matchedPrefix: tagPrefix }))
    }
    
    setSearchSuggestions(suggestions)
    setSelectedSuggestionIndex(suggestions.length > 0 ? 0 : -1)

    if (!isSearchPanelOpen) setSearchPanelOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      handleRemoveTag(tags.length - 1)
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      setSearchPanelOpen(false)
      e.currentTarget.blur()
      return
    }

    if (searchSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex(Math.min(selectedSuggestionIndex + 1, searchSuggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex(Math.max(selectedSuggestionIndex - 1, 0))
      } else if (e.key === 'Tab') {
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < searchSuggestions.length) {
          e.preventDefault()
          const sugg = searchSuggestions[selectedSuggestionIndex]
          if (sugg.type === 'prefix') {
            updateSearchQuery(tags, 'tag:')
          } else if (sugg.type === 'tag') {
            const newTags = [...tags, `tag:${sugg.text}`]
            updateSearchQuery(newTags, '')
          }
          setSearchSuggestions([])
          setSelectedSuggestionIndex(-1)
        }
      }
    }
  }

  const [isMaximized, setIsMaximized] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const viewMenuRef = useRef<HTMLDivElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false)
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!(window as any).runtime) return;
    const updateMaximizedState = async () => {
      try {
        const isMax = await WindowIsMaximised()
        setIsMaximized(isMax)
      } catch (e) {}
    }
    
    updateMaximizedState()
    // Retry after a short delay to handle Wails initial load quirks
    setTimeout(updateMaximizedState, 100)
    setTimeout(updateMaximizedState, 500)
    
    window.addEventListener('resize', updateMaximizedState)
    return () => window.removeEventListener('resize', updateMaximizedState)
  }, [])
  
  const handleMaximize = () => {
    if ((window as any).runtime) {
      WindowToggleMaximise()
      setIsMaximized(!isMaximized)
    } else {
      AppMaximize()
    }
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isSearchActive = isSearchFocused || isSearchPanelOpen || searchQuery !== ''

  return (
    <div className="flex items-center h-14 bg-white rounded-2xl shadow-sm border border-gray-100 wails-draggable px-4 shrink-0">
      <div className="flex items-center gap-1 wails-no-drag">
        <button 
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          onClick={goBack} 
          disabled={!activeTab || activeTab.historyIndex <= 0}
        >
          <AnimatedClickIcon animData={leftAnim} className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          onClick={goForward} 
          disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}
        >
          <AnimatedClickIcon animData={rightAnim} className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Middle Flexible Area */}
      <div className="flex flex-1 items-center mx-4 gap-4 overflow-hidden">
        <motion.div 
          ref={tabsContainerRef}
          layout
          onWheel={(e) => {
            if (tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY
            }
          }}
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          className={`flex items-center bg-[#e8e8e8] rounded-full p-1 overflow-x-auto overflow-y-hidden no-scrollbar transition-colors duration-200 ease-out group/tabs ${isSearchActive ? 'w-auto shrink-0' : 'flex-1 min-w-0'}`}
        >
          <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              if (isSearchActive && !isActive) return null

              return (
                <motion.div
                  key={tab.id}
                  layout
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={isSearchActive ? { opacity: 0, width: 0, transition: { duration: 0 } } : { opacity: 0, width: 0 }}
                  transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                  className={`relative flex items-center transition-colors whitespace-nowrap group ${
                    isActive ? 'flex-shrink-0 max-w-full active-tab-wrapper' : 'flex-shrink-0 px-3 py-1 rounded-full hover:bg-gray-200/50 text-gray-600'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {isActive ? (
                    <div className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-full px-3 py-1 flex items-center shrink min-w-0 max-w-full font-medium text-gray-900 relative z-10">
                      <img src="/src/assets/icons/folder_line.svg" className="w-4 h-4 mr-2 opacity-70 shrink-0" alt="Folder" />
                      <div className="text-sm tracking-wider flex items-center h-full shrink min-w-0">
                        <DynamicBreadcrumb path={tab.currentPath || tab.title} />
                      </div>
                      
                      {tabs.length > 1 && (
                        <button
                          className="ml-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 rounded-full hover:bg-gray-100 p-0.5 transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTab(tab.id)
                          }}
                        >
                          <img src="/src/assets/icons/close_line.svg" className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 flex items-center">
                      <img src="/src/assets/icons/folder_line.svg" className="w-4 h-4 mr-2 opacity-70" alt="Folder" />
                      <div className="text-sm tracking-wider flex items-center h-full flex-1 min-w-0">
                        {(() => {
                          const parts = tab.title.replace(/\\$/, '').split('\\')
                          if (parts.length > 3) {
                            return '... > ' + parts.slice(-2).join(' > ')
                          }
                          return tab.title.replace(/\\/g, ' > ').replace(/ > $/, '')
                        })()}
                      </div>
                    </div>
                  )}
                  
                </motion.div>
              )
            })}
          </AnimatePresence>
          {!isSearchActive && (
            <button 
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-300/50 ml-1 shrink-0 transition-colors opacity-0 group-hover/tabs:opacity-100"
              onClick={() => addTab('C:\\')}
            >
              <img src="/src/assets/icons/add_line.svg" className="w-4 h-4 opacity-70" />
            </button>
          )}
        </motion.div>

        {/* Search Box */}
        <motion.div
          id="search-container"
          layout
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          className={`relative flex items-center bg-[#e8e8e8] rounded-full focus-within:ring-2 ring-gray-200 px-3 py-1.5 transition-colors duration-200 ease-out wails-no-drag ${isSearchActive ? 'flex-1 min-w-0' : 'w-[100px] shrink-0'}`}
        >
          {isSearchActive && (
            <div 
              className="w-4 h-4 mr-2 cursor-pointer shrink-0 hover:opacity-80 transition-opacity flex items-center justify-center" 
              onClick={() => setSearchPanelOpen(!isSearchPanelOpen)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <AnimatedClickIcon animData={isSearchPanelOpen ? upAnim : downAnim} className="w-4 h-4 text-gray-500" />
            </div>
          )}
          
          {tags.map((t, index) => (
            <span key={index} className="flex items-center bg-gray-500 text-white rounded-full pl-2.5 pr-1.5 py-0.5 text-xs mr-1.5 shrink-0 shadow-sm font-medium">
              {t}
              <button 
                onClick={() => handleRemoveTag(index)} 
                className="ml-1 opacity-70 hover:opacity-100 outline-none flex items-center justify-center p-0.5 rounded-full hover:bg-gray-600 transition-colors"
              >
                <img src="/src/assets/icons/close_line.svg" className="w-2.5 h-2.5 brightness-0 invert" />
              </button>
            </span>
          ))}

          <input
            id="search-input"
            className="flex-1 w-full min-w-[50px] bg-transparent border-none outline-none text-sm placeholder-gray-500 text-gray-800"
            placeholder={tags.length > 0 ? "" : "搜索..."}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setSearchFocused(true)
              setSearchPanelOpen(true)
            }}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery && (
            <img 
              src="/src/assets/icons/close_line.svg" 
              className="w-3.5 h-3.5 mx-1 text-gray-400 cursor-pointer hover:opacity-80 shrink-0" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchQuery('')
                setSearchPanelOpen(false)
              }}
            />
          )}
          <img src="/src/assets/icons/search_line.svg" className="w-4 h-4 ml-1 text-gray-600 shrink-0" />
        </motion.div>
      </div>

      {/* Right Controls Area - NEVER CHANGES SIZE */}
      <div className="flex items-center gap-3 wails-no-drag shrink-0">
        <div className="relative shrink-0" ref={viewMenuRef}>
          <button 
            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)} 
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            title="视图选项"
          >
            <img src="/src/assets/icons/eye_line.svg" className="w-4 h-4 text-gray-700" />
          </button>
          <AnimatePresence>
            {isViewMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-32 bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-lg z-50 overflow-hidden"
              >
                <div className="py-1">
                  <button onClick={() => { setViewMode('grid'); setIsViewMenuOpen(false) }} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${viewMode === 'grid' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                    <img src="/src/assets/icons/apps-2-line.svg" className="w-4 h-4 mr-3" /> 网格显示
                  </button>
                  <button onClick={() => { setViewMode('list'); setIsViewMenuOpen(false) }} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${viewMode === 'list' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                    <img src="/src/assets/icons/list_check_line.svg" className="w-4 h-4 mr-3" /> 列表显示
                  </button>
                  <div className="h-px bg-gray-200/50 my-1 mx-2"></div>
                  <div className="flex items-center px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => { setIsGrouped(!isGrouped); setIsViewMenuOpen(false); }}>
                    <Checkbox 
                      isSelected={isGrouped} 
                      onChange={(val) => { setIsGrouped(val); setIsViewMenuOpen(false); }} 
                    >
                      <Checkbox.Content>
                        <Checkbox.Control className="w-[18px] h-[18px] shadow-none border-2 border-gray-400 data-[selected=true]:border-blue-500 rounded-full">
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <span className="text-sm text-gray-700 select-none">启用分组</span>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative shrink-0" ref={sortMenuRef}>
          <button 
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} 
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            {(() => {
              const currentSortOption = activeTab?.currentPath === 'recent://' ? recentSortOption : sortOption
              if (currentSortOption === 'name_asc') return <img src="/src/assets/icons/AZ_sort_ascending_letters_line.svg" className="w-4 h-4 text-gray-700" />
              if (currentSortOption === 'name_desc') return <img src="/src/assets/icons/ZA_sort_descending_letters_line.svg" className="w-4 h-4 text-gray-700" />
              if (currentSortOption === 'time_desc') return <img src="/src/assets/icons/sort_by_time_down.svg" className="w-4 h-4 text-gray-700" />
              if (currentSortOption === 'time_asc') return <img src="/src/assets/icons/sort_by_time_up.svg" className="w-4 h-4 text-gray-700" />
              if (currentSortOption === 'size_desc') return <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 text-gray-700" />
              if (currentSortOption === 'size_asc') return <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 text-gray-700" />
              return null
            })()}
          </button>
          
          <AnimatePresence>
            {isSortMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-lg z-50 overflow-hidden"
              >
                <div className="py-1">
                  {(() => {
                    const currentSortOption = activeTab?.currentPath === 'recent://' ? recentSortOption : sortOption
                    const handleSetSortOption = (opt: any) => {
                      if (activeTab?.currentPath === 'recent://') {
                        setRecentSortOption(opt)
                      } else {
                        setSortOption(opt)
                      }
                      setIsSortMenuOpen(false)
                    }
                    return (
                      <>
                        <button onClick={() => handleSetSortOption('name_asc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'name_asc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/AZ_sort_ascending_letters_line.svg" className="w-4 h-4 mr-3" /> 按名称 (A-Z)
                        </button>
                        <button onClick={() => handleSetSortOption('name_desc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'name_desc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/ZA_sort_descending_letters_line.svg" className="w-4 h-4 mr-3" /> 按名称 (Z-A)
                        </button>
                        <div className="h-px bg-gray-200/50 my-1 mx-2"></div>
                        <button onClick={() => handleSetSortOption('time_desc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'time_desc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/sort_by_time_down.svg" className="w-4 h-4 mr-3" /> 按时间 (从新到旧)
                        </button>
                        <button onClick={() => handleSetSortOption('time_asc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'time_asc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/sort_by_time_up.svg" className="w-4 h-4 mr-3" /> 按时间 (从旧到新)
                        </button>
                        <div className="h-px bg-gray-200/50 my-1 mx-2"></div>
                        <button onClick={() => handleSetSortOption('size_desc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'size_desc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 mr-3" /> 按大小 (从大到小)
                        </button>
                        <button onClick={() => handleSetSortOption('size_asc')} className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${currentSortOption === 'size_asc' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                          <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 mr-3" /> 按大小 (从小到大)
                        </button>
                      </>
                    )
                  })()}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={triggerRefresh} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <AnimatedClickIcon animData={refreshAnim} className="w-4 h-4 text-gray-700" />
        </button>
        
        <div className="w-[1px] h-4 bg-gray-300 mx-1 shrink-0"></div>

        <div className="flex items-center gap-1 text-gray-600 shrink-0">
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" onClick={() => Minimize()}>
            <img src="/src/assets/icons/minimize_line.svg" className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" onClick={handleMaximize}>
            <img src={isMaximized ? "/src/assets/icons/fullscreen_exit_line.svg" : "/src/assets/icons/fullscreen_line.svg"} className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500 hover:text-white transition-colors" onClick={() => Close()}>
            <img src="/src/assets/icons/close_line.svg" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
