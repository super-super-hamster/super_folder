# Tag Management Guidelines

---

## Scenario: File Tag Reordering and Suggestions

### 1. Scope / Trigger

- Trigger: Editing selected-file tag lists, global tag order, tag ComboBox suggestions, or tag usage visibility.
- Components: `frontend/src/components/layout/TagPanel.tsx`, `frontend/src/components/settings/TagSettings.tsx`, `frontend/src/store/tagStore.ts`.

### 2. Signatures

```ts
type TagState = {
  globalTags: models.Tag[]
  fetchGlobalTags: () => Promise<void>
  reorderTags: (orderedIds: string[]) => Promise<void>
}

// Wails bindings
GetTagUsageCounts(): Promise<Record<string, number>>
UpdateTagsOrder(orderedIDs: string[]): Promise<void>
```

### 3. Contracts

- `TagPanel` can display only the tags that apply to the current file selection, but `UpdateTagsOrder` is global.
- When dragging selected-file tags, merge the reordered visible subset back into the existing `globalTags` order before persisting.
- `reorderTags()` must persist a complete ordered ID list, not just the visible subset.
- ComboBox suggestions that represent existing tags must use tags with `usageCounts[tag.id] > 0`.
- A newly typed custom tag may still be created even though it is not in usage counts yet.

### 4. Validation & Error Matrix

| Condition | Handling |
|-----------|----------|
| Drag order includes only selected-file tags | Merge into existing global order before `UpdateTagsOrder` |
| Ordered ID does not exist in `globalTags` | Ignore it in optimistic `globalTags`; backend update is harmless for missing rows |
| Usage count is missing or 0 | Hide from settings list and existing-tag ComboBox results |
| Custom input has no matching tag | Create tag, add it to selected files, refresh usage counts |

### 5. Good/Base/Bad Cases

- Good: Reorder selected tags `[B, A]` while global order is `[A, X, B, Y]`; persist `[B, X, A, Y]`.
- Base: Add a new custom tag; it becomes visible after add because usage counts refresh.
- Bad: Persist only `[B, A]`; this gives unrelated tags stale/colliding `sort_order` values and can drop them from optimistic frontend state.

### 6. Tests Required

- Frontend typecheck must pass after tag panel or tag store changes.
- Manual assertion: drag a tag in the advanced operation panel, reopen Settings > Tags, and confirm unrelated tags still exist and order changed.
- Manual assertion: remove the last use of a tag and confirm it disappears from Settings > Tags and the advanced tag ComboBox.

### 7. Wrong vs Correct

#### Wrong

```ts
// Only persists currently visible selected-file tags.
await UpdateTagsOrder(fileTags.map(tag => tag.id))
```

#### Correct

```ts
const selectedIds = new Set(fileTags.map(tag => tag.id))
let selectedIndex = 0
const orderedIds = globalTags.map(tag => {
  if (!selectedIds.has(tag.id)) return tag.id
  return fileTags[selectedIndex++]?.id || tag.id
})
await UpdateTagsOrder(orderedIds)
```
