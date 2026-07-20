import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ComboBox, Input, ListBox } from '@heroui/react'
import { useSelectionStore } from '../../store/selectionStore'
import { useTagStore } from '../../store/tagStore'
import { GetTagsForFiles, AddTagToFiles, RemoveTagFromFiles, GetTagUsageCounts } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'

export default function TagPanel() {
  const { selectedPaths } = useSelectionStore()
  const { globalTags, fetchGlobalTags, createTag, triggerTagRefresh, tagRefreshKey } = useTagStore()
  
  const [fileTags, setFileTags] = useState<models.Tag[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [tagError, setTagError] = useState('')

  const validateTagName = (name: string) => {
    if (name.includes(' ') || name.includes('*')) return '标签名称不能带有空格和*'
    return ''
  }

  const addingTagsRef = useRef(new Set<string>())

  useEffect(() => {
    fetchGlobalTags()
    fetchUsageCounts()
  }, [])

  const fetchUsageCounts = async () => {
    try {
      const counts = await GetTagUsageCounts()
      setUsageCounts(counts as Record<string, number>)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    const paths = Array.from(selectedPaths)
    fetchGlobalTags()
    fetchUsageCounts()
    if (paths.length > 0) {
      GetTagsForFiles(paths).then(tagsMap => {
        if (paths.length === 1) {
          setFileTags(tagsMap[paths[0]] || [])
        } else {
          // Compute intersection
          const counts = new Map<string, number>()
          const tagCounts = new Map<string, models.Tag>()
          paths.forEach(p => {
            const tags = tagsMap[p] || []
            tags.forEach(t => {
              counts.set(t.id, (counts.get(t.id) || 0) + 1)
              tagCounts.set(t.id, t)
            })
          })
          
          const commonTags: models.Tag[] = []
          counts.forEach((count, tagId) => {
            if (count === paths.length) {
              commonTags.push(tagCounts.get(tagId)!)
            }
          })
          setFileTags(commonTags)
        }
      })
    } else {
      setFileTags([])
    }
    setIsAdding(false)
  }, [selectedPaths, tagRefreshKey])

  const handleAddTag = async (tagName: string) => {
    if (validateTagName(tagName)) return
    const paths = Array.from(selectedPaths)
    if (!tagName.trim() || paths.length === 0) return
    
    if (addingTagsRef.current.has(tagName)) return
    addingTagsRef.current.add(tagName)
    
    try {
      let type = ''
      let name = tagName.trim()
      const lastColon = Math.max(name.lastIndexOf(':'), name.lastIndexOf('：'))
      if (lastColon >= 0) {
          type = name.slice(0, lastColon).trim()
          name = name.slice(lastColon + 1).trim()
      }
      
      if (!name) return

      let tag = globalTags.find(t => t.name.toLowerCase() === name.toLowerCase() && 
                                     (t.type || "").toLowerCase() === type.toLowerCase())
      
      if (!tag) {
        tag = await createTag(name, type)
      }

      if (!fileTags.find(t => t.id === tag!.id)) {
        setFileTags(prev => [...prev, tag!])
        try {
          await AddTagToFiles(paths, tag!)
          void fetchUsageCounts()
          triggerTagRefresh()
        } catch (error) {
          setFileTags(prev => prev.filter(t => t.id !== tag!.id))
          throw error
        }
      }
      setIsAdding(false)
      setInputValue('')
    } catch (error) {
      setTagError(String(error))
    } finally {
      addingTagsRef.current.delete(tagName)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    await RemoveTagFromFiles(paths, [tagId])
    setFileTags(prev => prev.filter(t => t.id !== tagId))
    await fetchGlobalTags()
    await fetchUsageCounts()
    triggerTagRefresh()
  }

  interface GroupNode {
    segment: string
    fullPath: string
    tags: models.Tag[]
    children: GroupNode[]
  }

  const groupedTags = useMemo(() => {
    const rootNodes: GroupNode[] = []
    const flatTags: models.Tag[] = []
    const nodeMap = new Map<string, GroupNode>()

    fileTags.forEach(tag => {
      if (!tag.type) {
        flatTags.push(tag)
        return
      }

      const parts = tag.type.split(':')
      let path = ''
      let parentNodes = rootNodes

      parts.forEach((part, i) => {
        path = path ? `${path}:${part}` : part

        if (!nodeMap.has(path)) {
          const node: GroupNode = { segment: part, fullPath: path, tags: [], children: [] }
          nodeMap.set(path, node)
          parentNodes.push(node)
        }

        const node = nodeMap.get(path)!

        if (i === parts.length - 1) {
          node.tags.push(tag)
        }

        parentNodes = node.children
      })
    })

    return { rootNodes, flatTags }
  }, [fileTags])

  const handleRemoveGroup = async (fullPath: string) => {
    const tagIds = fileTags
      .filter(t => t.type === fullPath || t.type.startsWith(fullPath + ':'))
      .map(t => t.id)
    if (tagIds.length === 0) return
    const paths = Array.from(selectedPaths)
    await RemoveTagFromFiles(paths, tagIds)
    setFileTags(prev => prev.filter(t => !tagIds.includes(t.id)))
    await fetchGlobalTags()
    await fetchUsageCounts()
    triggerTagRefresh()
  }

  const renderGroupNode = (node: GroupNode, depth: number): React.ReactNode => (
    <div key={node.fullPath} className={`${depth > 0 ? 'ml-8' : ''} group`}>
      <div className="flex items-center justify-between text-sm font-semibold text-gray-600 py-1.5 px-2 select-none rounded transition-colors group-hover:bg-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' style={{ color: '#9CA3AF' }} className='shrink-0'>
            <g fill='none'>
              <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z' />
              <path fill='currentColor' d='M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v16.028c0 1.22-1.38 1.93-2.372 1.221L12 18.229l-5.628 4.02c-.993.71-2.372 0-2.372-1.22z' />
            </g>
          </svg>
          <span className="truncate">{node.segment}</span>
        </div>
        <button onClick={() => handleRemoveGroup(node.fullPath)} className="text-sf-text hover:bg-gray-200 rounded p-0.5 transition-all shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
      {node.children.map(child => renderGroupNode(child, depth + 1))}
      {node.tags.map(tag => (
        <TagItem key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
      ))}
    </div>
  )

  const visibleGlobalTags = useMemo(() => {
    return globalTags.filter(tag => (usageCounts[tag.id] || 0) > 0)
  }, [globalTags, usageCounts])

  // Filter and format tags according to display logic
  const displayTags = useMemo(() => {
    // Unique tags from global tags based on type and name
    const uniqueTags = Array.from(new Map(visibleGlobalTags.map(item => [`${item.type}:${item.name}`, item])).values())
    
    // If input contains ':', show sub-type prefixes and matching tags
    if (/[:：]/.test(inputValue)) {
      const result: any[] = []
      const trimmed = inputValue.trim()

      // Show sub-type prefixes when input ends with ':'
      if (/[:：]$/.test(trimmed)) {
        const prefix = trimmed.slice(0, -1).trim()
        const seen = new Set<string>()
        uniqueTags.forEach(item => {
          if (item.type && (item.type === prefix || item.type.startsWith(prefix + ':'))) {
            const rest = item.type.slice(prefix.length).replace(/^:/, '')
            const nextSeg = rest.includes(':') ? rest.split(':')[0] : rest
            if (nextSeg && !seen.has(nextSeg)) {
              seen.add(nextSeg)
              const full = prefix ? `${prefix}:${nextSeg}` : nextSeg
              result.push({
                id: `type-${full}`,
                textValue: `${full}:`,
                display: `${full}:`,
                isTypeOnly: true
              })
            }
          }
        })
      }

      uniqueTags.forEach(item => {
        result.push({
          id: item.id,
          textValue: item.type ? `${item.type}: ${item.name}` : item.name,
          display: item.type ? `${item.type}: ${item.name}` : item.name,
          isTypeOnly: false
        })
      })

      return result
    }
    
    // Otherwise, show only tag types (with a colon) and tags without a type
    const result: any[] = []
    const seenTypes = new Set<string>()
    
    uniqueTags.forEach(item => {
      if (item.type) {
        if (!seenTypes.has(item.type)) {
          seenTypes.add(item.type)
          result.push({
            id: `type-${item.type}`,
            textValue: `${item.type}:`,
            display: `${item.type}:`,
            isTypeOnly: true
          })
        }
      } else {
        result.push({
          id: item.id,
          textValue: item.name,
          display: item.name,
          isTypeOnly: false
        })
      }
    })
    
    return result
  }, [visibleGlobalTags, inputValue])

  if (selectedPaths.size === 0) {
    return <div className="text-gray-400 text-center mt-8 text-sm">当前未选择文件</div>
  }

  return (
    <div className="w-full p-4 flex flex-col gap-3 text-gray-800">
      {groupedTags.rootNodes.map(node => renderGroupNode(node, 0))}
      {groupedTags.flatTags.map(tag => (
        <TagItem key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
      ))}

      <div className="flex flex-col items-center mt-2 w-full">
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }} 
              animate={{ opacity: 1, height: 'auto', marginTop: 8 }} 
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="w-full mb-3 overflow-hidden"
            >
              <ComboBox 
                allowsCustomValue 
                className="w-full" 
                inputValue={inputValue} 
                onInputChange={setInputValue}
                onSelectionChange={(key) => {
                  if (key) {
                    const keyStr = key.toString()
                    if (keyStr.startsWith('type-')) {
                      // It's a type prefix
                      const typePrefix = keyStr.substring(5) + ':'
                      setInputValue(typePrefix)
                      return
                    }
                    const selectedTag = visibleGlobalTags.find(t => t.id === key)
                    if (selectedTag) {
                      handleAddTag(selectedTag.type ? `${selectedTag.type}: ${selectedTag.name}` : selectedTag.name)
                      setInputValue('')
                    } else {
                      handleAddTag(keyStr)
                      setInputValue('')
                    }
                  }
                }}
              >
                <ComboBox.InputGroup className={`bg-sf-input hover:bg-sf-input-hover rounded-full overflow-hidden outline-none transition-colors ${tagError ? 'border border-red-500' : ''}`}>
                  <Input 
                    className="w-full text-gray-800 bg-transparent outline-none ring-0 border-none px-2 h-full"
                    placeholder="" 
                    autoFocus 
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' && inputValue) {
                        const err = validateTagName(inputValue)
                        if (err) { setTagError(err); return }
                        setTagError('')
                        handleAddTag(inputValue)
                      }
                    }} 
                  />
                  <ComboBox.Trigger className="text-gray-500 bg-transparent" />
                </ComboBox.InputGroup>
                {tagError && (
                  <span className="text-xs text-red-500 mt-1">{tagError}</span>
                )}
                <ComboBox.Popover className="border border-gray-200 shadow-lg rounded-xl">
                  <ListBox className="text-gray-800">
                    {displayTags.map(item => (
                      <ListBox.Item 
                        key={item.id} 
                        id={item.id} 
                        textValue={item.textValue} 
                        className="text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer"
                      >
                        {item.display}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors text-sf-text text-sm font-medium mt-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加标签
        </button>
      </div>
    </div>
  )
}

function TagItem({ tag, onRemove }: { tag: models.Tag, onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded py-1.5 px-2 transition-colors hover:bg-gray-100 group-hover:bg-gray-100">
      <div className="flex items-center gap-2 min-w-0">
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' style={{ color: tag.colorHex }} className='shrink-0'>
          <g fill='none'>
            <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z' />
            <path fill='currentColor' d='M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v16.028c0 1.22-1.38 1.93-2.372 1.221L12 18.229l-5.628 4.02c-.993.71-2.372 0-2.372-1.22z' />
          </g>
        </svg>
        <span className="text-[14px] text-gray-800 truncate">{tag.name}</span>
      </div>
      <button onClick={onRemove} className="text-sf-text hover:bg-gray-200 rounded p-0.5 transition-all shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  )
}
