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

In the menu component, compute clamped coordinates before rendering:

```tsx
const menuHeight = 340 // approximate max height for a full menu
const menuWidth = 176  // w-44

let left = x
let top = y

if (containerRect) {
  left = Math.min(Math.max(left, containerRect.left), Math.max(containerRect.left, containerRect.right - menuWidth))
  top = Math.min(Math.max(top, containerRect.top), Math.max(containerRect.top, containerRect.bottom - menuHeight))
}
```

For a fixed-width menu (`w-44` = 176 px), hard-code `menuWidth` to match. Estimate `menuHeight` from the tallest realistic menu.

---

## View-Mode-Sensitive Empty-Space Menu

Right-clicking empty space in the file list shows different actions depending on the active view mode.

- **List / Grid**: Show `新建文件夹` and `新建文件`.
- **Album**: Hide `新建文件` and `新建文件夹` from the empty-space menu. Album mode is image-focused; file creation is not a primary action there.

Use the current `viewMode` from `uiStore` to conditionally render the items.

---

## Auto-Scroll to Newly Created Items

After creating a new file or folder, the list must scroll the new item into view before showing the inline rename box.

1. Set `scrollToPath` in `uiStore` to the new item's path.
2. Wait for the virtual list to render the item.
3. Start the rename popover only after the DOM element (`#file-${newPath}`) exists.

For virtual lists, `rowVirtualizer.scrollToIndex` with `align: 'center'` is the reliable way to bring a row into view. Polling for the DOM element works for both list and grid modes because the element id is stable.

```tsx
useUIStore.getState().setScrollToPath(newPath)

let attempts = 0
const poll = setInterval(() => {
  const el = document.getElementById(`file-${newPath}`)
  if (el) {
    clearInterval(poll)
    startRename(newPath, newName, el.getBoundingClientRect())
  } else if (attempts > 20) {
    clearInterval(poll)
  }
  attempts++
}, 50)
```
