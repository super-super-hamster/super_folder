import { pinyin } from 'pinyin-pro'
import { models } from '../../wailsjs/go/models'
import { SortOption } from '../store/uiStore'

export type VirtualListItem = 
  | { type: 'header', title: string }
  | { type: 'row', items: models.FileInfo[] }

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

export const processFiles = (
  files: models.FileInfo[], 
  sortOption: SortOption, 
  columns: number,
  isGrouped: boolean
): VirtualListItem[] => {
  
  const sortedFiles = [...files].sort((a, b) => {
    // 文件夹始终在前
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1

    if (sortOption === 'name_asc') {
      return a.name.localeCompare(b.name, 'zh-CN')
    } else if (sortOption === 'name_desc') {
      return b.name.localeCompare(a.name, 'zh-CN')
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

  if (!isGrouped) {
    const listItems: VirtualListItem[] = []
    for (let i = 0; i < sortedFiles.length; i += columns) {
      listItems.push({
        type: 'row',
        items: sortedFiles.slice(i, i + columns)
      })
    }
    return listItems
  }

  const groups = new Map<string, models.FileInfo[]>()

  sortedFiles.forEach(file => {
    let groupKey = ''
    if (sortOption.startsWith('name')) {
      groupKey = getInitial(file.name)
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
  } else {
    sortedGroupKeys.sort((a, b) => timeGroupOrder.indexOf(a) - timeGroupOrder.indexOf(b))
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

  return listItems
}
