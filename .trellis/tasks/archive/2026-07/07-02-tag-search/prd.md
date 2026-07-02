# Fix tag search and add tag type wildcard

## Goal

修复标签搜索无法返回结果的 bug，并新增按标签类型批量搜索的能力。

## Confirmed Facts

- 前端搜索语法通过 `parseSearchQuery` 解析 `tag:` / `标签:` 前缀，去掉前缀后把 tag 名字（如 `red`）作为 `tags` 数组发给后端。
- 后端 `internal/search/service/searcher.go` 的 `executeSearch` 直接把 `req.Tags`（名字）用于 `WHERE tag_id IN ?`。
- 数据库表 `file_tags.tag_id` 存的是 `tags.id`（UUID），`tags.name` 才是显示名。因此用名字比 UUID 永远匹配不到。
- 标签模型 `models.Tag` 有 `Type` 字段，可用来给标签分类（如 `作者:red`、`状态:done`）。
- 当前前端 `TagPanel.tsx` 支持用 `type:name` 格式创建带类型的标签。

## Requirements

1. **修复标签名搜索**：后端在按 tag 搜索前，先把 tag 名字解析成对应的 tag ID（UUID），再用 ID 查询 `file_tags`。
2. **新增类型通配符搜索**：支持搜索语法 `tag:<type>:*` / `标签:<type>:*`，返回所有带该类型的标签所关联的文件。
   - 例：`tag:作者:*` 会匹配所有 `作者:` 类型的标签（如 `作者:张三`、`作者:李四`）。
3. **AND/OR 逻辑保持可用**：多个 tag 条件之间仍按现有 `&` 符号区分 AND/OR，并在类型通配符和普通 tag 之间正确生效。
4. **前端补全/提示**：搜索框输入 `tag:` 时仍显示 tag 前缀；输入 `tag:作者:` 或 `tag:作者:*` 时可提示该类型下标签或通配符。
5. **添加/删除标签可撤销**：通过右侧“高级”面板给文件添加或删除标签后，按 `Ctrl+Z` 可撤销，`Ctrl+Y`/`Ctrl+Shift+Z` 可恢复。批量添加/删除同一标签算一次撤销操作。

## Acceptance Criteria

- [ ] 输入 `tag:red` 能正确返回所有打了 `red` 标签的文件（后端先把 `red` 解析为 UUID）。
- [ ] 输入 `tag:作者:*` 能返回所有带 `作者` 类型标签的文件。
- [ ] 输入 `tag:red & tag:blue` 仍按 AND 逻辑返回同时满足的文件。
- [ ] 输入 `tag:作者:* & tag:done` 能正确组合类型通配符和普通 tag。
- [ ] 不存在的 tag 名字或类型返回空结果，不报错。
- [ ] 在“高级”面板给一个或多个文件添加标签后，按 `Ctrl+Z` 能撤销。
- [ ] 在“高级”面板删除单个标签或整个类型标签组后，按 `Ctrl+Z` 能撤销。
- [ ] 撤销/恢复后，标签面板和文件网格都会刷新。
- [ ] 前端构建与 Go 编译均通过。

## Out of Scope

- 修改标签存储模型或 ADS 标签同步逻辑。
- 修改标签 UI 面板（TagPanel / TagSettings）的增删改交互。
- 引入新的搜索引擎或全文索引。

## Open Questions

- 类型名称**大小写敏感**。用户必须输入创建标签时使用的准确类型名（如 `tag:作者:*` 不会匹配 `tag:author:*`）。
- `tag:作者:*` 的通配符是否只支持 `*`，还是也支持前缀匹配（如 `tag:作者:张*`）？
