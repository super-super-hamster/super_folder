# 开发问题与解决记录

本文档简要记录了本项目在开发过程中碰到的主要技术问题及其对应的解决方法。

## 1. HeroUI v3 组件无法渲染与样式丢失
- **问题描述**：在引入 HeroUI (BETA) 后，`Checkbox` 组件在界面中不显示（渲染结果为空）；同时即便偶尔出现 DOM 节点，也完全丢失了官方预设的样式（如主色调和组件形态）。
- **解决方法**：
  - **组件结构重构**：HeroUI v3 引入了复合组件架构（Compound Components）。将原有的简写写法重构为符合 v3 规范的完整结构：`<Checkbox><Checkbox.Content><Checkbox.Control>...`。
  - **Tailwind v4 样式集成**：Tailwind v4 弃用了基于 `tailwind.config.js` 的插件注入模式。为了加载 HeroUI 的 BEM 样式，直接在前端入口的 `style.css` 中注入了预编译样式：`@import "../node_modules/@heroui/react/dist/styles.css";`。

## 2. 复选框（Checkbox）视觉细节优化
- **问题描述**：默认的复选框带有阴影，基础状态下边框不够明显，边框与内部的圆角图标形状不贴合（内圆外方），且边框尺寸显得过大。
- **解决方法**：
  - **去除阴影与加粗边框**：通过给 `Checkbox.Control` 传入 `shadow-none border-2 border-gray-400` 消除阴影并加深轮廓。
  - **解决形状不契合**：追加了 `rounded-full` 样式，强制让外边框变成正圆形，完美匹配对号图标。
  - **尺寸缩小**：查阅 HeroUI 官方文档后得知 v3 已移除 `size` 属性，于是通过传入自定义类名 `w-[18px] h-[18px]` 精确控制外框大小，并使用 `data-[selected=true]:border-blue-500` 处理了选中状态的颜色突变。

## 3. Wails 客户端原生体验改造 (屏蔽浏览器行为)
- **问题描述**：由于基于 Webview 渲染，用户会意外触发浏览器的特有行为，比如 `Ctrl+滚轮` 缩放页面、`F5`/`Ctrl+R` 刷新、以及原生右键菜单。
- **解决方法**：在 `main.tsx` 挂载了全局的 `keydown` 和 `wheel` 事件监听，将 `e.ctrlKey` 与滚轮及 `r`, `p`, `s` 等键结合时调用 `e.preventDefault()` 阻断默认行为；并全局拦截 `contextmenu` 事件，仅允许指定类名(`.allow-context-menu`)触发。

## 4. Ctrl+F 搜索功能接管
- **问题描述**：全局屏蔽浏览器快捷键后，用户习惯的 `Ctrl+F` 无法再呼出搜索功能。
- **解决方法**：在拦截 `Ctrl+F` 的默认浏览器弹窗行为后，通过 DOM 自动抓取导航栏 `#search-input`，并手动调用 `.focus()` 使其获得焦点，实现了符合原生软件逻辑的查找交互。

## 5. 顶部导航栏动画挤压变形
- **问题描述**：当搜索框获得焦点并通过动画变长时，右侧的“排序/分组”按钮以及其他控制按钮被 Flexbox 挤压变形。
- **解决方法**：为右侧按钮容器显式增加了 Tailwind 的 `shrink-0`（等同于 `flex-shrink: 0`）属性，确保在兄弟元素扩张时，这些图标能维持固定尺寸。

## 6. 空白处防误触逻辑优化
- **问题描述**：在开启“选择模式”并选中了若干文件后，如果不小心点击到文件列表的空白处，会导致所有选中状态被清空并直接退出选择模式。
- **解决方法**：移除了 `FileList.tsx` 根容器上绑定的 `onClick={() => clearSelection()}` 逻辑，保证状态的持久性。
