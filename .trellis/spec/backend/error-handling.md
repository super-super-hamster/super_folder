# Error Handling

> Error types, handling strategies, and propagation patterns.

---

## Scenario: Wails Desktop App Error Flow

### 1. Scope / Trigger
- Trigger: Returning errors from Go backend to JavaScript frontend
- All errors cross the Wails binding boundary → surfaced to user in Chinese

### 2. Signatures

```go
// Wails binding convention — last return value is error
func (a *App) SomeMethod(args) (result, error)

// Undo/Redo error strings (Chinese, user-facing)
"没有可撤销的操作"
"没有可还原的操作"
"撤销失败，源文件可能已丢失或被占用: %v"
"还原失败: %v"

// File operation error strings (Chinese, user-facing)
"永久删除 '%s' 失败: %v"
"操作 '%s' 失败: %v"
"重命名失败 %s -> %s: %v"
```

### 3. Contracts

| Layer | Error Style | Example |
|-------|-------------|---------|
| Internal packages (`internal/`) | `fmt.Errorf("context: %w", err)` | `fmt.Errorf("CreateFile error: %w", err)` |
| Wails bindings (`app.go`) | Wrap or pass through; frontend string `error.Error()` | `return nil, err` |
| User-facing | Chinese error strings with `%v` for details | `"重命名失败 %s -> %s: %v"` |
| Cancellation | `context.Canceled` — silently ignored | `err == context.Canceled` → skip error emit |

### 4. Validation & Error Matrix

| Condition | Action | Example |
|-----------|--------|---------|
| `os.IsNotExist(err)` | Check before action or treat as no-op | `database.GetConfig`, `ReadTagsFromADS` |
| `context.Canceled` | Silently skip, do not emit error event | `fileop.go` line 148, 196 |
| Record not found (DB) | `errors.Is(err, gorm.ErrRecordNotFound)` → return `("", nil)` | `GetConfig`, `GetThumbnail`, `GetRemark` |
| Windows API failure | Wrap with `fmt.Errorf("SHFileOperationW failed with code %d", ret)` | `recycle.go` |
| Conflict resolution | Event-driven via `runtime.EventsEmit`, await `ConflictChan` | `fileop.go` |
| Permission denied | Continue to next file, emit error event per-file | `fileop.go:198` |
| Undo/Redo failure | Clear both stacks, return error | `undo.go:66-68`, `undo.go:92-94` |

### 5. Good/Base/Bad Cases

#### Good — Soft error per file (continue batch)
```go
if err != nil && err != context.Canceled {
    runtime.EventsEmit(t.WailsCtx, "paste:error", map[string]interface{}{
        "taskID":  t.ID,
        "message": fmt.Sprintf("操作 '%s' 失败: %v", filepath.Base(src), err),
    })
    continue // Keep going with remaining files
}
```

#### Good — Context cancellation as normal flow
```go
if t.Ctx.Err() != nil {
    break
}
```

#### Good — RecordNotFound is not an error
```go
if errors.Is(err, gorm.ErrRecordNotFound) {
    return "", nil
}
```

#### Bad — Panic instead of error return
```go
// NEVER
if err != nil {
    panic(err)
}
```

#### Bad — Ignoring errors silently (non-optional)
```go
// Prefer logging or returning. Do not swallow without reason.
fmt.Println("Error:", err)  // This is acceptable (print to terminal)
```

### 6. Tests Required
- None currently. When adding: test undo error on missing file, conflict resolution channel, context cancellation during long copy

### 7. Wrong vs Correct

#### Wrong — Error string in English for user-facing messages
```go
return nil, fmt.Errorf("rename failed: %v", err)
```

#### Correct — User-facing errors in Chinese
```go
return nil, fmt.Errorf("重命名失败 %s -> %s: %v", src, dest, err)
```
