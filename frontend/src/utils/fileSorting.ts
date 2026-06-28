import { pinyin } from 'pinyin-pro'
import { models } from '../../wailsjs/go/models'
import { SortOption, ViewMode } from '../store/uiStore'
import { isImage } from './previewHelper'

export type VirtualListItem = 
  | { type: 'header', title: string }
  | { type: 'row', items: models.FileInfo[] }

const getExt = (path: string) => {
  const parts = path.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
}

const getInitial = (name: string): string => {
  if (!name) return '#'
  const firstChar = name.charAt(0)
  
  if (/^[\u4e00-\u9fa5]+$/.test(firstChar)) {
    const py = pinyin(firstChar, { pattern: 'first', toneType: 'none' })
    if (py && py.length > 0) {
      return py[0].toUpperCase()
    }
  }
  
  if (/^[a-zA-Z]$/.test(firstChar)) {
    return firstChar.toUpperCase()
  }
  
  if (/^[0-9]$/.test(firstChar)) {
    return '0-9'
  }
  
  return '#'
}

const getTimeGroup = (modTime: any): string => {
  if (!modTime) return '未知时间'
  
  const time = new Date(modTime).getTime()
  const now = Date.now()
  const diff = now - time

  const HOUR = 60 * 60 * 1000
  const DAY = 24 * HOUR
  const WEEK = 7 * DAY
  const MONTH = 30 * DAY

  if (diff < HOUR) return '1小时内'
  if (diff < DAY) return '一天内'
  if (diff < WEEK) return '一周内'
  if (diff < MONTH) return '一个月内'
  return '一个月以上'
}

const timeGroupOrder = ['1小时内', '一天内', '一周内', '一个月内', '一个月以上', '未知时间']

const getSizeGroup = (size: number): string => {
  if (size === undefined || size === null) return '未知大小'
  const KB = 1024
  const MB = 1024 * KB
  const GB = 1024 * MB
  
  if (size >= GB) return '>1GB'
  if (size >= 100 * MB) return '100MB - 1GB'
  if (size >= MB) return '1MB - 100MB'
  if (size >= KB) return '1KB - 1MB'
  return '<1KB'
}

const sizeGroupOrder = ['>1GB', '100MB - 1GB', '1MB - 100MB', '1KB - 1MB', '<1KB', '未知大小']

export const processFiles = (
  files: models.FileInfo[], 
  sortOption: SortOption, 
  columns: number,
  isGrouped: boolean,
  viewMode: ViewMode
): VirtualListItem[] => {
  
  const createFolderIndex = files.findIndex(f => f.path === '__create_smart_folder__')
  const createFolderItem = createFolderIndex >= 0 ? files[createFolderIndex] : null
  let regularFiles = createFolderIndex >= 0 ? [...files.slice(0, createFolderIndex), ...files.slice(createFolderIndex + 1)] : files

  if (viewMode === 'album') {
    regularFiles = regularFiles.filter(f => f.isDir || isImage(getExt(f.path)))
  }

  const sortedFiles = [...regularFiles].sort((a, b) => {
    // 文件夹始终在前
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1

    if (sortOption === 'name_asc') {
      return a.name.localeCompare(b.name, 'zh-CN')
    } else if (sortOption === 'name_desc') {
      return b.name.localeCompare(a.name, 'zh-CN')
    } else if (sortOption === 'size_asc') {
      return (a.size || 0) - (b.size || 0)
    } else if (sortOption === 'size_desc') {
      return (b.size || 0) - (a.size || 0)
    } else if (sortOption === 'time_asc') {
      const ta = new Date(a.modTime || 0).getTime()
      const tb = new Date(b.modTime || 0).getTime()
      return ta - tb
    } else {
      const ta = new Date(a.modTime || 0).getTime()
      const tb = new Date(b.modTime || 0).getTime()
      return tb - ta
    }
  })

  if (viewMode === 'album') {
    const listItems: VirtualListItem[] = []
    const folderFiles = sortedFiles.filter(f => f.isDir)
    const imageFiles = sortedFiles.filter(f => !f.isDir)

    if (folderFiles.length > 0) {
      listItems.push({ type: 'header', title: '文件夹' })
      for (let i = 0; i < folderFiles.length; i += columns) {
        listItems.push({ type: 'row', items: folderFiles.slice(i, i + columns) })
      }
    }

    if (imageFiles.length > 0) {
      listItems.push({ type: 'header', title: '图片' })
      for (let i = 0; i < imageFiles.length; i += columns) {
        listItems.push({ type: 'row', items: imageFiles.slice(i, i + columns) })
      }
    }

    // append smart folder create item at the end of folders if it exists
    if (createFolderItem) {
      // Find the last folder row
      let lastFolderRowIdx = -1
      for (let i = listItems.length - 1; i >= 0; i--) {
        if (listItems[i].type === 'row' && (listItems[i] as any).items[0]?.isDir) {
          lastFolderRowIdx = i
          break
        }
      }
      
      if (lastFolderRowIdx >= 0) {
        const lastRow = listItems[lastFolderRowIdx] as { type: 'row', items: models.FileInfo[] }
        if (lastRow.items.length < columns) {
          lastRow.items.push(createFolderItem)
        } else {
          listItems.splice(lastFolderRowIdx + 1, 0, { type: 'row', items: [createFolderItem] })
        }
      } else {
        // If no folder exists, just add a folder header and row
        if (folderFiles.length === 0) {
          listItems.unshift({ type: 'header', title: '文件夹' }, { type: 'row', items: [createFolderItem] })
        }
      }
    }

    return listItems
  }

  if (!isGrouped) {
    const listItems: VirtualListItem[] = []
    for (let i = 0; i < sortedFiles.length; i += columns) {
      listItems.push({
        type: 'row',
        items: sortedFiles.slice(i, i + columns)
      })
    }
    if (createFolderItem) {
      const lastItem = listItems.length > 0 ? listItems[listItems.length - 1] : null
      if (lastItem && lastItem.type === 'row' && lastItem.items.length < columns) {
        lastItem.items.push(createFolderItem)
      } else {
        listItems.push({ type: 'row', items: [createFolderItem] })
      }
    }
    return listItems
  }

  const groups = new Map<string, models.FileInfo[]>()

  sortedFiles.forEach(file => {
    let groupKey = ''
    if (sortOption.startsWith('name')) {
      groupKey = getInitial(file.name)
    } else if (sortOption.startsWith('size')) {
      groupKey = getSizeGroup(file.size)
    } else {
      groupKey = getTimeGroup(file.modTime)
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(file)
  })

  let sortedGroupKeys = Array.from(groups.keys())
  if (sortOption === 'name_asc') {
    sortedGroupKeys.sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
  } else if (sortOption === 'name_desc') {
    sortedGroupKeys.sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return b.localeCompare(a)
    })
  } else if (sortOption === 'time_asc') {
    sortedGroupKeys.sort((a, b) => timeGroupOrder.indexOf(b) - timeGroupOrder.indexOf(a)) 
  } else if (sortOption === 'time_desc') {
    sortedGroupKeys.sort((a, b) => timeGroupOrder.indexOf(a) - timeGroupOrder.indexOf(b))
  } else if (sortOption === 'size_asc') {
    sortedGroupKeys.sort((a, b) => sizeGroupOrder.indexOf(b) - sizeGroupOrder.indexOf(a))
  } else if (sortOption === 'size_desc') {
    sortedGroupKeys.sort((a, b) => sizeGroupOrder.indexOf(a) - sizeGroupOrder.indexOf(b))
  }

  const listItems: VirtualListItem[] = []
  
  sortedGroupKeys.forEach(key => {
    const groupFiles = groups.get(key)!
    if (groupFiles.length === 0) return

    listItems.push({ type: 'header', title: key })
    
    for (let i = 0; i < groupFiles.length; i += columns) {
      listItems.push({
        type: 'row',
        items: groupFiles.slice(i, i + columns)
      })
    }
  })

  if (createFolderItem) {
    listItems.push({ type: 'header', title: '创建' })
    listItems.push({ type: 'row', items: [createFolderItem] })
  }

  return listItems
}
