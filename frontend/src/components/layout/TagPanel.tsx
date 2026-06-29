import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ComboBox, Input, ListBox } from '@heroui/react'
import { useSelectionStore } from '../../store/selectionStore'
import { useTagStore } from '../../store/tagStore'
import { GetTagsForFiles, AddTagToFile, RemoveTagFromFile } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'

export default function TagPanel() {
  const { selectedPaths } = useSelectionStore()
  const { globalTags, fetchGlobalTags, createTag, triggerTagRefresh } = useTagStore()
  
  const [fileTags, setFileTags] = useState<models.Tag[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const addingTagsRef = useRef(new Set<string>())

  useEffect(() => {
    fetchGlobalTags()
  }, [])

  useEffect(() => {
    const paths = Array.from(selectedPaths)
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
  }, [selectedPaths])

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
        await Promise.all(paths.map(p => AddTagToFile(p, tag!)))
        setFileTags(prev => [...prev, tag!])
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
    await Promise.all(paths.map(p => RemoveTagFromFile(p, tagId)))
    setFileTags(prev => prev.filter(t => t.id !== tagId))
    triggerTagRefresh()
  }

  const handleRemoveGroup = async (type: string) => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    const tagsToRemove = fileTags.filter(t => t.type === type)
    if (tagsToRemove.length === 0) return
    
    await Promise.all(tagsToRemove.map(t => Promise.all(paths.map(p => RemoveTagFromFile(p, t.id)))))
    
    const idsToRemove = new Set(tagsToRemove.map(t => t.id))
    setFileTags(prev => prev.filter(t => !idsToRemove.has(t.id)))
    triggerTagRefresh()
  }

  // Group tags
  const typeGroups = fileTags.reduce((acc, tag) => {
    if (tag.type) {
      if (!acc[tag.type]) acc[tag.type] = []
      acc[tag.type].push(tag)
    }
    return acc
  }, {} as Record<string, models.Tag[]>)

  const flatTags = fileTags.filter(t => !t.type)

  // Filter and format tags according to display logic
  const displayTags = useMemo(() => {
    // Unique tags from global tags based on type and name
    const uniqueTags = Array.from(new Map(globalTags.map(item => [`${item.type}:${item.name}`, item])).values())
    
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
  }, [globalTags, inputValue])

  if (selectedPaths.size === 0) {
    return <div className="text-gray-400 text-center mt-8 text-sm">请选择至少一个文件以管理标签</div>
  }

  return (
    <div className="w-full p-4 flex flex-col gap-3 text-gray-800">
      <div className="flex flex-col gap-2">
        {Object.entries(typeGroups).map(([type, tags]) => (
          <div key={type} className="flex flex-col gap-1">
            <div className="peer flex items-center justify-between text-sm text-sf-text font-semibold select-none hover:bg-gray-100 rounded py-1.5 px-2 transition-colors cursor-default">
              <div className="flex items-center gap-2">
                {/* <svg style={{ color: tags[0]?.colorHex || '#0F2039' }} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> */}
                {type}
              </div>
              <button onClick={() => handleRemoveGroup(type)} className="text-sf-text hover:bg-gray-200 rounded p-0.5 transition-all">
                {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> */}
              </button>
            </div>
            <div className="pl-6 flex flex-col gap-1 peer-hover:[&>div]:bg-gray-100">
              {tags.map(tag => (
                <TagItem key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} isNested={true} />
              ))}
            </div>
          </div>
        ))}

        {flatTags.map(tag => (
          <TagItem key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} isNested={false} />
        ))}
      </div>

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
                    const selectedTag = globalTags.find(t => t.id === key)
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
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-sf-text mt-2"
        >
          {/* <motion.svg 
            animate={{ rotate: isAdding ? 45 : 0 }} 
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </motion.svg> */}
        </button>
      </div>
    </div>
  )
}

function TagItem({ tag, onRemove, isNested }: { tag: models.Tag, onRemove: () => void, isNested: boolean }) {
  return (
    <div className="flex items-center justify-between group rounded py-1.5 px-2 transition-colors select-none hover:bg-gray-100 cursor-default">
      <div className="flex items-center gap-3">
        {/* SVG Icon Placeholder */}
        <span className="text-[14px] text-gray-800">{tag.name}</span>
      </div>
      <button onClick={onRemove} className="text-sf-text hover:bg-gray-200 rounded p-0.5 transition-all">
        {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> */}
      </button>
    </div>
  )
}
