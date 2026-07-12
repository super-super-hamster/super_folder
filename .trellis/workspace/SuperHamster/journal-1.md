# Journal - SuperHamster (Part 1)

> AI development session journal
> Started: 2026-06-28

---



## Session 1: EPUB viewer fixes: scrollbars, keyboard focus, layout

**Date**: 2026-07-01
**Task**: EPUB viewer fixes: scrollbars, keyboard focus, layout
**Branch**: `main`

### Summary

Fixed EPUB viewer vertical scrollbar by hiding .epub-container and iframe scrollbars. Restored rendition.display/relocated/rendered lifecycle after accidental removal. Added keyboard handlers inside iframe contents so ArrowUp/Down scroll and double-press ArrowLeft/Right switch chapters regardless of focus. Updated App.tsx to skip global ArrowLeft/Right back-forward when viewing EPUB files. Added commit-rule note to .trellis/spec/guides/index.md.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `fb76afc` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Top tab sizing + EPUB padding

**Date**: 2026-07-01
**Task**: Top tab sizing + EPUB padding
**Branch**: `main`

### Summary

Adjusted TopNav so tab wrappers no longer shrink and active tab background matches text width; added 16px left/right padding to EPUB iframe body.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `349f0b2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Fix Tag Search And Undo

**Date**: 2026-07-02
**Task**: Fix Tag Search And Undo
**Branch**: `main`

### Summary

Fixed tag-name and typed wildcard search, batched tag add/remove undo and redo, tag refresh after undo/redo, and documented undo payload contracts.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f9451f6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Privacy mode protection

**Date**: 2026-07-02
**Task**: Privacy mode protection
**Branch**: `main`

### Summary

Implemented privacy mode protection with public-mode filtering for protected paths, tags, search, favorites, recent items, startup unlock flow, password setup/unlock UI, lock badges, and Windows identity verification for password reset.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `6232e42` | (see git log) |
| `646be39` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Startup privacy and UI polish

**Date**: 2026-07-03
**Task**: Startup privacy and UI polish
**Branch**: `main`

### Summary

Fixed startup privacy gate timing, duplicate initial icon/file loading, feature page breadcrumbs and icons, context-menu conversion visibility, search controls, sidebar styling, and marquee auto-scroll behavior.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1478a9f` | (see git log) |
| `3087076` | (see git log) |
| `964fbc5` | (see git log) |
| `2eca0d6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Fix tag search and tag management

**Date**: 2026-07-03
**Task**: Fix tag search and tag management
**Branch**: `main`

### Summary

Fixed colon-containing tag search parsing and typed tag matching, deduped directory reloads after clearing search, added advanced tag drag reordering, cleaned unused tags with undo safety, and stabilized tag marker color generation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d46085c` | (see git log) |
| `aa97925` | (see git log) |
| `15172b7` | (see git log) |
| `7783727` | (see git log) |
| `7a0c100` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Preserve panel state, search path nav, public mode protection, marquee edge feedback

**Date**: 2026-07-03
**Task**: Preserve panel state, search path nav, public mode protection, marquee edge feedback
**Branch**: `main`

### Summary

This session: (1) left-side panel toggling preserves mounted state instead of unmounting; (2) search path navigation via InspectPathForNavigation; (3) public mode hides protected path existence; (4) marquee edge feedback fully reworked — bottom animation with enter/exit, direction gating (top up-only, bottom down-only), content-height-based scroll clamp, no DOM scrollHeight usage.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e968541` | (see git log) |
| `294a054` | (see git log) |
| `bd0d4e3` | (see git log) |
| `555768d` | (see git log) |
| `910a3a9` | (see git log) |
| `1771d82` | (see git log) |
| `2e8990c` | (see git log) |
| `8552ecd` | (see git log) |
| `0e8a46a` | (see git log) |
| `cca7929` | (see git log) |
| `ad75fa9` | (see git log) |
| `042e8ca` | (see git log) |
| `bd0c2bd` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Fix terminal mode switch newline leak

**Date**: 2026-07-04
**Task**: Fix terminal mode switch newline leak
**Branch**: `main`

### Summary

Fixed multiple newline-related bugs in terminal SF↔CMD mode switching:\n- Sync mechanism now writes full ConPTY buffer preserving \\r\\n and ANSI\n- Reset cmdRawBuffer on SF→CMD switch\n- Added defensive return after @cmd handler\n- Fixed @cmd prompt ANSI orange color stripped by sync

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c4768de` | (see git log) |
| `4f7d024` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Add initial path setting

**Date**: 2026-07-04
**Task**: Add initial path setting
**Branch**: `main`

### Summary

Implemented initial path setting in General settings with last/custom modes, privacy-aware config, close-time recording, startup path resolver, and follow-up fixes for Select value, default C: path, and input normalization.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4310cc1` | (see git log) |
| `2ed7057` | (see git log) |
| `b2340ca` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Add sidebar column browse, search depth filter, terminal newline fix

**Date**: 2026-07-04
**Task**: Add sidebar column browse, search depth filter, terminal newline fix
**Branch**: `main`

### Summary

Implemented sidebar column browse mode showing parent directory listing with drag-and-drop support, added search depth filter with input validation, fixed terminal SF→CMD mode switch extra blank line issue.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `110c3ed` | (see git log) |
| `d288ed0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Fix empty folder creation, scroll-to-rename race, and FilterVisibleFiles nil

**Date**: 2026-07-04
**Task**: Fix empty folder creation, scroll-to-rename race, and FilterVisibleFiles nil
**Branch**: `main`

### Summary

Fixed three issues: FilterVisibleFiles returning nil for empty folders causing ReadDir to return null; scrollToPosition restoration overriding scrollToIndex for new items; added diagnostic modal to handleCreate catch block.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `cd89640` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Add search include filter with OR substring matching, fix depth filter placeholder

**Date**: 2026-07-05
**Task**: Add search include filter with OR substring matching, fix depth filter placeholder
**Branch**: `main`

### Summary

Added search include filter: frontend store, tag-style input UI (single item at a time), backend OR substring matching in both tag and USN paths. Removed depth filter placeholder text. Changed include input to single-item mode (no comma split).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d33d049` | (see git log) |
| `d164d91` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Custom overlay scrollbar

**Date**: 2026-07-06
**Task**: Custom overlay scrollbar
**Branch**: `main`

### Summary

Added a reusable ScrollArea component with a custom overlay scrollbar (no arrows, 50% opacity thumb, hover-to-show) and applied it to visible scrollable panels including Settings, SearchPanel, RightSidebarAdvanced, BatchRename, previews, SimilarImages, and ModalManager.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e95eca3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Auto-scroll active tab in TopNav

**Date**: 2026-07-06
**Task**: Auto-scroll active tab in TopNav
**Branch**: `main`

### Summary

Added auto-scroll behavior to the top tab bar so that when the current tab's path changes, the tab bar scrolls horizontally to keep the active tab's right edge aligned with the container's right edge (clamped to scroll bounds).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a8e2c05` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Fix TopNav tab auto-scroll jitter

**Date**: 2026-07-06
**Task**: Fix TopNav tab auto-scroll jitter
**Branch**: `main`

### Summary

Replaced the one-shot requestAnimationFrame scroll logic with a ResizeObserver-based debounce on the active tab element. Scroll now uses scrollIntoView({inline: 'end'}) and only triggers when the tab overflows the right edge, eliminating jitter and incorrect positioning caused by concurrent framer-motion layout animations.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5764c1d` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Add file info panel, glob wildcards, tag validation, directory fallback preview

**Date**: 2026-07-07
**Task**: Add file info panel, glob wildcards, tag validation, directory fallback preview
**Branch**: `main`

### Summary

Added file info panel with GetFileDetail backend (stat, image dimensions, code line count, media metadata). Added glob wildcard search (? * [...]) with regex conversion. Added tag name validation (spaces and * blocked). Removed tag add from settings. Changed preview fallback to show current directory when no/multi/unsupported selection.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9701ffb` | (see git log) |
| `22acf77` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Fix RightSidebar advanced tab stutter

**Date**: 2026-07-07
**Task**: Fix RightSidebar advanced tab stutter
**Branch**: `main`

### Summary

Root-caused stutter of the active tab indicator when switching to the 高级 tab to synchronous mounting of RightSidebarAdvanced/TagPanel. Fixed by wrapping tab switches in useTransition, rendering content via useDeferredValue, and showing a HeroUI Skeleton placeholder during the deferred transition so the framer-motion layoutId indicator can animate immediately.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c4a84bd` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Fix General settings height collapse on toggle

**Date**: 2026-07-07
**Task**: Fix General settings height collapse on toggle
**Branch**: `main`

### Summary

Fixed the settings General page height collapse when toggling the '导航栏显示上一级目录' switch. Root cause was nested h-full inside a ScrollArea: GeneralSettings and ChineseConvSettings both had h-full, causing the scrollable content height to collapse on re-render. Changed GeneralSettings root to min-h-full and ChineseConvSettings root to mt-auto so the section anchors to the bottom without nested full-height conflicts.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `bf4e7ea` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Fix settings panel bottom gap after toggle

**Date**: 2026-07-07
**Task**: Fix settings panel bottom gap after toggle
**Branch**: `main`

### Summary

Follow-up fix: the previous min-h-full on GeneralSettings left a fixed-height bottom gap because the container height was determined by content. Reverted GeneralSettings to h-full so it strictly matches the ScrollArea height, while ChineseConvSettings remains mt-auto to anchor the section to the bottom.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5958a99` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Fix settings scroll area height and bottom anchoring

**Date**: 2026-07-07
**Task**: Fix settings scroll area height and bottom anchoring
**Branch**: `main`

### Summary

Added min-h-0 to SettingsContent ScrollArea so the scroll region fills the panel height instead of collapsing to content height after re-renders. Changed GeneralSettings from space-y-6 to gap-6 so the mt-auto on ChineseConvSettings is not overridden by the space-y > * + * margin, allowing the section to anchor to the panel bottom.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9da2f42` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: Fix settings content pushed above visible area

**Date**: 2026-07-07
**Task**: Fix settings content pushed above visible area
**Branch**: `main`

### Summary

Real root cause: GeneralSettings h-full forced its height to the scroll viewport, but its real content was much taller. mt-auto on ChineseConvSettings then pushed the section down within that 577px flex container, making the 1236px content bottom extend far beyond the viewport, so the visible top got cut off and the bottom looked empty. Removed h-full from GeneralSettings and mt-auto from ChineseConvSettings so content flows naturally inside the ScrollArea without being pushed up.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0411850` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Fix HeroUI Switch/Checkbox scroll shift bug, add file info panel, glob wildcards

**Date**: 2026-07-07
**Task**: Fix HeroUI Switch/Checkbox scroll shift bug, add file info panel, glob wildcards
**Branch**: `main`

### Summary

Fixed HeroUI Switch/Checkbox scroll shift root cause (sr-only input focus in flex-col). Added file info panel with metadata. Added glob wildcard support (? * [...]) in search. Added tag validation. Added sidebar column browse. Added include filter with OR logic. Added NOT toggle for filter conditions. Fixed empty folder creation bug. Added .markdown support.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `da65655` | (see git log) |
| `9701ffb` | (see git log) |
| `22acf77` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: Replace title attributes with HeroUI Tooltip

**Date**: 2026-07-11
**Task**: Replace title attributes with HeroUI Tooltip
**Branch**: `main`

### Summary

Replaced 21 native HTML title attributes with HeroUI v3 Tooltip. Fixed RAC FocusableContext context split bug via useTooltipState hook + controlled isOpen. Removed v2 HeroUIProvider. Added no-drag rule for tooltip trigger. Created TooltipItem wrapper for map-loop usage. Documented in spec. Delay 500ms.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `bd568e3` | (see git log) |
| `5caea28` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 24: Fix grouped file list scroller flicker

**Date**: 2026-07-12
**Task**: Fix grouped file list scroller flicker
**Branch**: `main`

### Summary

Fixed the group fast scroller briefly showing the wrong group when scrolling from the top of a grouped file list. Added rowVirtualizer.measure() when listItems change so the virtualizer does not use stale positions after toggling grouping. Moved current group index computation in GroupFastScroller from render-time to a scroll event listener with requestAnimationFrame throttling, using the scroll element's scrollTop to avoid transient mismatches between scrollOffset and getVirtualItems().

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0766d7a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: Refine group fast scroller to topmost visibly displayed group

**Date**: 2026-07-12
**Task**: Refine group fast scroller to topmost visibly displayed group
**Branch**: `main`

### Summary

Updated GroupFastScroller current-group detection: instead of showing a group whose header only barely peeks above the viewport, it now selects the first group header that has at least 22px of visible height. The wheel handler also reuses this logic for consistency. Falls back to the previous straddling logic if no header reaches the 22px threshold.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `310b459` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: Prevent group fast scroller label wrapping

**Date**: 2026-07-12
**Task**: Prevent group fast scroller label wrapping
**Branch**: `main`

### Summary

Added whitespace-nowrap to the group fast scroller indicator labels so titles like '0-9' render on a single line instead of wrapping.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ecc7219` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 27: Fix sidebar '..' navigation history logic

**Date**: 2026-07-12
**Task**: Fix sidebar '..' navigation history logic
**Branch**: `main`

### Summary

Fixed handleDotDot in Sidebar.tsx: it previously compared the parent path against the current history entry, causing incorrect goBack behavior. Now it compares against history[historyIndex - 1] (the path after one back). Only when that matches the parent path does it pop the stack via goBack; otherwise it navigates to the parent directory as a new history entry.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3284377` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 28: Add auto-collapse sidebar setting and faster hover expand

**Date**: 2026-07-12
**Task**: Add auto-collapse sidebar setting and faster hover expand
**Branch**: `main`

### Summary

Added a new General setting '导航栏自动折叠' (autoCollapseSidebar), default enabled. When disabled, the main Sidebar stays expanded regardless of mouse leave or whether the current path has a parent. Also reduced the Sidebar hover expand delay from 500ms to 200ms.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ffc0e43` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 29: Make CreateFolder undoable

**Date**: 2026-07-12
**Task**: Make CreateFolder undoable
**Branch**: `main`

### Summary

Registered the CreateFolder operation in the undo stack so users can undo/redo newly created folders. Added OpCreateFolder to internal/undo with inverse (os.Remove empty folder) and forward (os.MkdirAll) handlers; backend CreateFolder now pushes the operation after successful creation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2ef35ed` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 30: Group scroller fixed highlight with animated text

**Date**: 2026-07-12
**Task**: Group scroller fixed highlight with animated text
**Branch**: `main`

### Summary

Refactored GroupFastScroller so the active group highlight box stays vertically fixed while the group text scrolls past it. Added ResizeObserver to keep the highlight width/height synchronized with the active text item, used Framer Motion layout animations for fast spring scrolling, and made font sizes taper from the center outward.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ced26c8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 31: Fix group scroller highlight disappearing after scroll

**Date**: 2026-07-12
**Task**: Fix group scroller highlight disappearing after scroll
**Branch**: `main`

### Summary

Fixed the group fast scroller highlight box disappearing after scrolling. Root cause: the highlight was centered on the floating container, but at list boundaries the active group was not at the container center; also measuring the active item via a ref could transiently fail after layout animations. Fix: always render 5 symmetric slots with invisible placeholders so the active group stays at the visual center; measure the container width via ResizeObserver for the highlight width instead of relying on a per-item ref.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `12141a2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 32: Fix group scroller fast-scroll stacking

**Date**: 2026-07-12
**Task**: Fix group scroller fast-scroll stacking
**Branch**: `main`

### Summary

Replaced per-item Framer Motion layout animations in GroupFastScroller with a single translating list. Fast scrolling no longer causes items to pile on one side because the whole reel now translates as one unit. The active group highlight stays fixed in the center and adapts its width to the active group text.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `31a7989` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 33: Center group scroller highlight vertically

**Date**: 2026-07-12
**Task**: Center group scroller highlight vertically
**Branch**: `main`

### Summary

Fixed the group scroller highlight appearing at the top of the viewport instead of the center. Added justify-center and relative positioning to the container so the active-group highlight aligns with the translated list's active item.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d84665b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 34: Fixed group scroller layout with fixed slots

**Date**: 2026-07-12
**Task**: Fixed group scroller layout with fixed slots
**Branch**: `main`

### Summary

Replaced the translating list approach with 5 fixed slots in GroupFastScroller. The center slot always contains the active group and its highlight, while adjacent slots show first characters. Missing slots at boundaries are filled with invisible placeholders to keep the active group centered. Content animates in/out based on scroll direction, avoiding fast-scroll stacking.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c15f7d7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
