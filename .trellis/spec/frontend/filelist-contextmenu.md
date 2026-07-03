# File List Context Menu Guidelines

---

**Language**: All documentation should be written in **English**.

---

## Menu Boundary Constraint

The context menu must stay fully inside the file list panel. Do not position it purely by `clientX`/`clientY`; clamp against the panel's bounding rectangle.

Store the container rectangle when opening the menu:

```tsx
openMenu(e.clientX, e.clientY, f.path, f.name, f.isDir, scrollRef.current?.getBoundingClientRect())
```

In the menu component, compute the height from the actual items that will be rendered, then clamp coordinates:

```tsx
const MENU_WIDTH = 176
const ITEM_HEIGHT = 34
const DIVIDER_HEIGHT = 9
const PADDING_Y = 16

// Count buttons and dividers that will actually render for this menu variant
const { itemCount, dividerCount } = computeMenuItemCounts(...)
const menuHeight = itemCount * ITEM_HEIGHT + dividerCount * DIVIDER_HEIGHT + PADDING_Y

let left = x
let top = y

if (containerRect) {
  if (left + MENU_WIDTH > containerRect.right) {
    left = Math.max(containerRect.left, x - MENU_WIDTH)
  }
  if (top + menuHeight > containerRect.bottom) {
    top = Math.max(containerRect.top, y - menuHeight)
  }
  top = Math.max(top, containerRect.top)
}
```

Prefer flipping the menu above the cursor when it would overflow the bottom edge, rather than pinning it to the panel bottom. This keeps the menu close to the click point.

Do not add internal scrollbars to the context menu. If the full menu cannot fit inside the container even after flipping, still prefer the flipped position; the container itself is expected to be tall enough for normal usage.

---

## View-Mode-Sensitive Empty-Space Menu

Right-clicking empty space in the file list shows different actions depending on the active view mode.

- **List / Grid**: Show `新建文件夹` and `新建文件`.
- **Album**: Hide `新建文件` from the empty-space menu. `新建文件夹` remains available because album mode still shows folders.

Use the current `viewMode` from `uiStore` to conditionally render the items.

---

## File-Type-Sensitive Feature Actions

File-only feature actions must be gated by the target file type before rendering the menu item. Do not render a disabled feature row for unsupported file types unless the action is intentionally discoverable.

### Simplified/Traditional Conversion

Only show `简繁转换` for `.txt` and `.epub` files. The handler should still filter selected paths defensively before adding them to `chineseConvStore`.

```tsx
const targetExt = targetPath && !isDir ? targetPath.substring(targetPath.lastIndexOf('.')).toLowerCase() : ''
const canChineseConvert = targetExt === '.txt' || targetExt === '.epub'

{!isDir && canChineseConvert && (
  <button onClick={() => handleAction('chinese_conv')}>简繁转换</button>
)}
```

When launching a feature page from virtual roots such as `favorite://`, derive the feature page base from the real target file path, not `currentPath`. Otherwise breadcrumbs become `favorite:// > 简繁转换` instead of the source folder path.

```tsx
const targetFolderPath = targetPath && targetPath.includes('\\')
  ? targetPath.substring(0, targetPath.lastIndexOf('\\'))
  : currentPath

navigate((targetFolderPath || currentPath || 'C:\\') + '\\简繁转换', '简繁转换', false)
```

### General Conversion

Only show `转换` when all selected targets are files and `GetConvertibleFormats(targets)` returns at least one common output format. Hide the action entirely when:

- The current target is not convertible.
- Multiple selected files have no common conversion format.
- Any selected target is a directory.

Because `GetConvertibleFormats` is asynchronous, clear old format state before each request and key the result to the exact target set. Never render `转换` from stale formats returned for a previous right-click.

```tsx
const key = targets.join('\n')
setConvertibleFormats([])
setConvertibleFormatsKey(includesDirectory ? '' : key)

GetConvertibleFormats(targets).then(formats => {
  if (isCurrent) setConvertibleFormats(formats || [])
})

const canShowConvert = !selectedIncludesDirectory &&
  convertibleFormatsKey === selectedTargetsKey &&
  convertibleFormats.length > 0
```

---

## Auto-Scroll to Newly Created Items

After creating a new file or folder, the list must scroll the new item into view before showing the inline rename box.

1. Set `scrollToPath` in `uiStore` to the new item's path.
2. Wait for the virtual list to render the item.
3. Start the rename popover only after the DOM element (`#file-${newPath}`) exists.

For virtual lists, `rowVirtualizer.scrollToIndex` with `align: 'center'` is the reliable way to bring a row into view. Wrap the call in `requestAnimationFrame` to ensure the DOM has settled after the refresh. Polling for the DOM element works for both list and grid modes because the element id is stable.

```tsx
useUIStore.getState().setScrollToPath(newPath)

// In FileList.tsx scrollToPath effect:
useEffect(() => {
  if (!scrollToPath) return
  if (listItems.length === 0) return
  const index = listItems.findIndex(i => i.type === 'row' && i.items?.some(f => f.path === scrollToPath))
  if (index >= 0) {
    requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(index, { align: 'center' })
    })
    setScrollToPath(null)
  }
}, [scrollToPath, listItems, rowVirtualizer, setScrollToPath])
```
