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

---

## Scenario: Stable Tag Colors

### 1. Scope / Trigger

- Trigger: Creating tags, rendering tag markers, or changing tag order behavior.
- Components: `frontend/src/store/tagStore.ts`, `frontend/src/hooks/useDirectoryFiles.ts`, tag display components.

### 2. Signatures

```ts
export const generateColorFromName = (name: string): string
```

### 3. Contracts

- New tag colors are deterministic from stable tag identity: plain tags use `name`, typed tags use `type:name`.
- Do not choose colors from a fixed small palette; hash the identity into a controlled CSS color range.
- Honor existing persisted `tag.colorHex` when present.
- File icon tag marker color must not depend on `sortOrder` or backend tag array order.
- If multiple tags exist on a file, choose the displayed marker tag by stable identity ordering before reading/generating its color.

### 4. Validation & Error Matrix

| Condition | Handling |
|-----------|----------|
| Existing tag has `colorHex` | Use it directly as CSS color |
| Existing tag lacks `colorHex` | Generate from `type:name` or `name` |
| Tags are reordered | Marker color remains the same for the same tag set |
| Different names hash nearby | Keep saturation/lightness bounded so colors remain usable |

### 5. Good/Base/Bad Cases

- Good: `project:alpha` always generates the same color regardless of tag position.
- Base: Two files with the same tag set show the same marker color even if the backend returns tags in different order.
- Bad: Use `tags[0].colorHex` for file markers; dragging tags changes `sortOrder`, which can change the first returned tag and therefore the marker color.

### 6. Tests Required

- Frontend typecheck/build must pass after color generation or marker selection changes.
- Manual assertion: reorder tags in the advanced panel; files with the same tags keep the same bottom-right marker color.
- Manual assertion: create several differently named tags; colors differ and remain in a readable visual range.

### 7. Wrong vs Correct

#### Wrong

```ts
const colors = ['#F87171', '#FB923C', '#FBBF24']
return colors[Math.abs(hash) % colors.length]
```

#### Correct

```ts
const hue = unsignedHash % 360
const saturation = 58 + ((unsignedHash >>> 8) % 17)
const lightness = 48 + ((unsignedHash >>> 16) % 15)
return `hsl(${hue} ${saturation}% ${lightness}%)`
```
