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
| 高度相似 | `min(pHashDist, dHashDist)` | ≤ 12 | Same scene/object, minor edits |
| 部分相似 | `min(pHashDist, dHashDist)` | ≤ 20 | Shared logo/texture, different context |

- 极度相似 requires **both** hashes to be close, maximizing precision.
- 高度/部分相似 only require **one** hash to be close, maximizing recall.
- This creates a nested hierarchy: 极度相似 ⊂ 高度相似 ⊂ 部分相似.

---

## Virtual Path Convention

Similar-image mode uses a virtual path:

```
similar://C:\folder\path?subfolders=true&threshold=12
```

- `similar://` prefix tells `App.tsx` to render the `SimilarImages` component
- The actual folder path is before `?`
- Query parameters carry scope and threshold
- `DynamicBreadcrumb` renders the folder breadcrumb followed by `> 相似图片`
- `tabsStore.getSpecialTitle` returns `相似图片`

---

## State Storage

Three DB tables:

- `image_hashes` — per-image pHash/dHash, scoped by `folder_path`
- `similar_pairs` — edges between similar images within a folder scope
- `similar_folder_state` — cached indexing state for incremental refresh

### Refresh Logic

On entering the page or clicking refresh:
1. Load `SimilarFolderState` for the folder
2. Compare stored `MaxFileMtime` with current folder's max file mtime
3. If scope/threshold changed or mtime newer → recompute
4. Otherwise → load cached `SimilarPair` rows and build groups

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

## Frontend Behavior

- Entry: Settings → 高级 → 查找相似图片
- Page forces `viewMode = 'album'` and restores previous mode on unmount
- Results shown as grouped thumbnail grids
- Refresh button triggers `triggerRefresh()`; `SimilarImages` watches `refreshKey` and reloads

---

## Common Pitfalls

- Don't call `FindSimilarImageGroups` without first checking `NeedsReindex`; cached results are fast
- `SimilarImages` must restore the previous `viewMode` in its cleanup effect
- Recursive breadcrumb for `similar://` must use the raw folder path, not the full virtual path
