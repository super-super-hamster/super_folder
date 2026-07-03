# Virtual List & Marquee Selection Guidelines

---

## Virtual Row Height Must Match CSS Height

**Rule**: `rowVirtualizer.estimateSize` and `updateDragSelection` row size must match the actual CSS `h-*` class on `FileListItem`.

### Height Mapping

| View Mode | CSS Class | Size (px) |
|-----------|-----------|-----------|
| list | `h-[40px]` | 40 |
| grid | `h-36` (9rem) | 144 |
| album (dir) | `h-28` (7rem) | 112 |
| album (file) | `h-20` (5rem) | 80 |
| header | — | 45 |

### Locations

- `useMarqueeSelection.ts:62-70` — `updateDragSelection` row size
- `FileList.tsx:173-182` — `rowVirtualizer.estimateSize`

### Common Mistakes

- Using 160 for grid (instead of 144) creates a 16px phantom zone below each item, causing marquee selection to trigger prematurely when approaching from below. Upper/left/right edges are not affected because the gap only exists at the bottom.
- Using 116 for album dir (instead of 112) creates a 4px bottom gap.

---

## Marquee Selection: Store dragBox as Direct State

### Don't: Derive dragBox from dragStartPos/dragCurrentPos

```tsx
const [dragStartPos, setDragStartPos] = useState<...>(null)
const [dragCurrentPos, setDragCurrentPos] = useState<...>(null)
const dragBox = isDragging && dragStartPos && dragCurrentPos ? {
  left: Math.min(dragStartPos.x, dragCurrentPos.x),
  top: Math.min(dragStartPos.y, dragCurrentPos.y),
  width: Math.abs(dragCurrentPos.x - dragStartPos.x),
  height: Math.abs(dragCurrentPos.y - dragCurrentPos.y)
} : null
```

This causes `dragBox.height` to get stuck at 0 because `dragCurrentPos.y` can become stale when React batches or skips re-renders during pointer move.

### Do: Store dragBox directly, compute on each move

```tsx
const [dragStartPos, setDragStartPos] = useState<...>(null)
const [dragBox, setDragBox] = useState<DragBox | null>(null)

const computeDragBox = useCallback((current, start) => ({
  left: Math.min(start.x, current.x),
  top: Math.min(start.y, current.y),
  width: Math.abs(current.x - start.x),
  height: Math.abs(current.y - start.y)
}), [])

// On pointerdown:
setDragBox({ left: coords.x, top: coords.y, width: 0, height: 0 })

// On pointermove:
setDragBox(computeDragBox(coords, dragStartPos))

// On pointerup:
setDragBox(null)
```

### Auto-scroll integration

The same `computeDragBox` + `updateDragSelection` pattern applies in the `requestAnimationFrame` scroll loop. Auto-scroll speed must scale with pointer proximity to the top/bottom edge so near-edge dragging is faster than dragging at the edge threshold:

```tsx
const distanceRatio = Math.min(1, Math.max(0, edgeDistance / SCROLL_MARGIN))
const speed = MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * distanceRatio

if (didScroll) {
  const coords = getContainerCoords(lastMousePosRef.current.x, lastMousePosRef.current.y)
  setDragBox(computeDragBox(coords, dragStartPos))
  updateDragSelection(coords, dragStartPos)
}
```

Use the same speed calculation for upward and downward scroll. Keep the drag box and selection recomputed after every scroll tick.

---

## Container Coordinates

`getContainerCoords` translates client coordinates to the virtual list's content coordinate system:

```tsx
const getContainerCoords = (clientX, clientY) => ({
  x: clientX - rect.left - 24,     // offset for left sidebar padding
  y: clientY - rect.top + scrollTop - 16  // scroll-aware, offset for top padding
})
```

- Subtracts 24px from `x` to account for the left sidebar gutter
- Subtracts 16px from `y` for the top padding of the scroll container
- Adds `scrollTop` so the y coordinate tracks content position during scroll
