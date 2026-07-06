import React, { useRef, useState, useEffect, useCallback } from 'react'

interface ScrollAreaProps {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  orientation?: 'vertical' | 'horizontal' | 'both'
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export default function ScrollArea({
  children,
  className = '',
  innerClassName = '',
  orientation = 'vertical',
  onClick,
}: ScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)
  const [showThumb, setShowThumb] = useState(false)
  const dragStateRef = useRef<{ startY: number; startScrollTop: number } | null>(null)
  const thumbHeightRef = useRef(0)

  useEffect(() => {
    thumbHeightRef.current = thumbHeight
  }, [thumbHeight])

  const updateMetrics = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { clientHeight, scrollHeight, scrollTop } = el
    if (scrollHeight <= clientHeight + 1) {
      setShowThumb(false)
      return
    }
    setShowThumb(true)
    const trackPadding = 8
    const trackHeight = Math.max(0, clientHeight - trackPadding)
    const minThumb = 24
    const height = Math.max(minThumb, (clientHeight / scrollHeight) * trackHeight)
    const maxTop = trackHeight - height
    const top = maxTop <= 0 ? 0 : (scrollTop / (scrollHeight - clientHeight)) * maxTop
    setThumbHeight(height)
    setThumbTop(top)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateMetrics()
    el.addEventListener('scroll', updateMetrics, { passive: true })
    const ro = new ResizeObserver(updateMetrics)
    ro.observe(el)
    const mo = new MutationObserver(updateMetrics)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', updateMetrics)
      ro.disconnect()
      mo.disconnect()
    }
  }, [updateMetrics])

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const el = scrollRef.current
      if (!el) return
      setIsDragging(true)
      dragStateRef.current = { startY: e.clientY, startScrollTop: el.scrollTop }

      const handleMove = (ev: PointerEvent) => {
        if (!dragStateRef.current || !el) return
        const delta = ev.clientY - dragStateRef.current.startY
        const { clientHeight, scrollHeight } = el
        const trackHeight = Math.max(0, clientHeight - 8)
        const currentThumbHeight = thumbHeightRef.current || Math.max(24, (clientHeight / scrollHeight) * trackHeight)
        const maxTop = trackHeight - currentThumbHeight
        if (maxTop <= 0) return
        const ratio = delta / maxTop
        el.scrollTop = dragStateRef.current.startScrollTop + ratio * (scrollHeight - clientHeight)
      }

      const handleUp = () => {
        setIsDragging(false)
        dragStateRef.current = null
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    []
  )

  const showScrollbar = showThumb && (isHovered || isDragging)

  const needsVertical = orientation === 'vertical' || orientation === 'both'

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollRef}
        className={`h-full w-full overflow-auto no-scrollbar ${innerClassName}`}
        onClick={onClick}
      >
        {children}
      </div>

      {needsVertical && (
        <div
          className="absolute right-1 top-1 bottom-1 w-1.5 rounded-full pointer-events-none transition-opacity duration-200"
          style={{ opacity: showScrollbar ? 1 : 0 }}
        >
          <div
            className="absolute w-full rounded-full bg-gray-400/50 hover:bg-gray-400/80 pointer-events-auto cursor-pointer transition-colors"
            style={{ height: thumbHeight, top: thumbTop }}
            onPointerDown={startDrag}
          />
        </div>
      )}
    </div>
  )
}
