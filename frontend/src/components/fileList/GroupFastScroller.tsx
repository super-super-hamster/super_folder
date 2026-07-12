import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
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
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const scrollerZoneRef = useRef<HTMLDivElement>(null)
  const targetGroupRef = useRef<number>(0)
  const lastWheelTime = useRef<number>(0)
  const rafPendingRef = useRef(false)

  const computeCurrentGroup = useCallback(() => {
    if (!isGrouped || groups.length === 0) return 0
    const scrollElement = rowVirtualizer.scrollElement as HTMLElement | undefined
    const scrollTop = scrollElement?.scrollTop ?? rowVirtualizer.scrollOffset ?? 0
    const clientHeight = scrollElement?.clientHeight ?? 0
    const virtualItems = rowVirtualizer.getVirtualItems() as { index: number; start: number; size: number }[]
    if (virtualItems.length === 0) return 0

    const virtualMap = new Map(virtualItems.map(item => [item.index, item]))
    const threshold = 22

    for (let i = 0; i < headerIndices.length; i++) {
      const headerIndex = headerIndices[i]
      const item = virtualMap.get(headerIndex)
      if (!item) continue
      const visibleTop = Math.max(item.start, scrollTop)
      const visibleBottom = Math.min(item.start + item.size, scrollTop + clientHeight)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)
      if (visibleHeight >= threshold) {
        return i
      }
    }

    let topIndex = virtualItems[0].index
    for (const item of virtualItems) {
      if (item.start + item.size > scrollTop) {
        topIndex = item.index
        break
      }
    }

    let idx = 0
    for (let i = 0; i < headerIndices.length; i++) {
      if (headerIndices[i] <= topIndex) {
        idx = i
      } else {
        break
      }
    }
    return idx
  }, [isGrouped, groups.length, headerIndices, rowVirtualizer])

  useEffect(() => {
    setCurrentGroupIndex(computeCurrentGroup())
  }, [computeCurrentGroup])

  useEffect(() => {
    const scrollElement = rowVirtualizer.scrollElement as HTMLElement | undefined
    if (!scrollElement) return

    const handleScroll = () => {
      if (rafPendingRef.current) return
      rafPendingRef.current = true
      requestAnimationFrame(() => {
        rafPendingRef.current = false
        setCurrentGroupIndex(computeCurrentGroup())
      })
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [rowVirtualizer.scrollElement, computeCurrentGroup])

  useEffect(() => {
    const el = scrollerZoneRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isGrouped || groups.length === 0) return

      const currIdx = computeCurrentGroup()

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
  }, [isGrouped, groups.length, headerIndices, rowVirtualizer, computeCurrentGroup])

  const getItemClasses = (offset: number) => {
    const abs = Math.abs(offset)
    if (abs === 0) return 'h-9 px-3 font-bold text-gray-900 text-xl'
    if (abs === 1) return 'h-8 px-2 font-medium text-gray-600 text-base'
    return 'h-7 px-2 font-medium text-gray-500 text-sm'
  }

  if (!isGrouped || groups.length === 0) return null

  const itemHeight = 36
  const gap = 8
  const step = itemHeight + gap
  const visibleCount = 5
  const containerHeight = visibleCount * itemHeight + (visibleCount - 1) * gap
  const translateY = -(currentGroupIndex * step + itemHeight / 2)

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
            className="absolute right-8 top-1/2 -translate-y-1/2 w-max overflow-hidden pointer-events-none relative flex flex-col items-center justify-center"
            style={{ height: containerHeight }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="relative z-10 flex items-center justify-center whitespace-nowrap px-3 h-9 bg-sf-selected rounded-lg font-bold text-gray-900 text-xl"
            >
              {groups[currentGroupIndex]}
            </motion.div>

            <motion.div
              animate={{ y: translateY }}
              transition={{ type: 'spring', stiffness: 600, damping: 45 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-0"
            >
              {groups.map((title, idx) => {
                const offset = idx - currentGroupIndex
                const abs = Math.abs(offset)
                const isCenter = offset === 0
                const opacity = abs <= 2 ? (isCenter ? 0 : (abs === 1 ? 0.6 : 0.3)) : 0

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center whitespace-nowrap rounded-lg ${getItemClasses(offset)}`}
                    style={{ opacity }}
                  >
                    {isCenter ? '\u00A0' : title.charAt(0)}
                  </div>
                )
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
