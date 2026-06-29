import { Select, ListBox } from '@heroui/react'
import { useTabsStore } from '../../store/tabsStore'

interface Props {
  path: string
}

export default function DynamicBreadcrumb({ path }: Props) {
  if (path === 'favorite://') {
    return <span className="truncate">收藏</span>
  }
  if (path === 'recent://') {
    return <span className="truncate">最近访问</span>
  }
  if (path === 'smartfolder://' || path.startsWith('smartfolder://')) {
    return <span className="truncate">虚拟文件夹</span>
  }

  const allSegments = path.replace(/\\$/, '').split('\\')

  if (allSegments.length === 0) return null

  const showEllipsis = allSegments.length > 3
  const hiddenStartIndex = 0
  const hiddenEndIndex = showEllipsis ? allSegments.length - 2 : 0
  
  const hiddenSegments = showEllipsis ? allSegments.slice(hiddenStartIndex, hiddenEndIndex) : []

  return (
    <div className="flex items-center w-full whitespace-nowrap">
      {showEllipsis && (
        <div key="ellipsis" className="flex items-center">
          <Select
            aria-label="Hidden paths"
            placeholder="..."
            onSelectionChange={(key) => {
              const selectedIdxStr = Array.from(key as any as Set<string>)[0] || (key as string)
              if (!selectedIdxStr) return
              const selectedIdx = parseInt(selectedIdxStr)
              const targetPath = allSegments.slice(0, selectedIdx + 1).join('\\') + (selectedIdx === 0 ? '\\' : '')
              const { tabs, activeTabId, navigate } = useTabsStore.getState()
              const isLast = selectedIdx === allSegments.length - 1
              const activeTab = tabs.find(t => t.id === activeTabId)
              navigate(targetPath, allSegments[selectedIdx], isLast && activeTab ? activeTab.isDir : true)
            }}
          >
            <Select.Trigger className="px-1 rounded hover:bg-gray-200 cursor-pointer transition-colors text-sm bg-transparent shadow-none border-none h-6 min-h-0 flex items-center justify-center">
              <span className="font-bold tracking-widest leading-none block pb-1">...</span>
            </Select.Trigger>
            <Select.Popover className="border border-gray-200 shadow-lg rounded-xl">
              <ListBox>
                {hiddenSegments.map((hiddenSeg, hiddenIdx) => {
                  const actualIdx = hiddenStartIndex + hiddenIdx
                  return (
                    <ListBox.Item key={actualIdx.toString()} id={actualIdx.toString()} textValue={hiddenSeg} className="text-gray-800 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black data-[selected=true]:font-medium transition-colors cursor-pointer">
                      {hiddenSeg}
                    </ListBox.Item>
                  )
                })}
              </ListBox>
            </Select.Popover>
          </Select>
          <span className="mx-1 text-gray-400 text-sm">&gt;</span>
        </div>
      )}

      {allSegments.map((seg, idx) => {
        if (showEllipsis && idx < hiddenEndIndex) return null

        const isLast = idx === allSegments.length - 1
        const targetPath = allSegments.slice(0, idx + 1).join('\\') + (idx === 0 ? '\\' : '')

        return (
          <div key={idx} className="flex items-center shrink-0">
            <span 
              className="px-1 rounded hover:bg-gray-200 cursor-pointer transition-colors text-sm"
              onClick={(e) => {
                e.stopPropagation()
                const isLast = idx === allSegments.length - 1
                const { tabs, activeTabId, navigate } = useTabsStore.getState()
                const activeTab = tabs.find(t => t.id === activeTabId)
                navigate(targetPath, seg, isLast && activeTab ? activeTab.isDir : true)
              }}
            >
              {seg === 'recent://' ? '最近访问' : seg}
            </span>
            {!isLast && <span className="mx-1 text-gray-400 text-sm">&gt;</span>}
          </div>
        )
      })}
    </div>
  )
}
