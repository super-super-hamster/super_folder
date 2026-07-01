import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { ProgressBar } from '@heroui/react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { useSelectionStore } from '../../store/selectionStore'
import { useContextMenuStore } from '../../store/contextMenuStore'
import { useSettingsStore } from '../../store/settingsStore'
import { EventsOn } from '../../../wailsjs/runtime/runtime'
import FileListItem from '../fileList/FileListItem'
import {
  FindSimilarImageGroups,
  GetSimilarImageGroups,
  CheckSimilarImagesNeedReindex,
  FindImagesSimilarTo,
  CancelSimilarImageSearch,
  OpenFileWithDefault
} from '../../../wailsjs/go/main/App'
import { models } from '../../../wailsjs/go/models'
import eyeLine from '../../assets/icons/eye_line.svg'
import eyeCloseLine from '../../assets/icons/eye_close_line.svg'

interface ProgressData {
  stage: string
  current: number
  total: number
}

function parseSimilarPath(path: string) {
  const suffix = '\\相似图片'
  if (!path.endsWith(suffix)) {
    return { folderPath: path, queryImagePath: undefined, includeSubfolders: false, threshold: 5, useMax: false }
  }
  const rest = path.slice(0, -suffix.length)
  const [folderPath, queryString] = rest.split('?')
  const params = new URLSearchParams(queryString || '')
  return {
    folderPath,
    queryImagePath: params.get('path') || undefined,
    includeSubfolders: params.get('subfolders') === 'true',
    threshold: parseInt(params.get('threshold') || '5', 10),
    useMax: params.get('useMax') === 'true'
  }
}

export function buildSimilarPath(folderPath: string, query: URLSearchParams) {
  const params = query.toString()
  return folderPath + (params ? `?${params}` : '') + '\\相似图片'
}

function fakeFile(path: string): models.FileInfo {
  const name = path.split('\\').pop() || path
  const dotIdx = name.lastIndexOf('.')
  const ext = dotIdx !== -1 ? name.substring(dotIdx) : ''
  return {
    path,
    name,
    ext,
    isDir: false,
    size: 0,
    modTime: ''
  } as models.FileInfo
}

function getGroupSignature(paths: string[]) {
  return paths.slice().sort().join('\x00')
}

function hiddenKey(folderPath: string, threshold: number, useMax: boolean) {
  return `similar_hidden_groups:${encodeURIComponent(folderPath)}:${threshold}:${useMax}`
}

function loadHiddenSignatures(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveHiddenSignatures(key: string, signatures: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(signatures)))
  } catch {}
}

export default function SimilarImages() {
  const { tabs, activeTabId, navigate } = useTabsStore()
  const { refreshKey } = useUIStore()
  const { selectedPaths, setSelection, toggleSelect, selectOnly, clearSelection } = useSelectionStore()
  const { openMenu } = useContextMenuStore()
  const { doubleClickOpenMode } = useSettingsStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath || ''
  const { folderPath, queryImagePath, includeSubfolders, threshold, useMax } = useMemo(() => parseSimilarPath(currentPath), [currentPath])

  const [groups, setGroups] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ProgressData>({ stage: 'hashing', current: 0, total: 0 })
  const [displayedHidden, setDisplayedHidden] = useState<Set<string>>(new Set())
  const [pendingHidden, setPendingHidden] = useState<Set<string>>(new Set())
  const [hiddenSectionExpanded, setHiddenSectionExpanded] = useState(false)

  const storageKey = useMemo(() => hiddenKey(folderPath, threshold, useMax), [folderPath, threshold, useMax])

  useEffect(() => {
    const loaded = loadHiddenSignatures(storageKey)
    const valid = new Set(groups.map(g => getGroupSignature(g)))
    const filtered = new Set(Array.from(loaded).filter(s => valid.has(s)))
    setDisplayedHidden(filtered)
    setPendingHidden(filtered)
    setHiddenSectionExpanded(false)
    if (filtered.size !== loaded.size) {
      saveHiddenSignatures(storageKey, filtered)
    }
  }, [storageKey, groups])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setProgress({ stage: 'checking', current: 0, total: 0 })

    try {
      let result: string[][]

      if (queryImagePath) {
        const paths = await FindImagesSimilarTo(queryImagePath, folderPath, includeSubfolders, threshold, useMax)
        result = paths.length > 0 ? [paths] : []
      } else {
        const needsReindex = await CheckSimilarImagesNeedReindex(folderPath, includeSubfolders, threshold, useMax)
        if (needsReindex) {
          result = await FindSimilarImageGroups(folderPath, includeSubfolders, threshold, useMax)
        } else {
          result = await GetSimilarImageGroups(folderPath, threshold, useMax)
        }
      }

      setGroups(result || [])
    } catch (e) {
      console.error(e)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [folderPath, queryImagePath, includeSubfolders, threshold, useMax])

  useEffect(() => {
    const unsubscribe = EventsOn('similarity-progress', (data: ProgressData) => {
      setProgress(data)
    })

    loadGroups()

    return () => {
      unsubscribe()
      CancelSimilarImageSearch().catch(() => {})
    }
  }, [currentPath])

  useEffect(() => {
    if (!loading) {
      loadGroups()
    }
  }, [refreshKey])

  const handleClick = (e: React.MouseEvent, file: models.FileInfo) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(file.path)
    } else {
      selectOnly(file.path)
    }
  }

  const handleDoubleClick = (file: models.FileInfo) => {
    if (doubleClickOpenMode === 'defaultProgram') {
      OpenFileWithDefault(file.path).catch(console.error)
    } else {
      navigate(file.path, file.name, false)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, file: models.FileInfo) => {
    e.preventDefault()
    e.stopPropagation()
    if (!selectedPaths.has(file.path)) {
      selectOnly(file.path)
    }
    openMenu(e.clientX, e.clientY, file.path, file.name, false)
  }

  const toggleHidden = useCallback((signature: string) => {
    setPendingHidden(prev => {
      const next = new Set(prev)
      if (next.has(signature)) {
        next.delete(signature)
      } else {
        next.add(signature)
      }
      saveHiddenSignatures(storageKey, next)
      return next
    })
  }, [storageKey])

  const groupMetas = useMemo(() => {
    return groups.map((group, idx) => {
      const signature = getGroupSignature(group)
      return {
        group,
        idx,
        signature,
        isDisplayedHidden: displayedHidden.has(signature),
        isPendingHidden: pendingHidden.has(signature)
      }
    })
  }, [groups, displayedHidden, pendingHidden])

  const visibleGroups = groupMetas.filter(m => !m.isDisplayedHidden)
  const hiddenGroups = groupMetas.filter(m => m.isDisplayedHidden)

  const renderImages = (group: string[]) => (
    <div className="flex flex-wrap gap-1">
      {group.map((path) => {
        const file = fakeFile(path)
        return (
          <div key={path} className="w-20 h-20">
            <FileListItem
              file={file}
              viewMode="album"
              selectedPaths={selectedPaths}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            />
          </div>
        )
      })}
    </div>
  )

  const renderGroupHeader = (idx: number, length: number, signature: string, isPendingHidden: boolean) => (
    <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
      <div className="text-xs font-medium text-gray-500">
        {isPendingHidden ? `第 ${idx + 1} 组 · ${length} 张 · 已隐藏` : `第 ${idx + 1} 组 · ${length} 张`}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); toggleHidden(signature) }}
        className="p-1 rounded-md hover:bg-gray-200 transition-colors focus:outline-none"
        title={isPendingHidden ? '取消隐藏' : '隐藏该组'}
      >
        <img
          src={isPendingHidden ? eyeCloseLine : eyeLine}
          className="w-4 h-4 opacity-70"
          alt={isPendingHidden ? '已隐藏' : '隐藏'}
        />
      </button>
    </div>
  )

  const title = queryImagePath
    ? `与 ${queryImagePath.split('\\').pop()} 相似的图片`
    : `找到 ${groups.length} 组相似图片`

  if (loading) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 overflow-hidden flex flex-col items-center justify-center wails-no-drag">
        <div className="w-80 space-y-4">
          <div className="text-center text-gray-600 text-sm">
            {progress.stage === 'checking' && '正在检查数据状态...'}
            {progress.stage === 'hashing' && '正在分析图片特征...'}
            {progress.stage === 'comparing' && '正在比对图片相似度...'}
          </div>
          <ProgressBar
            value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
            className="w-full"
          />
          <div className="text-center text-xs text-gray-400">
            {progress.total > 0 ? `${progress.current} / ${progress.total}` : ''}
          </div>
        </div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 overflow-hidden flex flex-col items-center justify-center wails-no-drag">
        <div className="text-gray-500 text-sm">未找到相似图片</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-panel border border-gray-100 overflow-hidden flex flex-col wails-no-drag">
      <div className="flex items-center px-5 py-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-700">{title}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6" onClick={clearSelection}>
        {visibleGroups.map(({ group, idx, signature, isPendingHidden }) => (
          <div key={signature} className={`rounded-xl p-4 ${isPendingHidden ? 'bg-gray-100' : 'bg-sf-panel/50'}`}>
            {!queryImagePath && renderGroupHeader(idx, group.length, signature, isPendingHidden)}
            {renderImages(group)}
          </div>
        ))}

        {hiddenGroups.length > 0 && (
          <>
            <div
              className="flex items-center cursor-pointer select-none"
              onClick={(e) => { e.stopPropagation(); setHiddenSectionExpanded(v => !v) }}
            >
              <div className="flex-1 h-px bg-gray-300" />
              <div className="mx-4 text-xs font-medium text-gray-500">隐藏</div>
              <div className="flex-1 h-px bg-gray-300" />
              <svg
                className={`w-4 h-4 text-gray-500 ml-3 transition-transform duration-200 ${hiddenSectionExpanded ? 'rotate-0' : '-rotate-90'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {hiddenSectionExpanded && (
              <div className="space-y-6">
                {hiddenGroups.map(({ group, idx, signature, isPendingHidden }) => (
                  <div key={signature} className={`rounded-xl p-4 ${isPendingHidden ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {!queryImagePath && renderGroupHeader(idx, group.length, signature, isPendingHidden)}
                    {renderImages(group)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
