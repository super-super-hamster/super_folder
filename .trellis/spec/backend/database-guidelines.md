# Database Guidelines

> ORM patterns, queries, migrations, and storage model.

---

## Scenario: SQLite via GORM

### 1. Scope / Trigger
- Trigger: Adding new models, queries, or schema changes
- DB Engine: SQLite (via `github.com/glebarez/sqlite` pure-Go driver)
- Path: `C:\ProgramData\file-manager\config.db` (WAL mode)

### 2. Signatures

```go
// InitDB — single call in main.go, auto-migrates all models
func InitDB() error

// Query patterns (all in internal/database/db.go)
func GetConfig(key string) (string, error)         // Upsert by key
func SetConfig(key string, valueJSON string) error  // Create or update

type Config struct {
    ID        uint   `gorm:"primaryKey"`
    Key       string `gorm:"uniqueIndex"`
    ValueJSON string
}
```

### 3. Contracts

#### DB Location & Connection

| Field | Value |
|-------|-------|
| Path | `%ProgramData%/file-manager/config.db` |
| Driver | `github.com/glebarez/sqlite` (pure Go, no CGO) |
| Journal | WAL (`PRAGMA journal_mode=WAL`) |
| Synchronous | NORMAL (`PRAGMA synchronous=NORMAL`) |
| Migration | `DB.AutoMigrate(&models.Config{}, &models.Thumbnail{}, &models.Tag{}, &models.FileTag{}, &models.Remark{}, &models.Favorite{})` |

#### Models & GORM Tags

```go
// Primary key conventions
type Thumbnail struct {
    Path    string `gorm:"primaryKey"`      // natural key
    ModTime int64
    Data    []byte
}

type Tag struct {
    ID        string `gorm:"primaryKey"`    // UUID, set by caller
    Name      string
    Type      string
    ColorHex  string
    SortOrder int
}

type FileTag struct {
    Path  string `gorm:"primaryKey;index"`  // composite PK
    TagID string `gorm:"primaryKey"`
}

type Remark struct {
    Path    string `gorm:"primaryKey"`      // natural key
    Content string
}

type Favorite struct {
    Path  string `gorm:"primaryKey"`        // natural key
    IsDir bool
}

type Config struct {
    ID        uint   `gorm:"primaryKey"`     // auto-increment
    Key       string `gorm:"uniqueIndex"`
    ValueJSON string
}
```

### 4. Validation & Error Matrix

| Condition | GORM Method | Go Handling |
|-----------|-------------|-------------|
| Record not found | `.First()` | `errors.Is(err, gorm.ErrRecordNotFound)` → return `("", nil)` |
| Unique constraint violation | `.Create()` | Return error to caller |
| Composite PK duplicate | `.FirstOrCreate()` | Silent no-op (used for `FileTag`, `Favorite`) |
| Empty result set | `.Find()` | Returns empty slice, not nil |
| Writes to `/thumb` | `SaveThumbnail` | Upsert (GORM Save on primary key) |

### 5. Good/Base/Bad Cases

#### Good — Upsert pattern (SetConfig)
```go
func SetConfig(key string, valueJSON string) error {
    var cfg models.Config
    result := DB.Where("key = ?", key).First(&cfg)
    if result.Error == gorm.ErrRecordNotFound {
        cfg = models.Config{Key: key, ValueJSON: valueJSON}
        return DB.Create(&cfg).Error
    }
    cfg.ValueJSON = valueJSON
    return DB.Save(&cfg).Error
}
```

#### Good — FirstOrCreate for junction tables
```go
func AddTagToFile(path string, tagID string) error {
    ft := models.FileTag{Path: path, TagID: tagID}
    return DB.Where(models.FileTag{Path: path, TagID: tagID}).FirstOrCreate(&ft).Error
}
```

#### Good — AND/OR tag filtering
```go
// AND logic
DB.Table("file_tags").
    Select("path").
    Where("tag_id IN ?", req.Tags).
    Group("path").
    Having("count(distinct tag_id) = ?", len(req.Tags)).
    Pluck("path", &paths)

// OR logic
DB.Table("file_tags").
    Select("distinct path").
    Where("tag_id IN ?", req.Tags).
    Pluck("path", &paths)
```

#### Bad — Schema changes without AutoMigrate
```go
// Adding a field? Just add it to the struct. AutoMigrate handles it.
// Do NOT write manual ALTER TABLE statements.
```

### 6. Tests Required
- None currently. When adding: test `GetConfig`/`SetConfig` round-trip, tag AND/OR query results, upsert idempotency

### 7. Wrong vs Correct

#### Wrong
```go
// Using raw SQL when GORM can do it
DB.Exec("SELECT * FROM configs WHERE key = ?", key)
```

#### Correct
```go
DB.Where("key = ?", key).First(&cfg)
```

---

## Scenario: Tag Lifecycle Cleanup

### 1. Scope / Trigger

- Trigger: Removing tags from files, deleting unused tag rows, or changing undo/redo tag behavior.
- Affected tables: `tags`, `file_tags`.
- Affected packages: `internal/database`, `internal/undo`, Wails bindings in `app.go`.

### 2. Signatures

```go
func RemoveTagFromFiles(paths []string, tagIDs []string) error
func DeleteUnusedTags(tagIDs []string) error
func RestoreTags(tags []models.Tag) error

type Operation struct {
    TagIDs      []string
    PathTagIDs  map[string][]string
    RemovedTags []models.Tag
}
```

### 3. Contracts

- Removing tags from files must delete `file_tags` rows first.
- After removal, tags whose IDs are no longer referenced by any `file_tags` row should be deleted from `tags`.
- Before cleanup, capture the removed tag snapshots in the undo operation.
- Undoing a remove-tag operation must restore deleted tag rows before reattaching `file_tags` rows.
- ADS sync runs after the DB mutation and cleanup succeed.

### 4. Validation & Error Matrix

| Condition | Handling |
|-----------|----------|
| `paths` or `tagIDs` empty | Return nil; no DB work |
| None of the requested tags exist on target paths | Return nil; do not push undo |
| Tag reaches 0 references after removal | Delete row from `tags` |
| Undo remove-tag with deleted tag row | Restore tag via `RestoreTags`, then add `file_tags` rows |
| Restore tag already exists | `FirstOrCreate` must be idempotent |

### 5. Good/Base/Bad Cases

- Good: Remove the only use of tag `T`; `file_tags` loses the row, `tags` loses `T`, undo stores the full `models.Tag` snapshot.
- Base: Remove tag `T` from one of several files; `tags` keeps `T` because other `file_tags` rows still reference it.
- Bad: Delete `T` from `tags` without storing a snapshot; undo cannot reattach the tag to files because the tag row no longer exists.

### 6. Tests Required

- Go workspace build/test must pass after lifecycle changes.
- Manual assertion: remove the last use of a tag, verify it disappears from tag settings and suggestions.
- Manual assertion: undo that removal and verify the tag row and file association return.

### 7. Wrong vs Correct

#### Wrong

```go
_ = database.RemoveTagFromFiles(paths, tagIDs)
_ = database.DeleteUnusedTags(tagIDs)
undo.Push(undo.Operation{Type: undo.OpRemoveTag, TagIDs: tagIDs})
```

#### Correct

```go
existingTags, _ := database.GetTagsForFiles(paths)
removedTags := collectRemovedTagSnapshots(existingTags, tagIDs)
_ = database.RemoveTagFromFiles(paths, tagIDs)
_ = database.DeleteUnusedTags(tagIDs)
undo.Push(undo.Operation{
    Type:        undo.OpRemoveTag,
    TagIDs:      tagIDs,
    RemovedTags: removedTags,
})
```
