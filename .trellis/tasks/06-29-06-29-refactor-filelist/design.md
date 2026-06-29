# Design: Refactor FileList.tsx

## Architecture Overview

The refactor follows a classic container/presentational split:

- `FileList.tsx` becomes an **orchestrator/container**: it composes hooks, holds a small amount of UI-specific state (`lastClickedPath`, `dragOverPath`), wires callbacks, and renders the virtual list.
- Extracted **hooks** encapsulate side effects and behaviors that do not need JSX.
- Extracted **components** encapsulate self-contained JSX trees.
- Pure helpers move to `utils/`.
- Browser mocks move to a dev-only boot file.

## New Files

### Components

| File | Responsibility | Props |
|------|----------------|-------|
| `components/common/AnimatedFolderIcon.tsx` | Lottie folder icon that plays on hover. | `className?: string` |
| `components/common/AnimatedDocumentIcon.tsx` | Lottie document icon that plays on hover and stops at 50%. | `className?: string` |
| `components/common/ThumbnailImage.tsx` | Lazy-loaded thumbnail with skeleton and error fallback. | `path: string, alt: string, className?: string` |
| `components/fileList/FileListItem.tsx` | Single file cell for list/album/grid views. | `file`, `viewMode`, `isSelectionMode`, `isSelected`, `dragOverPath`, `fileTagColors`, event callbacks |
| `components/fileList/GroupFastScroller.tsx` | Floating group scroller overlay with wheel navigation. | `rowVirtualizer`, `listItems`, `isGrouped` |
| `components/fileList/SmartFolderCreatePanel.tsx` | Inline smart-folder creation form. | `onClose`, `searchPresets`, `smartFolders`, `onSave` |

### Hooks

| File | Responsibility | Inputs / Outputs |
|------|----------------|------------------|
| `hooks/useDirectoryFiles.ts` | Fetch files/tag colors for current path. | Returns `{ files, setFiles, loading, fileTagColors, missingPreset }` |
| `hooks/useMarqueeSelection.ts` | Box selection with auto-scroll. | Takes `scrollRef`, `listItems`, `columns`, `viewMode`; returns `{ isDragging, dragBox, dragSelectedPaths, onPointerDown }` |
| `hooks/useFileListShortcuts.ts` | Global file-list keyboard shortcuts. | Returns action callbacks (`onSelectAll`, `onCopy`, `onCut`, `onPaste`, `onDelete`, `onRename`, `onSearchFocus`) |
| `hooks/useBatchRenameTrigger.ts` | Listen for `triggerBatchRename` window event. | Takes `currentPath`, `files` |

### Utilities

| File | Responsibility |
|------|----------------|
| `utils/fileFormatting.ts` | `getFileIcon`, `formatSize`, `formatDate`; re-exports `isImage` from `previewHelper.ts`. |
| `devMocks.ts` | Browser-only mocks for `window.go` and `window.runtime`; imported in `main.tsx`. |

## State Ownership

| State | Owner | Reason |
|-------|-------|--------|
| `files`, `loading`, `fileTagColors` | `useDirectoryFiles` | Data lifecycle belongs with fetching. |
| `selectedPaths`, `isSelectionMode` | `useSelectionStore` | Already global; unchanged. |
| `lastClickedPath` | `FileList.tsx` | Only needed for shift-range selection in this view. |
| `dragOverPath` | `FileList.tsx` | Visual state tied to the list container. |
| `isDragging`, `dragStartPos`, `dragCurrentPos`, `dragSelectedPaths` | `useMarqueeSelection` | Internal to marquee behavior. |
| `columns`, `effectiveColumns`, `listItems`, `flatFiles` | `FileList.tsx` | Layout math tied to virtualizer; keep local. |
| `rowVirtualizer` | `FileList.tsx` | Core to the component; passing it around is acceptable. |
| Smart-folder form state | `SmartFolderCreatePanel` | Self-contained form. |

## Data Flow

1. `FileList` reads `currentPath` from `useTabsStore`.
2. `useDirectoryFiles(currentPath)` returns `files`, `loading`, `fileTagColors`, `missingPreset`.
3. `FileList` computes `listItems` via `processFiles` and `flatFiles`.
4. `useMarqueeSelection` reads `scrollRef`, `listItems`, `columns` and mutates selection store on pointer up.
5. `useFileListShortcuts` returns callbacks that `FileList` implements (often using `files`, `currentPath`, selection store).
6. `FileList` maps virtual rows; each row renders `FileListItem` cells.
7. `GroupFastScroller` receives `rowVirtualizer` and `listItems` to compute visible groups.
8. `SmartFolderCreatePanel` is rendered inline when `isCreatingSmartFolder` is true.

## Key Interfaces

```ts
// hooks/useDirectoryFiles.ts
export interface UseDirectoryFilesResult {
  files: models.FileInfo[]
  loading: boolean
  fileTagColors: Record<string, string>
  missingPreset: boolean
}

// hooks/useMarqueeSelection.ts
export interface DragBox {
  left: number
  top: number
  width: number
  height: number
}
export interface UseMarqueeSelectionResult {
  isDragging: boolean
  dragBox: DragBox | null
  onPointerDown: (e: React.PointerEvent) => void
}

// hooks/useFileListShortcuts.ts
export interface UseFileListShortcutsCallbacks {
  onSelectAll: () => void
  onToggleSelectionMode: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: (shiftKey: boolean) => void
  onRename: () => void
  onSearchFocus: () => void
}

// components/fileList/FileListItem.tsx
export interface FileListItemProps {
  file: models.FileInfo
  viewMode: 'list' | 'grid' | 'album'
  isSelectionMode: boolean
  isSelected: boolean
  dragOverPath: string | null
  fileTagColors: Record<string, string>
  onClick: (e: React.MouseEvent, file: models.FileInfo) => void
  onDoubleClick: (file: models.FileInfo) => void
  onContextMenu: (e: React.MouseEvent, file: models.FileInfo) => void
  onDragStart: (e: React.DragEvent, file: models.FileInfo) => void
  onDragOver: (e: React.DragEvent, file: models.FileInfo) => void
  onDragLeave: (e: React.DragEvent, file: models.FileInfo) => void
  onDrop: (e: React.DragEvent, file: models.FileInfo) => void
  onToggleSelect: (path: string) => void
}
```

## Coupling Decisions

- `useDirectoryFiles` is allowed to call `useModalStore.getState().openModal` for fetch errors because modal state is global.
- `useMarqueeSelection` is allowed to call `useSelectionStore.getState().setSelection` on pointer up because selection state is global.
- `useFileListShortcuts` is **not** allowed to own `files` mutation (e.g. optimistic delete); it only notifies the parent via callbacks.
- `FileListItem` receives all event handlers from `FileList` to keep selection logic centralized.
