import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContextMenuStore } from '../../store/contextMenuStore'
import { useSelectionStore } from '../../store/selectionStore'
import { useClipboardStore } from '../../store/clipboardStore'
import { useRenameStore } from '../../store/renameStore'
import { useBatchRenameStore } from '../../store/batchRenameStore'
import { useFavoriteStore } from '../../store/favoriteStore'
import { useUIStore } from '../../store/uiStore'
import { useTabsStore } from '../../store/tabsStore'
import { useModalStore } from '../../store/modalStore'
import { useTaskStore } from '../../store/taskStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useConversionStore, ConversionFile } from '../../store/conversionStore'
import { PasteFiles, DeleteToRecycleBin, CreateFolder, CreateFile, ReadDir, GetConvertibleFormats, OpenFileWithDefault, OpenInTerminal } from '../../../wailsjs/go/main/App'
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import copyAnim from '../../assets/anim/copy.json'
import trashAnim from '../../assets/anim/trash.json'

export default function ContextMenu() {
  const { isVisible, x, y, targetPath, targetName, isDir, closeMenu } = useContextMenuStore()
  const { copy, cut, items: clipboardItems, operation } = useClipboardStore()
  const { selectedPaths, clearSelection } = useSelectionStore()
  const { startRename } = useRenameStore()
  const { setFiles: setBatchRenameFiles } = useBatchRenameStore()
  const { favorites, toggleFavorite } = useFavoriteStore()
  const { triggerRefresh } = useUIStore()
  const { tabs, activeTabId, navigate } = useTabsStore()
  const { smartFolders, setSmartFolders } = useSettingsStore()
  const isRunning = useTaskStore(state => state.isRunning)
  const copyLottieRef = useRef<LottieRefCurrentProps>(null)
  const trashLottieRef = useRef<LottieRefCurrentProps>(null)

  const [convertibleFormats, setConvertibleFormats] = useState<string[]>([])

  useEffect(() => {
    if (isVisible && targetPath) {
      const selectedFiles = Array.from(selectedPaths)
      const targets = selectedFiles.includes(targetPath) ? selectedFiles : [targetPath]
      GetConvertibleFormats(targets).then(formats => {
        setConvertibleFormats(formats || [])
      }).catch(() => setConvertibleFormats([]))
    } else {
      setConvertibleFormats([])
    }
  }, [isVisible, targetPath, selectedPaths])

  useEffect(() => {
    const handleGlobalClick = () => {
      if (isVisible) closeMenu()
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [isVisible, closeMenu])

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) closeMenu()
    }
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [isVisible, closeMenu])

  if (!isVisible) return null

  // Ensure menu stays within screen bounds
  const menuWidth = 176 // w-44 = 176px
  const menuHeight = targetPath ? 300 : 220 // Safe height estimates
  
  let posX = x
  if (x + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 10
  }
  if (posX < 10) posX = 10

  let posY = y
  if (y + menuHeight > window.innerHeight) {
    posY = y - menuHeight // open upwards
  }
  if (posY < 10) posY = 10

  const currentPath = tabs.find(t => t.id === activeTabId)?.currentPath

  const handleAction = (action: string) => {
    const selectedFiles = Array.from(selectedPaths)
    const targets = selectedFiles.includes(targetPath) ? selectedFiles : [targetPath]

    switch(action) {
      case 'open_with_default':
        targets.forEach(path => {
          OpenFileWithDefault(path).catch(console.error)
        })
        break
      case 'open_terminal':
        if (targetPath) {
          OpenInTerminal(targets[0]).catch(console.error)
        } else if (currentPath) {
          OpenInTerminal(currentPath).catch(console.error)
        }
        break
      case 'convert':
        if (currentPath && convertibleFormats.length > 0) {
          const store = useConversionStore.getState()
          store.clear()
          store.setAvailableFormats(convertibleFormats)
          store.setTargetFormat(convertibleFormats[0])
          store.setOriginalPath(currentPath)

          // derive files
          const files: ConversionFile[] = targets.map(p => {
            const parts = p.split('\\')
            const fullName = parts[parts.length - 1]
            const dotIdx = fullName.lastIndexOf('.')
            const name = dotIdx !== -1 ? fullName.substring(0, dotIdx) : fullName
            const ext = dotIdx !== -1 ? fullName.substring(dotIdx) : ''
            return { path: p, name, ext, status: 'pending' }
          })
          store.setFiles(files)

          navigate(currentPath + '\\转换', '转换')
        }
        break
      case 'copy':
        copy(targets.map(p => ({ path: p, name: '', ext: '', isDir: false, size: 0, modTime: '' } as any)))
        clearSelection()
        break
      case 'cut':
        cut(targets.map(p => ({ path: p, name: '', ext: '', isDir: false, size: 0, modTime: '' } as any)))
        clearSelection()
        break
      case 'paste':
        if (useTaskStore.getState().isRunning) {
          useTaskStore.getState().notifyBlockedAction('粘贴')
          break
        }
        if (clipboardItems.length > 0 && currentPath && operation) {
          PasteFiles(operation, clipboardItems.map(f => f.path), currentPath).catch(console.error)
        }
        break
      case 'delete':
        if (useTaskStore.getState().isRunning) {
          useTaskStore.getState().notifyBlockedAction('删除')
          break
        }
        DeleteToRecycleBin(targets).then(() => triggerRefresh()).catch(console.error)
        break
      case 'delete_smart_folder':
        if (targetPath && targetPath.startsWith('smartfolder://')) {
          const sfId = targetPath.replace('smartfolder://', '')
          setSmartFolders(smartFolders.filter(f => f.id !== sfId))
          triggerRefresh()
        }
        break
      case 'rename':
        if (targets.length === 1) {
          const el = document.getElementById(`file-${targetPath}`)
          if (el) {
            startRename(targetPath, targetName, el.getBoundingClientRect())
          }
        } else if (targets.length > 1) {
          // Since ContextMenu doesn't have the file objects directly, we can read them
          // Or we can just use the global useFileListStore if we had one.
          // Wait, we can fetch them via ReadDir or just dispatch a custom event.
          window.dispatchEvent(new CustomEvent('triggerBatchRename'))
        }
        break
      case 'favorite':
        if (targetPath) {
          toggleFavorite(targetPath, isDir).catch(console.error)
        }
        break
      case 'copy-path':
        if (targetPath) {
          ClipboardSetText(targets.length === 1 ? targets[0] : targets.join('\n'))
        } else if (currentPath) {
          ClipboardSetText(currentPath)
        }
        clearSelection()
        break
      case 'refresh':
        triggerRefresh()
        break
    }
    closeMenu()
  }

  const handleCreate = async (type: 'folder' | 'file') => {
    if (!currentPath) return
    closeMenu()
    
    try {
      const files = await ReadDir(currentPath)
      const existingNames = new Set(files.map(f => f.name.toLowerCase()))
      
      let baseName = type === 'folder' ? '新建文件夹' : '新建文件'
      let ext = type === 'file' ? '.txt' : ''
      let newName = baseName + ext
      let counter = 1
      
      while (existingNames.has(newName.toLowerCase())) {
        newName = `${baseName} (${counter})${ext}`
        counter++
      }
      
      const newPath = `${currentPath}\\${newName}`
      
      if (type === 'folder') {
        try {
          await CreateFolder(newPath)
          useUIStore.getState().triggerRefresh()
        } catch (err: any) {
          useModalStore.getState().openModal('warning', { message: `创建文件夹失败: ${err}` })
        }
      } else {
        try {
          await CreateFile(newPath)
          useUIStore.getState().triggerRefresh()
        } catch (err: any) {
          useModalStore.getState().openModal('warning', { message: `创建文件失败: ${err}` })
        }
      }
      
      useUIStore.getState().setScrollToPath(newPath)
      
      // Wait for DOM to update and start rename
      let attempts = 0
      const poll = setInterval(() => {
        const el = document.getElementById(`file-${newPath}`)
        if (el) {
          clearInterval(poll)
          startRename(newPath, newName, el.getBoundingClientRect())
        } else if (attempts > 20) {
          clearInterval(poll)
        }
        attempts++
      }, 50)
      
    } catch (e) {
      console.error(e)
    }
  }

  const renderIcon = (path: string, viewBox: string = "0 0 24 24") => (
    <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" viewBox={viewBox} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: posY, left: posX }}
        className="fixed z-[60] w-44 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 py-2 flex flex-col text-sm text-gray-800 font-medium overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {targetPath === '__create_smart_folder__' ? null : targetPath ? (
          targetPath.startsWith('smartfolder://') ? (
            <button 
              onClick={() => handleAction('delete_smart_folder')} 
              className="flex items-center w-full px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-left"
            >
              <div className="flex items-center">
                <img src="/src/assets/icons/delete_bin_line.svg" className="w-4 h-4 mr-3" alt="delete" />
                删除
              </div>
            </button>
          ) : (
          <>
            <button 
              onClick={() => handleAction('copy')} 
              onMouseEnter={() => {
                copyLottieRef.current?.setSpeed(0.33);
                copyLottieRef.current?.setDirection(1);
                copyLottieRef.current?.goToAndPlay(0, true);
              }}
              onMouseLeave={() => {
                copyLottieRef.current?.setSpeed(0.33);
                copyLottieRef.current?.setDirection(-1);
                copyLottieRef.current?.play();
              }}
              className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center">
                <div className="w-4 h-4 mr-3 flex items-center justify-center opacity-70">
                  <Lottie lottieRef={copyLottieRef} animationData={copyAnim} autoplay={false} loop={false} />
                </div>
                复制
              </div>
              <span className="text-gray-400 text-xs tracking-wider">Ctrl+C</span>
            </button>
            <button onClick={() => handleAction('cut')} className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              <div className="flex items-center">
                <img src="/src/assets/icons/scissors_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="cut" />
                剪切
              </div>
              <span className="text-gray-400 text-xs tracking-wider">Ctrl+X</span>
            </button>
            <button onClick={() => handleAction('paste')} className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed" disabled={clipboardItems.length === 0}>
              <div className="flex items-center">
                {renderIcon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2")}
                粘贴
              </div>
              <span className="text-gray-400 text-xs tracking-wider">Ctrl+V</span>
            </button>
            <div className="h-px bg-gray-200 my-1 mx-2" />
            <button onClick={() => handleAction('favorite')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              {favorites.has(targetPath) ? (
                <>
                  <img src="/src/assets/icons/star_fill.svg" className="w-4 h-4 mr-3" alt="unfavorite" />
                  取消收藏
                </>
              ) : (
                <>
                  <img src="/src/assets/icons/star_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="favorite" />
                  收藏
                </>
              )}
            </button>
            <button onClick={() => handleAction('rename')} className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              <div className="flex items-center">
                {renderIcon("M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z")}
                重命名
              </div>
              <span className="text-gray-400 text-xs tracking-wider">F2</span>
            </button>
            <button 
              onClick={() => handleAction('convert')} 
              disabled={convertibleFormats.length === 0 || isRunning}
              className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <img src="/src/assets/icons/transfer_horizontal_line.svg" className={`w-4 h-4 mr-3 ${convertibleFormats.length === 0 ? 'opacity-40' : 'opacity-70'}`} alt="convert" />
              <span className={convertibleFormats.length === 0 ? 'text-gray-400' : ''}>转换</span>
            </button>
            <button 
              onClick={() => handleAction('delete')} 
              onMouseEnter={() => {
                trashLottieRef.current?.setDirection(1);
                trashLottieRef.current?.goToAndPlay(0, true);
              }}
              onMouseLeave={() => {
                trashLottieRef.current?.setDirection(-1);
                trashLottieRef.current?.play();
              }}
              className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-4 h-4 mr-3 flex items-center justify-center opacity-80">
                  <Lottie lottieRef={trashLottieRef} animationData={trashAnim} autoplay={false} loop={false} />
                </div>
                删除
              </div>
              <span className="text-gray-400 text-xs tracking-wider">Del</span>
            </button>
            <div className="h-px bg-gray-200 my-1 mx-2" />
            <button onClick={() => handleAction('copy-path')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              <img src="/src/assets/icons/directory_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="copy path" />
              复制路径
            </button>
            {isDir && (
              <button onClick={() => handleAction('open_terminal')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                <img src="/src/assets/icons/terminal_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open terminal" />
                在终端中打开
              </button>
            )}
            <button onClick={() => handleAction('open_with_default')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              <img src="/src/assets/icons/share_3_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open" />
              使用默认程序打开
            </button>
          </>
          )
        ) : (
          <>
            <button onClick={() => handleAction('refresh')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              {renderIcon("M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15")}
              刷新
            </button>
            {currentPath && !currentPath.startsWith('favorite://') && !currentPath.startsWith('recent://') && !currentPath.startsWith('smartfolder://') && !currentPath.startsWith('preset://') && (
              <>
                <button onClick={() => handleAction('paste')} className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed" disabled={clipboardItems.length === 0}>
                  <div className="flex items-center">
                    {renderIcon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2")}
                    粘贴
                  </div>
                  <span className="text-gray-400 text-xs tracking-wider">Ctrl+V</span>
                </button>
                <div className="h-px bg-gray-200 my-1 mx-2" />
                <button onClick={() => handleCreate('folder')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/new_folder_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="new folder" />
                  新建文件夹
                </button>
                <button onClick={() => handleCreate('file')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/file_new_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="new file" />
                  新建文件
                </button>
                <div className="h-px bg-gray-200 my-1 mx-2" />
                <button onClick={() => handleAction('copy-path')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/directory_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="copy path" />
                  复制当前路径
                </button>
                <button onClick={() => handleAction('open_terminal')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/terminal_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open terminal" />
                  在终端中打开
                </button>
              </>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
