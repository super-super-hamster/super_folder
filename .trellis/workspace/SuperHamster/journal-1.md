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
