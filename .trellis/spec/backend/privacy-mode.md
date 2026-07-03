# Privacy Mode Backend Contracts

## Scenario: App-Level Privacy Filtering

### 1. Scope / Trigger

- Trigger: Any backend binding, search path, tag query, or database read that can expose file paths, tags, tag counts, favorites, recent items, or protection state.
- Public mode must behave as if protected content does not exist inside the app.
- Privacy mode may return protected content and direct protection state for UI badges.

### 2. Signatures

```go
func (a *App) GetPrivacyState() (models.PrivacyState, error)
func (a *App) SetupPrivacyPassword(password string, confirm string) (models.PrivacyState, error)
func (a *App) UnlockPrivacyMode(password string) (models.PrivacyState, error)
func (a *App) LockPrivacyMode() (models.PrivacyState, error)
func (a *App) GetProtectedPaths(paths []string) (map[string]bool, error)
func (a *App) SetPathProtected(path string, isDir bool, protected bool) error
func (a *App) SetTagProtected(tagID string, protected bool) error
func (a *App) GetTagUsageCounts() (map[string]int, error)
func (a *App) InspectPathForNavigation(path string) (models.PathInspection, error)

type ProtectedPath struct {
    Path      string `gorm:"primaryKey"`
    IsDir     bool
    CreatedAt int64
    UpdatedAt int64
}

type PathInspection struct {
    Path       string `json:"path"`
    Exists     bool   `json:"exists"`
    Accessible bool   `json:"accessible"`
    IsDir      bool   `json:"isDir"`
}
```

### 3. Contracts

- Passwords are exactly 6 alphanumeric characters and are stored as salted PBKDF2 hashes in `models.Config`.
- `SetupPrivacyPassword` is for first setup only unless a same-process reset verification flag is already true.
- `ResetPrivacyPassword` must preserve `protected_paths` rows and `tags.is_protected` values.
- Public mode filters must apply before returning or emitting directory chunks, search results, favorites, recent items, tags, file tag colors, and tag usage counts.
- `GetTagUsageCounts` in public mode must count only visible file paths for visible tags; it must not reveal hidden item counts.
- `GetProtectedPaths` returns direct protection state only in privacy mode; public mode returns an empty map.
- `InspectPathForNavigation` is a navigation preflight. In public mode it must treat protected paths as `Exists=false` / `Accessible=false`, matching the app rule that protected content behaves as if it does not exist.

### 4. Validation & Error Matrix

| Condition | Required Result |
|-----------|-----------------|
| Password length is not 6 | Return validation error |
| Password contains symbols | Return validation error |
| Setup called while password exists and reset is not verified | Return error; do not overwrite password |
| Public mode path has a protected ancestor | Hide path |
| Public mode path or ancestor has a protected tag | Hide path |
| Public mode visible tag count includes hidden path | Bug; count must exclude it |
| Public mode path inspection targets protected content | Return inaccessible/non-existent inspection; do not leak `IsDir` |

### 5. Good/Base/Bad Cases

- Good: In public mode, query `file_tags` for visible tags, then call `privacy.IsPathHiddenInPublic(path)` before incrementing each count.
- Base: In privacy mode, `database.GetTagUsageCounts()` may return raw counts because protected content is intentionally visible.
- Bad: Returning grouped `count(*)` from `file_tags` directly in public mode leaks hidden item counts.
- Bad: Calling `os.Stat` and returning `Exists=true` before applying public-mode protection leaks protected paths through search navigation.

### 6. Tests Required

- Add integration coverage when tests exist for: protected folder hides descendants, protected tag hides tagged files, public tag usage excludes hidden paths, and privacy tag usage includes them.
- Add binding coverage for: setup cannot overwrite an existing password, reset can overwrite only after verified reset state.
- Add search-service coverage for: public requests filter protected paths and privacy requests do not.
- Add binding/manual coverage for: `InspectPathForNavigation` returns a directory/file result in privacy mode and returns inaccessible for protected content in public mode.

### 7. Wrong vs Correct

#### Wrong

```go
func (a *App) GetTagUsageCounts() (map[string]int, error) {
    return database.GetTagUsageCounts()
}
```

#### Correct

```go
func (a *App) GetTagUsageCounts() (map[string]int, error) {
    if a.isPrivacyMode() {
        return database.GetTagUsageCounts()
    }
    counts := map[string]int{}
    for _, row := range visibleTagRows {
        hidden, err := privacy.IsPathHiddenInPublic(row.Path)
        if err != nil {
            return nil, err
        }
        if !hidden {
            counts[row.TagID]++
        }
    }
    return counts, nil
}
```

## Scenario: Windows Identity Reset Verification

### 1. Scope / Trigger

- Trigger: Any implementation of forgotten privacy password reset on Windows.
- The app must never read, store, or validate the Windows PIN/password directly.
- The app may only trust the operating system's identity-verification result.

### 2. Signatures

```go
func (a *App) VerifyWindowsIdentityForPrivacyReset() (bool, error)
func (a *App) ResetPrivacyPassword(password string, confirm string) (models.PrivacyState, error)

package winidentity

func Available() bool
func Verify() (bool, error)
```

### 3. Contracts

- Windows implementation uses `Windows.Security.Credentials.UI.UserConsentVerifier` through WinRT.
- `Available()` returns true only when `CheckAvailabilityAsync()` returns `Available`.
- `Verify()` returns true only when `RequestVerificationAsync(...)` returns `Verified`.
- `VerifyWindowsIdentityForPrivacyReset` must clear `resetVerified` before every verification attempt.
- `resetVerified` is same-process state only and must be cleared after password reset, unlock, or lock.
- Non-Windows builds must return unavailable through a `!windows` stub.

### 4. Validation & Error Matrix

| Condition | Required Result |
|-----------|-----------------|
| WinRT availability is not `Available` | Return unavailable; keep reset disabled |
| Verification result is `Verified` | Set same-process `resetVerified` and allow reset dialog |
| Verification is canceled, times out, errors, or returns any other result | Return error/false and keep `resetVerified` false |
| Reset called without verified state | Return error; do not change password |

### 5. Good/Base/Bad Cases

- Good: Launch OS verification UI, accept only `Verified`, then call `ResetPrivacyPassword` with a new app password.
- Base: If Windows Hello/PIN is unavailable, show disabled reset UI and do not provide an app-level bypass.
- Bad: Asking the user to type their Windows PIN into the app or comparing it in app code.

### 6. Tests Required

- Add unit coverage around `VerifyWindowsIdentityForPrivacyReset` by injecting/faking `winidentity.Verify` when test seams exist.
- Add integration/manual coverage for available, canceled, unavailable, timeout, and successful reset paths.
- Assert that protected paths and protected tags remain after reset.

### 7. Wrong vs Correct

#### Wrong

```go
func VerifyWindowsPin(pin string) bool {
    return pin == storedPin
}
```

#### Correct

```go
func (a *App) VerifyWindowsIdentityForPrivacyReset() (bool, error) {
    a.resetVerified = false
    verified, err := winidentity.Verify()
    if err != nil {
        return false, err
    }
    a.resetVerified = verified
    return verified, nil
}
```
