# Implementation Plan: 自定义悬浮滚动条

## Step 1 — Create `ScrollArea` component

**File**: `frontend/src/components/common/ScrollArea.tsx`

1. Create wrapper with `relative overflow-hidden`.
2. Inner scrollable div with `overflow-auto no-scrollbar`.
3. Track/thumb positioned absolute right (and bottom for `both` mode).
4. Implement `updateThumb`, `startDrag`, window-level drag listeners.
5. Use `ResizeObserver` to recalculate on content/container resize.

## Step 2 — Apply to target components

Replace native scrollable containers in:

- `frontend/src/components/settings/SettingsSidebar.tsx`
- `frontend/src/components/settings/SettingsContent.tsx`
- `frontend/src/components/layout/SearchPanel.tsx` (left filter panel)
- `frontend/src/components/layout/RightSidebarAdvanced.tsx`
- `frontend/src/components/rename/BatchRenameView.tsx`
- `frontend/src/components/preview/CodePreview.tsx`
- `frontend/src/components/preview/MarkdownPreview.tsx`
- `frontend/src/components/preview/TextPreview.tsx`
- `frontend/src/components/preview/DocxPreview.tsx`
- `frontend/src/components/preview/XlsxPreview.tsx`
- `frontend/src/components/preview/ImagePreview.tsx`
- `frontend/src/components/preview/EpubPreview.tsx`

## Step 3 — Verify

1. `cd frontend && npm run build`
2. Visual spot check:
   - 滚动条无箭头。
   - thumb 半透明，hover 加深。
   - 鼠标进入出现，离开消失。
   - 内容宽度不随滚动条显隐变化。

## Rollback Points

- If overlay causes z-index issues with modals/menus, adjust wrapper stacking.
- If drag implementation is unstable, remove drag and keep auto-show/hide only.
