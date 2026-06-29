import { useState, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTagStore } from '../store/tagStore'
import { useModalStore } from '../store/modalStore'
import { ReadDirChunked, SearchFiles, GetFavorites, GetRecentItems, GetTagsForFiles } from '../../wailsjs/go/main/App'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import { models } from '../../wailsjs/go/models'

export interface UseDirectoryFilesResult {
  files: models.FileInfo[]
  setFiles: React.Dispatch<React.SetStateAction<models.FileInfo[]>>
  loading: boolean
  fileTagColors: Record<string, string>
  missingPreset: boolean
}

const prevPathRef = { current: '' as string | undefined }

export function useDirectoryFiles(currentPath: string | undefined): UseDirectoryFilesResult {
  const [files, setFiles] = useState<models.FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [fileTagColors, setFileTagColors] = useState<Record<string, string>>({})
  const [missingPreset, setMissingPreset] = useState(false)

  const { refreshKey, searchQuery, searchFilter } = useUIStore()
  const { searchPresets, smartFolders } = useSettingsStore()
  const { tagRefreshKey } = useTagStore()

  useEffect(() => {
    if (files.length === 0) {
      setFileTagColors({})
      return
    }
    const paths = files.map(f => f.path)
    GetTagsForFiles(paths).then(res => {
      const colors: Record<string, string> = {}
      for (const [path, tags] of Object.entries(res)) {
        if (tags && tags.length > 0) {
          colors[path] = tags[0].colorHex
        }
      }
      setFileTagColors(colors)
    }).catch(console.error)
  }, [files, tagRefreshKey])

  useEffect(() => {
    if (!currentPath || currentPath.endsWith('\\转换')) {
      return
    }
    let isMounted = true
    setMissingPreset(false)

    if (prevPathRef.current !== currentPath) {
      setLoading(true)
      setFiles([])
      prevPathRef.current = currentPath
    }

    let fetchPromise: Promise<models.FileInfo[]>

    let keyword = searchQuery ? searchQuery.trim() : ''
    let tags: string[] = []
    let tagLogic = 'OR'

    if (keyword.toLowerCase().includes('tag:')) {
      const parts = keyword.split('&')
      if (parts.length > 1) {
        tagLogic = 'AND'
        tags = parts.map(p => {
          const m = p.match(/tag:([^&\s]+)/i)
          return m ? m[1] : ''
        }).filter(Boolean)
        keyword = keyword.replace(/tag:([^&\s]+)/gi, '').replace(/&/g, '').trim()
      } else {
        const m = keyword.match(/tag:([^\s]+)/gi)
        if (m) {
          tags = m.map(t => t.split(':')[1])
          keyword = keyword.replace(/tag:([^\s]+)/gi, '').trim()
        }
      }
    }

    if (currentPath === 'smartfolder://') {
      const virtualItems: models.FileInfo[] = smartFolders.map(sf => ({
        name: sf.name,
        path: `smartfolder://${sf.id}`,
        isDir: true,
        size: 0,
        modTime: '',
        ext: ''
      } as any))
      virtualItems.push({
        name: '创建',
        path: '__create_smart_folder__',
        isDir: false,
        size: 0,
        modTime: '',
        ext: ''
      } as any)
      fetchPromise = Promise.resolve(virtualItems)
    } else if (currentPath && currentPath.startsWith('smartfolder://') && currentPath !== 'smartfolder://') {
      const sfId = currentPath.replace('smartfolder://', '')
      const sf = smartFolders.find(f => f.id === sfId)
      if (sf) {
        const preset = searchPresets.find(p => p.id === sf.presetId)
        if (preset) {
          const req = {
            keyword: '',
            isRegex: preset.filter.isRegex || false,
            caseSensitive: preset.filter.isCaseSensitive || false,
            onlyFiles: preset.filter.type === 'file',
            onlyFolders: preset.filter.type === 'folder',
            extensions: preset.filter.extensions || [],
            excludedFolders: preset.filter.excludedFolders || [],
            tags: [],
            tagLogic: 'OR',
            maxDepth: 0,
            rootPath: '',
            rootPaths: sf.rootPaths,
            limit: 2000
          }
          fetchPromise = SearchFiles(req)
        } else {
          setMissingPreset(true)
          fetchPromise = Promise.resolve([])
        }
      } else {
        fetchPromise = Promise.resolve([])
      }
    } else if (currentPath && currentPath.startsWith('preset://')) {
      const presetId = currentPath.replace('preset://', '')
      const preset = searchPresets.find(p => p.id === presetId)
      if (preset) {
        const req = {
          keyword: '',
          isRegex: preset.filter.isRegex || false,
          caseSensitive: preset.filter.isCaseSensitive || false,
          onlyFiles: preset.filter.type === 'file',
          onlyFolders: preset.filter.type === 'folder',
          extensions: preset.filter.extensions || [],
          tags: [],
          tagLogic: 'OR',
          maxDepth: 0,
          rootPath: '',
          limit: 2000
        }
        fetchPromise = SearchFiles(req)
      } else {
        fetchPromise = Promise.resolve([])
      }
    } else if (searchQuery && searchQuery.trim() !== '') {
      const req = {
        keyword: keyword,
        isRegex: searchFilter?.isRegex || false,
        caseSensitive: searchFilter?.isCaseSensitive || false,
        onlyFiles: searchFilter?.type === 'file',
        onlyFolders: searchFilter?.type === 'folder',
        extensions: searchFilter?.extensions || [],
        tags: tags,
        tagLogic: tagLogic,
        maxDepth: 0,
        rootPath: currentPath,
        limit: 2000
      }
      fetchPromise = SearchFiles(req)
    } else if (currentPath === 'favorite://') {
      fetchPromise = GetFavorites()
    } else if (currentPath === 'recent://') {
      fetchPromise = GetRecentItems()
    } else if (currentPath?.endsWith('\\批量重命名')) {
      fetchPromise = Promise.resolve([])
    } else {
      const reqId = Date.now().toString() + Math.random().toString()
      let isFirstUpdate = true
      EventsOn('directory:chunk:' + reqId, (chunk: models.FileInfo[]) => {
        if (isMounted) {
          setFiles(prev => {
            if (isFirstUpdate) {
              isFirstUpdate = false
              return [...(chunk || [])]
            }
            return [...prev, ...(chunk || [])]
          })
        }
      })
      EventsOn('directory:done:' + reqId, () => {
        EventsOff('directory:chunk:' + reqId)
        EventsOff('directory:done:' + reqId)
      })

      fetchPromise = ReadDirChunked(currentPath, reqId).then(res => {
        if (isMounted) {
          setFiles(prev => {
            if (isFirstUpdate) {
              isFirstUpdate = false
              return [...(res || [])]
            }
            return [...(res || []), ...prev]
          })
        }
        return null as unknown as models.FileInfo[]
      })
    }

    fetchPromise
      .then((res) => {
        if (isMounted && res !== null) setFiles(res || [])
      })
      .catch((err) => {
        console.error('Failed to fetch items:', err)
        if (isMounted) {
          setFiles([])
          useModalStore.getState().openModal('warning', { message: `读取目录失败: ${err}` })
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [currentPath, refreshKey])

  return { files, setFiles, loading, fileTagColors, missingPreset }
}
