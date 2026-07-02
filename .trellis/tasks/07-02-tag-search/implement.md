# Implementation Plan

## Step 1: Backend tag resolution helpers

- `internal/database/db.go`
  - Add `GetTagIDsByNames(names []string) ([]string, error)`
  - Add `GetTagIDsByType(tagType string) ([]string, error)`
  - Update `RemoveTagFromFiles(paths, tagIDs []string)` to accept multiple tag IDs.

## Step 2: Backend search service resolve tags

- `internal/search/service/searcher.go`
  - Add `resolveTagIDs(tags []string) ([]string, error)`
  - In `executeSearch`, call `resolveTagIDs(req.Tags)` before filtering.
  - Handle wildcard `type:*`.

## Step 3: Frontend autocomplete for typed tags

- `frontend/src/components/layout/TopNav.tsx`
  - Keep `availableTags` for plain names.
  - Fetch `globalTags` (models.Tag[]) and derive type-based suggestions.
  - When input after `tag:` contains `:`, suggest matching typed tags and `*`.

## Step 4: Frontend suggestion apply

- `frontend/src/components/layout/SearchPanel.tsx`
  - Ensure `tag:作者:*` suggestions rebuild query correctly.

## Step 5: Search debounce

- `frontend/src/hooks/useDirectoryFiles.ts`
  - Use `use-debounce` on `searchQuery` (300ms).

## Step 6: Tag panel UI + undo

- `frontend/src/components/layout/TagPanel.tsx`
  - Add bookmark icon before each tag and type group, colored by `tag.colorHex`.
  - Restore delete buttons for tags and type groups.
  - Use `AddTagToFiles` / `RemoveTagFromFiles` for batch operations.
  - Add `tagRefreshKey` to tag list effect deps.
- `internal/undo/undo.go`
  - Add `OpAddTag` / `OpRemoveTag`, `Paths`, `TagIDs`, and handler registration.
- `app.go`
  - `init()` registers tag add/remove handlers (DB + ADS sync).
  - Add `AddTagToFiles` and `RemoveTagFromFiles` bindings; `AddTagToFile` / `RemoveTagFromFile` delegate to them.
  - Push corresponding undo operations.
- `App.tsx`
  - After undo/redo, also call `useTagStore.triggerTagRefresh()`.

## Step 7: Regenerate Wails bindings

- `wails generate module`

## Step 8: Build & compile

- `cd frontend && npm run build`
- `go build ./...`

## Validation

- Manual test cases:
  1. `tag:red` returns files with tag `red`.
  2. `tag:作者:*` returns files with any `作者:` tag.
  3. `tag:red & tag:blue` returns intersection.
  4. `tag:作者:* & tag:done` returns intersection.
  5. `tag:notexist` returns empty.
  6. Add tag to multiple selected files -> one `Ctrl+Z` removes it from all.
  7. Remove type tag group -> one `Ctrl+Z` restores it.
  8. Undo/redo refreshes tag panel and file grid.
