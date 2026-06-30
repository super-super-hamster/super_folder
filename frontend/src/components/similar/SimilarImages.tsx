import React, { useEffect, useState, useCallback } from 'react'
import { ProgressBar } from '@heroui/react'
import { useTabsStore } from '../../store/tabsStore'
import { useUIStore } from '../../store/uiStore'
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime'
import {
  FindSimilarImageGroups,
  GetSimilarImageGroups,
  CheckSimilarImagesNeedReindex
} from '../../../wailsjs/go/main/App'

interface ProgressData {
  stage: string
  current: number
  total: number
}

function parseSimilarPath(path: string) {
  const prefix = 'similar://'
  const rest = path.slice(prefix.length)
  const [folderPath, queryString] = rest.split('?')
  const params = new URLSearchParams(queryString || '')
  return {
    folderPath,
    includeSubfolders: params.get('subfolders') === 'true',
    threshold: parseInt(params.get('threshold') || '12', 10)
  }
}

function encodeThumbPath(path: string) {
  return `/thumb?path=${encodeURIComponent(path)}`
}

export default function SimilarImages() {
  const { tabs, activeTabId } = useTabsStore()
  const { viewMode, setViewMode, triggerRefresh, refreshKey } = useUIStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentPath = activeTab?.currentPath || ''
  const { folderPath, includeSubfolders, threshold } = parseSimilarPath(currentPath)

  const [groups, setGroups] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ProgressData>({ stage: 'hashing', current: 0, total: 0 })
  const [previousViewMode, setPreviousViewMode] = useState(viewMode)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setProgress({ stage: 'checking', current: 0, total: 0 })

    try {
      const needsReindex = await CheckSimilarImagesNeedReindex(folderPath, includeSubfolders, threshold)
      let result: string[][]

      if (needsReindex) {
        result = await FindSimilarImageGroups(folderPath, includeSubfolders, threshold)
      } else {
        result = await GetSimilarImageGroups(folderPath)
      }

      setGroups(result || [])
    } catch (e) {
      console.error(e)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [folderPath, includeSubfolders, threshold])

  useEffect(() => {
    setPreviousViewMode(viewMode)
    setViewMode('album')

    const unsubscribe = EventsOn('similarity-progress', (data: ProgressData) => {
      setProgress(data)
    })

    loadGroups()

    return () => {
      unsubscribe()
      setViewMode(previousViewMode)
    }
  }, [currentPath])

  useEffect(() => {
    if (!loading) {
      loadGroups()
    }
  }, [refreshKey])

  const handleRefresh = async () => {
    triggerRefresh()
  }

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
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-700">
          找到 {groups.length} 组相似图片
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="bg-sf-panel/50 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">相似组 {groupIdx + 1} · {group.length} 张</div>
            <div className="flex flex-wrap gap-3">
              {group.map((path) => (
                <div
                  key={path}
                  className="w-28 h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0"
                >
                  <img
                    src={encodeThumbPath(path)}
                    alt={path.split('\\').pop()}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
