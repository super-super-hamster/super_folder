import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore } from '../../store/taskStore'
import { useClipboardStore } from '../../store/clipboardStore'
import { useUndoStore } from '../../store/undoStore'

export const ProgressCapsule = () => {
  const { isRunning, operation, progress, isModalVisible, setModalVisible, blockedAction } = useTaskStore()
  const { operation: clipboardOp, items: clipboardItems, capsuleKey } = useClipboardStore()
  const { message: undoMsg, type: undoType, key: undoKey } = useUndoStore()
  
  const [showDone, setShowDone] = useState(false)
  
  const [overrideMsg, setOverrideMsg] = useState<{ text: string, type: 'block' | 'undo' } | null>(null)
  
  const [isHovered, setIsHovered] = useState(false)
  const [isTemporarilyExpanded, setIsTemporarilyExpanded] = useState(true)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevCapsuleKey = useRef(capsuleKey)

  const triggerExpand = () => {
    setIsTemporarilyExpanded(true)
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current)
    expandTimerRef.current = setTimeout(() => {
      setIsTemporarilyExpanded(false)
    }, 3000)
  }

  // When task finishes, show "Done" briefly
  useEffect(() => {
    if (!isRunning && progress === 100) {
      setShowDone(true)
      triggerExpand()
      const timer = setTimeout(() => {
        setShowDone(false)
        useTaskStore.getState().clearTask()
      }, 3000)
      return () => clearTimeout(timer)
    } else if (isRunning) {
      setShowDone(false)
      triggerExpand()
    }
  }, [isRunning, progress])

  // Listen for clipboard changes (copy/cut)
  useEffect(() => {
    if (capsuleKey > prevCapsuleKey.current) {
      triggerExpand()
      prevCapsuleKey.current = capsuleKey
    }
  }, [capsuleKey])

  // Listen for undo messages
  const prevUndoKey = useRef(undoKey)
  useEffect(() => {
    if (undoKey > prevUndoKey.current && undoMsg) {
      setOverrideMsg({
        text: undoMsg,
        type: 'undo'
      })
      triggerExpand()
      prevUndoKey.current = undoKey
    }
  }, [undoKey, undoMsg])



  // Listen for blocked actions
  useEffect(() => {
    if (blockedAction) {
      setOverrideMsg({
        text: `请等待${blockedAction.action}完成`,
        type: 'block'
      })
      triggerExpand()
      
      const timer = setTimeout(() => {
        setOverrideMsg(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [blockedAction])

  const isVisible = (isRunning && !isModalVisible) || showDone || (clipboardItems.length > 0 && !isRunning && capsuleKey > 0) || overrideMsg?.type === 'undo'

  const opName = operation === 'cut' ? '移动中' : (operation === 'permanent_delete' ? '删除中' : '复制中')

  const isExpanded = isHovered || isTemporarilyExpanded || showDone; // keep expanded if done

  // Clear undo text only when the capsule has fully collapsed
  useEffect(() => {
    if (!isExpanded && overrideMsg?.type === 'undo') {
      const timer = setTimeout(() => {
        setOverrideMsg(null)
      }, 300) // Wait for collapse animation
      return () => clearTimeout(timer)
    }
  }, [isExpanded, overrideMsg?.type])

  let icon = null;
  let text = "";

  const isClipboard = clipboardItems.length > 0 && !isRunning;

  // 1. Determine Icon
  if (isRunning) {
    icon = (
      <div className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path className="text-gray-200" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="text-blue-500 transition-all duration-300" strokeWidth="3" strokeDasharray={`${progress}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
      </div>
    );
  } else if (showDone) {
    icon = (
      <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  } else if (isClipboard) {
    icon = (
      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {clipboardOp === 'cut' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        )}
      </svg>
    );
  } else if (overrideMsg?.type === 'block' || (overrideMsg?.type === 'undo' && undoType === 'error')) {
    icon = (
      <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  } else {
    // Default fallback for undo success when no clipboard exists
    icon = (
      <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  // 2. Determine Text
  if (overrideMsg) {
    text = overrideMsg.text;
  } else if (showDone) {
    text = operation === 'permanent_delete' ? '删除成功' : '粘贴成功';
  } else if (isClipboard) {
    text = `已${clipboardOp === 'cut' ? '剪切' : '复制'} ${clipboardItems.length} 项`;
  } else {
    text = opName;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, scale: 0.9 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute bottom-6 left-6 z-40"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            onClick={() => {
              if (isRunning) {
                setModalVisible(true)
              }
            }}
            className={`
              flex items-center p-2 rounded-full border cursor-pointer
              backdrop-blur-md transition-colors
              ${showDone 
                ? 'bg-green-500/90 border-green-400 text-white' 
                : 'bg-white/90 border-gray-200 hover:bg-white text-gray-800'
              }
            `}
          >
            {icon}
            <motion.div
              initial={false}
              animate={{ width: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
              className="overflow-hidden whitespace-nowrap flex items-center"
            >
              <span className="pl-2 font-medium text-xs pr-1">{text}</span>
              {(!isRunning && clipboardItems.length > 0 && !showDone && overrideMsg?.type !== 'block') && (
                <div 
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    useClipboardStore.getState().clear()
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
