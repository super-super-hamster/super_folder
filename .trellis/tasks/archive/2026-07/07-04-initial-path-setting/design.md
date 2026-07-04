# Design: 设置通用初始路径

## Architecture

```
+---------------------------------+
|  GeneralSettings.tsx            |
|  - Select: last / custom        |
|  - Input + SelectDirectory btn  |
+---------------------------------+
                |
                v
+---------------------------------+
|  settingsStore.ts               |
|  - initialPathMode_*            |
|  - initialPathCustom_*          |
|  - load/save via Get/SetConfig  |
+---------------------------------+
                |
                v
+---------------------------------+
|  Config (SQLite/GORM)           |
|  - initialPathLast              |
|  - initialPathMode_public       |
|  - initialPathCustom_public     |
|  - initialPathMode_privacy      |
|  - initialPathCustom_privacy    |
+---------------------------------+
                |
                v
+---------------------------------+
|  App.tsx startup resolver       |
|  - load privacy mode            |
|  - read mode/custom             |
|  - validate path                |
|  - set tabsStore default tab    |
+---------------------------------+
                |
                v
+---------------------------------+
|  Window close handler           |
|  - record active normal tab     |
|  - write initialPathLast        |
+---------------------------------+
```

## Config Schema

All values stored as JSON strings via `GetConfig` / `SetConfig`.

| Key | JSON Type | Default |
|---|---|---|
| `initialPathLast` | `string` | `""` |
| `initialPathMode_public` | `"last" \| "custom"` | `"last"` |
| `initialPathCustom_public` | `string` | `""` |
| `initialPathMode_privacy` | `"last" \| "custom"` | `"last"` |
| `initialPathCustom_privacy` | `string` | `""` |

## Settings Store Additions

In `frontend/src/store/settingsStore.ts`:

- State fields:
  - `initialPathModePublic: 'last' | 'custom'`
  - `initialPathCustomPublic: string`
  - `initialPathModePrivacy: 'last' | 'custom'`
  - `initialPathCustomPrivacy: string`
- Actions:
  - `setInitialPathModePublic(mode)` — set + save
  - `setInitialPathCustomPublic(path)` — set + save
  - `setInitialPathModePrivacy(mode)` — set + save
  - `setInitialPathCustomPrivacy(path)` — set + save
- `loadFromBackend` loads the four keys with safe parsing and defaults.

The store remains unaware of privacy mode; callers pass the correct key.

## Settings UI

In `frontend/src/components/settings/GeneralSettings.tsx`:

- Read current privacy mode from `usePrivacyStore().state?.mode` (field name to confirm from `models.PrivacyState`).
- Render the Select bound to the mode for the active privacy mode.
- When mode is `"custom"`, render an `Input` with an inline folder picker button at the right.
- The input/button combo uses `flex` layout consistent with existing settings rows.
- On change, call the corresponding store setter.
- The setting does **not** affect the currently open tab; it is only applied at next startup.

## Function Page Detection

Create a shared utility `frontend/src/utils/pathUtils.ts` (or add to existing file) with `isFunctionPage(path: string): boolean`.

Rules (must match existing code in `tabsStore.ts`):

- Path contains `://` (covers `favorite://`, `recent://`, `smartfolder://`, `preset://`, `batch-rename://`).
- Path ends with `\相似图片`.
- Path ends with `\批量重命名`.
- Path ends with `\转换`.
- Path ends with `\简繁转换`.

## Window Close Recording

Requirement B says the value must be recorded only when the window closes, not on every tab switch. To avoid the async reliability problem of writing to SQLite from a browser close event, we use an in-memory last-path cache on the backend:

1. Add `lastInitialPath string` to the `App` struct in `app.go`.
2. Expose a new Go binding `RecordInitialPath(path string)` that only assigns `a.lastInitialPath = path`.
3. The frontend calls `RecordInitialPath(...)` whenever the active tab changes, but this is only an in-memory assignment (no DB write).
4. In the existing `beforeClose` handler, write:
   ```go
   _ = database.SetConfig("initialPathLast", string(mustJSON(a.lastInitialPath)))
   ```

This keeps the actual persistence write in the synchronous Go close hook while letting the frontend keep the backend up-to-date with the current effective initial path.

### Frontend selection of the path to record

Create `getLastInitialPath(tabs, activeTabId): string`:

- If the active tab path is a normal directory (not a function page), return it.
- If the active tab is a function page, scan `tabs` in reverse order starting from the active tab index backward, returning the first normal directory path.
- If no normal directory tab exists, return `""`.

Invoke this from a single `useEffect` in `App.tsx` (or a store subscription) that reacts to `tabs` and `activeTabId`. The call to `RecordInitialPath` is fire-and-forget.

### Function Page Detection

Create a shared utility `frontend/src/utils/pathUtils.ts` (or add to existing file) with `isFunctionPage(path: string): boolean`.

Rules (must match existing code in `tabsStore.ts`):

- Path contains `://` (covers `favorite://`, `recent://`, `smartfolder://`, `preset://`, `batch-rename://`).
- Path ends with `\相似图片`.
- Path ends with `\批量重命名`.
- Path ends with `\转换`.
- Path ends with `\简繁转换`.

## Startup Path Resolver

In `frontend/src/App.tsx`, after privacy store is initialized and not in startup unlock mode:

1. Read `usePrivacyStore.getState().state?.mode` to determine current mode string (`"public"` or `"privacy"`).
2. Await `useSettingsStore.getState().loadFromBackend()`.
3. Pick target path:
   - If mode is `"public"`:
     - If `initialPathMode_public === 'custom'`, target = `initialPathCustom_public`.
     - Else target = `initialPathLast`.
   - If mode is `"privacy"`:
     - If `initialPathMode_privacy === 'custom'`, target = `initialPathCustom_privacy`.
     - Else target = `initialPathLast`.
4. Validate target:
   - Empty / function page / contains `://` → invalid.
   - Call `InspectPathForNavigation(target)`.
   - In privacy mode, also call `IsPathProtected(target)`. If protected, it is still considered valid because the user can unlock.
   - Valid = `exists && accessible && isDir`, or (privacy mode && protected).
5. If invalid, target = `C:\`.
6. Update `tabsStore` default tab:
   - Replace the hard-coded `C:\` entry by calling `useTabsStore.getState().navigate(target, undefined, true, true)` with `replace=true`, or add a dedicated `setInitialTab(path)` action if cleaner.

## Privacy Behavior

- Public mode: `InspectPathForNavigation` already filters protected paths via `ensurePublicCanAccess`. A protected path returns `exists=false`, so fallback to `C:\`.
- Privacy mode: protected paths are considered valid because the user can unlock. `InspectPathForNavigation` will return `exists=true`. No extra check needed unless we want to avoid protected paths in privacy mode too; PRD says privacy mode can open them.

## Dev Mocks

Update `frontend/src/devMocks.ts`:

- `GetConfig(key)` returns realistic defaults for the new keys.
- `SetConfig(key, value)` stores in-memory so reloads work.
- `InspectPathForNavigation(path)` returns reasonable results for mock paths.
- `GetDrives()` returns `["C:\\"]`.

## Error Handling

- Invalid JSON in config → fallback to default, log error.
- `InspectPathForNavigation` throws → fallback to `C:\`, log error.
- Empty custom path with mode `"custom"` → fallback to `C:\`.

## Files to Modify

- `frontend/src/store/settingsStore.ts`
- `frontend/src/components/settings/GeneralSettings.tsx`
- `frontend/src/utils/pathUtils.ts` (new)
- `frontend/src/App.tsx` (record last path + startup resolver)
- `app.go` (add `lastInitialPath`, `RecordInitialPath`, persist in `beforeClose`)
- `frontend/src/devMocks.ts`
