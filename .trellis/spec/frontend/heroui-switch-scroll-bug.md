# HeroUI 组件 Bug 修复记录

## 模式总结

HeroUI v3 底层使用 React Aria Components（RAC）。多个 Bug 的根因都是 **RAC 内部机制与构建/运行环境的交互断裂**，修复方案是**在应用层提供显式的上下文/定位/事件管理**来绕过。

---

## Case 1: Switch/Checkbox Scroll Shift Bug

### 现象

当 Switch 或 Checkbox 位于滚动容器最底部时，点击切换会导致内容上移。

### 触发链

```
点击 Switch/Checkbox
  → React Aria Components 拦截 click 事件
  → 内部调用 hiddenInputRef.current.focus()
  → <input> 有 sr-only 类: position: absolute; width: 1px; height: 1px
  → 无 position: relative 祖先 → 以 viewport 为定位基准
  → 浏览器自动 scrollIntoView 使焦点元素可见
  → 在 flex-col 布局中，input 是第一个子元素（位于 label 顶部）
  → scrollTop 被调整 → 内容上移
```

### 修复

```tsx
<Switch isSelected={...} onChange={...} className="relative" />
<Checkbox isSelected={...} onChange={...} className="relative" />
```

`position: relative` 让 `<label>` 成为 `sr-only` input 的定位包含块。

---

## Case 2: Tooltip 不渲染 Bug

### 现象

HeroUI `<Tooltip>` 组件不显示，`state.isOpen` 始终为 `false`。

### 根因

`@heroui/react` v3 的 `tooltip.js` 中 `useFocusable` 的 import 使用了硬编码的 `.pnpm` 路径：

```js
import { useFocusable } from 
  '../../node_modules/.pnpm/react-aria@3.49.0_...'
```

该路径在 npm 安装的项目中不存在。Vite 将其解析为与 RAC 的 `FocusableProvider`（使用 bare specifier `react-aria/private/interactions/useFocusable`）不同的模块实例。导致 `FocusableContext` 存在两份：

- RAC `TooltipTrigger` → `FocusableProvider` → 写入 `Context_A`
- HeroUI `Tooltip.Trigger` → `useFocusable` → 读取 `Context_B`

hover 事件处理器无法传递到 trigger 元素 → tooltip 不渲染。

### 修复

绕过 RAC 的 `FocusableContext` 上下文链，直接在 trigger 元素上挂载 pointer 事件，通过受控 `isOpen` 驱动 tooltip：

```tsx
const tp = useTooltipState(200)

<Tooltip delay={200} isOpen={tp.isOpen}>
  <button ref={tp.triggerRef as React.Ref<HTMLButtonElement>} {...tp.triggerProps}>
  <Tooltip.Content placement="top" triggerRef={tp.triggerRef}>text</Tooltip.Content>
</Tooltip>
```

详见 [heroui-tooltip-guide.md](./heroui-tooltip-guide.md)。

---

## 通用原则

| 问题 | RAC 内部行为 | 修复方式 |
|------|-------------|---------|
| Switch scroll | `input.focus()` 触发 `scrollIntoView` | 加 `position: relative` 创建定位包含块 |
| Tooltip 不渲染 | `FocusableContext` 模块实例断裂 | 绕过上下文链，直接挂载事件 + 受控 `isOpen` |
