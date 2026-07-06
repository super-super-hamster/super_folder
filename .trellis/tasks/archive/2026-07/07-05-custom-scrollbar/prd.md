# 自定义悬浮滚动条

## Goal

用统一的自定义滚动条替换原生滚动条：不显示上下箭头，滚动条thumb使用 50% 透明度，鼠标进入可滚动区域时浮现，且悬浮在内容上方不占用布局宽度。

## Requirements

### 1. 外观

- 不显示滚动条上下箭头按钮。
- 滚动条 thumb 颜色为 50% 透明度（默认 `bg-gray-400/50`，hover 时可加深）。
- thumb 带圆角，宽度 6px（垂直）或 6px（水平）。
- track 完全透明，不显示背景。

### 2. 行为

- 滚动条仅在鼠标进入可滚动容器时显示；鼠标离开后淡出。
- 滚动条悬浮在内容上方，不挤占容器内容宽度（overlay 效果）。
- 保留原生滚轮、触摸板、键盘滚动行为。
- 垂直滚动条固定在容器右侧；如后期需要水平滚动条，同样处理底部。

### 3. 作用范围

- 应用于所有当前**没有**使用 `no-scrollbar` 隐藏滚动条、且确实需要滚动条的区域。
- 保持现有 `no-scrollbar` 区域继续隐藏滚动条。
- 首批覆盖的主要区域：
  - 设置左侧边栏 `SettingsSidebar`
  - 设置内容区 `SettingsContent`
  - 搜索面板左侧条件区 `SearchPanel`
  - 右侧面板高级页 `RightSidebarAdvanced`
  - 批量重命名面板 `BatchRenameView`
  - 各类预览面板（Code、Markdown、Text、Docx、Xlsx、Image、Epub 等）

## Acceptance Criteria

- [ ] 新增可复用的滚动条组件/工具类，能隐藏原生滚动条并渲染自定义悬浮 thumb。
- [ ] 自定义滚动条没有上下箭头。
- [ ] 自定义滚动条 thumb 默认 50% 透明度，hover 时可见度提高。
- [ ] 鼠标进入容器时滚动条出现，离开时消失。
- [ ] 滚动条不占用容器宽度，内容不随滚动条显隐发生偏移。
- [ ] 首批覆盖区域均切换为新的自定义滚动条。
- [ ] 仍使用 `no-scrollbar` 的区域保持隐藏状态不变。
- [ ] 前端 `npm run build` 通过。

## Out of Scope

- 改变 `no-scrollbar` 区域为显示滚动条。
- 为不滚动的小区域（如单行输入框）添加滚动条。
- 第三方滚动条库（保持零依赖）。

## Notes

- 需要兼容 Windows（Wails 目标平台）的滚动条占用空间问题，因此不能依赖 `overflow: overlay`。
- 虚拟列表（`FileList`）当前已使用 `no-scrollbar`，本次不改动。
