export const isFunctionPage = (path: string): boolean => {
  if (!path) return false
  if (path.includes('://')) return true
  const part = path.split('?')[0]
  return (
    part.endsWith('\\相似图片') ||
    part.endsWith('\\批量重命名') ||
    part.endsWith('\\转换') ||
    part.endsWith('\\简繁转换')
  )
}

export interface LastPathTab {
  id: string
  currentPath: string
}

export const getLastInitialPath = (tabs: LastPathTab[], activeTabId: string): string => {
  const activeIndex = tabs.findIndex((t) => t.id === activeTabId)
  if (activeIndex === -1) return ''
  const candidates = tabs.slice(0, activeIndex + 1).reverse()
  for (const tab of candidates) {
    if (!isFunctionPage(tab.currentPath)) {
      return tab.currentPath
    }
  }
  return ''
}
