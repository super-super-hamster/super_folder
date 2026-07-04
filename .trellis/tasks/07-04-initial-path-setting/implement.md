# Implementation Plan: 设置通用初始路径

## Step 1 — Backend close-time persistence

**Files**: `app.go`

1. Add `lastInitialPath string` to the `App` struct.
2. Add exported binding:
   ```go
   func (a *App) RecordInitialPath(path string) {
       a.lastInitialPath = path
   }
   ```
3. In `beforeClose`, marshal `a.lastInitialPath` as JSON and save to `database.SetConfig("initialPathLast", json)`.

## Step 2 — Shared path utility

**Files**: `frontend/src/utils/pathUtils.ts` (new)

1. Export `isFunctionPage(path: string): boolean` matching `getSpecialTitle` rules.
2. Export `getLastInitialPath(tabs: Tab[], activeTabId: string): string`:
   - Find active index.
   - If active path is normal dir, return it.
   - Else scan backward for normal dir.
   - Return `""` if none.

## Step 3 — Settings store

**Files**: `frontend/src/store/settingsStore.ts`

1. Add state fields:
   - `initialPathModePublic: 'last' | 'custom'`
   - `initialPathCustomPublic: string`
   - `initialPathModePrivacy: 'last' | 'custom'`
   - `initialPathCustomPrivacy: string`
2. Add setters that update state and call `SetConfig`.
3. In `loadFromBackend`, load the four keys with safe JSON parsing and defaults.

## Step 4 — Settings UI

**Files**: `frontend/src/components/settings/GeneralSettings.tsx`

1. Import `usePrivacyStore` and read `state?.mode`.
2. Import new settings fields/setters from `useSettingsStore`.
3. Add a new settings row under “其他”:
   - Label: “初始路径”
   - `Select` with `last` / `custom` keys and Chinese labels.
   - When mode is `custom`, render an `Input` + folder picker button.
4. On Select change, save to the active privacy mode.
5. On input change or folder selection, save to the active privacy mode.

## Step 5 — Keep backend up-to-date with current effective last path

**Files**: `frontend/src/App.tsx`

1. Import `RecordInitialPath`, `isFunctionPage`, `getLastInitialPath`.
2. Add a `useEffect` that reacts to `[tabs, activeTabId]`:
   - Compute `path = getLastInitialPath(tabs, activeTabId)`.
   - Call `RecordInitialPath(path)` (fire-and-forget).

## Step 6 — Startup resolver

**Files**: `frontend/src/App.tsx`

1. After privacy store is initialized and not in `startupUnlock` mode, run a `useEffect` that:
   - Loads settings from backend.
   - Determines current privacy mode.
   - Selects target path based on mode + `initialPathMode_*`.
   - Validates via `InspectPathForNavigation` (and `IsPathProtected` in privacy mode).
   - Falls back to `C:\`.
   - Replaces default tab path/title/history with the resolved path.
2. Ensure the effect only runs once after privacy initialization.

## Step 7 — Dev mocks

**Files**: `frontend/src/devMocks.ts`

1. Update `GetConfig` to return defaults for the new keys.
2. Update `SetConfig` to store values in-memory.
3. Update `InspectPathForNavigation` to return sensible results.
4. Ensure `RecordInitialPath` is mocked.

## Step 8 — Validation

1. `cd frontend && npm run build` — must pass.
2. `go build .` — must pass.
3. Manual spot checks:
   - Set custom path, restart, verify default tab.
   - Set invalid custom path, restart, verify `C:\`.
   - Use last-location with a normal directory, restart, verify.
   - Use last-location with active function page, restart, verify nearest normal dir or `C:\`.
   - Toggle privacy mode, verify independent custom paths.

## Rollback Points

- If close-time write proves unreliable, switch to writing `initialPathLast` on every normal-directory tab change (violates requirement B but is safer).
- If startup resolver runs before privacy store initializes, add a guard and retry.
