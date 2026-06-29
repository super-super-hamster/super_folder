# Directory Structure

> Module organization and file layout conventions.

---

## Scenario: Go Backend Layout

### 1. Scope / Trigger
- Trigger: Adding or modifying Go package files

### 2. Signatures
- `main.go` — single entrypoint, binary setup only
- `app.go` — all Wails bindings (Go→JS exported methods)
- `internal/<package>/` — per-concern packages, no sub-packages beyond `search/`

```
super_folder/
├── main.go              # Entry: DB init, rename init, wails.Run()
├── app.go               # All Wails bindings (file ops, tags, search, undo, settings)
├── go.mod               # module super_folder
├── wails.json
├── internal/
│   ├── database/
│   │   └── db.go        # GORM init, config/tags/thumbnails/remarks/favorites CRUD
│   ├── fs/
│   │   ├── fs.go        # ReadDir, GetDrives, GetDefaultPaths
│   │   ├── fileop.go    # Async copy/move/delete with conflict resolution & progress
│   │   ├── recycle.go   # SHFileOperationW → recycle bin
│   │   └── tags_ads.go  # NTFS Alternate Data Stream tag persistence
│   ├── models/
│   │   └── models.go    # Shared data structs (no logic)
│   ├── rename/
│   │   └── schemes.go   # JS rename scheme filesystem CRUD + fsnotify watcher
│   ├── search/
│   │   ├── service/     # Windows service wrapper + HTTP RPC handler
│   │   └── usn/         # USN Journal engine (MFT enum, real-time listener)
│   ├── terminal/
│   │   └── terminal.go  # ConPTY xterm.js bridge
│   ├── thumbnail/
│   │   └── handler.go   # HTTP handler (injected into Wails AssetServer)
│   ├── converter/
│   │   └── convert.go   # Image/data format conversion
│   └── undo/
│       └── undo.go      # In-memory undo/redo stacks
```

### 3. Contracts

| Layer | Entry File | Responsibility |
|-------|-----------|----------------|
| Binary | `main.go` | CLI flag parsing, init wiring, `wails.Run()` |
| Bindings | `app.go` | Exported methods callable from JS via Wails runtime |
| Model | `internal/models/models.go` | Pure data structs (no imports from other `internal/` packages) |
| Concern | `internal/<package>/<file>.go` | Single responsibility logic |

### 4. Validation & Rules

| Rule | Violation |
|------|-----------|
| Each `internal/` dir is one Go package (no nested packages except `search/`) | Compile error on duplicate package declarations |
| `app.go` must only delegate to `internal/` packages, not contain business logic | Review gate |
| `models/` must not import any other `internal/` package | Import cycle |
| `app.go` methods must be exported (capitalized) | Wails binding will not register |
| Internal packages must not import `super_folder` (no back-reference to main) | Import cycle |

### 5. Good/Base/Bad Cases

#### Good
```go
// app.go — binding only, delegates to internal package
func (a *App) ReadDir(path string) ([]models.FileInfo, error) {
    return fs.ReadDir(path)
}
```

#### Bad
```go
// app.go — DO NOT put business logic in bindings
func (a *App) ReadDir(path string) ([]models.FileInfo, error) {
    entries, _ := os.ReadDir(path)
    // ... 40 lines of processing here ...
    return result, nil
}
```

### 6. Tests Required
- No Go tests exist in this project
- When adding tests: place `_test.go` next to the file it tests, use `package <name>_test` for black-box tests

### 7. Wrong vs Correct

#### Wrong
```
internal/
  search_service/  ← snake_case, nested unnecessarily
  file_manager/
```

#### Correct
```
internal/
  search/
    usn/       ← max one level of nesting, only for service+engine split
    service/
```
