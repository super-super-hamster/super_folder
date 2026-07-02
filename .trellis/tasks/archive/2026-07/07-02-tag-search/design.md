# Design: Tag Search Fix + Type Wildcard

## Boundaries

仅修改搜索相关链路，不动标签 CRUD、ADS、UI 面板。

## Data Flow

```
frontend search input
    → parseSearchQuery (utils/searchQuery.ts)
    → useDirectoryFiles sends tags[] as strings (tag names or "type:*")
    → app.go SearchFiles forwards JSON to search service
    → searcher.go handleSearch → executeSearch
        → resolveTagIDs(req.Tags) queries tags table, returns UUIDs
        → WHERE file_tags.tag_id IN (<UUIDs>) ...
```

## Backend Resolution Rules

输入 `req.Tags` 的元素可能是：

1. **普通 tag 名**（如 `red`）→ 查 `tags.name = 'red'`，返回所有匹配的 tag ID。
2. **类型通配符**（如 `作者:*`）→ 查 `tags.type = '作者'`，返回该类型下所有 tag ID。
3. **混合**（如 `作者:张三`）→ 按普通 tag 名处理；查询 `tags.name = '作者:张三'`。

判定通配符：字符串以 `:*` 结尾且长度 > 2。通配符前面的部分作为 type。

## AND/OR 逻辑

- 多个 tag 条件若在前端搜索串中用 `&` 分隔，则 `tagLogic = 'AND'`；否则为 `'OR'`。
- 后端对解析后的 UUID 列表保持原有 AND/OR 逻辑不变。

## Frontend Changes

1. `parseSearchQuery` 已能捕获 `tag:作者:*`，无需改正则。
2. `TopNav.tsx` 补全：当输入 `tag:作者:` 时，列出该类型下标签 + `*` 通配符建议。
3. `SearchPanel.tsx` 点击建议时，正确拼回 `tag:作者:*` 或 `tag:作者:张三`。
4. `useDirectoryFiles.ts` 对 `searchQuery` 做 300ms 防抖，避免每输入一个字符都触发搜索。
5. `TagPanel.tsx`（右侧“高级”面板）：
   - 每个标签前显示 `bookmark_fill.svg` 图标，颜色使用 `tag.colorHex`。
   - 每个标签和类型标签组右侧显示删除叉。
   - 批量添加/删除标签调用后端批量接口，算一次 undo 操作。

## Tag Undo/Redo

为避免 `internal/undo` 与 `internal/fs` 循环导入，在 `app.go` 的 `init()` 中向 `undo` 注册 tag 添加/删除处理器。`undo.Operation` 新增 `Paths` 和 `TagIDs` 字段以及 `OpAddTag` / `OpRemoveTag` 类型。

- `AddTagToFiles(paths, tag)`：写入 DB + ADS，并 push `OpAddTag`。
- `RemoveTagFromFiles(paths, tagIDs)`：从 DB + ADS 移除，并 push `OpRemoveTag`。
- `undo` 执行 inverse/forward 时调用注册的处理器完成反向/正向操作。

撤销/恢复成功后，`App.tsx` 同时触发 UI 刷新和 tag 刷新，确保文件网格和标签面板同步。

## Database Queries

新增 `internal/database/db.go` 辅助函数：

- `GetTagIDsByNames(names []string) ([]string, error)`
- `GetTagIDsByType(tagType string) ([]string, error)`

搜索服务直接调用。`RemoveTagFromFiles` 改为支持多个 tag ID。

## Error Handling

- 未解析到的 tag 名字或类型视为空 ID 列表，结果为空，不报错。
- 数据库查询失败记录日志并返回空结果，避免搜索崩溃。
