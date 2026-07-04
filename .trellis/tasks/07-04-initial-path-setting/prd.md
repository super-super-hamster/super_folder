# 设置通用初始路径

## Goal

在“设置 → 通用”中新增“初始路径”配置，允许用户选择应用启动时默认打开的路径：上次退出的位置，或一个自定义路径。自定义路径和上次位置都必须经过访问性校验，不可访问时回退到 `C:\`。

## Confirmed Facts

- 设置 UI 入口：`frontend/src/components/settings/GeneralSettings.tsx`。
- 设置前后端存储：前端 `settingsStore.ts` 通过 `GetConfig(key)` / `SetConfig(key, valueJSON)` 与后端 `models.Config` 表交互。
- 默认标签页硬编码在 `frontend/src/store/tabsStore.ts`，初始为 `C:\`。
- 标签页当前不做持久化；每次启动只有一个默认标签页。
- 后端已提供路径校验 API：`InspectPathForNavigation(path)` 可返回路径是否存在、可访问、是否为目录；公开模式下会自动过滤受保护路径。
- 窗口关闭事件可在 `app.go` 或前端 `beforeunload` 中捕获。

## Requirements

### 1. 配置项

新增以下 `Config` key：

| key | 类型 | 说明 |
|---|---|---|
| `initialPathLast` | `string` | 共享的“上次退出位置”。窗口关闭时写入。 |
| `initialPathMode_public` | `"last" \| "custom"` | 公开模式下的初始路径策略。 |
| `initialPathCustom_public` | `string` | 公开模式下自定义路径。 |
| `initialPathMode_privacy` | `"last" \| "custom"` | 隐私模式下的初始路径策略。 |
| `initialPathCustom_privacy` | `string` | 隐私模式下自定义路径。 |

### 2. 设置 UI

- 在“设置 → 通用”新增“初始路径”设置行。
- 使用 `Select` 组件，两个选项：
  - **上次退出的位置**
  - **自定义**
- 选择“自定义”后，显示输入框 + 最右侧文件夹选择按钮。
  - 输入框可手动输入路径。
  - 点击按钮调用 `SelectDirectory()` 选择目录，并把结果回填到输入框。
- UI 始终显示/保存当前隐私模式（公开/隐私）对应的配置。
- 默认值为“上次退出的位置”。

### 3. 退出时记录“上次位置”

- 仅在窗口关闭时记录一次。
- 取当前激活标签页的 `currentPath`。
- 如果激活标签页是功能页/虚拟页，则向前查找最近一个正常的目录标签页：
  - 功能页/虚拟页包括但不限于：`batch-rename://`、以 `\批量重命名` 结尾、以 `\相似图片` 结尾、以 `\转换` 结尾、以 `\简繁转换` 结尾、`favorite://`、`recent://`、`smartfolder://*`、`preset://*` 等包含 `://` 的路径。
- 若找不到正常目录标签页，则写入空字符串（启动时统一回退到 `C:\`）。

### 4. 启动时应用初始路径

1. 应用启动后，先加载当前隐私模式。
2. 读取当前模式对应的 `initialPathMode_*`：
   - `"last"`：使用共享的 `initialPathLast`。
   - `"custom"`：使用当前模式对应的 `initialPathCustom_*`。
3. 对目标路径进行校验：
   - 空字符串、功能页/虚拟页、校验失败均视为不可访问。
   - 使用 `InspectPathForNavigation(path)` 判断存在性与可访问性。
   - 隐私模式下额外使用 `IsPathProtected(path)` 判断；若路径受保护，仍视为可访问（解锁后可使用）。
4. 若目标路径不可访问，回退到 `C:\`（或第一个可用盘符，最终保底 `C:\`）。
5. 将校验后的路径写入 `tabsStore` 默认标签页的 `currentPath` 与 `history`。

### 5. 开发环境

- 更新 `frontend/src/devMocks.ts`，确保 `GetConfig`、`SetConfig`、`InspectPathForNavigation`、`GetDrives`、`SelectDirectory` 等绑定在浏览器预览中可用。

## Acceptance Criteria

- [ ] “设置 → 通用”中出现“初始路径”设置项，使用 Select 切换“上次退出的位置”和“自定义”。
- [ ] 选择“自定义”时出现输入框和文件夹选择按钮；手动输入或选择路径后保存生效。
- [ ] 公开模式和隐私模式各自保存独立的“自定义”路径和模式选择。
- [ ] 窗口关闭时，当前激活的正常目录标签页路径被写入 `initialPathLast`。
- [ ] 窗口关闭时若激活的是功能页/虚拟页，则记录最近一个正常目录标签页；若没有则记录空字符串。
- [ ] 启动时若当前模式为“上次退出的位置”，默认标签页打开上次记录的位置；若不可访问则打开 `C:\`。
- [ ] 启动时若当前模式为“自定义”，默认标签页打开对应自定义路径；若不可访问则打开 `C:\`。
- [ ] 公开模式下，受保护路径不会作为初始路径被打开，自动回退 `C:\`。
- [ ] 隐私模式下，受保护路径在解锁后可以作为初始路径被打开。
- [ ] 修改设置并保存后，不立即改变当前已打开的标签页，仅在下次启动时生效。
- [ ] 前端 `npm run build` 通过，Go 构建通过。

## Out of Scope

- 标签页完整持久化（历史、多标签恢复等）。
- 为不同驱动器/网络路径做特殊处理，最终回退统一使用 `C:\`。
- 在设置 UI 中实时预览初始路径效果。

## Notes

- 配置键命名已固定，避免后续再次迁移。
- 功能页判定规则应与现有代码保持一致；若后续新增功能页，需要同步更新判定逻辑。
