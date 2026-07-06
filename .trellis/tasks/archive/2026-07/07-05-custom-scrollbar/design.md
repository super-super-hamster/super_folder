# Design: 自定义悬浮滚动条

## Approach

采用**可复用 React 组件**方案，不引入第三方库。

原因：
- Windows 原生 WebKit 滚动条默认占用布局宽度，无法实现真正的 overlay。
- `overflow: overlay` 是非标准属性，不能依赖。
- 自定义组件可以同时控制显隐动画、thumb 尺寸/位置，并保持原生滚轮/触摸板行为。

## Component: `ScrollArea`

**Path**: `frontend/src/components/common/ScrollArea.tsx`

### Props

```tsx
interface ScrollAreaProps {
  children: React.ReactNode
  className?: string        // wrapper 外层样式
  innerClassName?: string   // 实际滚动 div 的样式
  orientation?: 'vertical' | 'horizontal' | 'both'  // 默认 vertical
}
```

### Structure

```tsx
<div className={cn('relative overflow-hidden', className)}>
  {/* 实际滚动容器 */}
  <div
    ref={scrollRef}
    className={cn('overflow-auto no-scrollbar', innerClassName)}
    onScroll={updateThumb}
    onPointerEnter={() => setIsHovered(true)}
    onPointerLeave={() => setIsHovered(false)}
  >
    {children}
  </div>

  {/* 垂直滚动条 track + thumb */}
  {showVertical && (
    <div
      className="absolute right-1 top-1 bottom-1 w-1.5 rounded-full pointer-events-none opacity-0 transition-opacity duration-200"
      style={{ opacity: isHovered || isDragging ? 1 : 0 }}
    >
      <div
        className="w-full rounded-full bg-gray-400/50 hover:bg-gray-400/80 pointer-events-auto cursor-pointer transition-colors"
        style={{ height: thumbHeight, top: thumbTop, position: 'absolute' }}
        onPointerDown={startDrag}
      />
    </div>
  )}
</div>
```

### Behavior

1. **隐藏原生滚动条**：内层滚动 div 使用 `.no-scrollbar`。
2. **尺寸计算**：通过 `ResizeObserver` 监听滚动容器和内容尺寸，计算：
   - `thumbHeight = Math.max(24, (clientHeight / scrollHeight) * trackHeight)`
   - `thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (trackHeight - thumbHeight)`
3. **显隐**：鼠标进入 wrapper 时 `opacity: 1`，离开后 `opacity: 0`，过渡 200ms。
4. **拖拽**：在 thumb 上按下并拖动，按滚动比例同步调整 `scrollTop`。
5. **水平滚动**：结构对称，先实现垂直；`both` 模式同时渲染底部 track。

## Integration

替换首批区域的滚动容器为 `<ScrollArea>`：

| 区域 | 当前滚动容器 | 备注 |
|---|---|---|
| SettingsSidebar | 最外层可滚动 div | 垂直 |
| SettingsContent | 最外层可滚动 div | 垂直 |
| SearchPanel 左侧条件区 | `.w-[200px] ... overflow-y-auto` | 垂直 |
| RightSidebarAdvanced | `flex-1 overflow-y-auto min-h-0` | 垂直 |
| BatchRenameView | `overflow-y-auto` | 垂直 |
| CodePreview | `overflow-auto` / `overflow-y-auto` | 垂直 |
| MarkdownPreview | `overflow-auto` | 垂直 |
| TextPreview | `overflow-y-auto` | 垂直 |
| DocxPreview | `overflow-auto` | 垂直 |
| XlsxPreview | `overflow-auto` | 垂直 |
| ImagePreview | `overflow-auto` | 垂直（如有） |
| EpubPreview | 内容区 `overflow-auto` | 垂直，注意 iframe 内已有隐藏样式 |

## Styling

- Thumb: `bg-gray-400/50`, `hover:bg-gray-400/80`, `rounded-full`, `w-1.5`。
- Track: 完全透明，只作为定位参考。
- Wrapper: `relative overflow-hidden`，防止自定义 thumb 溢出。

## Files to Modify

- `frontend/src/components/common/ScrollArea.tsx` (new)
- `frontend/src/style.css` (add `.no-scrollbar` if缺失；已有)
- 各目标组件文件

## Risks

- 拖拽时若鼠标移出窗口，需继续监听，直到 pointerup。
- 内容高度动态变化（如虚拟列表、异步加载）需要 `ResizeObserver` 及时更新 thumb。
- `FileList` 使用虚拟列表且当前 `no-scrollbar`，本次不改动。
