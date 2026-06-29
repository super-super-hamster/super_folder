# 技术设计：统一前端颜色管理

## 颜色体系

在 `tailwind.config.js` 的 `theme.extend.colors` 下新增 `sf` 命名空间：

```js
sf: {
  page: '#ffffff',
  panel: '#efefef',
  item: '#e1e1e1',
  'item-hover': '#d8d8d8',
  selected: '#D9D9D9',
  input: '#e8e8e8',
  'input-hover': '#dfdfdf',
  border: '#e5e5e5',
  text: '#1f2937',      // gray-800
  'text-secondary': '#6b7280', // gray-500
  'text-muted': '#9ca3af',     // gray-400
}
```

使用方式：
- 面板背景：`bg-sf-panel`
- 项背景：`bg-sf-item`
- 项悬浮：`hover:bg-sf-item-hover`
- 选中：`bg-sf-selected/75`、`text-black`、`font-medium`
- 输入框/选择框触发器：`bg-sf-input`、`hover:bg-sf-input-hover`、`data-[hover=true]:bg-sf-input-hover`
- 边框：`border-sf-border`

## 边界与兼容

1. 破坏性颜色（错误、删除、警告）保持原有 `red-*` / `green-*`，不纳入 `sf` 体系。
2. HeroUI 组件默认样式由 `@heroui/react` 提供，仅覆盖显式传入的 `className`。
3. 图片、图标颜色使用 `currentColor` 或保留原样，不强制替换。
4. 为了最小化回归，不改变布局、圆角、尺寸，只替换颜色类。

## 替换策略

1. 先定义主题色。
2. 以 `BatchRenameView.tsx` 为基准，逐项替换为 `sf-*` 类名。
3. 用 `grep` 列出所有硬编码色值出现位置，按组件批量替换。
4. 对 `FileList.tsx` 中的 `bg-gray-200`（选中）、`hover:bg-gray-100/60`（悬浮）等，统一映射到 `sf` 语义色。
5. 对仍使用 `text-[#1e3a8a]`、`text-[#0F2039]` 的“新增/添加”按钮，统一改为 `text-sf-text-secondary` 或保留为品牌色，视设计意图而定（本任务以统一灰阶为主，蓝色品牌按钮可保留或单独处理）。

## 验证

- `npx tsc --noEmit`
- `grep -R "#efefef\|#e1e1e1\|#d8d8d8\|#e8e8e8\|#dfdfdf\|#D9D9D9" frontend/src --include="*.tsx"` 应为空（排除 tailwind.config.js 等配置）。
