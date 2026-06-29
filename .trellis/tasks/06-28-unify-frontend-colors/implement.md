# 执行计划：统一前端颜色管理

## 阶段 1：定义颜色变量

- [ ] 修改 `frontend/tailwind.config.js`，在 `theme.extend.colors` 中新增 `sf` 语义色（见 design.md）。
- [ ] 运行 `cd frontend && npx tsc --noEmit` 确认配置无语法错误。

## 阶段 2：基准页替换

- [ ] 修改 `frontend/src/components/rename/BatchRenameView.tsx`：
  - 左右面板 `bg-[#efefef]` → `bg-sf-panel`
  - 文件项 `bg-[#e1e1e1]`、`hover:bg-[#d8d8d8]` → `bg-sf-item`、`hover:bg-sf-item-hover`
  - 预览区普通项 `bg-[#e1e1e1]` → `bg-sf-item`
  - 选择框触发器 `bg-[#e8e8e8]`、`hover:bg-[#dfdfdf]` → `bg-sf-input`、`hover:bg-sf-input-hover`
  - 列表选中项 `bg-[#D9D9D9]/75` → `bg-sf-selected/75`

## 阶段 3：选择框 / 下拉框统一

- [ ] 替换以下组件中所有 Select/ComboBox 触发器和选中项颜色：
  - `frontend/src/components/fileList/FileList.tsx`
  - `frontend/src/components/settings/CacheSettings.tsx`
  - `frontend/src/components/conversion/ConversionView.tsx`
  - `frontend/src/components/layout/TagPanel.tsx`
  - `frontend/src/components/settings/TagSettings.tsx`
  - `frontend/src/components/layout/DynamicBreadcrumb.tsx`
  - `frontend/src/components/layout/TopNav.tsx`（自定义视图/排序菜单）
  - `frontend/src/components/layout/SearchPanel.tsx`
  - `frontend/src/components/settings/SearchPresetSettings.tsx`

## 阶段 4：文件列表项颜色统一

- [ ] 修改 `frontend/src/components/fileList/FileList.tsx`：
  - 列表/网格/相册模式下选中项 `bg-gray-200` / `bg-gray-100` → `bg-sf-selected/75`
  - 悬浮状态 `hover:bg-gray-100/60` / `hover:bg-gray-100` → `hover:bg-sf-item-hover`
  - 拖拽高亮 `bg-blue-100` 可保留为操作反馈色

## 阶段 5：剩余硬编码色值清理

- [ ] `ConversionView.tsx`：`bg-[#e5e5e5]`、按钮 `bg-[#f0f0f0]` / `hover:bg-[#e8e8e8]`
- [ ] `SettingsSidebar.tsx`：`bg-[#e8e8e8]` 激活态
- [ ] `TagPanel.tsx` / `TagSettings.tsx` / `RemarkPanel.tsx` / `ContextMenu.tsx` 中残留的 `#0F2039`、`#1e3a8a` 等按语义替换或保留说明

## 阶段 6：验证

- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npm run build`（可选，用于检查 Vite/Tailwind 编译）
- [ ] 用 grep 搜索 `#efefef`、`#e1e1e1`、`#d8d8d8`、`#e8e8e8`、`#dfdfdf`、`#D9D9D9`，确认只剩主题配置中的定义。

## 回滚点

- 阶段 1 完成后可回滚 `tailwind.config.js`。
- 每个组件替换后都可单独 `git checkout` 该文件。
