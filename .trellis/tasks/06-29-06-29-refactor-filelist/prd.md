# PRD: Refactor FileList.tsx

## Problem

`frontend/src/components/fileList/FileList.tsx` has grown to ~1,550 lines and carries at least 13 distinct responsibilities (data fetching, keyboard shortcuts, drag-and-drop, marquee selection, virtual list rendering, smart-folder creation, etc.). Its cognitive complexity is 432 and cyclomatic complexity is 180, making it the most expensive component in the frontend.

This makes the file hard to reason about, risky to change, and a bottleneck for future features (e.g. new view modes, selection behaviors, or directory sources).

## Goal

Refactor `FileList.tsx` by extracting cohesive, self-contained hooks and sub-components while preserving all existing behavior. After the refactor the component should be ~500–700 lines and only orchestrate state, hooks, and sub-components.

## Scope

### In scope
- Extract presentational icon/picture components.
- Move browser-dev mocks out of the component file.
- Extract pure file-formatting helpers and deduplicate `formatSize`.
- Extract data-fetching hook `useDirectoryFiles`.
- Extract marquee/box-selection hook `useMarqueeSelection`.
- Extract keyboard-shortcut hook `useFileListShortcuts` (dispatch-only, keep optimistic delete in parent).
- Extract batch-rename trigger listener hook `useBatchRenameTrigger`.
- Extract `GroupFastScroller` component.
- Extract `FileListItem` component.
- Extract inline `SmartFolderCreatePanel` component.
- Update all imports in `FileList.tsx` and other consumers.
- Type-check and build after every extraction step.

### Out of scope
- Change any user-visible behavior or styling.
- Add unit tests (project has no test infrastructure today).
- Refactor the Go backend or Wails bindings.
- Refactor `processFiles` / `fileSorting.ts`.
- Convert to a different state-management approach.

## Acceptance Criteria

1. `FileList.tsx` line count is ≤ 750 lines.
2. `npx tsc --noEmit` passes.
3. `npm run build` passes.
4. All existing keyboard shortcuts, selection modes, drag-and-drop, marquee selection, group scrolling, and smart-folder creation continue to work.
5. No `formatSize` duplication remains (`CacheSettings.tsx` uses the shared helper).
6. `isImage` in `FileList.tsx` is replaced by the shared `previewHelper.ts` implementation.
7. No new runtime dependencies are introduced.

## Non-goals

- Performance optimization beyond the refactor.
- Changing the visual design.
- Replacing Zustand stores.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Regressions in marquee selection | Keep geometry math identical; verify with manual drag tests in all three view modes. |
| Regressions in keyboard shortcuts | Keep callback wiring explicit; test Ctrl+A, S, Delete, F2, Ctrl+F. |
| Smart-folder creation broken | Extract as component but keep inline rendering location and state shape. |
| Drag-and-drop over folders broken | Keep `dragOverPath` state and handlers in parent; pass stable callbacks to `FileListItem`. |
