# Backend Architecture

This document defines the core conventions for the Go backend of the File Manager project.

## High-Performance MFT/USN Search Engine

We utilize a custom NTFS Master File Table (MFT) and Update Sequence Number (USN) journal parser to achieve extremely fast file enumeration and tracking across local Windows drives.

- **Implementation details**: Found in `internal/search/usn/engine.go`
- **Rule of Thumb**: Operations on the engine must heavily respect global locks (`engine.Mu.RLock()`). Avoid complex string operations (e.g., regex compilation or deep path resolution) inside the tight enumeration loops. Filter out invalid items (`node.IsFolder` checks, string length checks) as early as possible.
- **Root Path Filtering**: When executing a search, the backend honors the `req.RootPath` by checking `strings.HasPrefix(fullPath, req.RootPath)`. By default, this restricts searches to the directory the user is currently browsing.

## SQLite Tagging & Remark Integration

Files can be tagged or given remarks, and these mappings are stored in SQLite using GORM.

- **Location**: `internal/database/` and `internal/models/`
- **Mapping Mechanism**: The `file_tags` table links `tag_id` to file paths (`path`). The `remarks` table directly maps file `path` to a string `content`.
- **File Renames**: The USN Engine automatically tracks renaming (`onRename` hook) to ensure the SQLite `path` strings are kept in sync with the live filesystem for both Tags and Remarks.
- **Pre-filtering for Search**: When a user searches for tags (`tag:abc`), `searcher.go` queries the SQLite database first to retrieve matching paths before intersecting them with the MFT results. This ensures instantaneous tag lookups.
- **Remark Search Interception**: When a user searches with the `备注:` prefix, `searcher.go` entirely bypasses the USN scan and directly executes a `LIKE` query against the SQLite `remarks` table for extreme performance.

## Search Service Segregation

Because standard Wails IPC has inherent serialization bottlenecks when passing massive arrays of file structs, **search runs on a dedicated internal HTTP server** (`127.0.0.1:48123`).

- Do not implement heavy enumeration via standard `app.go` Wails exports.
- **Pattern**: `app.SearchFiles` acts as a proxy, forwarding the frontend request to the internal HTTP server via `http.Post`.
