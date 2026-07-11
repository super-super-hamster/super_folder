# HeroUI Tooltip 使用规范

## placement 优先级

优先级：**上 → 左 → 右 → 下**（上方空间充裕时优先显示在上方，依次类推）。

绝大多数位置可以硬编码，按照各 UI 区域的实际空间来定：

| 位置 | 推荐 placement | 原因 |
|------|---------------|------|
| 窗口顶部导航栏按钮 | `bottom` | 上方无空间 |
| 内容区按钮（正常空间） | `top` | 上方空间充裕 |
| 右侧边缘操作按钮（设置页） | `left` | 右侧可能出界 |
| 列表行右侧删除按钮 | `left` | 按钮靠近右边缘 |
| 阅读器顶部工具栏 | `bottom` | 按钮在面板顶部 |
| 其他一般情况 | `top` | 默认 |

## 使用方式

### 非循环渲染（直接组件内）

```tsx
import { useTooltipState } from '../../utils/useTooltipState'

const tp = useTooltipState(200)

<Tooltip delay={200} isOpen={tp.isOpen}>
  <button ref={tp.triggerRef as React.Ref<HTMLButtonElement>} onClick={...} {...tp.triggerProps}>
    按钮
  </button>
  <Tooltip.Content placement="top" triggerRef={tp.triggerRef}>提示文字</Tooltip.Content>
</Tooltip>
```

- `useTooltipState(200)` — 200ms 延迟
- `ref={tp.triggerRef}` 提供给 `Tooltip.Content` 作为定位参考
- `{...tp.triggerProps}` 提供 hover/focus 事件处理器
- `isOpen={tp.isOpen}` + `triggerRef={tp.triggerRef}` 控制 tooltip 显隐和定位

### 循环渲染（`.map()` 内）

```tsx
import { TooltipItem } from '../../utils/TooltipItem'

{items.map(item => (
  <TooltipItem content="提示文字" placement="top">
    <button onClick={...}>...</button>
  </TooltipItem>
))}
```

`TooltipItem` 是一个自带独立 state + ref 的封装组件，适用于循环中的多个 tooltip。

## 根因总结

### 问题

HeroUI v3 `@heroui/react@3.2.0` 的 `Tooltip.Trigger` 内部调用 `useFocusable`，该 import 硬编码了 `.pnpm` 路径：

```js
// @heroui/react/dist/components/tooltip/tooltip.js
import { useFocusable } from 
  '../../node_modules/.pnpm/react-aria@3.49.0_...'
```

该路径在 `npm`（非 `pnpm`）安装的项目中不存在。Vite 将其解析为与 RAC 的 `FocusableProvider`（使用 bare specifier `react-aria/private/interactions/useFocusable`）**不同的模块实例**。导致 `FocusableContext`（`createContext(null)`）存在两份：

- RAC 的 `TooltipTrigger` → `FocusableProvider` → 写入 `Context_A`
- HeroUI 的 `Tooltip.Trigger` → `useFocusable` → 读取 `Context_B`

hover 事件处理器无法传递到 trigger 元素上 → `state.isOpen` 始终为 `false` → tooltip 不渲染。

### 修复

绕过 RAC 的 `FocusableContext` 上下文链。直接在 trigger 元素上挂载 `onPointerEnter`/`onPointerLeave`，通过受控 `isOpen` 驱动 tooltip：

```
hover → onPointerEnter → setOpen(true) → Tooltip isOpen=true → 渲染
```

### 与 Switch/Checkbox scroll bug 的类比

两者都是 RAC 内部上下文/定位机制在特定构建环境下断裂，需要用应用层的显式控制来绕过。

| | Switch/Checkbox | Tooltip |
|---|---|---|
| RAC 内部行为 | `input.focus()` 触发 `scrollIntoView` | `FocusableProvider`→`FocusableContext` 上下文传递 |
| 根因 | 缺少 position 定位包含块 | 不同模块实例导致两份 `FocusableContext` |
| 修复 | `className="relative"` 创建定位上下文 | 直接挂载 pointer 事件 + 受控 `isOpen` |
