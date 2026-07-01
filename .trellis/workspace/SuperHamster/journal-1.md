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
