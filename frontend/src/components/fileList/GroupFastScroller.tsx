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
  const [direction, setDirection] = useState(1)
  const scrollerZoneRef = useRef<HTMLDivElement>(null)
  const targetGroupRef = useRef<number>(0)
  const lastWheelTime = useRef<number>(0)
  const rafPendingRef = useRef(false)
  const prevIndexRef = useRef(0)
  const skipInitialRef = useRef(true)

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
    if (currentGroupIndex !== prevIndexRef.current) {
      setDirection(currentGroupIndex > prevIndexRef.current ? 1 : -1)
      prevIndexRef.current = currentGroupIndex
    }
  }, [currentGroupIndex])

  useEffect(() => {
    skipInitialRef.current = false
  }, [])

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
            {[-2, -1, 0, 1, 2].map((offset) => {
              const idx = currentGroupIndex + offset
              const abs = Math.abs(offset)
              const isCenter = offset === 0
              const baseClasses = getItemClasses(offset)

              if (idx < 0 || idx >= groups.length) {
                return (
                  <div
                    key={`placeholder-${offset}`}
                    className={`invisible flex items-center justify-center whitespace-nowrap rounded-lg ${baseClasses}`}
                    aria-hidden
                  >
                    &nbsp;
                  </div>
                )
              }

              const opacity = isCenter ? 1 : (abs === 1 ? 0.6 : 0.3)

              return (
                <div
                  key={`slot-${offset}`}
                  className={`relative flex items-center justify-center overflow-hidden whitespace-nowrap rounded-lg ${isCenter ? 'bg-sf-selected ' : ''}${baseClasses}`}
                  style={{ opacity }}
                >
                  <motion.div
                    key={idx}
                    initial={skipInitialRef.current ? false : { y: direction * 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                    className="flex items-center justify-center whitespace-nowrap"
                  >
                    {isCenter ? groups[idx] : groups[idx].charAt(0)}
                  </motion.div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
