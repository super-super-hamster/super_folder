# 统一前端颜色管理

## 背景

目前前端各页面、组件使用大量硬编码色值（如 `#efefef`、`#e1e1e1`、`#d8d8d8`、`#e8e8e8`、`#dfdfdf`、`#D9D9D9` 等），导致同样的视觉层级在不同文件里颜色不一致，后续维护困难。需要以“批量重命名”标签页的层级配色为基准，建立统一的颜色管理体系。

## 需求

1. 建立一套语义化的颜色变量（Tailwind 主题色），覆盖：
   - 页面底色（page）
   - 面板/第一层背景色（panel）
   - 列表项/第二层背景色（item）
   - 悬浮色（item-hover）
   - 选中项背景色（selected）
   - 输入框/选择框触发器背景色（input）及其悬浮色（input-hover）
   - 边框、主文字、次文字等

2. 所有页面/组件中的硬编码颜色都要替换为上述语义化类名，包括但不限于：
   - `BatchRenameView`（基准页）
   - `FileList` 文件项悬浮、选中、列表背景
   - 各处的 `Select` / `ComboBox` 触发器和选中项
   - `ConversionView`、`SearchPanel`、`SearchPresetSettings`、`TagPanel`、`TagSettings`、`SettingsSidebar`、`RemarkPanel`、`ContextMenu` 等

3. 视觉上保持与批量重命名页一致的层级：
   - 页面 → 白/浅底
   - 面板 → `#efefef`
   - 项 → `#e1e1e1`
   - 项悬浮 → `#d8d8d8`
   - 选中 → `#D9D9D9` 75% 透明度

## 验收标准

- [ ] `tailwind.config.js` 中新增 `sf.*` 语义色，颜色值与基准页一致。
- [ ] 所有 `.tsx` 中不再出现基准硬编码色值 `#efefef`、`#e1e1e1`、`#d8d8d8`、`#e8e8e8`、`#dfdfdf`、`#D9D9D9`（除非在主题配置中定义）。
- [ ] 原本使用 `bg-gray-100/200` 表示悬浮/选中的文件项，统一改为语义色。
- [ ] `cd frontend && npx tsc --noEmit` 通过，无类型错误。
- [ ] 运行 `wails dev` 或 `npm run build` 不报错。
