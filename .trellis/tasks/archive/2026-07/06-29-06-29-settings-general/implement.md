# Implementation Plan: Refactor Settings — General Tab & Nav Order

## Step 1: Prepare icon asset

- Copy `D:\fileGe\icon\settings_6_line.svg` to `frontend/src/assets/icons/settings_6_line.svg`.

## Step 2: Update settings store defaults and migration

1. Open `frontend/src/store/settingsStore.ts`.
2. Append special items to `defaultShortcuts`:
   - `{ id: 'favorite', name: '收藏', path: 'favorite://', icon: 'star_line.svg', visible: true }`
   - `{ id: 'recent', name: '最近访问', path: 'recent://', icon: 'history_anticlockwise_line.svg', visible: true }`
   - `{ id: 'smartfolder', name: '虚拟文件夹', path: 'smartfolder://', icon: 'folder_virtual.svg', visible: true }`
3. In `loadFromBackend`, after loading shortcuts, check for missing special items and append them. Then call `saveShortcuts` if any were added.

## Step 3: Update SettingsSidebar

1. Change `SETTINGS_TABS` to:
   - `{ id: 'general', name: '通用', icon: 'settings_6_line.svg' }`
   - `{ id: 'search', name: '搜索', icon: 'search_line.svg' }`
   - `{ id: 'tag', name: '标签', icon: 'bookmark_line.svg' }`
   - `{ id: 'cache', name: '缓存', icon: 'database-2-line.svg' }`
2. Keep expand/collapse animation unchanged.

## Step 4: Update SettingsContent

1. Replace `FolderSettings` import with `GeneralSettings`.
2. Remove `AnimatePresence` and `motion.div` wrapper.
3. Render `{activeSettingsTab === 'general' && <GeneralSettings />}` etc.

## Step 5: Create GeneralSettings component

1. Create `frontend/src/components/settings/GeneralSettings.tsx`.
2. Load shortcuts and system default paths via `GetDefaultPaths`.
3. Render `Reorder.Group` with all shortcuts.
4. For each item:
   - Show icon and name.
   - For folder items: show resolved path (system default or custom override), clickable to open `SelectDirectory()`.
   - For special items: hide path and do not make it clickable.
   - Show visibility toggle button.
5. On drag end, call `setShortcuts(items)`.
6. On path selection, update the item's `path` and call `setShortcuts`.

## Step 6: Delete FolderSettings

1. Remove `frontend/src/components/settings/FolderSettings.tsx`.

## Step 7: Update Sidebar

1. In `frontend/src/components/layout/Sidebar.tsx`, build `navItems` directly from `shortcuts`:
   - For folder items: `path = s.path || defaultPaths[shortcutMapping[s.id]]`.
   - For special items: `path = s.path` (protocol path).
2. Remove the hardcoded append of 收藏/最近访问/虚拟文件夹.
3. Keep icon override for `documents` and `pictures`.

## Step 8: Verify

- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Manually verify settings tab order, icon, title, path click, and sidebar order.
