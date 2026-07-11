import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTagStore } from '../../store/tagStore'
import { GetTagUsageCounts, UpdateTag, DeleteTag } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'
import { TooltipItem } from '../../utils/TooltipItem'
import { usePrivacyStore } from '../../store/privacyStore'

const TagSettings = () => {
  const { globalTags, fetchGlobalTags, tagRefreshKey } = useTagStore()
  const { state: privacyState, setTagProtected } = usePrivacyStore()
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  useEffect(() => {
    fetchGlobalTags()
    fetchCounts()
  }, [tagRefreshKey])

  const fetchCounts = async () => {
    try {
      const counts = await GetTagUsageCounts()
      setUsageCounts(counts as Record<string, number>)
    } catch (e) { console.error(e) }
  }

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '删除标签',
      message: '确定要删除这个标签吗？所有使用该标签的文件都将移除此标签。',
      onConfirm: async () => {
        try {
          await DeleteTag(id)
          await fetchGlobalTags()
          await fetchCounts()
        } catch (e) { console.error(e) }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDoubleClick = (tag: models.Tag) => {
    setEditingTagId(tag.id)
    setEditingName(tag.name)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }

  const handleSaveRename = async (tag: models.Tag) => {
    if (editingName.trim() && editingName.trim() !== tag.name) {
      try {
        const newTag = { ...tag, name: editingName.trim() } as models.Tag
        await UpdateTag(newTag)
        await fetchGlobalTags()
      } catch (e) { console.error(e) }
    }
    setEditingTagId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, tag: models.Tag) => {
    if (e.key === 'Enter') {
      handleSaveRename(tag)
    } else if (e.key === 'Escape') {
      setEditingTagId(null)
    }
  }

  const handleDeleteType = (type: string, tags: models.Tag[]) => {
    setConfirmModal({
      isOpen: true,
      title: '删除类型标签',
      message: `确定要删除类型 "${type}" 及包含的 ${tags.length} 个标签吗？`,
      onConfirm: async () => {
        try {
          for (const tag of tags) {
            await DeleteTag(tag.id)
          }
          await fetchGlobalTags()
          await fetchCounts()
        } catch (e) { console.error(e) }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const renderTagRow = (tag: models.Tag, isTypeChild = false) => {
    const isEditing = editingTagId === tag.id
    const count = usageCounts[tag.id] || 0
    const isPrivacyMode = privacyState?.mode === 'privacy'
    return (
      <div 
        key={tag.id}
        className="flex items-center justify-between px-4 py-3 bg-sf-panel/80 rounded-xl group transition-colors hover:bg-sf-item"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: tag.colorHex }} />
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={() => handleSaveRename(tag)}
              onKeyDown={e => handleKeyDown(e, tag)}
              className="w-24 text-sm font-medium outline-none bg-transparent border-b border-blue-500"
            />
          ) : (
            <span 
              className="text-sm font-medium text-gray-800 cursor-text select-none" 
              onDoubleClick={() => !isEditing && handleDoubleClick(tag)}
            >
              {tag.name}
            </span>
          )}
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{count} 个文件</span>
        </div>
        <div className="flex items-center gap-2">
          {isPrivacyMode && (
            <TooltipItem content={tag.isProtected ? '解除保护' : '保护标签'} placement="top">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setTagProtected(tag.id, !tag.isProtected).catch(console.error)
                }}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <img src={`/src/assets/icons/${tag.isProtected ? 'lock_line.svg' : 'unlock_line.svg'}`} className="w-4 h-4" alt={tag.isProtected ? 'protected' : 'unprotected'} />
              </button>
            </TooltipItem>
          )}
          <TooltipItem content="删除标签" placement="left">
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(tag.id) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-all"
            >
              <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 opacity-50" alt="删除" />
            </button>
          </TooltipItem>
        </div>
      </div>
    )
  }

  const visibleGlobalTags = useMemo(() => {
    return globalTags.filter(tag => (usageCounts[tag.id] || 0) > 0)
  }, [globalTags, usageCounts])

  const TypeGroup = ({ type, tags }: { type: string, tags: models.Tag[] }) => {
    const colorHex = tags[0]?.colorHex || '#9ca3af'
    const expanded = expandedTypes.has(type)
    
    if (type === '未分类') {
      return (
        <div className="flex flex-col gap-2">
          {tags.map(tag => renderTagRow(tag))}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <div 
          onClick={() => setExpandedTypes(prev => {
            const next = new Set(prev)
            if (next.has(type)) next.delete(type)
            else next.add(type)
            return next
          })}
          className="flex items-center justify-between px-4 py-3 bg-sf-panel/80 rounded-xl group transition-colors hover:bg-sf-item cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: colorHex }} />
            <span className="text-sm font-medium text-gray-800">{type}</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">{tags.length} 个子标签</span>
          </div>
          <div className="flex items-center gap-2">
            <TooltipItem content="删除类型及子标签" placement="left">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteType(type, tags) }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-all"
              >
                <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 opacity-50" alt="删除" />
              </button>
            </TooltipItem>
            <motion.svg animate={{ rotate: expanded ? 90 : 0 }} className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </motion.svg>
          </div>
        </div>
        
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-8 flex flex-col gap-2 overflow-hidden"
            >
              {tags.map(tag => renderTagRow(tag, true))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Group tags by type
  const groupedTags = visibleGlobalTags.reduce((acc, tag) => {
    const type = tag.type || '未分类'
    if (!acc[type]) acc[type] = []
    acc[type].push(tag)
    return acc
  }, {} as Record<string, models.Tag[]>)

  return (
    <div className="flex flex-col h-full space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">标签管理</h2>
      </div>

      <div className="flex flex-col gap-6 relative">
        <div className="flex flex-col gap-2">
          {Object.entries(groupedTags).map(([type, tags]) => (
            <TypeGroup key={type} type={type} tags={tags} />
          ))}
          {visibleGlobalTags.length === 0 && (
            <div className="text-sm text-gray-400 py-8 text-center bg-sf-panel/80 rounded-lg border border-gray-100 border-dashed">
              暂无标签
            </div>
          )}
        </div>
      </div>

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center relative z-10"
          >
            <div className="flex items-center gap-2 mb-4 text-red-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <h2 className="text-xl font-bold">{confirmModal.title}</h2>
            </div>
            <p className="text-gray-600 mb-6 text-sm text-center">
              {confirmModal.message}
            </p>
            
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium text-sm"
              >
                确定删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default TagSettings
