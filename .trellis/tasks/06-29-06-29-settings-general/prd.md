# PRD: Refactor Settings — General Tab & Nav Order

## Problem

The current settings panel has a "文件夹" (Folders) tab that only manages folder shortcuts. Requirements have changed:
- The tab should become "通用" (General).
- It should manage the entire sidebar navigation order, including virtual folders, favorites, and recent.
- Users should be able to set custom default paths for folder items by clicking the path.

## Goal

Restructure the settings sidebar and content to match the new "通用" concept, remove switching animations, and make navigation order configurable for all sidebar items.

## Scope

### In scope
1. Rename "文件夹" settings tab to "通用", change its icon to `settings_6_line.svg`, reorder tabs to "通用 搜索 标签 缓存".
2. Replace `FolderSettings` with `GeneralSettings`.
3. In `GeneralSettings`, change the section title from "文件夹" to "导航栏顺序".
4. Remove the switching animation in `SettingsContent` when changing active settings tab.
5. Make folder item paths clickable in `GeneralSettings`; clicking opens `SelectDirectory()` and saves the selected path as the item's default path.
6. Add "虚拟文件夹", "收藏", "最近访问" to the reorder list in `GeneralSettings`. These items do not show a path and cannot have their default path modified.
7. Update `Sidebar.tsx` to use the saved shortcut order and custom paths.
8. Update `settingsStore.ts` defaults and migration so existing users get the new special items.

### Out of scope
- Changing the sidebar expand/collapse animation.
- Changing the reorder drag animation.
- Adding any other new settings content.
- Backend API changes.

## Acceptance Criteria

1. Settings sidebar shows tabs in order: 通用, 搜索, 标签, 缓存.
2. "通用" tab uses `settings_6_line.svg` icon.
3. `SettingsContent` renders the active tab instantly without fade/slide animation.
4. `GeneralSettings` title is "导航栏顺序".
5. Folder items in `GeneralSettings` show their icon, name, current path, and visibility toggle; path is clickable.
6. Clicking a folder path opens the folder selector; the selected path is saved and reflected in the sidebar.
7. "虚拟文件夹", "收藏", "最近访问" appear in the reorder list, with no path and no path modification.
8. Sidebar navigation order matches the order configured in `GeneralSettings`.
9. `npx tsc --noEmit` and `npm run build` pass.

## Non-goals

- Refactoring unrelated settings files.
- Adding tests (project has no test infrastructure).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing user shortcuts config missing special items | Migrate on load by appending missing items with default visibility true. |
| Sidebar order breaks | Ensure Sidebar reads shortcuts directly and maps special IDs to their protocol paths. |
| Custom path not reflected | Use `shortcut.path` in Sidebar, falling back to system default paths. |
