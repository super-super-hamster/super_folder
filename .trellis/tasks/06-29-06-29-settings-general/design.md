# Design: Refactor Settings — General Tab & Nav Order

## Architecture Overview

The change extends the existing `ShortcutItem` concept from folder-only to a full sidebar navigation list. The settings UI becomes the single source of truth for sidebar order and custom folder paths.

## Data Model

`ShortcutItem` already exists in `settingsStore.ts`. It will continue to be used, now with special IDs for non-folder items.

Special item IDs:
- `favorite` → 收藏 → path `favorite://`
- `recent` → 最近访问 → path `recent://`
- `smartfolder` → 虚拟文件夹 → path `smartfolder://`

Folder item IDs remain: `desktop`, `downloads`, `documents`, `pictures`, `music`, `videos`.

For folder items, `ShortcutItem.path` stores a user-selected override. Empty string means "use system default path".

## File Changes

| File | Change |
|------|--------|
| `frontend/src/components/settings/SettingsSidebar.tsx` | Update `SETTINGS_TABS`: rename `folder` → `general`, icon → `settings_6_line.svg`, reorder to general/search/tag/cache. |
| `frontend/src/components/settings/SettingsContent.tsx` | Remove `AnimatePresence`/`motion` wrapper; render `GeneralSettings` for `general` tab. |
| `frontend/src/components/settings/GeneralSettings.tsx` | New component replacing `FolderSettings`. Manages full nav order. |
| `frontend/src/components/settings/FolderSettings.tsx` | Delete. |
| `frontend/src/store/settingsStore.ts` | Update `defaultShortcuts` to include special items; add migration in `loadFromBackend`. |
| `frontend/src/components/layout/Sidebar.tsx` | Build `navItems` directly from `shortcuts`; use `s.path` override or system default; special IDs map to protocol paths. |
| `frontend/src/assets/icons/settings_6_line.svg` | Copied from `D:\fileGe\icon\settings_6_line.svg`. |

## State Flow

1. `settingsStore.loadFromBackend()` loads saved shortcuts.
2. If saved shortcuts lack special items, append them with `visible: true` and save.
3. `GeneralSettings` renders the full list, allows reorder, visibility toggle, and custom path selection for folder items.
4. `setShortcuts` saves the updated list.
5. `Sidebar` reads `shortcuts` and renders navigation items in that order, using custom path if set.

## Interface/Type Changes

No new interfaces. Existing `ShortcutItem` is reused:

```ts
export interface ShortcutItem {
  id: string
  name: string
  path: string
  icon: string
  visible: boolean
}
```

Special items use their `path` field to store the protocol path (e.g. `favorite://`).

## Special Item Detection

```ts
const SPECIAL_IDS = new Set(['favorite', 'recent', 'smartfolder'])
const isSpecialItem = (id: string) => SPECIAL_IDS.has(id)
```

## Path Resolution in Sidebar

```ts
const resolveShortcutPath = (s: ShortcutItem, defaultPaths: Record<string, string>) => {
  if (isSpecialItem(s.id)) return s.path // favorite://, recent://, smartfolder://
  if (s.path) return s.path // user override
  return defaultPaths[shortcutMapping[s.id]] // system default
}
```
