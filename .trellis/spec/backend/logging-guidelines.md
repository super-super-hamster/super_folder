# Logging Guidelines

> Logging practices — no structured logging package is used in this project.

---

## Scenario: Terminal-Only Debug Output

### 1. Scope / Trigger
- Trigger: Adding diagnostic output to Go backend code
- There is no structured logging library. Output goes to stderr/stdout visible in the Wails terminal window.

### 2. Signatures

```go
// Primary output methods (used throughout codebase):
fmt.Println("[Tag] message:", err)       // internal/packages
log.Printf("message: %v", err)           // search/service (Windows service mode)
runtime.EventsEmit(ctx, "event:name", payload) // Emit errors to frontend toast/notification
```

### 3. Contracts

| Destination | Method | When to Use |
|-------------|--------|-------------|
| Terminal (developer) | `fmt.Println` | Package-level debug output (converter, thumbnail, fs, undo) |
| Windows Service log | `log.Printf` / `log.Fatalf` | `search/service/` — runs as Windows service, writes to Event Log |
| Frontend (user) | `runtime.EventsEmit` → `paste:error` / `paste:conflict` / `paste:progress` | User-visible file operation errors and progress |

### 4. Validation & Error Matrix

| Situation | Method | Example |
|-----------|--------|---------|
| Startup failure | `println` (builtin, not fmt) | `main.go:33` `println("DB Init Error:", err.Error())` |
| Non-critical file error | `fmt.Println` | `fileop.go:128` |
| User-visible error | `runtime.EventsEmit` with `"paste:error"` event | `fileop.go:150-153` |
| USN Journal debug | `log.Printf` with drive prefix | `engine.go:84` `"[C:] Started MFT enumeration..."` |
| Fatal config error | `log.Fatalf` | `searcher.go:87` (only in separate search service) |

### 5. Good/Base/Bad Cases

#### Good — Service prefix for USN logging
```go
log.Printf("[%s:] Starting MFT enumeration...", e.driveLetter)
```

#### Good — Frontend progress via events
```go
runtime.EventsEmit(t.WailsCtx, "paste:progress", map[string]interface{}{
    "taskID":         t.ID,
    "totalBytes":     t.TotalBytes,
    "copiedBytes":    t.CopiedBytes,
})
```

#### Acceptable — Println for non-critical errors
```go
fmt.Println("Error calculating size:", err)
```

#### Bad — Using `fmt.Println` in Windows service code
```go
// In search/service/ — this output will not be visible
fmt.Println("search started")  // Use log.Printf instead
```

### 6. Tests Required
- None. No logging assertions exist or are planned.

### 7. Wrong vs Correct

#### Wrong
```go
fmt.Println("Search service listening on port", SearchPort)
```

#### Correct
```go
log.Printf("Starting Search RPC Server on 127.0.0.1:%d...", SearchPort)
```
