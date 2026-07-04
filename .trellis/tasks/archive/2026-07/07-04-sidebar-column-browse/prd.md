# Sidebar Column Browse

## Goal

Turn the left sidebar into a column-style file browser when "导航栏显示上一级目录" is enabled, showing the parent directory's file listing.

## Requirements

### Setting

- Add `showParentDirInNav` boolean toggle to Settings → General → 其他
- Default: `false`
- Persisted to localStorage

### Sidebar Behavior When Setting is ON

- **Has parent directory** (e.g. `C:\Users\X\Documents`): sidebar shows only the parent directory's file listing (`C:\Users\X` contents), replacing shortcuts and drives entirely
- **No parent directory** (root `C:\`, `favorite://`, `recent://`, etc): sidebar shows existing default content (shortcuts + drives)
- Settings gear always stays at the bottom, with a gray separator line above it

### Parent Directory Listing

- Title/breadcrumb: directory name of the parent
- Top item: `..` — navigates to the parent's parent
- Click folder → `navigate(path, name)` — updates current path, sidebar re-renders
- Single-click file → `navigate(path, name)` — in-app open
- Double-click file → `OpenFileWithDefault(path)` — default program open
- File icon based on common file types (image, document, etc.)
- Folder icon for directories

### Auto-Collapse

- When browsing parent directory: sidebar stays expanded, no auto-collapse
- When showing default content (no parent / setting off): existing auto-collapse behavior unchanged

## Acceptance Criteria

- [ ] Setting toggle appears in Settings → General → 其他
- [ ] Toggle persists across app restarts
- [ ] At `C:\Users\X\Documents`, sidebar shows `C:\Users\X` contents with `..` at top
- [ ] At `C:\` (root), sidebar shows default shortcuts + drives
- [ ] At `favorite://`, sidebar shows default content
- [ ] Clicking a folder in sidebar navigates and updates both main panel and sidebar
- [ ] Single-clicking a file in sidebar opens it in-app (navigates)
- [ ] Double-clicking a file in sidebar opens with default program
- [ ] Clicking `..` navigates up one level
- [ ] Sidebar does not auto-collapse when browsing
- [ ] Gray separator line above settings gear
- [ ] Frontend build succeeds
