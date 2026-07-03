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

export function useMarqueeSelection({ scrollRef, listItems, columns, viewMode }: UseMarqueeSelectionOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null)
  const [dragBox, setDragBox] = useState<DragBox | null>(null)
  const [dragSelectedPaths, setDragSelectedPaths] = useState<Set<string>>(new Set())
  const lastMousePosRef = useRef<{ x: number, y: number } | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)
  const isCtrlPressedRef = useRef(false)

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
      let size: number
      if (item.type === 'header') {
        size = 45
      } else if (viewMode === 'list') {
        size = 40
      } else if (viewMode === 'album') {
        size = item.items[0]?.isDir ? 112 : 80
      } else {
        size = 144
      }
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

    const coords = getContainerCoords(e.clientX, e.clientY)
    setIsDragging(true)
    setDragStartPos(coords)
    setDragBox({ left: coords.x, top: coords.y, width: 0, height: 0 })
    setDragSelectedPaths(new Set())
    isCtrlPressedRef.current = e.ctrlKey || e.metaKey

    if (!isCtrlPressedRef.current && !e.shiftKey && !useSelectionStore.getState().isSelectionMode) {
      useSelectionStore.getState().clearSelection()
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }, [getContainerCoords, scrollRef])

  useEffect(() => {
    if (!isDragging || !dragStartPos) return

    const handlePointerMove = (e: PointerEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      const coords = getContainerCoords(e.clientX, e.clientY)
      setDragBox(computeDragBox(coords, dragStartPos))
      updateDragSelection(coords, dragStartPos)
    }

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false)
      setDragBox(null)
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current)

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

      let didScroll = false
      if (clientY < rect.top + SCROLL_MARGIN) {
        const distanceRatio = Math.min(1, Math.max(0, (rect.top + SCROLL_MARGIN - clientY) / SCROLL_MARGIN))
        scrollRef.current.scrollTop -= MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * distanceRatio
        didScroll = true
      } else if (clientY > rect.bottom - SCROLL_MARGIN) {
        const distanceRatio = Math.min(1, Math.max(0, (clientY - (rect.bottom - SCROLL_MARGIN)) / SCROLL_MARGIN))
        scrollRef.current.scrollTop += MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * distanceRatio
        didScroll = true
      }

      if (didScroll) {
        const coords = getContainerCoords(lastMousePosRef.current.x, lastMousePosRef.current.y)
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
    }
  }, [isDragging, dragStartPos, getContainerCoords, computeDragBox, updateDragSelection, scrollRef])

  return { isDragging, dragBox, dragSelectedPaths, onPointerDown: handlePointerDown }
}
