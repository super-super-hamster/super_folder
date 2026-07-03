# Fix startup privacy gate and duplicate file icons

## Goal

Fix two frontend startup regressions introduced around privacy mode and release asset packaging.

## Requirements

- When restore privacy mode requires unlock on startup, the startup privacy gate must appear immediately without first showing the normal file manager UI.
- When startup does not require a password, file icons must render once; no duplicate icon overlay or duplicate file item should appear on initial load.
- The fix must preserve the existing behavior where entering with password unlock keeps icons normal.
- The fix must preserve packaged asset availability for installed builds.
- The fix must not weaken backend privacy enforcement.

## Acceptance Criteria

- [ ] With `shouldPromptRestore` true, app startup shows the white privacy gate first and does not flash the main UI.
- [ ] With `shouldPromptRestore` false, app startup shows file list icons only once.
- [ ] Unlocking through the startup gate still enters privacy mode and refreshes visible files/tags.
- [ ] Frontend build succeeds.
- [ ] Go build succeeds if backend files are touched.
