import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRenameStore } from '../../store/renameStore'
import { useUIStore } from '../../store/uiStore'
import { useModalStore } from '../../store/modalStore'
import { RenameFile } from '../../../wailsjs/go/main/App'
import { EventsEmit } from '../../../wailsjs/runtime/runtime'

export default function RenamePopover() {
  const { isRenaming, targetPath, targetName, rect, endRename } = useRenameStore()
  const { triggerRefresh } = useUIStore()
  
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setNewName(targetName)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const lastDot = targetName.lastIndexOf('.')
          if (lastDot > 0) {
            inputRef.current.setSelectionRange(0, lastDot)
          } else {
            inputRef.current.select()
          }
        }
      }, 50)
    }
  }, [isRenaming, targetName])

  const validate = (name: string) => {
    if (name.trim() === '') {
      return '文件名不能为空'
    }
    const invalidChars = /[\\/:*?"<>|]/
    if (invalidChars.test(name)) {
      return '文件名不能包含 \\ / : * ? " < > |'
    }
    return ''
  }

  const handleRename = async () => {
    const err = validate(newName)
    if (err) return
    if (newName === targetName) {
      endRename()
      return
    }

    const lastSlash = targetPath.lastIndexOf('\\')
    const dir = targetPath.substring(0, lastSlash)
    const newPath = dir + '\\' + newName

    try {
      const ok = await RenameFile(targetPath, newPath, false)
      if (!ok) {
        EventsEmit('rename:conflict', { oldPath: targetPath, newPath: newPath, name: newName })
        endRename()
      } else {
        useUIStore.getState().setScrollToPath(newPath)
        triggerRefresh()
        endRename()
      }
    } catch (e: any) {
      useModalStore.getState().openModal('warning', { message: `重命名失败: ${e}` })
      endRename()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRename()
    } else if (e.key === 'Escape') {
      endRename()
    }
  }

  if (!isRenaming || !rect) return null

  const popoverWidth = 280
  const popoverHeight = 150
  
  let top = rect.bottom + 8
  let left = rect.left + rect.width / 2 - popoverWidth / 2
  let showAbove = false

  if (top + popoverHeight > window.innerHeight) {
    top = rect.top - popoverHeight - 8
    showAbove = true
  }

  if (left < 10) left = 10
  if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10

  // Calculate arrow position relative to popover
  let arrowLeft = rect.left + rect.width / 2 - left
  if (arrowLeft < 20) arrowLeft = 20
  if (arrowLeft > popoverWidth - 20) arrowLeft = popoverWidth - 20

  const err = validate(newName)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70]" onClick={endRename} onContextMenu={(e) => e.preventDefault()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: showAbove ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{ top, left, width: popoverWidth }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bg-sf-panel rounded-xl shadow-md border border-sf-border p-5 flex flex-col"
        >
          <div 
            className={`absolute w-4 h-4 bg-sf-panel border-sf-border transform rotate-45 ${showAbove ? 'bottom-[-9px] border-b border-r' : 'top-[-9px] border-t border-l'}`} 
            style={{ left: arrowLeft - 8 }}
          />
          
          <h3 className="text-center font-bold text-gray-800 text-lg mb-5 z-10 relative">重命名</h3>
          
          <div className="flex flex-col mb-4 relative z-10">
            {err && (
              <span className="text-xs text-red-500 absolute -top-5 left-1 font-medium">{err}</span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full bg-sf-input text-gray-800 px-3 py-2 rounded-lg outline-none border-2 transition-colors ${err ? 'border-red-500' : 'border-blue-400 focus:border-blue-500'}`}
            />
          </div>

          <div className="flex justify-end relative z-10">
            <button
              onClick={handleRename}
              disabled={!!err}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${err ? 'bg-transparent text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white shadow-md'}`}
            >
              确定
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
