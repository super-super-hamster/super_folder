# Fix startup privacy gate and duplicate file icons

## Goal

Fix two frontend startup regressions introduced around privacy mode and release asset packaging.

## Requirements

- When restore privacy mode requires unlock on startup, the startup privacy gate must appear immediately without first showing the normal file manager UI.
- When startup does not require a password, file icons must render once; no duplicate icon overlay or duplicate file item should appear on initial load.
- The fix must preserve the existing behavior where entering with password unlock keeps icons normal.
- The fix must preserve packaged asset availability for installed builds.
- The fix must not weaken backend privacy enforcement.
- File context menu should show Simplified/Traditional conversion only for `.txt` and `.epub` files.
- Batch rename breadcrumb leading icon should use `edit_3_line.svg`.
- Similar images breadcrumb leading icon should use `pic_2_fill.svg`.
- Simplified/Traditional conversion breadcrumb leading icon should use `transfer_horizontal_line.svg`.
- File context menu rename action should use `edit_3_line.svg`.
- Entering feature pages from virtual roots such as favorites should preserve the underlying original path in breadcrumbs, not show `favorite:// > ...`.
- Similar image pages should keep the previous folder path in breadcrumbs before the final feature segment.

## Acceptance Criteria

- [ ] With `shouldPromptRestore` true, app startup shows the white privacy gate first and does not flash the main UI.
- [ ] With `shouldPromptRestore` false, app startup shows file list icons only once.
- [ ] Unlocking through the startup gate still enters privacy mode and refreshes visible files/tags.
- [ ] Simplified/Traditional conversion appears only for `.txt` and `.epub` files.
- [ ] Feature page breadcrumbs show the requested leading icons.
- [ ] Feature page breadcrumbs preserve the original source path when launched from favorites or other shortcut views.
- [ ] Frontend build succeeds.
- [ ] Go build succeeds if backend files are touched.
