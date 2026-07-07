import { useEffect, useState } from 'react'
import { useSelectionStore } from '../../store/selectionStore'
import { useTabsStore } from '../../store/tabsStore'
import { GetFileDetail } from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

function formatDuration(ms: number): string {
  if (ms <= 0) return ''
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function prop(label: string, value: string | number | undefined | null, unit?: string) {
  if (value === undefined || value === null || value === '' || value === 0) return null
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-800 font-medium truncate max-w-[60%] ml-2">{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  )
}

function section(title: string, children: React.ReactNode) {
  if (!children) return null
  return (
    <div className="mb-4">
      <div className="mb-1.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="bg-gray-50 rounded-lg px-3 py-1">
        {children}
      </div>
    </div>
  )
}

export default function FileInfoPanel() {
  const { selectedPaths } = useSelectionStore()
  const { tabs, activeTabId } = useTabsStore()
  const currentPath = tabs.find(t => t.id === activeTabId)?.currentPath
  const [detail, setDetail] = useState<models.FileDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedPaths.size !== 1) {
      setDetail(null)
      setError('')
      return
    }
    const path = Array.from(selectedPaths)[0]
    GetFileDetail(path).then(d => {
      setDetail(d)
      setError('')
    }).catch(e => {
      setDetail(null)
      setError(String(e))
    })
  }, [selectedPaths, currentPath])

  if (selectedPaths.size === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xs">未选择文件</div>
  }
  if (selectedPaths.size > 1) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xs">已选择 {selectedPaths.size} 个项目</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xs">无法获取文件信息</div>
  }
  if (!detail) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xs">加载中...</div>
  }

  const isImage = detail.imageWidth && detail.imageHeight
  const isVideo = detail.videoWidth != null && detail.videoHeight != null && detail.videoWidth > 0 && detail.videoHeight > 0 && detail.mediaDurationMs != null && detail.mediaDurationMs > 0
  const isAudio = (detail.videoWidth == null || detail.videoWidth === 0) && detail.mediaDurationMs != null && detail.mediaDurationMs > 0

  return (
    <div className="p-4 overflow-y-auto h-full">
      {section('通用', <>
        {prop('文件名', detail.name)}
        {prop('位置', detail.path)}
        {prop('大小', detail.size > 0 ? formatSize(detail.size) : undefined)}
        {prop('修改时间', detail.modTime)}
        {detail.createTime ? prop('创建时间', detail.createTime) : null}
        {detail.isDir ? null : prop('类型', detail.ext.toUpperCase())}
        {detail.isHidden ? prop('属性', '隐藏') : null}
        {detail.isProtected ? prop('保护', '是') : null}
        {detail.isDir ? prop('文件夹数', detail.folderCount) : null}
        {detail.isDir ? prop('文件数', detail.fileCount) : null}
        {detail.lineCount != null && detail.lineCount > 0 ? prop('行数', detail.lineCount.toLocaleString()) : null}
      </>)}

      {isImage && section('图像', <>
        {prop('尺寸', `${detail.imageWidth} × ${detail.imageHeight}`)}
      </>)}

      {isVideo && section('视频', <>
        {detail.videoWidth && detail.videoHeight ? prop('分辨率', `${detail.videoWidth} × ${detail.videoHeight}`) : null}
        {detail.mediaDurationMs ? prop('时长', formatDuration(detail.mediaDurationMs)) : null}
      </>)}

      {isAudio && section('音频', <>
        {detail.mediaDurationMs ? prop('时长', formatDuration(detail.mediaDurationMs)) : null}
      </>)}
    </div>
  )
}
