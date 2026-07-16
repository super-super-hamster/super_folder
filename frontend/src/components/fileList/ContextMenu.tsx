import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContextMenuStore } from '../../store/contextMenuStore'
import { useSelectionStore } from '../../store/selectionStore'
import { useChineseConvStore } from '../../store/chineseConvStore'
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
import { usePrivacyStore } from '../../store/privacyStore'
import { isImage } from '../../utils/fileFormatting'
import { buildSimilarPath } from '../similar/SimilarImages'
import { PasteFiles, DeleteToRecycleBin, CreateFolder, CreateFile, ReadDir, GetConvertibleFormats, OpenFileWithDefault, OpenInExplorer, OpenInTerminal, GetSimilarImageThresholds, GetProtectedPaths } from '../../../wailsjs/go/main/App'
import { ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import LottieLib, { LottieRefCurrentProps } from 'lottie-react'
const Lottie = (LottieLib as any).default || LottieLib
import copyAnim from '../../assets/anim/copy.json'
import trashAnim from '../../assets/anim/trash.json'

export default function ContextMenu() {
  const { isVisible, x, y, targetPath, targetName, isDir, closeMenu, containerRect, fileDirMap } = useContextMenuStore()
  const { copy, cut, items: clipboardItems, operation } = useClipboardStore()
  const { selectedPaths, clearSelection } = useSelectionStore()
  const { startRename } = useRenameStore()
  const { setFiles: setBatchRenameFiles } = useBatchRenameStore()
  const { addFiles: addChineseConvFiles } = useChineseConvStore()
  const { favorites, toggleFavorite } = useFavoriteStore()
  const { state: privacyState, setPathProtected } = usePrivacyStore()
  const { triggerRefresh } = useUIStore()
  const { tabs, activeTabId, navigate } = useTabsStore()
  const { smartFolders, setSmartFolders, doubleClickOpenMode } = useSettingsStore()
  const { viewMode } = useUIStore()
  const isAlbumView = viewMode === 'album'
  const isRunning = useTaskStore(state => state.isRunning)
  const copyLottieRef = useRef<LottieRefCurrentProps>(null)
  const trashLottieRef = useRef<LottieRefCurrentProps>(null)

  const [convertibleFormats, setConvertibleFormats] = useState<string[]>([])
  const [convertibleFormatsKey, setConvertibleFormatsKey] = useState('')
  const [targetProtected, setTargetProtected] = useState(false)

  useEffect(() => {
    if (isVisible && targetPath && !isDir) {
      const selectedFiles = Array.from(selectedPaths)
      const targets = selectedFiles.includes(targetPath) ? selectedFiles : [targetPath]
      const includesDirectory = targets.some(path => path === targetPath ? isDir : fileDirMap[path] === true)
      const key = targets.join('\n')
      setConvertibleFormats([])
      setConvertibleFormatsKey(includesDirectory ? '' : key)
      if (includesDirectory) return
      let isCurrent = true
      GetConvertibleFormats(targets).then(formats => {
        if (isCurrent) setConvertibleFormats(formats || [])
      }).catch(() => {
        if (isCurrent) setConvertibleFormats([])
      })
      return () => { isCurrent = false }
    } else {
      setConvertibleFormats([])
      setConvertibleFormatsKey('')
    }
  }, [isVisible, targetPath, selectedPaths, isDir, fileDirMap])

  useEffect(() => {
    if (isVisible && targetPath && privacyState?.mode === 'privacy' && !targetPath.startsWith('smartfolder://')) {
      GetProtectedPaths([targetPath]).then(res => setTargetProtected(!!res[targetPath])).catch(() => setTargetProtected(false))
    } else {
      setTargetProtected(false)
    }
  }, [isVisible, targetPath, privacyState?.mode])

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

  const currentPath = tabs.find(t => t.id === activeTabId)?.currentPath
  const targetExt = targetPath && !isDir ? targetPath.substring(targetPath.lastIndexOf('.')).toLowerCase() : ''
  const canChineseConvert = targetExt === '.txt' || targetExt === '.epub'
  const targetFolderPath = targetPath && targetPath.includes('\\') ? targetPath.substring(0, targetPath.lastIndexOf('\\')) : currentPath
  const selectedTargets = targetPath ? (Array.from(selectedPaths).includes(targetPath) ? Array.from(selectedPaths) : [targetPath]) : []
  const selectedTargetsKey = selectedTargets.join('\n')
  const selectedIncludesDirectory = selectedTargets.some(path => path === targetPath ? isDir : fileDirMap[path] === true)
  const canShowConvert = !isDir && !selectedIncludesDirectory && convertibleFormatsKey === selectedTargetsKey && convertibleFormats.length > 0

  const handleAction = (action: string) => {
    const selectedFiles = Array.from(selectedPaths)
    const targets = selectedFiles.includes(targetPath) ? selectedFiles : [targetPath]

    switch(action) {
      case 'open_with_default':
        targets.forEach(path => {
          OpenFileWithDefault(path).catch(console.error)
        })
        break
      case 'open_in_app':
        targets.forEach(path => {
          navigate(path, path.split('\\').pop() || path, false)
        })
        break
      case 'open_in_explorer':
        targets.forEach(path => {
          OpenInExplorer(path).catch(console.error)
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
      case 'chinese_conv':
        {
          const filePaths = targets.filter(p => {
            const ext = (p.split('\\').pop() || '').toLowerCase()
            const dot = ext.lastIndexOf('.')
            return dot !== -1 && (ext.slice(dot) === '.txt' || ext.slice(dot) === '.epub')
          })
          if (filePaths.length > 0) {
            addChineseConvFiles(filePaths)
            navigate((targetFolderPath || currentPath || 'C:\\') + '\\简繁转换', '简繁转换', false)
          }
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
      case 'protect':
        if (targetPath) {
          setPathProtected(targetPath, isDir, !targetProtected).catch(console.error)
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
      case 'find_similar':
        if (targetPath) {
          const imagePath = targetPath
          const folderPath = imagePath.substring(0, imagePath.lastIndexOf('\\')) || currentPath || 'C:\\'
          const query = new URLSearchParams({
            path: imagePath,
            subfolders: 'false',
            threshold: '5',
            useMax: 'false'
          })
          const similarPath = buildSimilarPath(folderPath, query)
          navigate(similarPath, '相似图片', false)
        }
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

      // Wait for directory refresh and virtual list to render the new item
      let attempts = 0
      const poll = setInterval(() => {
        const el = document.getElementById(`file-${newPath}`)
        if (el) {
          clearInterval(poll)
          el.scrollIntoView({ block: 'center' })
          startRename(newPath, newName, el.getBoundingClientRect())
        } else if (attempts > 30) {
          clearInterval(poll)
        }
        attempts++
      }, 100)

    } catch (e) {
      console.error('handleCreate 异常', e)
      useModalStore.getState().openModal('warning', { message: `创建失败: ${e}` })
    }
  }

  const MENU_WIDTH = 176
  const ITEM_HEIGHT = 34
  const DIVIDER_HEIGHT = 9
  const PADDING_Y = 16

  let itemCount = 0
  let dividerCount = 0

  if (targetPath === '__create_smart_folder__') {
    itemCount = 0
  } else if (targetPath) {
    if (targetPath.startsWith('smartfolder://')) {
      itemCount = 1
    } else {
      itemCount = 5 // copy, cut, paste, favorite, rename
      dividerCount++ // after paste
      if (privacyState?.mode === 'privacy') {
        itemCount++
      }
      if (!isDir && canChineseConvert) {
        itemCount++ // chinese_conv
      }
      if (canShowConvert) {
        itemCount++ // convert
      }
      itemCount++ // delete
      dividerCount++ // before copy-path
      itemCount++ // copy-path
      if (isDir) {
        itemCount += 2 // open_in_explorer, open_terminal
      } else {
        itemCount++ // open_in_app or open_with_default
        if (isImage(targetPath.substring(targetPath.lastIndexOf('.')))) {
          itemCount++ // find_similar
        }
      }
    }
  } else {
    itemCount = 1 // refresh
    if (currentPath && !currentPath.startsWith('favorite://') && !currentPath.startsWith('recent://') && !currentPath.startsWith('smartfolder://') && !currentPath.startsWith('preset://')) {
      itemCount++ // paste
      dividerCount++
      itemCount++ // new folder
      if (!isAlbumView) {
        itemCount++ // new file
      }
      dividerCount++
      itemCount += 2 // copy-path, open_terminal
    }
  }

  const menuHeight = itemCount * ITEM_HEIGHT + dividerCount * DIVIDER_HEIGHT + PADDING_Y

  let menuX = x
  let menuY = y
  if (containerRect) {
    if (menuX + MENU_WIDTH > containerRect.right) {
      menuX = Math.max(containerRect.left, x - MENU_WIDTH)
    }
    if (menuY + menuHeight > containerRect.bottom) {
      menuY = Math.max(containerRect.top, y - menuHeight)
    }
    menuY = Math.max(menuY, containerRect.top)
  } else {
    if (menuX + MENU_WIDTH > window.innerWidth) {
      menuX = Math.max(0, window.innerWidth - MENU_WIDTH)
    }
    if (menuY + menuHeight > window.innerHeight) {
      menuY = Math.max(0, y - menuHeight)
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
        style={{ top: menuY, left: menuX }}
        className="sf-paper-raised sf-context-menu sf-motion-surface fixed z-[60] w-44 rounded-lg border py-2 flex flex-col text-sm text-sf-text font-medium overflow-hidden"
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
            {privacyState?.mode === 'privacy' && (
              <button onClick={() => handleAction('protect')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                <img src={`/src/assets/icons/${targetProtected ? 'unlock_line.svg' : 'lock_line.svg'}`} className="w-4 h-4 mr-3 opacity-70" alt="protect" />
                {targetProtected ? '解除保护' : '保护'}
              </button>
            )}
            <button onClick={() => handleAction('rename')} className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
              <div className="flex items-center">
                <img src="/src/assets/icons/edit_3_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="rename" />
                重命名
              </div>
              <span className="text-gray-400 text-xs tracking-wider">F2</span>
            </button>
            {!isDir && canChineseConvert && (
              <button
                onClick={() => handleAction('chinese_conv')}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left"
              >
                <img src="/src/assets/icons/transfer_horizontal_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="简繁转换" />
                简繁转换
              </button>
            )}
            {canShowConvert && (
              <button
                onClick={() => handleAction('convert')}
                disabled={convertibleFormats.length === 0 || isRunning}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <img src="/src/assets/icons/transfer_horizontal_line.svg" className={`w-4 h-4 mr-3 ${convertibleFormats.length === 0 ? 'opacity-40' : 'opacity-70'}`} alt="convert" />
                <span className={convertibleFormats.length === 0 ? 'text-gray-400' : ''}>转换</span>
              </button>
            )}
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
            {isDir ? (
              <>
                <button onClick={() => handleAction('open_in_explorer')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/directory_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open explorer" />
                  在文件资源管理器中打开
                </button>
                <button onClick={() => handleAction('open_terminal')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                  <img src="/src/assets/icons/terminal_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open terminal" />
                  在终端中打开
                </button>
              </>
            ) : (
              <>
                {doubleClickOpenMode === 'defaultProgram' ? (
                  <button onClick={() => handleAction('open_in_app')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                    <img src="/src/assets/icons/share_3_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open in app" />
                    应用内打开
                  </button>
                ) : (
                  <button onClick={() => handleAction('open_with_default')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                    <img src="/src/assets/icons/share_3_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="open with default" />
                    使用默认程序打开
                  </button>
                )}
                {targetPath && isImage(targetPath.substring(targetPath.lastIndexOf('.'))) && (
                  <button onClick={() => handleAction('find_similar')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                    <img src="/src/assets/icons/photo_album_2_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="find similar" />
                    和它相似的图
                  </button>
                )}
              </>
            )}
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
                {!isAlbumView && (
                  <>
                    <button onClick={() => handleCreate('file')} className="flex items-center w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left">
                      <img src="/src/assets/icons/file_new_line.svg" className="w-4 h-4 mr-3 opacity-70" alt="new file" />
                      新建文件
                    </button>
                  </>
                )}
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
