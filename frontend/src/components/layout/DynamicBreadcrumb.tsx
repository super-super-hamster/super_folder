import { Select, ListBox } from '@heroui/react'
import { useTabsStore } from '../../store/tabsStore'

interface Props {
  path: string
}

export default function DynamicBreadcrumb({ path }: Props) {
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
              const selectedIdxStr = key as string
              if (!selectedIdxStr) return
              const selectedIdx = parseInt(selectedIdxStr)
              const targetPath = allSegments.slice(0, selectedIdx + 1).join('\\') + (selectedIdx === 0 ? '\\' : '')
              useTabsStore.getState().navigate(targetPath, allSegments[selectedIdx])
            }}
          >
            <Select.Trigger className="bg-transparent shadow-none border-0 hover:bg-gray-200/50 px-1 min-h-0 h-6 w-8 rounded data-[hover=true]:bg-gray-200/80 cursor-pointer flex items-center justify-center">
              <span className="text-gray-500 font-bold tracking-widest leading-none block pb-1">...</span>
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {hiddenSegments.map((hiddenSeg, hiddenIdx) => {
                  const actualIdx = hiddenStartIndex + hiddenIdx
                  return (
                    <ListBox.Item key={actualIdx.toString()} id={actualIdx.toString()} textValue={hiddenSeg} className="text-gray-800">
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
                useTabsStore.getState().navigate(targetPath, seg)
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
