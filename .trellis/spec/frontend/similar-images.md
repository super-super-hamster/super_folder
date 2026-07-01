# Similar Image Detection Guidelines

---

## Backend Strategy

Use **perceptual hashing** (pHash + dHash) instead of OpenCV/ORB. Reasons:
- No extra native DLLs to bundle with the installer
- Sufficient for "same image, different compression/scale/crop" detection
- Scales well to ~10K images (≈50M pairwise comparisons, seconds in Go)

Library: `github.com/corona10/goimagehash` (pure Go).

---

## Threshold Levels

| Name | Strategy | Threshold | Typical Match |
|------|----------|-----------|---------------|
| 极度相似 | `max(pHashDist, dHashDist)` | ≤ 5 | Same image, compression/resize |
| 高度相似 | `min(pHashDist, dHashDist)` | ≤ 5 | Same scene/object, minor edits |
| 部分相似 | `min(pHashDist, dHashDist)` | ≤ 10 | Shared logo/texture, different context |

- 极度相似 requires **both** hashes to be close, maximizing precision.
- 高度/部分相似 only require **one** hash to be close, maximizing recall.
- This creates a nested hierarchy: 极度相似 ⊂ 高度相似 ⊂ 部分相似.

---

## Virtual Path Convention

Similar-image mode uses a virtual path:

```
similar://C:\folder\path?subfolders=true&threshold=5&useMax=false
```

- `similar://` prefix tells `App.tsx` to render the `SimilarImages` component
- The actual folder path is before `?`
- Query parameters carry scope and threshold
- `DynamicBreadcrumb` renders the folder breadcrumb followed by `> 相似图片`
- `tabsStore.getSpecialTitle` returns `相似图片`

---

## State Storage

Four DB tables:

- `image_hashes` — per-image pHash/dHash, scoped by `folder_path`
- `similar_hash_states` — hash freshness per folder (`folder_path`, `include_subfolders`, `max_file_mtime`)
- `similar_pairs` — edges between similar images, scoped by `folder_path`, `threshold`, and `use_max`
- `similar_folder_states` — marks that a specific search (`threshold` + `use_max`) has been computed

### Refresh Logic

On entering the page or clicking refresh:
1. Load `SimilarHashState` for the folder
2. If missing, scope changed, or `MaxFileMtime` older than current max → recompute hashes and pairs
3. Otherwise load `SimilarFolderState` for the requested `threshold`/`use_max`
4. If that search state is missing → reuse hashes and recompute only pairs/groups
5. Otherwise → load cached `SimilarPair` rows for the current `threshold`/`use_max` and build groups

---

## Progress Reporting

Backend emits Wails events during computation:

```go
runtime.EventsEmit(ctx, "similarity-progress", map[string]any{
    "stage":   "hashing", // or "comparing"
    "current": i,
    "total":   total,
})
```

Frontend listens with `EventsOn('similarity-progress', ...)` and updates `ProgressBar`.

---

## Memory Budget

Similar-image hashing shares a single memory budget with thumbnail generation:

- Config key: `thumbnailBudgetMB`
- Slider label: 高性能计算时的内存占用大小
- Range: 16 MB – 1024 MB
- Default: 512 MB
- Displayed as percentage only in Settings

Both features estimate decode memory as `width × height × 4` bytes (RGBA decoded image) and acquire that weight from a semaphore before decoding. The same limit is applied to both semaphores.

---

## Frontend Behavior

- Entry: Settings → 高级 → 查找相似图片
- Page forces `viewMode = 'album'` and restores previous mode on unmount
- Results shown as grouped thumbnail grids
- Refresh button triggers `triggerRefresh()`; `SimilarImages` watches `refreshKey` and reloads

---

## Common Pitfalls

- Don't call `FindSimilarImageGroups` without first checking `NeedsReindex`; cached results are fast
- `SimilarImages` no longer forces a global `viewMode`; it renders results in its own album-style layout using `FileListItem`
- Right-click context menu must be rendered at the top level (e.g. `App.tsx`) so it stays available when `SimilarImages` replaces `FileList`
- Recursive breadcrumb for `similar://` must use the raw folder path, not the full virtual path
- `SimilarPair` must store the `use_max` value used during comparison; queries are scoped by (`folder_path`, `threshold`, `use_max`)
