import { useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VirtualListItem } from '../../utils/fileSorting'

interface GroupFastScrollerProps {
  rowVirtualizer: any
  listItems: VirtualListItem[]
  isGrouped: boolean
}

export default function GroupFastScroller({ rowVirtualizer, listItems, isGrouped }: GroupFastScrollerProps) {
  const headerIndices = useMemo(() => {
    return listItems.map((item, idx) => item.type === 'header' ? idx : -1).filter(i => i !== -1)
  }, [listItems])

  const groups = useMemo(() => {
    return headerIndices.map(idx => (listItems[idx] as { title: string }).title)
  }, [headerIndices, listItems])

  const [isHoveringScroller, setIsHoveringScroller] = useState(false)
  const scrollerZoneRef = useRef<HTMLDivElement>(null)
  const targetGroupRef = useRef<number>(0)
  const lastWheelTime = useRef<number>(0)

  let currentGroupIndex = 0
  if (isGrouped && groups.length > 0) {
    const virtualItems = rowVirtualizer.getVirtualItems()
    if (virtualItems.length > 0) {
      let topIndex = virtualItems[0].index
      const scrollOffset = rowVirtualizer.scrollOffset || 0
      for (const item of virtualItems) {
        if (item.start + item.size > scrollOffset) {
          topIndex = item.index
          break
        }
      }

      for (let i = 0; i < headerIndices.length; i++) {
        if (headerIndices[i] <= topIndex) {
          currentGroupIndex = i
        } else {
          break
        }
      }
    }
  }

  useEffect(() => {
    const el = scrollerZoneRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isGrouped || groups.length === 0) return

      const virtualItems = rowVirtualizer.getVirtualItems()
      if (virtualItems.length === 0) return

      let topIndex = virtualItems[0].index
      const scrollOffset = rowVirtualizer.scrollOffset || 0
      for (const item of virtualItems) {
        if (item.start + item.size > scrollOffset) {
          topIndex = item.index
          break
        }
      }

      let currIdx = 0
      for (let i = 0; i < headerIndices.length; i++) {
        if (headerIndices[i] <= topIndex) currIdx = i
        else break
      }

      const now = Date.now()
      let nextIdx = targetGroupRef.current

      if (now - lastWheelTime.current > 150) {
        nextIdx = currIdx
      }

      if (e.deltaY > 0) {
        nextIdx = Math.min(nextIdx + 1, groups.length - 1)
      } else if (e.deltaY < 0) {
        nextIdx = Math.max(nextIdx - 1, 0)
      }

      if (nextIdx !== targetGroupRef.current || now - lastWheelTime.current > 150) {
        targetGroupRef.current = nextIdx
        rowVirtualizer.scrollToIndex(headerIndices[nextIdx], { align: 'start' })
      }

      lastWheelTime.current = now
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [isGrouped, groups.length, headerIndices, rowVirtualizer])

  const visibleGroups: { title: string, offset: number, index: number }[] = []
  if (isHoveringScroller && isGrouped) {
    for (let i = -2; i <= 2; i++) {
      const idx = currentGroupIndex + i
      if (idx >= 0 && idx < groups.length) {
        visibleGroups.push({ title: groups[idx], offset: i, index: idx })
      }
    }
  }

  if (!isGrouped || groups.length === 0) return null

  return (
    <div
      ref={scrollerZoneRef}
      className="absolute right-0 top-0 bottom-0 w-16 z-20"
      onMouseEnter={() => setIsHoveringScroller(true)}
      onMouseLeave={() => setIsHoveringScroller(false)}
    >
      <AnimatePresence>
        {isHoveringScroller && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none"
          >
            {visibleGroups.map((g) => {
              const isCenter = g.offset === 0
              const opacity = isCenter ? 1 : (g.offset === 1 || g.offset === -1 ? 0.6 : 0.3)
              const scale = isCenter ? 1.2 : 0.9

              return (
                <div
                  key={g.index}
                  className={`flex items-center justify-center transition-all duration-200 ${isCenter ? 'w-10 h-10 bg-sf-selected rounded-full font-bold text-gray-900 text-xl' : 'w-10 h-8 font-medium text-gray-700 text-lg'}`}
                  style={{ opacity, transform: `scale(${scale})` }}
                >
                  {g.title.length > 2 ? g.title.substring(0, 2) : g.title}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
