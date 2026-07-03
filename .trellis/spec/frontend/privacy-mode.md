# Privacy Mode Frontend Contracts

## Scenario: Privacy Mode UI State And Directory Refresh

### 1. Scope / Trigger

- Trigger: Any frontend code that toggles privacy mode, loads directory chunks, displays lock badges, or refreshes tag/file views after privacy changes.
- The backend is the enforcement point; frontend state must avoid showing stale public-mode data after unlock or stale privacy-mode indicators after lock.

### 2. Signatures

```ts
type PrivacyMode = 'public' | 'privacy'

interface PrivacyState {
  mode: PrivacyMode
  hasPassword: boolean
  restorePrivacyOnStartup: boolean
  shouldPromptRestore: boolean
  windowsIdentityAvailable: boolean
}

type ProtectedPathMap = Record<string, boolean>
```

### 3. Contracts

- Startup restore keeps the app in public mode until password unlock succeeds.
- The normal app shell and `FileList` must not mount before the first `GetPrivacyState()` completes.
- When `shouldPromptRestore` is true, set `state`, `initialized`, and `dialogMode: 'startupUnlock'` atomically in one store update.
- OTP unlock/setup inputs must accept 6 alphanumeric characters and clear on error.
- Directory loads must key stale-data clearing by both `currentPath` and `privacyMode`.
- `protectedPathMap` is direct protection state only; do not infer it from file tags, ancestors, or filtered lists.
- Lock badges are visible only in privacy mode and only for direct protected files/folders.
- Public mode must hide protection controls and protected state indicators.

### 4. Validation & Error Matrix

| Condition | Required Result |
|-----------|-----------------|
| `privacyMode` changes for same path | Clear `files`, `fileTagColors`, and `protectedPathMap` before accepting new chunks |
| App starts before privacy state is initialized | Render no normal shell; do not mount `FileList` |
| `shouldPromptRestore` is true | Render startup gate without a transient main UI frame |
| Unlock succeeds from startup gate | Refresh file/tag views without appending to old list |
| Public mode | Hide context-menu protect actions and lock badges |
| Windows reset unavailable | Disable reset button and show unavailable-state text |

### 5. Good/Base/Bad Cases

- Good: `loadKey = currentPath + '|' + privacyMode`, then clear list state when the key changes.
- Good: `privacyStore.load()` updates `state`, `initialized`, and startup dialog mode in a single `set()` call.
- Base: Same path and same mode can keep existing list while chunk updates continue.
- Bad: Keying only by `currentPath` lets public-mode and privacy-mode chunks stack after unlock, producing duplicate icons/items.
- Bad: Setting `initialized: true` before setting `dialogMode: 'startupUnlock'` can flash the normal UI before the gate appears.

### 6. Tests Required

- Add UI coverage when tests exist for: unlock from startup gate clears old directory state, public mode hides protect menu items, privacy mode shows direct lock badges, and reset unavailable text is shown.
- Add regression coverage for: unlocking on the same path does not duplicate visible file items.
- Add startup coverage for: the shell is hidden until privacy initialization completes and `shouldPromptRestore` opens the gate immediately.

### 7. Wrong vs Correct

#### Wrong

```ts
if (prevPathRef.current !== currentPath) {
  setFiles([])
  prevPathRef.current = currentPath
}
```

#### Correct

```ts
const loadKey = `${currentPath}|${privacyMode || 'public'}`
if (prevLoadKeyRef.current !== loadKey) {
  setFiles([])
  setFileTagColors({})
  setProtectedPathMap({})
  prevLoadKeyRef.current = loadKey
}
```
