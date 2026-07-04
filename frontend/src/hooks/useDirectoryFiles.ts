import { useState, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTagStore, generateColorFromName } from '../store/tagStore'
import { useModalStore } from '../store/modalStore'
import { usePrivacyStore } from '../store/privacyStore'
import { useTabsStore } from '../store/tabsStore'
import { ReadDirChunked, SearchFiles, GetFavorites, GetRecentItems, GetTagsForFiles, CanAccessPath, GetProtectedPaths } from '../../wailsjs/go/main/App'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import { models } from '../../wailsjs/go/models'
import { parseSearchQuery } from '../utils/searchQuery'

function mergeFilesByPath(base: models.FileInfo[], next: models.FileInfo[]): models.FileInfo[] {
  if (next.length === 0) return base
  const seen = new Set(base.map(file => file.path))
  const merged = [...base]
  for (const file of next) {
    if (!seen.has(file.path)) {
      seen.add(file.path)
      merged.push(file)
    }
  }
  return merged
}

function getTagColorIdentity(tag: models.Tag): string {
  return tag.type ? `${tag.type}:${tag.name}` : tag.name
}

function getStableTagColor(tags: models.Tag[]): string | undefined {
  if (tags.length === 0) return undefined
  const stableTag = [...tags].sort((a, b) => {
    const aIdentity = getTagColorIdentity(a)
    const bIdentity = getTagColorIdentity(b)
    return aIdentity.localeCompare(bIdentity, undefined, { sensitivity: 'base' }) || aIdentity.localeCompare(bIdentity)
  })[0]
  return stableTag.colorHex || generateColorFromName(getTagColorIdentity(stableTag))
}

export interface UseDirectoryFilesResult {
  files: models.FileInfo[]
  setFiles: React.Dispatch<React.SetStateAction<models.FileInfo[]>>
  loading: boolean
  fileTagColors: Record<string, string>
  protectedPathMap: Record<string, boolean>
  missingPreset: boolean
}

const prevLoadKeyRef = { current: '' as string | undefined }

export function useDirectoryFiles(currentPath: string | undefined): UseDirectoryFilesResult {
  const [files, setFiles] = useState<models.FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [fileTagColors, setFileTagColors] = useState<Record<string, string>>({})
  const [protectedPathMap, setProtectedPathMap] = useState<Record<string, boolean>>({})
  const [missingPreset, setMissingPreset] = useState(false)

  const { refreshKey, searchQuery, searchFilter, setSearchLoading } = useUIStore()
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
  const { searchPresets, smartFolders } = useSettingsStore()
  const { tagRefreshKey } = useTagStore()
  const privacyMode = usePrivacyStore(state => state.state?.mode)

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
          const color = getStableTagColor(tags)
          if (color) colors[path] = color
        }
      }
      setFileTagColors(colors)
    }).catch(console.error)
  }, [files, tagRefreshKey])

  useEffect(() => {
    if (privacyMode !== 'privacy' || files.length === 0) {
      setProtectedPathMap({})
      return
    }
    const paths = files.map(f => f.path)
    GetProtectedPaths(paths).then(res => {
      const next: Record<string, boolean> = {}
      for (const path of paths) {
        if (res[path] === true) next[path] = true
      }
      setProtectedPathMap(next)
    }).catch(console.error)
  }, [files, privacyMode])

  useEffect(() => {
    if (!currentPath || currentPath.endsWith('\\转换')) {
      return
    }
    let isMounted = true
    setMissingPreset(false)

    if (!currentPath.includes('://') && privacyMode !== 'privacy') {
      CanAccessPath(currentPath).then((canAccess) => {
        if (!canAccess && isMounted) {
          useModalStore.getState().openModal('warning', { message: '当前内容在公开模式下不可访问。' })
          useTabsStore.getState().navigate('C:\\', 'C:\\', true, true)
        }
      }).catch(console.error)
    }

    const loadKey = `${currentPath}|${privacyMode || 'public'}|${debouncedSearchQuery || ''}|${JSON.stringify(searchFilter)}`
    if (prevLoadKeyRef.current !== loadKey) {
      setLoading(true)
      setFiles([])
      setFileTagColors({})
      setProtectedPathMap({})
      prevLoadKeyRef.current = loadKey
    }

    let fetchPromise: Promise<models.FileInfo[]>
    let isSearchRequest = false
    let cleanupDirectoryEvents: (() => void) | null = null

    const parsed = parseSearchQuery(debouncedSearchQuery || '')
    let keyword = parsed.keyword
    const tags = parsed.tags.map(t => {
      const idx = t.indexOf(':')
      return idx >= 0 ? t.slice(idx + 1) : t
    }).filter(Boolean)
    const remarks = parsed.remarks.map(r => {
      const idx = r.indexOf(':')
      return idx >= 0 ? r.slice(idx + 1) : r
    }).filter(Boolean)
    const tagLogic = (debouncedSearchQuery && debouncedSearchQuery.includes('&')) ? 'AND' : 'OR'

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
          isSearchRequest = true
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
        isSearchRequest = true
        fetchPromise = SearchFiles(req)
      } else {
        fetchPromise = Promise.resolve([])
      }
    } else if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
      const maxTime = searchFilter?.maxTime
      const unit = searchFilter?.sizeUnit || 'MB'
      const toBytes = (val: number | null) => {
        if (val == null) return null
        if (unit === 'KB') return val * 1024
        if (unit === 'GB') return val * 1024 * 1024 * 1024
        return val * 1024 * 1024
      }
      const req = {
        keyword: keyword,
        isRegex: searchFilter?.isRegex || false,
        caseSensitive: searchFilter?.isCaseSensitive || false,
        onlyFiles: searchFilter?.type === 'file',
        onlyFolders: searchFilter?.type === 'folder',
        extensions: searchFilter?.extensions || [],
        tags: tags,
        tagLogic: tagLogic,
        remarks: remarks,
        maxDepth:
          searchFilter?.isDepthFilter && searchFilter?.maxDepth != null
            ? searchFilter.maxDepth + 1
            : 0,
        rootPath: currentPath,
        limit: 2000,
        minSize: toBytes(searchFilter?.minSize ?? null),
        maxSize: toBytes(searchFilter?.maxSize ?? null),
        minTime: searchFilter?.minTime ?? null,
        maxTime: maxTime != null ? maxTime + 24 * 60 * 60 * 1000 - 1 : null,
        imageShape: searchFilter?.isImageShapeFilter ? searchFilter?.imageShape : undefined
      }
      isSearchRequest = true
      fetchPromise = SearchFiles(req)
    } else if (currentPath === 'favorite://') {
      fetchPromise = GetFavorites()
    } else if (currentPath === 'recent://') {
      fetchPromise = GetRecentItems()
    } else if (currentPath?.endsWith('\\批量重命名')) {
      fetchPromise = Promise.resolve([])
    } else {
      const reqId = Date.now().toString() + Math.random().toString()
      let receivedChunk = false
      let directoryEventsActive = true
      cleanupDirectoryEvents = () => {
        directoryEventsActive = false
        EventsOff('directory:chunk:' + reqId)
        EventsOff('directory:done:' + reqId)
      }
      EventsOn('directory:chunk:' + reqId, (chunk: models.FileInfo[]) => {
        if (isMounted && directoryEventsActive) {
          receivedChunk = true
          setFiles(prev => {
            return mergeFilesByPath(prev, chunk || [])
          })
        }
      })
      EventsOn('directory:done:' + reqId, () => {
        cleanupDirectoryEvents?.()
      })

      fetchPromise = ReadDirChunked(currentPath, reqId).then(res => {
        if (isMounted) {
          const files = res || []
          if (receivedChunk) {
            setFiles(prev => mergeFilesByPath(files, prev))
          } else {
            setFiles([...files])
          }
        }
        return null as unknown as models.FileInfo[]
      })
    }

    if (isSearchRequest) setSearchLoading(true)

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
        if (isSearchRequest) setSearchLoading(false)
      })

    return () => {
      isMounted = false
      cleanupDirectoryEvents?.()
      if (isSearchRequest) setSearchLoading(false)
    }
  }, [currentPath, refreshKey, debouncedSearchQuery, searchFilter, privacyMode, setSearchLoading])

  return { files, setFiles, loading, fileTagColors, protectedPathMap, missingPreset }
}
