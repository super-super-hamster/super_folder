# PRD: Fix sf→cmd mode switch leaking newline buffer

## Bug Description

在 SF 模式下输入多个回车后（空命令），`sfLineCount` 会持续累加。切换回 CMD 模式（输入 `@cmd`）时，代码发送 `sfLineCount` 个 `\r` 到 ConPTY 以"同步光标位置"。但 ConPTY 的 `readPump` 以 2048 字节块读取输出，当 `sfLineCount` 较大时，多行提示输出会分多个 chunk 到达前端：

1. 首个 chunk 包含 1 个 `@cmd C:\>` 提示 → sync handler 立即匹配 `@cmd` + `>`，设置 `syncingConpty = false`，仅写入最后一个提示到 xterm
2. 后续 chunk 到达时 `syncingConpty` 已为 `false` → 直接写入 xterm → 用户看到多行空提示

**重现步骤：**
1. 在终端输入 `@sf <路径>` 进入 SF 模式
2. 按回车 3-4 次（空命令）
3. 输入 `@cmd` 按回车
4. 观察到 CMD 模式出现多行空提示

## Root Cause

**`TerminalPanel.tsx:302`** — `'\r'.repeat(Math.max(1, sfLineCount))` 发送过量回车符，且 `syncingConpty` 同步机制存在竞态条件：首个输出 chunk 即可触发同步完成条件，导致后续 chunk 泄漏。

次要问题：
- `\x1b` (Escape) 写入 ConPTY 不能清除 PowerShell 输入缓冲区（Windows Console 中 Escape 只是字符输入）
- SF 模式下本地回显输入从未转发到 ConPTY，所以 ConPTY 缓冲区本身无残留，无需清理

## Fix Plan

### Option A (推荐): 改用单行同步 + 计数保护

1. 将 `'\r'.repeat(Math.max(1, sfLineCount))` 改为单次 `'\r'`
2. 将 `syncingConpty` 布尔值改为计数器 `syncRemaining`，初始值 = 1
3. 输出 handler 中：累加 `syncBuffer` 中匹配到的 `@cmd` 提示数量，达到 `syncRemaining` 后才设为同步完成
4. 移除 `sfLineCount` 累积（SF 模式 Enter 不再递增此值，因为它不再用于同步）

### Option B (最小改动): 仅减少 `\r` 数量

将 `'\r'.repeat(Math.max(1, sfLineCount))` 改为 `'\r'`，只发送一个回车，同步单个提示输出。此改动最小但未消除底层竞态风险。

### 选 Option A，因它能彻底消除竞态条件。

## Files to Modify

- `frontend/src/components/terminal/TerminalPanel.tsx`:
  - Line 136: `sfLineCount` 变量可移除（或保留不用于同步）
  - Line 294-304: `@cmd` handler — `syncingConpty` 改为 `syncRemaining` 计数，`newlines` 改为单 `\r`
  - Line 139: `let syncingConpty = false` → `let syncRemaining = 0`
  - Line 539-548: sync handler — 从检测 `@cmd`+`>` 改为计数匹配

## Acceptance Criteria

1. SF 模式下任意次数的回车后切换 CMD，不出现多余空提示行
2. 切换后 CMD 模式提示符正常显示（`@cmd C:\> `）
3. 其他功能不受影响（SF→CMD 的基本功能、SF 模式命令执行、历史记录、rename 操作等）
4. 无竞态条件：所有 sync 输出在确认计数达标后才释放
