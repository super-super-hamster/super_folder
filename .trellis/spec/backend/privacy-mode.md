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

type ProtectedPath struct {
    Path      string `gorm:"primaryKey"`
    IsDir     bool
    CreatedAt int64
    UpdatedAt int64
}
```

### 3. Contracts

- Passwords are exactly 6 alphanumeric characters and are stored as salted PBKDF2 hashes in `models.Config`.
- `SetupPrivacyPassword` is for first setup only unless a same-process reset verification flag is already true.
- `ResetPrivacyPassword` must preserve `protected_paths` rows and `tags.is_protected` values.
- Public mode filters must apply before returning or emitting directory chunks, search results, favorites, recent items, tags, file tag colors, and tag usage counts.
- `GetTagUsageCounts` in public mode must count only visible file paths for visible tags; it must not reveal hidden item counts.
- `GetProtectedPaths` returns direct protection state only in privacy mode; public mode returns an empty map.

### 4. Validation & Error Matrix

| Condition | Required Result |
|-----------|-----------------|
| Password length is not 6 | Return validation error |
| Password contains symbols | Return validation error |
| Setup called while password exists and reset is not verified | Return error; do not overwrite password |
| Public mode path has a protected ancestor | Hide path |
| Public mode path or ancestor has a protected tag | Hide path |
| Public mode visible tag count includes hidden path | Bug; count must exclude it |

### 5. Good/Base/Bad Cases

- Good: In public mode, query `file_tags` for visible tags, then call `privacy.IsPathHiddenInPublic(path)` before incrementing each count.
- Base: In privacy mode, `database.GetTagUsageCounts()` may return raw counts because protected content is intentionally visible.
- Bad: Returning grouped `count(*)` from `file_tags` directly in public mode leaks hidden item counts.

### 6. Tests Required

- Add integration coverage when tests exist for: protected folder hides descendants, protected tag hides tagged files, public tag usage excludes hidden paths, and privacy tag usage includes them.
- Add binding coverage for: setup cannot overwrite an existing password, reset can overwrite only after verified reset state.
- Add search-service coverage for: public requests filter protected paths and privacy requests do not.

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
