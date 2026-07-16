import { useEffect, useState } from 'react'
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime'
import { useModalStore } from '../../store/modalStore'
import { useUIStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { CancelPaste, ResolvePasteConflict, RenameFile, PermanentDelete } from '../../../wailsjs/go/main/App'
import { Modal, Button, ProgressBar, Tooltip } from '@heroui/react'
import { useTooltipState } from '../../utils/useTooltipState'
import ScrollArea from './ScrollArea'

const ProgressModalContent = () => {
  const { taskData, operation, progress } = useTaskStore()
  
  const handleCancel = () => {
    if (taskData?.taskID) {
      CancelPaste(taskData.taskID)
    }
    useTaskStore.getState().clearTask()
  }

  const opName = operation === 'cut' ? '移动' : (operation === 'permanent_delete' ? '删除' : '复制')

  return (
    <>
      <Modal.Header className="flex flex-col gap-1 text-center items-center mt-2">
        正在执行的操作: {opName}
      </Modal.Header>
      <Modal.Body>
        <p className="text-gray-500 text-sm truncate w-full text-center">
          {taskData?.processedFiles || 0} / {taskData?.totalFiles || 0} 项
        </p>
        <ProgressBar value={progress} className="w-full mb-2">
          <ProgressBar.Track className="h-2.5 bg-gray-200 rounded-full w-full overflow-hidden">
            <ProgressBar.Fill className="h-2.5 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </ProgressBar.Track>
        </ProgressBar>
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={handleCancel}>
          取消
        </Button>
        <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" isDisabled>
          确认
        </Button>
      </Modal.Footer>
    </>
  )
}

const ConflictModalContent = () => {
  const { modalData, closeModal } = useModalStore()
  const [applyToAll, setApplyToAll] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const handleResolve = (action: string) => {
    setIsResolving(true)
    if (modalData?.taskID) {
      ResolvePasteConflict(modalData.taskID, action, applyToAll)
    }
  }

  // If a new conflict arrives, reset resolving state
  useEffect(() => {
    setIsResolving(false)
  }, [modalData?.destPath])

  return (
    <>
      <Modal.Header className="flex items-center gap-2 text-red-500 justify-center mt-2">
        {/* <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg> */}
        文件冲突
      </Modal.Header>
      <Modal.Body className="items-center">
        <p className="text-gray-500 text-sm text-center">
          目标文件夹中已存在同名文件：<br/>
          <span className="font-mono text-xs">{modalData?.destPath}</span>
        </p>
        
        <div className="flex flex-col gap-3 w-full my-2">
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white" isDisabled={isResolving} onPress={() => handleResolve('rename')}>
            保留两者 (自动补充后缀)
          </Button>
          <Button className="w-full bg-red-500 text-white hover:bg-red-600" isDisabled={isResolving} onPress={() => handleResolve('overwrite')}>
            覆盖目标文件
          </Button>
          <Button className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300" isDisabled={isResolving} onPress={() => handleResolve('skip')}>
            跳过该文件
          </Button>
        </div>

        <div className="flex justify-center w-full mt-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
            <input 
              type="checkbox" 
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-4 h-4 text-green-500 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
            />
            <span>为之后的所有冲突执行相同操作</span>
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer />
    </>
  )
}

const RenameConflictModalContent = () => {
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
    <>
      <Modal.Header className="flex items-center gap-2 text-red-500 justify-center mt-2">
        {/* <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg> */}
        重命名冲突
      </Modal.Header>
      <Modal.Body className="items-center">
        <p className="text-gray-500 text-sm text-center">
          当前文件夹中已存在名为 <span className="font-mono font-bold">{modalData?.name}</span> 的文件。
        </p>
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={closeModal}>
          取消
        </Button>
        <Button className="flex-1 bg-red-500 text-white hover:bg-red-600" onPress={() => handleResolve('overwrite')}>
          替换目标文件
        </Button>
      </Modal.Footer>
    </>
  )
}

const PermanentDeleteConfirmModalContent = () => {
  const { modalData, closeModal } = useModalStore()
  
  const handleConfirm = () => {
    if (modalData?.paths) {
      PermanentDelete(modalData.paths)
    }
    closeModal()
  }

  return (
    <>
      <Modal.Header className="flex items-center gap-2 text-red-500 justify-center mt-2">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        永久删除确认
      </Modal.Header>
      <Modal.Body className="items-center">
        <p className="text-gray-600 text-sm text-center">
          您即将永久删除选中的 {modalData?.paths?.length || 1} 项文件。<br/>此操作不可逆，无法从回收站恢复！
        </p>
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={closeModal}>
          取消
        </Button>
        <Button className="flex-1 bg-red-500 text-white hover:bg-red-600" onPress={handleConfirm}>
          确认删除
        </Button>
      </Modal.Footer>
    </>
  )
}

const WarningModalContent = () => {
  const detailTp = useTooltipState(200)
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
    <>
      <Modal.Header className="flex items-center gap-2 text-red-500 justify-center mt-2">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        操作失败
      </Modal.Header>
      <Modal.Body className="items-center w-full">
        <p className="text-gray-700 text-sm text-center mb-2">
          {getFriendlyMessage(modalData?.message)}
        </p>

        <div className="w-full flex justify-end mb-2">
          <Tooltip delay={200} isOpen={detailTp.isOpen}>
            <button 
              ref={detailTp.triggerRef as React.Ref<HTMLButtonElement>}
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
              {...detailTp.triggerProps}
            >
              <img src="/src/assets/icons/information_line.svg" className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity" alt="Details" />
            </button>
            <Tooltip.Content placement="left" triggerRef={detailTp.triggerRef}>{showDetails ? '隐藏详情' : '查看详情'}</Tooltip.Content>
          </Tooltip>
        </div>

        {showDetails && (
          <ScrollArea className="w-full bg-gray-50 rounded border border-gray-200 max-h-32" innerClassName="p-3">
            <p className="text-gray-600 text-xs font-mono break-all text-left">
              {modalData?.message || '未知错误'}
            </p>
          </ScrollArea>
        )}
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onPress={closeModal}>
          确定
        </Button>
      </Modal.Footer>
    </>
  )
}

const ConfirmModalContent = () => {
  const { modalData, closeModal } = useModalStore()

  return (
    <>
      <Modal.Header className="flex items-center justify-center mt-2">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6 mr-2" alt="confirm" />
        确认操作
      </Modal.Header>
      <Modal.Body className="items-center text-center">
        <p className="text-gray-600 text-sm">{modalData?.message}</p>
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={closeModal}>
          {modalData?.cancelButtonText || '取消'}
        </Button>
        <Button
          className={`flex-1 text-white ${modalData?.confirmVariant === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          onPress={() => {
            modalData?.onConfirm?.()
            closeModal()
          }}
        >
          {modalData?.confirmButtonText || '确认'}
        </Button>
      </Modal.Footer>
    </>
  )
}

const UnsavedWarningModalContent = () => {
  const { modalData, closeModal } = useModalStore()

  const handleConfirm = () => {
    if (modalData?.onConfirm) {
      modalData.onConfirm()
    }
    closeModal()
  }

  return (
    <>
      <Modal.Header className="flex items-center gap-2 text-yellow-500 justify-center mt-2">
        <img src="/src/assets/icons/warning_line.svg" className="w-6 h-6" alt="Warning" />
        未保存的更改
      </Modal.Header>
      <Modal.Body className="items-center">
        <p className="text-gray-600 text-sm text-center">
          您有未保存的修改，确认要离开吗？未保存的内容将会丢失。
        </p>
      </Modal.Body>
      <Modal.Footer className="w-full">
        <Button className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300" onPress={closeModal}>
          取消
        </Button>
        <Button className="flex-1 bg-orange-500 text-white" onPress={handleConfirm}>
          确认离开
        </Button>
      </Modal.Footer>
    </>
  )
}

export const ModalManager = () => {
  const { activeModal, openModal, closeModal } = useModalStore()
  const { isModalVisible, setModalVisible } = useTaskStore()

  useEffect(() => {
    EventsOn('paste:progress', (data: any) => {
      useTaskStore.getState().setTaskProgress(data)
      const activeModal = useModalStore.getState().activeModal
      if (activeModal === 'conflict') {
        useModalStore.getState().closeModal()
      }
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
      const activeModal = useModalStore.getState().activeModal
      if (activeModal === 'conflict') {
        useModalStore.getState().closeModal()
      }
      useUIStore.getState().triggerRefresh()
    })

    return () => {
      EventsOff('paste:progress')
      EventsOff('paste:conflict')
      EventsOff('paste:error')
      EventsOff('paste:done')
    }
  }, [])

  const isOpen = !!activeModal || isModalVisible

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (activeModal) closeModal()
      if (isModalVisible) setModalVisible(false)
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange} variant="opaque" className="bg-black/20">
        <Modal.Container placement="center">
          <Modal.Dialog className="sf-overlay relative rounded-lg border border-sf-border shadow-modal">
            {isModalVisible && !activeModal && <ProgressModalContent />}
            {activeModal === 'conflict' && <ConflictModalContent />}
            {activeModal === 'rename_conflict' && <RenameConflictModalContent />}
            {activeModal === 'warning' && <WarningModalContent />}
            {activeModal === 'unsaved_warning' && <UnsavedWarningModalContent />}
            {activeModal === 'permanent_delete_confirm' && <PermanentDeleteConfirmModalContent />}
            {activeModal === 'confirm' && <ConfirmModalContent />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
