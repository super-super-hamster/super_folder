# Privacy Mode Protection Design

## Scope

Implement application-level privacy filtering across the current Wails app. The backend is the enforcement point for persisted protected metadata and list/search filtering. The frontend owns unlock/setup dialogs, mode controls, and visible state.

## Data Model

- Extend `models.Tag` with `IsProtected bool`.
- Add `models.ProtectedPath` with `Path string primaryKey`, `IsDir bool`, and timestamps if useful.
- Store privacy settings in `models.Config`:
  - password hash and salt
  - current mode requested by the frontend
  - startup restore preference
  - last mode at shutdown
- Keep the actual unlocked mode in memory for the running process; do not persist an unlocked session.

## Backend Contracts

Add Wails bindings for:

- `GetPrivacyState()`: returns whether a password exists, current effective mode, restore preference, and whether Windows reset is available.
- `SetupPrivacyPassword(password, confirm string)`: validates and stores password, enters privacy mode.
- `UnlockPrivacyMode(password string)`: validates password and enters privacy mode.
- `LockPrivacyMode()`: switches to public mode.
- `SetRestorePrivacyModeOnStartup(enabled bool)`.
- `GetProtectedPaths(paths []string)`: returns direct protected state for UI badges.
- `SetPathProtected(path string, isDir bool, protected bool)`.
- `SetTagProtected(tagID string, protected bool)`.
- `IsPathProtected(path string)`: used by frontend navigation guard and breadcrumb.
- `VerifyWindowsIdentityForPrivacyReset()`: returns success/failure/unavailable. If unavailable, no insecure fallback.
- `ResetPrivacyPassword(password, confirm string)`: allowed only after a successful Windows identity verification in the current process.

## Filtering Rules

In public mode, a path is hidden when:

- the path is directly protected;
- any ancestor folder is protected;
- the path has any protected tag;
- any ancestor folder has a protected tag.

Protected tag names are hidden in public mode. Tag-based filtering must apply to `GetGlobalTags`, `GetTagsForFile`, `GetTagsForFiles`, tag usage counts where visible, search tag resolution, and frontend autocomplete sources.

## Search Service

The search service has its own process but opens the same SQLite DB. It cannot trust frontend mode unless the request says public/private. Search requests should include privacy mode, and the service should filter protected paths before returning results. The app binding should also filter returned paths in public mode as a defense-in-depth layer.

## Directory Chunking

`ReadDirChunked` must filter the first synchronous chunk and every async event chunk before emitting. This prevents protected content from flashing in public mode.

## Frontend State

Add a `privacyStore` with:

- effective mode: `public | privacy`;
- password presence;
- restore-on-startup preference;
- modal state for setup/unlock/reset;
- actions for setup, unlock, lock, toggle, protect path, protect tag, refresh state.

The app should load privacy state on startup. If restore-on-startup is enabled and the last mode was privacy, show the unlock dialog while keeping effective mode public until success.

## UI Entry Points

- Settings sidebar adds Privacy tab.
- Privacy settings controls mode switch, password change/reset, and startup restore.
- Tag settings shows protection controls only in privacy mode.
- Context menu shows protect/unprotect only in privacy mode and only for real filesystem paths.
- File list badges show lock only in privacy mode for directly protected items.
- Breadcrumb can query current path protection and show lock icon for protected folders.

## Compatibility

GORM AutoMigrate handles the added table/field. Existing data defaults to public/unprotected.

## Security Boundary

This feature hides content inside the app. It is not filesystem encryption and does not prevent direct disk access outside the app.
