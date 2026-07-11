# 将 title 属性替换为 HeroUI Tooltip 组件

## Goal

将项目中所有原生 HTML `title` 属性的悬停提示改为 HeroUI v3 `<Tooltip>` 组件，实现统一风格和可控的放置方向。

## Requirements

- 替换 11 个文件中 21 处 `title="..."` 为 HeroUI `<Tooltip>`
- `delay={200}`（200ms 延迟）
- 不显示箭头（`showArrow` 不传或设为 `false`）
- 提示方向按位置硬编码（见下方 placement 表）
- 保留所有现有 `className`、事件处理器、子元素结构不变
- 复用 `@heroui/react` 的 `Tooltip` 组件（已在项目中安装）

## Placement

| 文件 | 行号 | 内容 | placement |
|------|------|------|-----------|
| `FileListItem.tsx` | 100 | `file.name` (列表视图截断) | `top` |
| `FileListItem.tsx` | 141 | `file.name` (网格视图截断) | `top` |
| `TopNav.tsx` | 525 | 视图选项 | `bottom` |
| `SearchPanel.tsx` | 674 | 收起/展开搜索面板 | `top` |
| `SimilarImages.tsx` | 250 | 取消隐藏/隐藏该组 | `top` |
| `ModalManager.tsx` | 220 | 隐藏详情/查看详情 | `left` |
| `BatchRenameView.tsx` | 270 | 点击执行重命名 | `top` |
| `BatchRenameView.tsx` | 317 | `p.error \|\| p.newName` | `top` |
| `ChineseConvView.tsx` | 202 | 从文件导入 | `top` |
| `ChineseConvView.tsx` | 210 | 从文件夹导入 | `top` |
| `ChineseConvSettings.tsx` | 79 | 删除方案 | `left` |
| `GeneralSettings.tsx` | 123 | `path` (截断) | `top` |
| `GeneralSettings.tsx` | 134 | 隐藏/显示 | `top` |
| `SearchPresetSettings.tsx` | 148 | 删除预设 | `left` |
| `TagSettings.tsx` | 139 | 解除保护/保护标签 | `top` |
| `TagSettings.tsx` | 147 | 删除标签 | `left` |
| `TagSettings.tsx` | 193 | 删除类型及子标签 | `left` |
| `EpubPreview.tsx` | 293 | 上一章 | `bottom` |
| `EpubPreview.tsx` | 310 | 下一章 | `bottom` |
| `EpubPreview.tsx` | 320 | 目录 | `bottom` |
| `RemarkPanel.tsx` | 90 | 删除 | `left` |

## Root Cause (Bug Fix)

HeroUI v3 Tooltip 底层使用 RAC (React Aria Components) `TooltipTrigger`。RAC 通过 `FocusableProvider` 把 hover/focus 事件处理器放入 `FocusableContext`，但需要显式的 `<Tooltip.Trigger>` 组件来消费这个 Context 并绑定到 DOM 元素上。

使用 HeroUI `<Button>` 等组件时隐含消费了该 Context，但使用原生 `<button>`/`<div>`/`<span>` 作为 trigger 时必须用 `<Tooltip.Trigger>` 显式包裹。

## Fix

所有 21 处 trigger 元素添加 `<Tooltip.Trigger>` 包裹器。

## Acceptance Criteria

- [x] 所有 21 处 `title` 被替换为 `<Tooltip>`，无遗漏
- [x] 构建通过（`cd frontend && npm run build`）
- [x] Tooltip 悬停时 200ms 后显示
- [x] 放置方向符合上表
- [x] 无箭头显示
- [x] 原有交互（click、onChange 等）不受影响
- [x] FileListItem 始终显示 `file.name` 不检测溢出
