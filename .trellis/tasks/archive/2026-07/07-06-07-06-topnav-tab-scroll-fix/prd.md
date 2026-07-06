# Fix TopNav tab auto-scroll jitter and incorrect position

## Goal

Make the TopNav tab bar auto-scroll reliably and smoothly so the active tab remains visible after path changes, without jitter or landing in the wrong position.

## Requirements

1. Scroll only when the active tab's right edge exceeds the tab container's visible right edge (overflow case).
2. Wait for layout/size stabilization before measuring and scrolling.
3. Avoid manual `scrollLeft` delta math; let the browser align the active tab.
4. Keep the existing first-mount guard so initial tab restore does not auto-scroll.
5. Skip auto-scroll while search mode is active (only one tab visible).

## Acceptance Criteria

- [ ] Navigating deeper into a long path scrolls the active tab fully into view.
- [ ] Navigating to shorter paths does not cause the tab bar to twitch or jump left unnecessarily.
- [ ] Switching tabs or adding a new tab scrolls the active tab into view reliably.
- [ ] No scroll occurs on app startup when restoring tabs.
- [ ] Frontend build (`cd frontend && npm run build`) passes without errors.

## Notes

- Root cause: the current `useEffect` measures tab position while framer-motion layout/width animations are still running, and `scrollTo({ behavior: 'smooth' })` competes with those animations.
- Use `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' })` on the active tab element after its layout/size has stabilized.
- A `ResizeObserver` debounce on the active tab element is the most reliable signal that the final size has settled.
