import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Select, ListBox } from '@heroui/react'
import { useConversionStore } from '../../store/conversionStore'
import { useTabsStore } from '../../store/tabsStore'
import { ConvertFile } from '../../../wailsjs/go/main/App'

export default function ConversionView() {
  const { 
    files, 
    targetFormat, 
    availableFormats, 
    isProcessing, 
    isPaused, 
    originalPath,
    setTargetFormat, 
    removeFile, 
    updateFileStatus, 
    setIsProcessing, 
    setIsPaused,
    clear
  } = useConversionStore()
  
  const { popCurrent } = useTabsStore()

  const handleCancel = () => {
    setIsProcessing(false)
    clear()
    popCurrent()
  }

  const handleStartPause = () => {
    if (isProcessing) {
      if (!isPaused) {
        setIsPaused(true)
      } else {
        setIsPaused(false)
      }
    } else {
      setIsProcessing(true)
      setIsPaused(false)
    }
  }

  useEffect(() => {
    if (!isProcessing || isPaused) return

    let isCancelled = false
    const processQueue = async () => {
      for (const file of files) {
        if (isCancelled || useConversionStore.getState().isPaused || !useConversionStore.getState().isProcessing) break
        
        if (file.status === 'pending') {
          updateFileStatus(file.path, 'converting')
          try {
            await ConvertFile(file.path, targetFormat)
            updateFileStatus(file.path, 'success')
          } catch (e) {
            console.error('Conversion failed for', file.path, e)
            updateFileStatus(file.path, 'error')
          }
        }
      }
      
      const state = useConversionStore.getState()
      if (!isCancelled && !state.isPaused && state.files.every(f => f.status === 'success' || f.status === 'error')) {
        setIsProcessing(false)
      }
    }

    processQueue()

    return () => { isCancelled = true }
  }, [isProcessing, isPaused, files, targetFormat, updateFileStatus, setIsProcessing])

  const allDone = files.every(f => f.status === 'success' || f.status === 'error')

  // Derive original format display
  let originalFormatDisplay = '多个格式'
  if (files.length > 0) {
    const firstExt = files[0].ext.toLowerCase().replace('.', '')
    const allSame = files.every(f => f.ext.toLowerCase().replace('.', '') === firstExt)
    if (allSame && firstExt) {
      originalFormatDisplay = firstExt
    }
  }

  return (
    <div className="h-full w-full bg-white flex flex-col p-8 select-none overflow-hidden relative">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto relative">
        {/* Top Header */}
        <div className="flex items-center justify-center space-x-12 mb-8 mt-4">
          <div className="text-4xl font-medium text-gray-900 tracking-wide w-40 text-right">
            {originalFormatDisplay}
          </div>
          <div className="text-gray-400">
            <img src="/src/assets/icons/large_arrow_right_fill.svg" className="w-10 h-10 text-gray-900 opacity-90" />
          </div>
          <div className="w-40">
            <Select 
              selectedKey={targetFormat} 
              onSelectionChange={(key) => {
                if (key) setTargetFormat(key as string)
              }}
              isDisabled={isProcessing}
              className="w-full"
              aria-label="Target Format"
            >
              <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover transition-colors rounded-full shadow-none border-none h-14 min-h-0 flex items-center px-4 data-[hover=true]:bg-sf-input-hover">
                <Select.Value className="text-4xl font-medium text-gray-800 tracking-wide bg-transparent w-full truncate" />
              </Select.Trigger>
              <Select.Popover className="border border-gray-200 shadow-lg rounded-xl">
                <ListBox>
                  {availableFormats.map(fmt => (
                    <ListBox.Item key={fmt} id={fmt} textValue={fmt.replace('.', '')} className="text-lg text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                      {fmt.replace('.', '')}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 bg-sf-panel rounded-3xl p-6 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
            <AnimatePresence>
              {files.map(file => (
                <motion.div 
                  key={file.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white transition-colors ${file.status === 'success' ? 'bg-green-100/60' : ''} ${file.status === 'error' ? 'bg-red-100/60' : ''}`}
                >
                  <span className="text-gray-800 text-[15px] font-medium truncate flex-1 mr-4">
                    {file.name}{file.ext}
                  </span>
                  
                  <div className="flex items-center space-x-3 w-6 shrink-0 justify-center">
                    {file.status === 'converting' && (
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-blue-500"
                      />
                    )}
                    {file.status === 'error' && (
                      <span className="text-red-500 text-xs font-bold">失败</span>
                    )}
                    {(file.status === 'success' || file.status === 'error' || file.status === 'pending') && (
                      <button 
                        onClick={() => removeFile(file.path)}
                        disabled={isProcessing}
                        className={`w-8 h-8 ${file.status === 'success' ? '' : 'hover:bg-gray-100'} flex items-center justify-center transition-colors disabled:opacity-50`}
                      >
                        {file.status === 'success' ? (
                          <img src="/src/assets/icons/check_line.svg" className="w-5 h-5 opacity-90" alt="success" />
                        ) : (
                          <img src="/src/assets/icons/close_line.svg" className="w-4 h-4 text-gray-500" alt="remove" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {files.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-400">
                暂无文件
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex w-full space-x-6 mt-6 pb-2">
          {(!isProcessing || allDone) && (
            <button 
              onClick={handleCancel}
              className="flex-1 py-3 bg-sf-input hover:bg-sf-input-hover text-gray-700 text-[15px] font-medium rounded-full transition-colors flex items-center justify-center"
            >
              {allDone ? '完成' : '取消'}
            </button>
          )}

          {!allDone && (
            <button 
              onClick={handleStartPause}
              disabled={files.length === 0}
              className={`flex-1 py-3 text-white text-[15px] font-medium rounded-full transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                isProcessing && !isPaused ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-[#6ae045] hover:bg-[#5bc93a]'
              }`}
            >
              {isProcessing && !isPaused ? (
                <>
                  <img src="/src/assets/icons/pause_line.svg" className="w-4 h-4 mr-2 filter brightness-0 invert" />
                  暂停转换
                </>
              ) : (
                <>
                  <img src="/src/assets/icons/play_line.svg" className="w-4 h-4 mr-2 filter brightness-0 invert" />
                  {isPaused ? '继续转换' : '开始转换'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
