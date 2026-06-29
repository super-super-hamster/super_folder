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
