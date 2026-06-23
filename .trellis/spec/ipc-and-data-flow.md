# IPC and Data Flow

This document details the boundaries and contracts between the React frontend and Go backend in the File Manager project.

## Wails IPC vs RPC

We use two distinct transport mechanisms:

1. **Wails Auto-Generated IPC**: Used for lifecycle events, system settings, filesystem modifications (creating/deleting files), and lightweight reads (e.g., `ReadDir`).
2. **Dedicated HTTP RPC (`127.0.0.1:48123`)**: Used specifically for the `SearchFiles` operation. Bypassing Wails serialization prevents the UI thread from locking up when returning thousands of file structs from the MFT engine.

## Search Data Contract

When the frontend issues a search query, the contract must strictly be adhered to in order to ensure the `searcher.go` engine correctly parses the constraints.

### 1. `SearchRequest` Payload
Located in `internal/search/service/searcher.go`, triggered via `app.SearchFiles`.

```go
type SearchRequest struct {
	Keyword       string   `json:"keyword"`
	IsRegex       bool     `json:"isRegex"`
	CaseSensitive bool     `json:"caseSensitive"`
	OnlyFiles     bool     `json:"onlyFiles"`
	OnlyFolders   bool     `json:"onlyFolders"`
	Extensions    []string `json:"extensions"` // Array of extensions e.g. [".txt", ".png"]
	Tags          []string `json:"tags"`       // Array of exact tag strings e.g. ["important", "work"]
	TagLogic      string   `json:"tagLogic"`   // "AND" or "OR"
	MaxDepth      int      `json:"maxDepth"`
	RootPath      string   `json:"rootPath"`   // Crucial: Used to restrict search to a specific directory. Empty means global.
	Limit         int      `json:"limit"`      // Max results. Hardcapped typically to 1000-2000.
}
```

### 2. Frontend State Translation
In `frontend/src/components/fileList/FileList.tsx`, the global `searchQuery` string (maintained by `TopNav.tsx` capsules) is parsed locally before transmission:
- Extracts `tag:xxx` elements into the `Tags` array.
- Sends the remaining raw text as `Keyword`.
- Passes the current active tab directory to `RootPath` to automatically scope the search.

### Rule of Modification
If you introduce a new filter or UI toggle (e.g., "Sort By Date", "Global Search Toggle"), you must update both the TypeScript `SearchRequest` payload and the corresponding Go struct, ensuring the filter is evaluated efficiently inside `searcher.go` *before* the results are appended to the response slice.
