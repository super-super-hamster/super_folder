import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore, type SortOption } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { useTagStore, generateColorFromName } from '../../store/tagStore'
import { Minimize, Maximize as AppMaximize, Close, GetGlobalTags, InspectPathForNavigation } from '../../../wailsjs/go/main/App'
import { WindowToggleMaximise, WindowIsMaximised } from '../../../wailsjs/runtime/runtime'
import { useRef, useState, useEffect } from 'react'
import { useTooltipState } from '../../utils/useTooltipState'
import { Checkbox, Dropdown, Separator, Spinner, Tooltip } from '@heroui/react'
import DynamicBreadcrumb from './DynamicBreadcrumb'
import { parseSearchQuery, buildSearchQuery } from '../../utils/searchQuery'
import { models } from '../../../wailsjs/go/models'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import leftAnim from '../../assets/anim/left.json'
import rightAnim from '../../assets/anim/right.json'
import refreshAnim from '../../assets/anim/refresh.json'

const AnimatedClickIcon = ({ animData, className, autoPlayCount }: { animData: any, className?: string, autoPlayCount?: number }) => {
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

  useEffect(() => {
    if (autoPlayCount && autoPlayCount > 0) {
      lottieRef.current?.goToAndPlay(0, true)
    }
  }, [autoPlayCount])

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

const normalizeLocalPathInput = (value: string) => value.trim().replace(/\//g, '\\')

const isLikelyAbsoluteLocalPath = (value: string) => {
  const path = normalizeLocalPathInput(value)
  if (/^[a-zA-Z]:\\$/.test(path)) return true
  if (/^[a-zA-Z]:\\.+/.test(path)) return true
  return /^\\\\[^\\]+\\[^\\]+(?:\\.*)?$/.test(path)
}

const getParentPath = (path: string) => {
  const normalized = normalizeLocalPathInput(path).replace(/\\+$/, '')
  const driveRootMatch = normalized.match(/^[a-zA-Z]:$/)
  if (driveRootMatch) return `${normalized}\\`
  const lastSlash = normalized.lastIndexOf('\\')
  if (lastSlash <= 2 && /^[a-zA-Z]:/.test(normalized)) return normalized.slice(0, 3)
  if (lastSlash <= 1) return normalized
  return normalized.slice(0, lastSlash)
}

export default function TopNav() {
  const viewTp = useTooltipState(200)
  const minTp = useTooltipState(200)
  const { globalTags: allGlobalTags } = useTagStore()
  const { 
    isSearchFocused, setSearchFocused, 
    searchQuery, setSearchQuery, 
    triggerRefresh, 
    refreshAnimationCount,
    sortOption, setSortOption, 
    recentSortOption, setRecentSortOption, 
    isGrouped, setIsGrouped, 
    isSearchPanelOpen, setSearchPanelOpen,
    isSearchLoading,
    searchSuggestions, setSearchSuggestions,
    selectedSuggestionIndex, setSelectedSuggestionIndex,
    availableTags, setAvailableTags,
    viewMode, setViewMode
  } = useUIStore()

  const [globalTags, setGlobalTags] = useState<models.Tag[]>([])
  const [pathLookupMessage, setPathLookupMessage] = useState('')
  const lastPathLookupRef = useRef('')
  
  const { tabs, activeTabId, setActiveTab, addTab, removeTab, goBack, goForward } = useTabsStore()

  useEffect(() => {
    if (allGlobalTags && allGlobalTags.length > 0) {
      setGlobalTags(allGlobalTags)
      setAvailableTags(allGlobalTags.map(t => t.name))
      return
    }
    GetGlobalTags().then((res) => {
      if (res) {
        setGlobalTags(res)
        setAvailableTags(res.map(t => t.name))
      }
    }).catch(e => console.error(e))
  }, [allGlobalTags])

  const { tags, remarks, keyword: inputValue } = parseSearchQuery(searchQuery)
  const chips = [...tags, ...remarks]

  const updateSearchQuery = (parts: { tags?: string[]; remarks?: string[]; keyword?: string }) => {
    setSearchQuery(buildSearchQuery({ tags, remarks, ...parts }))
  }

  const handleRemoveChip = (index: number) => {
    const newTags = [...tags]
    const newRemarks = [...remarks]
    if (index < tags.length) {
      newTags.splice(index, 1)
    } else {
      newRemarks.splice(index - tags.length, 1)
    }
    updateSearchQuery({ tags: newTags, remarks: newRemarks, keyword: inputValue })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPathLookupMessage('')
    setSearchQuery(buildSearchQuery({ tags, remarks, keyword: val }))

    const { keyword: remaining } = parseSearchQuery(val)
    const typed = remaining.trim().toLowerCase()
    let suggestions: any[] = []

    const prefixOptions = [
      { key: 'tag:', label: 'tag:' },
      { key: '标签:', label: '标签:' },
      { key: '备注:', label: '备注:' },
      { key: 'note:', label: 'note:' }
    ]

    if (typed === '' || prefixOptions.some(p => p.key.startsWith(typed))) {
      suggestions = prefixOptions
        .filter(p => typed === '' || p.key.startsWith(typed))
        .map(p => ({ type: 'prefix', text: p.label, matchedPrefix: typed }))
    } else if (typed.startsWith('tag:') || typed.startsWith('标签:')) {
      const isChinese = typed.startsWith('标签:')
      const prefixLen = isChinese ? 3 : 4
      const tagPrefix = typed.slice(prefixLen)

      if (tagPrefix.includes(':')) {
        const typePart = tagPrefix.split(':')[0]
        const rest = tagPrefix.slice(typePart.length + 1)
        const matched = globalTags.filter(t => t.type === typePart && t.name.toLowerCase().includes(rest.toLowerCase()))
        const typeNames = Array.from(new Set(matched.map(t => t.name)))
        suggestions = [
          ...(rest === '' ? [{ type: 'tag', text: `${typePart}:*`, matchedPrefix: tagPrefix }] : []),
          ...typeNames.map(n => ({ type: 'tag', text: `${typePart}:${n}`, matchedPrefix: tagPrefix }))
        ]
      } else {
        const matches = availableTags.filter(t => t.toLowerCase().includes(tagPrefix))
        suggestions = matches.map(t => ({ type: 'tag', text: t, matchedPrefix: tagPrefix }))
      }
    }

    setSearchSuggestions(suggestions)
    setSelectedSuggestionIndex(suggestions.length > 0 ? 0 : -1)

    if (!isSearchPanelOpen) setSearchPanelOpen(true)
  }

  useEffect(() => {
    const typedPath = normalizeLocalPathInput(inputValue)
    if (tags.length > 0 || remarks.length > 0 || typedPath === '') {
      setPathLookupMessage('')
      lastPathLookupRef.current = ''
      return
    }

    if (!isLikelyAbsoluteLocalPath(typedPath)) {
      setPathLookupMessage('')
      lastPathLookupRef.current = ''
      return
    }

    const timer = window.setTimeout(() => {
      if (lastPathLookupRef.current === typedPath) return
      lastPathLookupRef.current = typedPath

      InspectPathForNavigation(typedPath)
        .then((info) => {
          const currentKeyword = normalizeLocalPathInput(parseSearchQuery(useUIStore.getState().searchQuery).keyword)
          if (currentKeyword !== typedPath) return

          if (!info?.exists || !info.accessible) {
            setPathLookupMessage('路径不存在')
            return
          }

          const targetPath = info.isDir ? normalizeLocalPathInput(info.path || typedPath) : getParentPath(info.path || typedPath)
          if (!targetPath) return

          setPathLookupMessage('')
          const tabsState = useTabsStore.getState()
          const activeTab = tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId)
          if (activeTab?.currentPath !== targetPath) {
            tabsState.navigate(targetPath, undefined, true)
          }
          setSearchQuery('')
          setSearchPanelOpen(false)
        })
        .catch(() => {
          const currentKeyword = normalizeLocalPathInput(parseSearchQuery(useUIStore.getState().searchQuery).keyword)
          if (currentKeyword === typedPath) setPathLookupMessage('路径不存在')
        })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [inputValue, tags.length, remarks.length, setSearchPanelOpen, setSearchQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      handleRemoveChip(chips.length - 1)
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
            updateSearchQuery({ keyword: sugg.text + ' ' })
          } else if (sugg.type === 'tag') {
            const isChinese = inputValue.trim().toLowerCase().startsWith('标签:')
            const raw = `${isChinese ? '标签' : 'tag'}:${sugg.text}`
            updateSearchQuery({ tags: [...tags, raw], keyword: '' })
          }
          setSearchSuggestions([])
          setSelectedSuggestionIndex(-1)
        }
      }
    }
  }

  const [isMaximized, setIsMaximized] = useState(false)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledOnMount = useRef(false)

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

  useEffect(() => {
    if (isSearchActive) return
    if (!hasScrolledOnMount.current) {
      hasScrolledOnMount.current = true
      return
    }
    const container = tabsContainerRef.current
    if (!container) return
    const activeTabEl = container.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null
    if (!activeTabEl) return

    let rafId: number | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const scrollIfOverflow = () => {
      if (!container || !activeTabEl) return
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTabEl.getBoundingClientRect()
      if (tabRect.right - containerRect.right > 1) {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' })
      }
    }

    const scheduleScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (timeoutId !== null) clearTimeout(timeoutId)
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(scrollIfOverflow, 80)
      })
    }

    const ro = new ResizeObserver(scheduleScroll)
    ro.observe(activeTabEl)
    scheduleScroll()

    return () => {
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [activeTabId, activeTab?.currentPath, isSearchActive])

  return (
    <div className="flex items-center h-14 bg-white rounded-2xl shadow-panel border border-gray-100 wails-draggable px-4 shrink-0">
      <div className="flex items-center gap-1 wails-no-drag">
        <button 
          id="nav-back-button"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus:outline-none"
          onClick={goBack} 
          disabled={!activeTab || activeTab.historyIndex <= 0}
        >
          <AnimatedClickIcon animData={leftAnim} className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          id="nav-forward-button"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus:outline-none"
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
          className={`flex items-center bg-gray-100 rounded-full p-1 overflow-x-auto overflow-y-hidden no-scrollbar transition-colors duration-200 ease-out group/tabs ${isSearchActive ? 'w-auto shrink-0' : 'flex-1 min-w-0'}`}
        >
          <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              if (isSearchActive && !isActive) return null

              const pathPart = tab.currentPath?.split('?')[0]
              const leadingIcon = pathPart?.endsWith('\\批量重命名')
                ? 'edit_3_line.svg'
                : pathPart?.endsWith('\\相似图片')
                  ? 'pic_2_fill.svg'
                  : pathPart?.endsWith('\\简繁转换')
                    ? 'transfer_horizontal_line.svg'
                    : 'folder_line.svg'

              return (
                <motion.div
                  key={tab.id}
                  data-tab-id={tab.id}
                  layout
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={isSearchActive ? { opacity: 0, width: 0, transition: { duration: 0 } } : { opacity: 0, width: 0 }}
                  transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                  className={`relative flex items-center transition-colors whitespace-nowrap group shrink-0 ${
                    isActive ? 'active-tab-wrapper' : 'px-3 py-1 rounded-full hover:bg-gray-200/50 text-gray-600'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {isActive ? (
                    <div className="bg-white shadow-sm rounded-full px-3 py-1 flex items-center shrink-0 min-w-0 font-medium text-primary relative z-panel">
                      <img src={`/src/assets/icons/${leadingIcon}`} className="w-4 h-4 mr-2 opacity-70 shrink-0" alt="Folder" />
                        <div className="text-sm tracking-wider flex items-center h-full shrink-0 min-w-0">
                          {tab.currentPath === 'batch-rename://' ? (
                            <span className="truncate">{tab.title}</span>
                          ) : (
                            <DynamicBreadcrumb path={tab.currentPath || tab.title} />
                          )}
                        </div>
                      
                      {tabs.length > 1 && (
                        <button
                          className="ml-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 rounded-full hover:bg-gray-100 p-0.5 transition-colors shrink-0 focus:outline-none"
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
                    <div className="relative z-panel flex items-center shrink-0">
                      <img src={`/src/assets/icons/${leadingIcon}`} className="w-4 h-4 mr-2 opacity-70" alt="Folder" />
                        <div className="text-sm tracking-wider flex items-center h-full shrink-0 min-w-0">
                            {(() => {
                              if (tab.currentPath === 'batch-rename://' || pathPart?.endsWith('\\相似图片')) return <span className="truncate">{tab.title}</span>
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
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-300/50 ml-1 shrink-0 transition-colors opacity-0 group-hover/tabs:opacity-100 focus:outline-none"
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
          className={`relative flex items-center bg-gray-100 rounded-full focus-within:bg-gray-200/80 px-3 py-1.5 transition-colors duration-200 ease-out wails-no-drag ${isSearchActive ? 'flex-1 min-w-0' : 'w-[100px] shrink-0'}`}
        >
          {isSearchActive && (
            <div className="w-4 h-4 mr-2 shrink-0 flex items-center justify-center">
              {isSearchLoading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <img src="/src/assets/icons/check_line.svg" className="w-4 h-4 opacity-70" alt="搜索状态" />
              )}
            </div>
          )}
          
          {chips.map((chip, index) => {
            const value = chip.slice(chip.indexOf(':') + 1)
            const chipStyle: React.CSSProperties = {
              backgroundColor: generateColorFromName(value),
              color: '#000'
            }
            return (
              <span key={index} className="flex items-center rounded-full pl-2.5 pr-1.5 py-0.5 text-xs mr-1.5 shrink-0 shadow-sm font-medium" style={chipStyle}>
                {chip}
                <button
                  onClick={() => handleRemoveChip(index)}
                  className="ml-1 opacity-70 hover:opacity-100 outline-none flex items-center justify-center p-0.5 rounded-full hover:bg-black/10 transition-colors"
                >
                  <img src="/src/assets/icons/close_line.svg" className="w-2.5 h-2.5" />
                </button>
              </span>
            )
          })}

          <input
            id="search-input"
            className="flex-1 w-full min-w-[50px] bg-transparent border-none outline-none text-sm placeholder-gray-500 text-gray-800"
            placeholder={chips.length > 0 ? "" : "搜索..."}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setSearchFocused(true)
              setSearchPanelOpen(true)
            }}
            onBlur={() => setSearchFocused(false)}
            autoComplete="off"
          />
          {pathLookupMessage && (
            <div className="absolute left-9 top-full mt-2 px-2 py-1 rounded-md bg-white border border-red-100 shadow-sm text-[11px] text-red-500 whitespace-nowrap z-dropdown">
              {pathLookupMessage}
            </div>
          )}
          {searchQuery && (
            <img 
              src="/src/assets/icons/close_line.svg" 
              className="w-3.5 h-3.5 mx-1 text-gray-400 cursor-pointer hover:opacity-80 shrink-0" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchQuery('')
              }}
            />
          )}
          <img src="/src/assets/icons/search_line.svg" className="w-4 h-4 ml-1 text-gray-600 shrink-0" />
        </motion.div>
      </div>

      {/* Right Controls Area - NEVER CHANGES SIZE */}
      <div className="flex items-center gap-3 wails-no-drag shrink-0">
        <Dropdown>
          <Dropdown.Trigger>
            <Tooltip delay={200} isOpen={viewTp.isOpen}>
              <button
                ref={viewTp.triggerRef as React.Ref<HTMLButtonElement>}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
                {...viewTp.triggerProps}
              >
                <img src="/src/assets/icons/eye_line.svg" className="w-4 h-4 text-gray-700" />
              </button>
              <Tooltip.Content placement="bottom" triggerRef={viewTp.triggerRef}>视图选项</Tooltip.Content>
            </Tooltip>
          </Dropdown.Trigger>
          <Dropdown.Popover className="w-24 p-1 rounded-xl border border-gray-200 shadow-lg" placement="bottom end">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={new Set([viewMode])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys as Set<string>)[0]
                if (selected) setViewMode(selected as 'grid' | 'list' | 'album')
              }}
            >
              <Dropdown.Item id="grid" textValue="网格模式" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                <img src="/src/assets/icons/apps-2-line.svg" className="w-4 h-4 mr-3" />
                网格模式
              </Dropdown.Item>
              <Dropdown.Item id="list" textValue="列表模式" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                <img src="/src/assets/icons/list_check_line.svg" className="w-4 h-4 mr-3" />
                列表模式
              </Dropdown.Item>
              <Dropdown.Item id="album" textValue="相册模式" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                <img src="/src/assets/icons/photo_album_2_line.svg" className="w-4 h-4 mr-3" />
                相册模式
              </Dropdown.Item>
            </Dropdown.Menu>
            <Separator className="my-1 bg-gray-200/50" />
            <Dropdown.Menu
              selectionMode="multiple"
              selectedKeys={isGrouped ? new Set(['grouped']) : new Set()}
              onSelectionChange={(keys) => {
                const selected = keys as Set<string>
                setIsGrouped(selected.has('grouped'))
              }}
            >
              <Dropdown.Item id="grouped" textValue="启用分组" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                <div className="w-4 h-4 mr-3 flex items-center justify-center">
                  {isGrouped ? <img src="/src/assets/icons/check_line.svg" className="w-4 h-4" /> : <span className="w-4 h-4" />}
                </div>
                启用分组
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Dropdown>
          <Dropdown.Trigger>
            <button className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
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
          </Dropdown.Trigger>
          <Dropdown.Popover className="w-48 p-1 rounded-xl border border-gray-200 shadow-lg" placement="bottom end">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={new Set([activeTab?.currentPath === 'recent://' ? recentSortOption : sortOption])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys as Set<string>)[0]
                if (!selected) return
                const option = selected as SortOption
                if (activeTab?.currentPath === 'recent://') {
                  setRecentSortOption(option)
                } else {
                  setSortOption(option)
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item id="name_asc" textValue="按名称 (A-Z)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/AZ_sort_ascending_letters_line.svg" className="w-4 h-4 mr-3" /> 按名称 (A-Z)
                </Dropdown.Item>
                <Dropdown.Item id="name_desc" textValue="按名称 (Z-A)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/ZA_sort_descending_letters_line.svg" className="w-4 h-4 mr-3" /> 按名称 (Z-A)
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator className="my-1 bg-gray-200/50" />
              <Dropdown.Section>
                <Dropdown.Item id="time_desc" textValue="按时间 (从新到旧)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/sort_by_time_down.svg" className="w-4 h-4 mr-3" /> 按时间 (从新到旧)
                </Dropdown.Item>
                <Dropdown.Item id="time_asc" textValue="按时间 (从旧到新)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/sort_by_time_up.svg" className="w-4 h-4 mr-3" /> 按时间 (从旧到新)
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator className="my-1 bg-gray-200/50" />
              <Dropdown.Section>
                <Dropdown.Item id="size_desc" textValue="按大小 (从大到小)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 mr-3" /> 按大小 (从大到小)
                </Dropdown.Item>
                <Dropdown.Item id="size_asc" textValue="按大小 (从小到大)" className="rounded-lg px-3 py-2 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium">
                  <img src="/src/assets/icons/database-2-line.svg" className="w-4 h-4 mr-3" /> 按大小 (从小到大)
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <button onClick={triggerRefresh} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
          <AnimatedClickIcon animData={refreshAnim} className="w-4 h-4 text-gray-700" autoPlayCount={refreshAnimationCount} />
        </button>
        
        <div className="w-[1px] h-4 bg-gray-300 mx-1 shrink-0"></div>

        <div className="flex items-center gap-1 text-gray-600 shrink-0">
          <Tooltip delay={200} isOpen={minTp.isOpen}>
            <button ref={minTp.triggerRef as unknown as React.Ref<HTMLButtonElement>} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none relative" onClick={() => Minimize()} {...minTp.triggerProps}>
              <img src="/src/assets/icons/minimize_line.svg" className="w-4 h-4" />
            </button>
            <Tooltip.Content placement="bottom" triggerRef={minTp.triggerRef}>最小化</Tooltip.Content>
          </Tooltip>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none" onClick={handleMaximize}>
            <img src={isMaximized ? "/src/assets/icons/fullscreen_exit_line.svg" : "/src/assets/icons/fullscreen_line.svg"} className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition-colors focus:outline-none" onClick={() => Close()}>
            <img src="/src/assets/icons/close_line.svg" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
