# Implementation Plan: Refactor FileList.tsx

## Step 0: Bootstrap

- Task already created: `06-29-06-29-refactor-filelist`.
- Read relevant specs after this file.
- Ensure baseline passes:
  ```bash
  cd frontend
  npx tsc --noEmit
  npm run build
  ```

## Step 1: Move icon/picture components and browser mocks

1. Create `frontend/src/components/common/AnimatedFolderIcon.tsx` from lines 32–68.
2. Create `frontend/src/components/common/AnimatedDocumentIcon.tsx` from lines 70–136.
3. Create `frontend/src/components/common/ThumbnailImage.tsx` from lines 138–203.
4. Create `frontend/src/devMocks.ts` from lines 206–229.
5. Import `devMocks.ts` in `frontend/src/main.tsx` (browser-only path).
6. Update `FileList.tsx` imports to use the new common components.
7. Remove moved code from `FileList.tsx`.
8. Run `npx tsc --noEmit` and `npm run build`.

## Step 2: Extract pure formatting helpers

1. Create `frontend/src/utils/fileFormatting.ts` exporting:
   - `isImage` (re-export from `previewHelper.ts`)
   - `getFileIcon(file)`
   - `formatSize(bytes)`
   - `formatDate(dateValue)`
2. Replace `FileList.tsx` local helpers with imports.
3. Replace `CacheSettings.tsx` local `formatSize` with the shared helper.
4. Run `npx tsc --noEmit` and `npm run build`.

## Step 3: Extract `useDirectoryFiles`

1. Create `frontend/src/hooks/useDirectoryFiles.ts`.
2. Move state/effects:
   - `files`, `loading`
   - tag-color fetching effect (lines 281–299)
   - directory/search/favorite/recent/smart-folder/preset fetch effect (lines 725–898)
3. Return `{ files, loading, fileTagColors, missingPreset }`.
4. In `FileList.tsx`, call the hook and remove the moved state/effects.
5. Keep the special empty-state message in JSX using `missingPreset`.
6. Run `npx tsc --noEmit` and `npm run build`.

## Step 4: Extract `useBatchRenameTrigger`

1. Create `frontend/src/hooks/useBatchRenameTrigger.ts` from lines 250–272.
2. Takes `currentPath`, `files`.
3. Use in `FileList.tsx`.
4. Run `npx tsc --noEmit`.

## Step 5: Extract `useFileListShortcuts`

1. Create `frontend/src/hooks/useFileListShortcuts.ts`.
2. Keep only keyboard event listening and dispatch logic.
3. Return callbacks:
   - `onSelectAll`
   - `onToggleSelectionMode`
   - `onCopy`
   - `onCut`
   - `onPaste`
   - `onDelete(shiftKey)`
   - `onRename`
   - `onSearchFocus`
4. In `FileList.tsx`, implement the callbacks and keep optimistic delete logic in the `onDelete` implementation.
5. Remove the inline `handleKeyDown` effect from `FileList.tsx`.
6. Run `npx tsc --noEmit` and `npm run build`.

## Step 6: Extract `useMarqueeSelection`

1. Create `frontend/src/hooks/useMarqueeSelection.ts`.
2. Move state, refs, `getContainerCoords`, `updateDragSelection`, `handlePointerDown`, pointer-effect, and auto-scroll loop.
3. Return `{ isDragging, dragBox, onPointerDown }`.
4. In `FileList.tsx`, render the marquee box from `dragBox`.
5. Run `npx tsc --noEmit` and `npm run build`.

## Step 7: Extract `GroupFastScroller`

1. Create `frontend/src/components/fileList/GroupFastScroller.tsx`.
2. Move `headerIndices`, `groups`, current-group computation, wheel handler, visible-groups overlay.
3. Props: `rowVirtualizer`, `listItems`, `isGrouped`.
4. Replace inline code in `FileList.tsx` with `<GroupFastScroller ... />`.
5. Run `npx tsc --noEmit` and `npm run build`.

## Step 8: Extract `FileListItem`

1. Create `frontend/src/components/fileList/FileListItem.tsx`.
2. Move the per-cell JSX (lines 1235–1349) including view-mode conditional rendering, checkbox, icon/thumbnail, tag dot, and labels.
3. Pass all handlers and state from `FileList.tsx`.
4. Import `AnimatedFolderIcon`, `AnimatedDocumentIcon`, `ThumbnailImage`, and helpers from `utils/fileFormatting`.
5. Run `npx tsc --noEmit` and `npm run build`.

## Step 9: Extract `SmartFolderCreatePanel`

1. Create `frontend/src/components/fileList/SmartFolderCreatePanel.tsx`.
2. Move form state and JSX (lines 1357–1492).
3. Props:
   - `searchPresets`
   - `smartFolders`
   - `onSave: (folder) => void`
   - `onClose: () => void`
4. In `FileList.tsx`, keep `isCreatingSmartFolder` flag and render the panel inline.
5. Run `npx tsc --noEmit` and `npm run build`.

## Step 10: Final cleanup and verification

1. Review `FileList.tsx` for dead imports and unused state.
2. Run `npx tsc --noEmit` and `npm run build`.
3. Check final line count target (≤ 750 lines).
4. Update `task.json` status and related files.
5. Run `trellis-check` skill or equivalent verification.

## Rollback Plan

If a regression is found after a step:

1. Do not proceed to the next step until fixed.
2. Use `git diff` to inspect the step's changes.
3. The preferred fix is forward: adjust the extracted module's interface or logic.
4. Only revert a step if the forward fix is clearly more expensive.
