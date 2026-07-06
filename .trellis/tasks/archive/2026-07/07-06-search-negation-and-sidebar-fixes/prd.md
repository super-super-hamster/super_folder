# 搜索筛选器非条件 + 包含 + 分栏导航修复

## Changes

- Add NOT (非) toggle to search filter cards: 仅文件/仅文件夹/包含/大小/时间/图片形状
- Yellow background for negated state, text changes for type and include filters
- Merge old 排除文件夹 into 仅文件夹 NOT mode
- Add folder path input to 仅文件夹 filter
- Backend negation logic for type, include, size, time, image_shape
- Remove ExcludedFolders from SearchRequest, add FolderPaths
- Sidebar column browse: fix ".." navigation logic, persist showParentDirInNav, expand on start
- Add "包含" (include) search filter with OR substring matching
- Fix empty folder creation (FilterVisibleFiles nil slice bug)
- Fix scroll-to-rename race condition
- Support .markdown extension, confirm rename on click outside
