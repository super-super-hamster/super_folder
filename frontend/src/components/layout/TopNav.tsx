import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { Minimize, Maximize as AppMaximize, Close } from '../../../wailsjs/go/main/App'
import { WindowToggleMaximise, WindowIsMaximised } from '../../../wailsjs/runtime/runtime'
import { useRef, useState, useEffect } from 'react'
import { Checkbox } from '@heroui/react'
import DynamicBreadcrumb from './DynamicBreadcrumb'

export default function TopNav() {
  const { isSearchFocused, setSearchFocused, searchQuery, setSearchQuery, triggerRefresh, sortOption, setSortOption, recentSortOption, setRecentSortOption, isGrouped, setIsGrouped, isSearchPanelOpen, setSearchPanelOpen } = useUIStore()
  const { tabs, activeTabId, setActiveTab, addTab, removeTab, goBack, goForward } = useTabsStore()
  const [isMaximized, setIsMaximized] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false)
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

  return (
    <div className="flex items-center h-14 bg-white rounded-2xl shadow-sm border border-gray-100 wails-draggable px-4 shrink-0">
      <div className="flex items-center gap-1 wails-no-drag">
        <button 
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          onClick={goBack} 
          disabled={!activeTab || activeTab.historyIndex <= 0}
        >
          <img src="/src/assets/icons/left_line.svg" className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          onClick={goForward} 
          disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}
        >
          <img src="/src/assets/icons/right_line.svg" className="w-5 h-5 text-gray-700" />
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
          className={`flex items-center bg-[#e8e8e8] rounded-full p-1 overflow-x-auto overflow-y-hidden no-scrollbar transition-colors duration-200 ease-out group/tabs ${(isSearchFocused || isSearchPanelOpen) ? 'w-auto shrink-0' : 'flex-1 min-w-0'}`}
        >
          <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              if ((isSearchFocused || isSearchPanelOpen) && !isActive) return null

              return (
                <motion.div
                  key={tab.id}
                  layout
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={(isSearchFocused || isSearchPanelOpen) ? { opacity: 0, width: 0, transition: { duration: 0 } } : { opacity: 0, width: 0 }}
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
          {!(isSearchFocused || isSearchPanelOpen) && (
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
          className={`relative flex items-center bg-[#e8e8e8] rounded-full focus-within:ring-2 ring-gray-200 px-3 py-1.5 transition-colors duration-200 ease-out ${(isSearchFocused || isSearchPanelOpen) ? 'flex-1 min-w-0' : 'w-[100px] shrink-0'}`}
        >
          {(isSearchFocused || isSearchPanelOpen) && (
            <img 
              src={isSearchPanelOpen ? "/src/assets/icons/up_line.svg" : "/src/assets/icons/down_line.svg"} 
              className="w-4 h-4 mr-2 text-gray-500 cursor-pointer shrink-0 hover:opacity-80 transition-opacity" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setSearchPanelOpen(!isSearchPanelOpen)
              }}
            />
          )}
          <input
            id="search-input"
            className="flex-1 w-full bg-transparent border-none outline-none text-sm placeholder-gray-500 text-gray-800"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!isSearchPanelOpen) setSearchPanelOpen(true)
            }}
            onFocus={() => {
              setSearchFocused(true)
              setSearchPanelOpen(true)
            }}
            onBlur={() => setSearchFocused(false)}
          />
          <img src="/src/assets/icons/search_line.svg" className="w-4 h-4 ml-2 text-gray-600 shrink-0" />
        </motion.div>
      </div>

      {/* Right Controls Area - NEVER CHANGES SIZE */}
      <div className="flex items-center gap-3 wails-no-drag shrink-0">
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
                      </>
                    )
                  })()}
                  <div className="h-px bg-gray-200/50 my-1 mx-2"></div>
                  <div className="flex items-center px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setIsGrouped(!isGrouped)}>
                    <Checkbox 
                      isSelected={isGrouped} 
                      onChange={setIsGrouped} 
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

        <button onClick={triggerRefresh} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <img src="/src/assets/icons/refresh_2_line.svg" className="w-4 h-4 text-gray-700" />
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
