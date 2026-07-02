# Quality Guidelines

> Code standards, forbidden patterns, and conventions.

---

## Scenario: Go Desktop App Code Quality

### 1. Scope / Trigger
- Trigger: Writing or reviewing Go backend code

### 2. Signatures

| Check | Standard |
|-------|----------|
| Comments | No Go `//` comments or excessive inline comments. Code should be self-documenting |
| Imports | Standard library first, third-party second, internal packages last. No blank imports except for image format registration |
| Error strings | User-facing: Chinese. Developer-facing: English with `%w` wrapping |
| goroutines | Must have cancellation mechanism (`context.Context` or `stopCh`) |
| Exported names | PascalCase. Unexported: camelCase |
| Wails bindings | Only in `app.go`. Delegate to `internal/` immediately |

### 3. Contracts

#### Forbidden Patterns

```go
// FORBIDDEN: Panic
if err != nil { panic(err) }

// FORBIDDEN: Inline business logic in app.go
func (a *App) SearchFiles(req map[string]interface{}) ([]models.FileInfo, error) {
    // 50 lines of processing... NO. Delegate to internal/search.
}

// FORBIDDEN: Using ioutil (deprecated since Go 1.16)
ioutil.ReadFile(path)  // Use os.ReadFile
ioutil.ReadDir(path)   // Use os.ReadDir

// FORBIDDEN: Raw SQL when GORM can do it (no security issue — local DB, but inconsistency)
DB.Exec("SELECT * FROM configs WHERE key = ?", key)

// FORBIDDEN: Exposing internal state directly to frontend
type App struct {
    DB *gorm.DB  // NO — frontend should not access DB directly
}
```

#### Allowed Patterns

```go
// ALLOWED: fmt.Println for terminal log (this project has no logging package)
fmt.Println("[Thumbnail Handler] File open error:", err)

// ALLOWED: unsafe.Pointer for USN Journal IOCTL (Windows API requirement)
recordPtr := uintptr(unsafe.Pointer(&buf[8]))

// ALLOWED: Inline mutable package-global maps with sync.Mutex (single-process Wails app)
var (
    taskMutex sync.Mutex
    tasks     = make(map[string]*FileTask)
)
```

### 4. Validation & Error Matrix

| Pattern | Status | Reason |
|---------|--------|--------|
| `ioutil.ReadFile` | FORBIDDEN (deprecated) | Use `os.ReadFile` since Go 1.16 |
| `panic` | FORBIDDEN | Desktop app must not crash |
| `log.Fatal` | FORBIDDEN except in `serveHTTP()` | `log.Fatalf` calls `os.Exit(1)` |
| `fmt.Println` | ALLOWED for debug output | Runs in terminal window, not user-visible |
| `goroutine` without cancel | FORBIDDEN | Must use `context.Context`, `stopCh`, or similar |
| `sync.Mutex` on package globals | ALLOWED | Single binary, single process — safe pattern |
| `unsafe.Pointer` | ALLOWED | Required for Windows DeviceIoControl API |

### 5. Good/Base/Bad Cases

#### Good — Separate data model from logic
```go
// internal/models/models.go — pure data
type FileInfo struct {
    Name    string    `json:"name"`
    Path    string    `json:"path"`
    IsDir   bool      `json:"isDir"`
    Size    int64     `json:"size"`
    ModTime time.Time `json:"modTime"`
    Ext     string    `json:"ext"`
}
```

#### Good — Context-aware goroutine
```go
go func() {
    for {
        select {
        case <-t.Ctx.Done():
            return
        default:
        }
        // do work...
    }
}()
```

#### Bad — File-scoped globals without mutex
```go
var tasks = make(map[string]*FileTask)  // concurrent map writes = panic
```

#### Correct
```go
var (
    taskMutex sync.Mutex
    tasks     = make(map[string]*FileTask)
)
```

### 6. Tests Required
- None currently exist. Any new test file: name `_test.go`, place adjacent to source

### 7. Wrong vs Correct

#### Wrong
```go
// ioutil deprecated, panic on error
func foo() {
    data, err := ioutil.ReadFile(path)
    if err != nil {
        panic(err)
    }
}
```

#### Correct
```go
func foo() error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("read file: %w", err)
    }
    return nil
}
```

---

## Scenario: Undo/Redo Operation Payloads

### 1. Scope / Trigger
- Trigger: Adding or changing an `internal/undo.Operation` type, inverse/forward mapping, or batch operation payload.

### 2. Signatures

```go
type Operation struct {
    Type       OpType              `json:"type"`
    SrcPaths   []string            `json:"srcPaths"`
    DestPaths  []string            `json:"destPaths"`
    Paths      []string            `json:"paths"`
    TagIDs     []string            `json:"tagIDs"`
    PathTagIDs map[string][]string `json:"pathTagIDs"`
}
```

### 3. Contracts

| Operation | Undo must | Redo must | Required payload |
|-----------|-----------|-----------|------------------|
| `OpAddTag` | Remove `TagIDs` from `Paths` | Add `TagIDs` to `Paths` | `Paths`, `TagIDs` |
| `OpRemoveTag` | Add removed tags back | Remove removed tags again | `PathTagIDs` for precise batch restore; fallback `Paths` + `TagIDs` only for uniform removals |

Batch operations must capture the original per-target relationship before mutation. Do not assume every selected path had every requested tag.

### 4. Validation & Error Matrix

| Condition | Action |
|-----------|--------|
| Handler not registered | Return an error from undo/redo and clear stacks through existing `Undo`/`Redo` flow |
| Batch remove has no matching existing tags | Return nil and do not push an undo operation |
| ADS sync fails after DB mutation | Return the sync error so frontend receives a failure instead of silently diverging |
| `PathTagIDs` is present | Apply handlers per path using only that path's tag IDs |

### 5. Good/Base/Bad Cases

#### Good — Preserve per-path removed tags
```go
PathTagIDs: map[string][]string{
    "a.txt": {"red"},
    "b.txt": {"blue"},
}
```

#### Bad — Restores a Cartesian product during undo
```go
Paths:  []string{"a.txt", "b.txt"},
TagIDs: []string{"red", "blue"},
```

The bad case would restore both tags to both files even if each file originally had only one.

### 6. Tests Required
- Undo add: after `OpAddTag`, `Undo` removes tags from all target paths and `Redo` adds them back.
- Undo remove: after `OpRemoveTag`, `Undo` restores only the tags each path originally had and `Redo` removes them again.
- Mixed batch: one selected path missing a requested tag must not gain that tag after undo.
- Failure path: unregistered handler or ADS sync failure returns an error and leaves stacks cleared by existing undo/redo error flow.

### 7. Wrong vs Correct

#### Wrong
```go
case OpAddTag, OpRemoveTag:
    return removeTagHandler(op.Paths, op.TagIDs)
```

#### Correct
```go
case OpAddTag:
    return applyTagHandler(op, removeTagHandler)
case OpRemoveTag:
    return applyTagHandler(op, addTagHandler)
```
