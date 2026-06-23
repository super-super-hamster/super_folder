import { useEffect, useState } from 'react'
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime'
import { useModalStore } from '../../store/modalStore'
import { useUIStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { CancelPaste, ResolvePasteConflict, RenameFile, PermanentDelete } from '../../../wailsjs/go/main/App'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressBarRoot, ProgressBarTrack, ProgressBarFill, Checkbox } from '@heroui/react'

const ProgressModal = () => {
  const { taskData, operation, progress } = useTaskStore()
  const setModalVisible = useTaskStore(state => state.setModalVisible)
  
  const handleCancel = () => {
    if (taskData?.taskID) {
      CancelPaste(taskData.taskID)
    }
    useTaskStore.getState().clearTask()
  }

  const opName = operation === 'cut' ? '移动' : (operation === 'permanent_delete' ? '删除' : '复制')

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center relative">
      <div 
        className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600"
        onClick={() => setModalVisible(false)}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-4">正在执行的操作: {opName}</h2>
      <p className="text-gray-500 mb-6 text-sm truncate w-full text-center">
        {taskData?.processedFiles || 0} / {taskData?.totalFiles || 0} 项
      </p>
      <ProgressBarRoot value={progress} className="w-full mb-6">
        <ProgressBarTrack className="h-2.5 bg-gray-200 rounded-full w-full overflow-hidden">
          <ProgressBarFill className="h-2.5 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </ProgressBarTrack>
      </ProgressBarRoot>
      
      <div className="flex w-full gap-3">
        <button 
          onClick={handleCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          取消
        </button>
        <button 
          disabled
          className="flex-1 bg-gray-300 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed opacity-50"
        >
          确认
        </button>
      </div>
    </div>
  )
}

const ConflictModal = () => {
  const { modalData, closeModal } = useModalStore()
  const [applyToAll, setApplyToAll] = useState(false)

  const handleResolve = (action: string) => {
    if (modalData?.taskID) {
      ResolvePasteConflict(modalData.taskID, action, applyToAll)
    }
    closeModal()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 text-red-500">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold">文件冲突</h2>
      </div>
      <p className="text-gray-500 mb-6 text-sm text-center">
        目标文件夹中已存在同名文件：<br/>
        <span className="font-mono text-xs">{modalData?.destPath}</span>
      </p>
      
      <div className="flex flex-col gap-3 w-full mb-6">
        <button 
          onClick={() => handleResolve('rename')}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          保留两者 (自动补充后缀)
        </button>
        <button 
          onClick={() => handleResolve('overwrite')}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          覆盖目标文件
        </button>
        <button 
          onClick={() => handleResolve('skip')}
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          跳过该文件
        </button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer mb-2 text-sm text-gray-700">
        <Checkbox 
          isSelected={applyToAll} 
          onChange={setApplyToAll as any} 
          className="w-4 h-4 mr-2"
        />
        为之后的所有冲突执行相同操作
      </label>
    </div>
  )
}

const RenameConflictModal = () => {
  const { modalData, closeModal } = useModalStore()

  const handleResolve = (action: string) => {
    if (modalData?.oldPath && modalData?.newPath) {
      if (action === 'overwrite') {
        RenameFile(modalData.oldPath, modalData.newPath, true).then(() => {
          useUIStore.getState().triggerRefresh()
        }).catch((e) => {
          useModalStore.getState().openModal('warning', { message: `覆盖失败: ${e}` })
        })
      }
    }
    closeModal()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 text-red-500">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold">重命名冲突</h2>
      </div>
      <p className="text-gray-500 mb-6 text-sm text-center">
        当前文件夹中已存在名为 <span className="font-mono font-bold">{modalData?.name}</span> 的文件。
      </p>
      
      <div className="flex w-full gap-3">
        <button 
          onClick={closeModal}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          取消
        </button>
        <button 
          onClick={() => handleResolve('overwrite')}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          替换目标文件
        </button>
      </div>
    </div>
  )
}

const PermanentDeleteConfirmModal = () => {
  const { modalData, closeModal } = useModalStore()
  
  const handleConfirm = () => {
    if (modalData?.paths) {
      PermanentDelete(modalData.paths)
    }
    closeModal()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 text-red-500">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        <h2 className="text-xl font-bold">永久删除确认</h2>
      </div>
      <p className="text-gray-600 mb-6 text-sm text-center">
        您即将永久删除选中的 {modalData?.paths?.length || 1} 项文件。<br/>此操作不可逆，无法从回收站恢复！
      </p>
      
      <div className="flex w-full gap-3">
        <button 
          onClick={closeModal}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          取消
        </button>
        <button 
          onClick={handleConfirm}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          确认删除
        </button>
      </div>
    </div>
  )
}

const WarningModal = () => {
  const { modalData, closeModal } = useModalStore()
  const [showDetails, setShowDetails] = useState(false)
  
  const getFriendlyMessage = (rawMessage?: string) => {
    if (!rawMessage) return '抱歉，操作未能成功。可能文件正被占用或权限不足。';
    const lower = rawMessage.toLowerCase();
    if (lower.includes('access is denied') || lower.includes('permission denied')) {
      return '很抱歉，权限不足，无法操作该文件或文件夹。';
    }
    if (lower.includes('used by another process') || lower.includes('in use')) {
      return '该文件正在被其他程序使用，请关闭相关程序后再试。';
    }
    if (lower.includes('no such file') || lower.includes('not found') || lower.includes('cannot find')) {
      return '找不到指定的文件，它可能已经被移动或删除。';
    }
    if (lower.includes('already exists')) {
      return '同名文件已存在。';
    }
    return '抱歉，操作未能成功，发生了一个未知错误。';
  }
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 text-red-500">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        <h2 className="text-xl font-bold">操作失败</h2>
      </div>
      
      <p className="text-gray-700 mb-2 text-sm text-center">
        {getFriendlyMessage(modalData?.message)}
      </p>

      <div className="w-full flex justify-end mb-4">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
          title={showDetails ? '隐藏详情' : '查看详情'}
        >
          <img src="/src/assets/icons/information_line.svg" className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity" alt="Details" />
        </button>
      </div>

      {showDetails && (
        <div className="w-full bg-gray-50 rounded p-3 mb-6 max-h-32 overflow-y-auto border border-gray-200">
          <p className="text-gray-600 text-xs font-mono break-all text-left">
            {modalData?.message || '未知错误'}
          </p>
        </div>
      )}
      
      <button 
        onClick={closeModal}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        确定
      </button>
    </div>
  )
}

const UnsavedWarningModal = () => {
  const { modalData, closeModal } = useModalStore()

  const handleConfirm = () => {
    if (modalData?.onConfirm) {
      modalData.onConfirm()
    }
    closeModal()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 text-yellow-500">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        <h2 className="text-xl font-bold">未保存的更改</h2>
      </div>
      <p className="text-gray-600 mb-6 text-sm text-center">
        您有未保存的修改，确认要离开吗？未保存的内容将会丢失。
      </p>
      
      <div className="flex w-full gap-3">
        <button 
          onClick={closeModal}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          取消
        </button>
        <button 
          onClick={handleConfirm}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          确认离开
        </button>
      </div>
    </div>
  )
}

export const ModalManager = () => {
  const { activeModal, openModal, closeModal } = useModalStore()
  const { isModalVisible, setModalVisible } = useTaskStore()

  useEffect(() => {
    EventsOn('paste:progress', (data: any) => {
      useTaskStore.getState().setTaskProgress(data)
    })

    EventsOn('paste:conflict', (data: any) => {
      openModal('conflict', data)
    })

    EventsOn('rename:conflict', (data: any) => {
      openModal('rename_conflict', data)
    })

    EventsOn('paste:error', (data: any) => {
      openModal('warning', { message: data.message || '操作过程中发生错误' })
    })

    EventsOn('paste:done', () => {
      useTaskStore.getState().clearTask()
      useUIStore.getState().triggerRefresh()
    })

    return () => {
      EventsOff('paste:progress')
      EventsOff('paste:conflict')
      EventsOff('paste:error')
      EventsOff('paste:done')
    }
  }, [])

  return (
    <AnimatePresence>
      {(activeModal || isModalVisible) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (activeModal) closeModal()
            if (isModalVisible) setModalVisible(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {isModalVisible && !activeModal && <ProgressModal />}
            {activeModal === 'conflict' && <ConflictModal />}
            {activeModal === 'rename_conflict' && <RenameConflictModal />}
            {activeModal === 'warning' && <WarningModal />}
            {activeModal === 'unsaved_warning' && <UnsavedWarningModal />}
            {activeModal === 'permanent_delete_confirm' && <PermanentDeleteConfirmModal />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
