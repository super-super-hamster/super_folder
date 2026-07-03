import { useState, useRef, useCallback, useEffect, RefObject } from 'react'
import { VirtualListItem } from '../utils/fileSorting'
import { useSelectionStore } from '../store/selectionStore'

export interface DragBox {
  left: number
  top: number
  width: number
  height: number
}

export interface UseMarqueeSelectionOptions {
  scrollRef: RefObject<HTMLDivElement | null>
  listItems: VirtualListItem[]
  columns: number
  viewMode: 'list' | 'grid' | 'album'
}

export interface EdgeFeedback {
  edge: 'top' | 'bottom'
  key: number
  intensity: number
}

function getItemSize(item: VirtualListItem, viewMode: 'list' | 'grid' | 'album') {
  if (item.type === 'header') return 45
  if (viewMode === 'list') return 40
  if (viewMode === 'album') return item.items[0]?.isDir ? 112 : 80
  return 144
}

export function useMarqueeSelection({ scrollRef, listItems, columns, viewMode }: UseMarqueeSelectionOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null)
  const [dragBox, setDragBox] = useState<DragBox | null>(null)
  const [dragSelectedPaths, setDragSelectedPaths] = useState<Set<string>>(new Set())
  const [edgeFeedback, setEdgeFeedback] = useState<EdgeFeedback | null>(null)
  const lastMousePosRef = useRef<{ x: number, y: number } | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)
  const isCtrlPressedRef = useRef(false)
  const triggeredEdgeRef = useRef<'top' | 'bottom' | null>(null)
  const edgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerEdgeFeedback = useCallback((edge: 'top' | 'bottom', intensity: number) => {
    if (edgeTimeoutRef.current) {
      clearTimeout(edgeTimeoutRef.current)
    }
    setEdgeFeedback({ edge, key: Date.now(), intensity })
    edgeTimeoutRef.current = setTimeout(() => {
      setEdgeFeedback(null)
      edgeTimeoutRef.current = null
    }, 250)
  }, [])

  const getContainerCoords = useCallback((clientX: number, clientY: number) => {
    if (!scrollRef.current) return { x: 0, y: 0 }
    const rect = scrollRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left - 24,
      y: clientY - rect.top + scrollRef.current.scrollTop - 16
    }
  }, [scrollRef])

  const computeDragBox = useCallback((current: { x: number, y: number }, start: { x: number, y: number }): DragBox => {
    return {
      left: Math.min(start.x, current.x),
      top: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y)
    }
  }, [])

  const getContentHeight = useCallback(() => {
    return listItems.reduce((total, item) => total + getItemSize(item, viewMode), 0)
  }, [listItems, viewMode])

  const getScrollPadding = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return { top: 0, bottom: 0 }
    const styles = window.getComputedStyle(scrollEl)
    return {
      top: Number.parseFloat(styles.paddingTop) || 0,
      bottom: Number.parseFloat(styles.paddingBottom) || 0
    }
  }, [scrollRef])

  const clampContentY = useCallback((y: number) => {
    const { bottom } = getScrollPadding()
    return Math.max(0, Math.min(y, getContentHeight() + bottom))
  }, [getContentHeight, getScrollPadding])

  const getRealMaxScrollTop = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return 0
    const { top: paddingTop, bottom: paddingBottom } = getScrollPadding()
    const realScrollHeight = getContentHeight() + paddingTop + paddingBottom
    return Math.max(0, realScrollHeight - scrollEl.clientHeight)
  }, [getContentHeight, getScrollPadding, scrollRef])

  const updateDragSelection = useCallback((currentPos: { x: number, y: number }, startPos: { x: number, y: number }) => {
    const boxLeft = Math.min(startPos.x, currentPos.x)
    const boxRight = Math.max(startPos.x, currentPos.x)
    const boxTop = Math.min(startPos.y, currentPos.y)
    const boxBottom = Math.max(startPos.y, currentPos.y)

    const newSelected = new Set<string>()
    let currentYOffset = 0
    const gap = viewMode === 'album' ? 4 : 16
    const C_W = scrollRef.current?.clientWidth ? scrollRef.current.clientWidth - 48 : 0
    const cols = viewMode === 'list' ? 1 : columns
    const cw = C_W > 0 ? (C_W - (cols - 1) * gap) / cols : 0

    for (let index = 0; index < listItems.length; index++) {
      const item = listItems[index]
      const size = getItemSize(item, viewMode)
      const start = currentYOffset
      const end = start + size

      if (end >= boxTop && start <= boxBottom) {
        if (item.type === 'row') {
          for (let col = 0; col < cols; col++) {
            const file = item.items[col]
            if (!file) continue
            const itemLeft = col * (cw + gap)
            const itemRight = itemLeft + cw
            if (itemRight >= boxLeft && itemLeft <= boxRight) {
              newSelected.add(file.path)
            }
          }
        }
      }
      currentYOffset += size
    }
    setDragSelectedPaths(newSelected)
  }, [listItems, columns, viewMode, scrollRef])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[draggable="true"]') || target.closest('button') || target.closest('input')) return

    const isScrollbar = e.clientX > (scrollRef.current?.getBoundingClientRect().right || 0) - 20
    if (isScrollbar) return

    e.preventDefault()
    target.focus?.()

    const rawCoords = getContainerCoords(e.clientX, e.clientY)
    const coords = {
      x: rawCoords.x,
      y: clampContentY(rawCoords.y)
    }
    setIsDragging(true)
    setDragStartPos(coords)
    setDragBox({ left: coords.x, top: coords.y, width: 0, height: 0 })
    setDragSelectedPaths(new Set())
    isCtrlPressedRef.current = e.ctrlKey || e.metaKey

    if (!isCtrlPressedRef.current && !e.shiftKey && !useSelectionStore.getState().isSelectionMode) {
      useSelectionStore.getState().clearSelection()
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }, [getContainerCoords, scrollRef, clampContentY])

  useEffect(() => {
    if (!isDragging || !dragStartPos) return

    const handlePointerMove = (e: PointerEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      const rawCoords = getContainerCoords(e.clientX, e.clientY)
      const coords = {
        x: rawCoords.x,
        y: clampContentY(rawCoords.y)
      }
      setDragBox(computeDragBox(coords, dragStartPos))
      updateDragSelection(coords, dragStartPos)
    }

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false)
      setDragBox(null)
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current)
      if (edgeTimeoutRef.current) {
        clearTimeout(edgeTimeoutRef.current)
        edgeTimeoutRef.current = null
      }
      setEdgeFeedback(null)
      triggeredEdgeRef.current = null

      setDragSelectedPaths(prev => {
        if (prev.size > 0) {
          const pathsToSelect = Array.from(prev)
          const finalSet = isCtrlPressedRef.current ? new Set(useSelectionStore.getState().selectedPaths) : new Set<string>()
          pathsToSelect.forEach(p => finalSet.add(p))
          useSelectionStore.getState().setSelection(Array.from(finalSet))
        }
        return new Set()
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    const scrollLoop = () => {
      if (!scrollRef.current || !lastMousePosRef.current) return
      const rect = scrollRef.current.getBoundingClientRect()
      const clientY = lastMousePosRef.current.y

      const SCROLL_MARGIN = 80
      const MIN_SCROLL_SPEED = 4
      const MAX_SCROLL_SPEED = 28

      const maxScrollTop = getRealMaxScrollTop()
      const scrollTop = Math.min(scrollRef.current.scrollTop, maxScrollTop)
      if (scrollRef.current.scrollTop !== scrollTop) {
        scrollRef.current.scrollTop = scrollTop
      }
      const atTop = scrollTop <= 0
      const atBottom = scrollTop >= maxScrollTop - 1

      let didScroll = false
      if (clientY < rect.top + SCROLL_MARGIN) {
        if (atTop) {
          if (triggeredEdgeRef.current !== 'top') {
            const distanceRatio = Math.min(1, Math.max(0, (rect.top + SCROLL_MARGIN - clientY) / SCROLL_MARGIN))
            triggerEdgeFeedback('top', distanceRatio)
            triggeredEdgeRef.current = 'top'
          }
        } else {
          triggeredEdgeRef.current = null
        }
        if (!atTop) {
          const distanceRatio = Math.min(1, Math.max(0, (rect.top + SCROLL_MARGIN - clientY) / SCROLL_MARGIN))
          const nextScrollTop = Math.max(0, scrollTop - (MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * distanceRatio))
          scrollRef.current.scrollTop = nextScrollTop
          didScroll = nextScrollTop !== scrollTop
        }
      } else if (clientY > rect.bottom - SCROLL_MARGIN) {
        if (atBottom) {
          if (triggeredEdgeRef.current !== 'bottom') {
            const distanceRatio = Math.min(1, Math.max(0, (clientY - (rect.bottom - SCROLL_MARGIN)) / SCROLL_MARGIN))
            triggerEdgeFeedback('bottom', distanceRatio)
            triggeredEdgeRef.current = 'bottom'
          }
        } else {
          triggeredEdgeRef.current = null
        }
        if (!atBottom) {
          const distanceRatio = Math.min(1, Math.max(0, (clientY - (rect.bottom - SCROLL_MARGIN)) / SCROLL_MARGIN))
          const nextScrollTop = Math.min(maxScrollTop, scrollTop + (MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * distanceRatio))
          scrollRef.current.scrollTop = nextScrollTop
          didScroll = nextScrollTop !== scrollTop
        }
      } else {
        triggeredEdgeRef.current = null
      }

      if (didScroll) {
        const rawCoords = getContainerCoords(lastMousePosRef.current.x, lastMousePosRef.current.y)
        const coords = {
          x: rawCoords.x,
          y: clampContentY(rawCoords.y)
        }
        setDragBox(computeDragBox(coords, dragStartPos))
        updateDragSelection(coords, dragStartPos)
      }

      autoScrollRafRef.current = requestAnimationFrame(scrollLoop)
    }
    autoScrollRafRef.current = requestAnimationFrame(scrollLoop)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current)
      triggeredEdgeRef.current = null
      if (edgeTimeoutRef.current) {
        clearTimeout(edgeTimeoutRef.current)
        edgeTimeoutRef.current = null
      }
    }
  }, [isDragging, dragStartPos, getContainerCoords, computeDragBox, updateDragSelection, scrollRef, triggerEdgeFeedback, clampContentY, getRealMaxScrollTop])

  return { isDragging, dragBox, dragSelectedPaths, edgeFeedback, onPointerDown: handlePointerDown }
}
