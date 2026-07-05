# 搜索筛选器新增包含条件

## Goal

Add a new "包含" (contains) search filter that lets users specify multiple substrings. A file passes if its name contains ANY of the input strings (OR logic).

## Requirements

### Frontend — SearchPanel

- New filter "包含" in the available filters list
- Adding the filter sets `isIncludeFilter: true`, `includeStrings: []`
- Input pattern identical to "排除文件夹": text input, Enter/blur to add, tag pills with X to remove, comma-separated batch add
- `submitInclude`: trim whitespace, de-duplicate, merge into store
- `handleRemoveInclude`: filter out by value

### Frontend — Store

- `SearchFilter` interface: add `isIncludeFilter: boolean`, `includeStrings: string[]`
- Default: `isIncludeFilter: false`, `includeStrings: []`

### Frontend — Request Building

- `useDirectoryFiles.ts`: pass `includeStrings` in search request

### Backend — searcher.go

- `SearchRequest` struct: add `IncludeStrings []string`
- Two matching locations (tag path and USN engine): after keyword/regex matching, check `strings.Contains(name, s)` for each include string
- OR logic: if ANY string matches, the file passes
- Respect `CaseSensitive` flag

## Acceptance Criteria

- [ ] "包含" filter option appears in the search panel "+" dropdown
- [ ] Adding the filter shows a text input area
- [ ] Enter/blur adds the string as a tag pill
- [ ] X button on pill removes it
- [ ] Multiple include strings are sent to backend
- [ ] Backend returns files whose name contains ANY of the strings
- [ ] Case sensitivity is respected
- [ ] Frontend build succeeds
- [ ] Backend build succeeds
