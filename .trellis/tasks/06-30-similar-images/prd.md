# 相似图片查找

## 目标
在文件管理器中提供相似图片查找功能，支持批量分组和单图搜索。

## 方案
- 后端使用纯 Go 感知哈希（pHash + dHash），避免 OpenCV 依赖
- 阈值三档：极度相似(5)、高度相似(12)、部分相似(20)
- 范围：当前文件夹 / 包含子文件夹
- 全量更新：检测到文件夹变化或用户刷新时重新计算

## 数据库表
- `image_hashes`: 图片路径、pHash、dHash、文件夹范围、文件 mtime
- `similar_pairs`: 文件夹范围内相似图片对
- `similar_folder_state`: 文件夹索引状态（范围、阈值、最大 mtime）

## 后端接口
- `FindSimilarImageGroups(folderPath, includeSubfolders, threshold)`
- `GetSimilarImageGroups(folderPath)`
- `CheckSimilarImagesNeedReindex(folderPath, includeSubfolders, threshold)`
- `GetSimilarImageThresholds()`

## 前端交互
- 入口：设置 → 高级 → 查找相似图片
- 虚拟路径：`similar://<folder>?subfolders=true&threshold=12`
- 页面内显示进度条，完成后展示相似组缩略图
- 强制相册模式，退出后恢复
- 刷新按钮检查数据是否需要更新

## 状态
已实现并通过 `go build ./...` 和 `npm run build` 验证。
