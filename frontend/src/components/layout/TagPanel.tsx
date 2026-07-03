import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { ComboBox, Input, ListBox } from '@heroui/react'
import { useSelectionStore } from '../../store/selectionStore'
import { useTagStore } from '../../store/tagStore'
import { GetTagsForFiles, AddTagToFiles, RemoveTagFromFiles, GetTagUsageCounts } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'

export default function TagPanel() {
  const { selectedPaths } = useSelectionStore()
  const { globalTags, fetchGlobalTags, createTag, reorderTags, triggerTagRefresh, tagRefreshKey } = useTagStore()
  
  const [fileTags, setFileTags] = useState<models.Tag[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})

  const addingTagsRef = useRef(new Set<string>())
  const fileTagsRef = useRef<models.Tag[]>([])

  useEffect(() => {
    fetchGlobalTags()
    fetchUsageCounts()
  }, [])

  useEffect(() => {
    fileTagsRef.current = fileTags
  }, [fileTags])

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
    const paths = Array.from(selectedPaths)
    if (!tagName.trim() || paths.length === 0) return
    
    if (addingTagsRef.current.has(tagName)) return
    addingTagsRef.current.add(tagName)
    
    try {
      let type = ''
      let name = tagName.trim()
      if (name.includes(':') || name.includes('：')) {
          const parts = name.split(/[:：]/)
          type = parts[0].trim()
          name = parts[1].trim()
      }
      
      if (!name) return

      let tag = globalTags.find(t => t.name.toLowerCase() === name.toLowerCase() && 
                                     (t.type || "").toLowerCase() === type.toLowerCase())
      
      if (!tag) {
        tag = await createTag(name, type)
      }

      if (!fileTags.find(t => t.id === tag!.id)) {
        await AddTagToFiles(paths, tag!)
        setFileTags(prev => [...prev, tag!])
        await fetchUsageCounts()
        triggerTagRefresh()
      }
      setIsAdding(false)
      setInputValue('')
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

  const handleReorderTags = (nextTags: models.Tag[]) => {
    setFileTags(nextTags)
  }

  const handleReorderEnd = () => {
    const reorderedFileTags = fileTagsRef.current
    const reorderedFileTagIds = new Set(reorderedFileTags.map(t => t.id))
    let nextFileTagIndex = 0
    const orderedIds = globalTags.map(tag => {
      if (!reorderedFileTagIds.has(tag.id)) {
        return tag.id
      }
      return reorderedFileTags[nextFileTagIndex++]?.id || tag.id
    })
    reorderTags(orderedIds).catch(console.error)
  }

  const visibleGlobalTags = useMemo(() => {
    return globalTags.filter(tag => (usageCounts[tag.id] || 0) > 0)
  }, [globalTags, usageCounts])

  // Filter and format tags according to display logic
  const displayTags = useMemo(() => {
    // Unique tags from global tags based on type and name
    const uniqueTags = Array.from(new Map(visibleGlobalTags.map(item => [`${item.type}:${item.name}`, item])).values())
    
    // If input contains ':', show the actual tags
    if (inputValue.includes(':')) {
      return uniqueTags.map(item => ({
        id: item.id,
        textValue: item.type ? `${item.type}: ${item.name}` : item.name,
        display: item.type ? `${item.type}: ${item.name}` : item.name,
        isTypeOnly: false
      }))
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
      <Reorder.Group
        axis="y"
        values={fileTags}
        onReorder={handleReorderTags}
        className="flex flex-col gap-2"
      >
        {fileTags.map(tag => (
          <TagItem key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} onDragEnd={handleReorderEnd} />
        ))}
      </Reorder.Group>

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
                    }
                  }
                }}
              >
                <ComboBox.InputGroup className="bg-sf-input hover:bg-sf-input-hover rounded-full overflow-hidden outline-none transition-colors">
                  <Input 
                    className="w-full text-gray-800 bg-transparent outline-none ring-0 border-none px-2 h-full"
                    placeholder="" 
                    autoFocus 
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' && inputValue) {
                        handleAddTag(inputValue)
                      }
                    }} 
                  />
                  <ComboBox.Trigger className="text-gray-500 bg-transparent" />
                </ComboBox.InputGroup>
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

function TagItem({ tag, onRemove, onDragEnd }: { tag: models.Tag, onRemove: () => void, onDragEnd: () => void }) {
  return (
    <Reorder.Item
      value={tag}
      onDragEnd={onDragEnd}
      className="flex items-center justify-between group rounded py-1.5 px-2 transition-colors select-none hover:bg-gray-100 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' style={{ color: tag.colorHex }} className='shrink-0'>
          <g fill='none'>
            <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z' />
            <path fill='currentColor' d='M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v16.028c0 1.22-1.38 1.93-2.372 1.221L12 18.229l-5.628 4.02c-.993.71-2.372 0-2.372-1.22z' />
          </g>
        </svg>
        <span className="text-[14px] text-gray-800">{tag.type ? `${tag.type}: ${tag.name}` : tag.name}</span>
      </div>
      <button onClick={onRemove} className="text-sf-text hover:bg-gray-200 rounded p-0.5 transition-all">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </Reorder.Item>
  )
}
