import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Select, ListBox, Tooltip } from '@heroui/react'
import { useTooltipState } from '../../utils/useTooltipState'
import { useChineseConvStore } from '../../store/chineseConvStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useTabsStore } from '../../store/tabsStore'
import { ConvertChineseFiles, SelectDirectory, SelectFiles } from '../../../wailsjs/go/main/App'
import { chineseconv } from '../../../wailsjs/go/models'

const schemeOptions = [
  { key: 's2t', label: '简体 → 繁体' },
  { key: 't2s', label: '繁体 → 简体' },
  { key: 's2tw', label: '简体 → 台湾繁体' },
  { key: 'tw2s', label: '台湾繁体 → 简体' },
  { key: 's2hk', label: '简体 → 香港繁体' },
  { key: 'hk2s', label: '香港繁体 → 简体' },
]

export default function ChineseConvView() {
  const importFileTp = useTooltipState(200)
  const importFolderTp = useTooltipState(200)
  const {
    files,
    baseScheme,
    customSchemeId,
    isProcessing,
    isPaused,
    addFiles,
    removeFile,
    clear,
    updateFileStatus,
    setBaseScheme,
    setCustomSchemeId,
    setIsProcessing,
    setIsPaused,
  } = useChineseConvStore()

  const { chineseConvSchemes } = useSettingsStore()
  const { popCurrent } = useTabsStore()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isProcessing || isPaused) return

    let cancelled = false
    const run = async () => {
      const scheme = chineseConvSchemes.find(s => s.id === customSchemeId)
      const pairs: chineseconv.CustomPair[] = (scheme?.pairs || []).map(p => ({
        from: p.from,
        to: p.to,
      }))

      const currentFiles = useChineseConvStore.getState().files
      for (const file of currentFiles) {
        if (cancelled || useChineseConvStore.getState().isPaused || !useChineseConvStore.getState().isProcessing) break
        if (file.status === 'success' || file.status === 'error') continue

        useChineseConvStore.getState().updateFileStatus(file.path, 'converting')
        try {
          await ConvertChineseFiles([file.path], baseScheme, pairs)
          useChineseConvStore.getState().updateFileStatus(file.path, 'success')
        } catch (e: any) {
          console.error('Convert failed', file.path, e)
          useChineseConvStore.getState().updateFileStatus(file.path, 'error')
          setErrorMsg(e?.message || String(e))
        }
      }
      setIsProcessing(false)
    }

    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, isPaused])

  const handleImportFolder = async () => {
    const dir = await SelectDirectory()
    if (!dir) return
    try {
      const result = await (window as any).go?.main?.App?.ReadDir?.(dir)
      const entries = result || []
      const paths: string[] = []
      for (const e of entries) {
        const ext = (e.ext || '').toLowerCase()
        if (!e.isDir && (ext === '.txt' || ext === '.epub')) {
          paths.push(e.path)
        }
      }
      addFiles(paths)
    } catch (e) {
      console.error(e)
    }
  }

  const handleImportFiles = async () => {
    try {
      const paths = await SelectFiles()
      if (paths) addFiles(paths)
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartPause = () => {
    if (isProcessing) {
      setIsPaused(!isPaused)
    } else {
      setIsProcessing(true)
      setIsPaused(false)
    }
  }

  const handleCancel = () => {
    setIsProcessing(false)
    clear()
    popCurrent()
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error')

  return (
    <div className="h-full w-full bg-white flex flex-col p-8 select-none overflow-hidden relative">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">选择转换配置:</span>
              <Select
                selectedKey={baseScheme}
                onSelectionChange={(key) => {
                  const selected = Array.from(key as any)[0] || key
                  setBaseScheme(selected as string)
                }}
                className="w-48"
                aria-label="Base Scheme"
              >
                <Select.Trigger className="bg-white border border-gray-300 rounded-lg shadow-none h-10 min-h-0 flex items-center px-3">
                  <Select.Value className="text-sm text-gray-800 bg-transparent w-full truncate" />
                </Select.Trigger>
                <Select.Popover className="border border-gray-200 shadow-lg rounded-xl">
                  <ListBox>
                    {schemeOptions.map(opt => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-sm text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-gray-200 data-[selected=true]:text-black transition-colors cursor-pointer px-3 py-2"
                      >
                        {opt.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {chineseConvSchemes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">自定义方案:</span>
                <Select
                  selectedKey={customSchemeId || ''}
                  onSelectionChange={(key) => {
                    const selected = Array.from(key as any)[0] || key
                    setCustomSchemeId((selected as string) || null)
                  }}
                  className="w-48"
                  aria-label="Custom Scheme"
                >
                  <Select.Trigger className="bg-white border border-gray-300 rounded-lg shadow-none h-10 min-h-0 flex items-center px-3">
                    <Select.Value className="text-sm text-gray-800 bg-transparent w-full truncate" />
                  </Select.Trigger>
                  <Select.Popover className="border border-gray-200 shadow-lg rounded-xl">
                    <ListBox>
                      <ListBox.Item
                        key=""
                        id=""
                        textValue="不使用"
                        className="text-sm text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-gray-200 data-[selected=true]:text-black transition-colors cursor-pointer px-3 py-2"
                      >
                        不使用
                      </ListBox.Item>
                      {chineseConvSchemes.map(s => (
                        <ListBox.Item
                          key={s.id}
                          id={s.id}
                          textValue={s.name}
                          className="text-sm text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-gray-200 data-[selected=true]:text-black transition-colors cursor-pointer px-3 py-2"
                        >
                          {s.name}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip delay={200} isOpen={importFileTp.isOpen}>
              <button
                ref={importFileTp.triggerRef as React.Ref<HTMLButtonElement>}
                onClick={handleImportFiles}
                disabled={isProcessing}
                className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors disabled:opacity-50"
                {...importFileTp.triggerProps}
              >
                <img src="/src/assets/icons/file_new_line.svg" className="w-5 h-5 brightness-0 invert" alt="文件" />
              </button>
              <Tooltip.Content placement="top" triggerRef={importFileTp.triggerRef}>从文件导入</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={200} isOpen={importFolderTp.isOpen}>
              <button
                ref={importFolderTp.triggerRef as React.Ref<HTMLButtonElement>}
                onClick={handleImportFolder}
                disabled={isProcessing}
                className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors disabled:opacity-50"
                {...importFolderTp.triggerProps}
              >
                <img src="/src/assets/icons/new_folder_line.svg" className="w-5 h-5 brightness-0 invert" alt="文件夹" />
              </button>
              <Tooltip.Content placement="top" triggerRef={importFolderTp.triggerRef}>从文件夹导入</Tooltip.Content>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 rounded-3xl p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">已添加 {files.length} 个文件</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
            <AnimatePresence>
              {files.map(file => (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white transition-colors ${file.status === 'success' ? 'bg-green-50' : ''} ${file.status === 'error' ? 'bg-red-50' : ''}`}
                >
                  <span className="text-gray-800 text-[15px] font-medium truncate flex-1 mr-4">
                    {file.name}{file.ext}
                  </span>

                  <div className="flex items-center space-x-3">
                    {file.status === 'converting' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-700"
                      />
                    )}
                    {file.status === 'error' && <span className="text-red-500 text-xs font-bold">失败</span>}
                    {file.status === 'success' && <img src="/src/assets/icons/check_line.svg" className="w-5 h-5 opacity-90" alt="成功" />}
                    <button
                      onClick={() => removeFile(file.path)}
                      disabled={isProcessing}
                      className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 opacity-60" alt="删除" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {files.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <img src="/src/assets/icons/document_line.svg" className="w-12 h-12 opacity-30 mb-3" />
                <span className="text-sm">请从文件夹或文件导入</span>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{errorMsg}</div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>

          <button
            onClick={handleStartPause}
            disabled={files.length === 0 || allDone}
            className={`px-8 py-2 rounded-full text-sm font-medium transition-colors ${
              isProcessing && !isPaused
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? (isPaused ? '继续' : '暂停') : '开始转换'}
          </button>
        </div>
      </div>
    </div>
  )
}
