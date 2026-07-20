import { useState, useEffect, useRef } from 'react'
import { useDebounce } from 'use-debounce'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTagStore, generateColorFromName } from '../store/tagStore'
import { useModalStore } from '../store/modalStore'
import { usePrivacyStore } from '../store/privacyStore'
import { useTabsStore } from '../store/tabsStore'
import { SearchFiles, GetFavorites, GetRecentItems, GetTagsForFiles, CanAccessPath, GetProtectedPaths } from '../../wailsjs/go/main/App'
import { models } from '../../wailsjs/go/models'
import { parseSearchQuery } from '../utils/searchQuery'
import { deleteDirectoryCache, getDirectoryCache, setDirectoryCache } from '../utils/directoryCache'
import { streamDirectory } from '../utils/directoryLoader'

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

export function useDirectoryFiles(currentPath: string | undefined): UseDirectoryFilesResult {
  const [files, setFiles] = useState<models.FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [fileTagColors, setFileTagColors] = useState<Record<string, string>>({})
  const [protectedPathMap, setProtectedPathMap] = useState<Record<string, boolean>>({})
  const [missingPreset, setMissingPreset] = useState(false)
  const tagRequestIdRef = useRef(0)

  const { refreshKey, searchQuery, searchFilter, setSearchLoading } = useUIStore()
  const prevLoadKeyRef = useRef<string | undefined>(undefined)
  const previousRefreshKeyRef = useRef(refreshKey)
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
  const { searchPresets, smartFolders } = useSettingsStore()
  const { tagRefreshKey } = useTagStore()
  const privacyMode = usePrivacyStore(state => state.state?.mode)

  useEffect(() => {
    if (loading || files.length === 0) {
      setFileTagColors({})
      return
    }
    const requestId = ++tagRequestIdRef.current
    const paths = files.map(f => f.path)
    GetTagsForFiles(paths).then(res => {
      if (requestId !== tagRequestIdRef.current) return
      const colors: Record<string, string> = {}
      for (const [path, tags] of Object.entries(res)) {
        if (tags && tags.length > 0) {
          const color = getStableTagColor(tags)
          if (color) colors[path] = color
        }
      }
      setFileTagColors(colors)
    }).catch(console.error)
  }, [files, loading, tagRefreshKey])

  useEffect(() => {
    if (privacyMode !== 'privacy' || loading || files.length === 0) {
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
  }, [files, loading, privacyMode])

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

    const refreshChanged = previousRefreshKeyRef.current !== refreshKey
    previousRefreshKeyRef.current = refreshKey
    const loadKey = `${currentPath}|${privacyMode || 'public'}|${debouncedSearchQuery || ''}|${JSON.stringify(searchFilter)}|${refreshKey}`
    if (prevLoadKeyRef.current !== loadKey) {
      setLoading(true)
      setFiles([])
      setFileTagColors({})
      setProtectedPathMap({})
      prevLoadKeyRef.current = loadKey
    }

    let fetchPromise: Promise<models.FileInfo[]>
	const runSearch = async (req: Record<string, any>) => {
	  const results = await SearchFiles(req)
	  return results
	  const diagnostics = ''
	  window.alert(`搜索诊断:\n${diagnostics || '无诊断数据'}`)
	  return results
	}
    let isSearchRequest = false
    let cleanupDirectoryStream: (() => void) | null = null

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
      const isSizeFilter = searchFilter?.isSizeFilter === true
      const isTimeFilter = searchFilter?.isTimeFilter === true
      const maxTime = isTimeFilter ? searchFilter?.maxTime : null
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
        typeNegated: searchFilter?.isTypeNegated || false,
        includeNegated: searchFilter?.isIncludeNegated || false,
        sizeNegated: searchFilter?.isSizeNegated || false,
        timeNegated: searchFilter?.isTimeNegated || false,
        imageShapeNegated: searchFilter?.isImageShapeNegated || false,
        extensions: searchFilter?.extensions || [],
        tags: tags,
        tagLogic: tagLogic,
        remarks: remarks,
        maxDepth:
          searchFilter?.isDepthFilter && searchFilter?.maxDepth != null
            ? searchFilter.maxDepth + 1
            : 0,
        includeStrings: searchFilter?.includeStrings || [],
        folderPaths: searchFilter?.isFolderPathsFilter ? (searchFilter?.folderPaths || []) : [],
        rootPath: currentPath,
        limit: 2000,
        minSize: isSizeFilter ? toBytes(searchFilter?.minSize ?? null) : null,
        maxSize: isSizeFilter ? toBytes(searchFilter?.maxSize ?? null) : null,
        minTime: isTimeFilter ? searchFilter?.minTime ?? null : null,
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
      const cacheMode = privacyMode || 'public'
      if (refreshChanged) deleteDirectoryCache(currentPath, cacheMode)
      const cached = refreshChanged ? undefined : getDirectoryCache(currentPath, cacheMode)

      if (cached?.complete) {
        fetchPromise = Promise.resolve(cached.files)
      } else {
        if (cached?.files.length) setFiles(cached.files)
        fetchPromise = new Promise<models.FileInfo[]>((resolve, reject) => {
          cleanupDirectoryStream = streamDirectory(currentPath, {
            onUpdate: (nextFiles, complete) => {
              if (!isMounted) return
              setDirectoryCache(currentPath, cacheMode, nextFiles, complete)
              setFiles(nextFiles)
              if (complete) resolve(null as unknown as models.FileInfo[])
            },
            onError: reject,
          })
        })
      }
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
      cleanupDirectoryStream?.()
      if (isSearchRequest) setSearchLoading(false)
    }
  }, [currentPath, refreshKey, debouncedSearchQuery, searchFilter, privacyMode, setSearchLoading])

  return { files, setFiles, loading, fileTagColors, protectedPathMap, missingPreset }
}
