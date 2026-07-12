# Fix group fast scroller flicker at top of grouped file list

## Goal

Eliminate the flicker in the side group fast scroller when scrolling down from the very top of a grouped file list.

## Requirements

1. Group fast scroller must show the correct current group while scrolling without jumping back to the previous group.
2. Ensure the virtual list is remeasured whenever `listItems` change (e.g., toggling grouping or changing folder).
3. Keep the existing group-wheel scrolling behavior on the fast scroller zone.

## Acceptance Criteria

- [ ] Scrolling down from the top of a grouped list no longer briefly shows the second group and then reverts to the first group.
- [ ] The fast scroller indicator stays in sync with the visible group headers.
- [ ] Toggling grouping on/off does not leave stale virtualizer measurements.
- [ ] Frontend build (`cd frontend && npm run build`) passes without errors.

## Notes

- Root cause: `GroupFastScroller` reads `rowVirtualizer.scrollOffset` and `rowVirtualizer.getVirtualItems()` during render; TanStack Virtual can update these at slightly different times during scroll, causing transient group index mismatches. `FileList` also fails to call `rowVirtualizer.measure()` when `listItems` change.
- Fix direction: remeasure on `listItems` changes and compute/update `currentGroupIndex` from a scroll listener instead of directly during render, with a small stability guard to suppress single-frame flips.
