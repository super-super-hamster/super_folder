# PRD: Chinese Simplified/Traditional Conversion

## Goal

Add a full-page Chinese text conversion feature for `.txt` and `.epub` files, similar to the existing batch rename and file conversion flows.

## Scope

### In scope
1. Right-click on `.txt` or `.epub` files shows a "简繁转换" menu item.
2. Selecting it opens a new page (`ChineseConvView`) with the selected files pre-loaded.
3. The conversion page allows choosing a base scheme and a custom user-defined scheme.
4. File list has "import from folder" and "import from files" buttons in the top-right.
5. Output files are placed in a sibling folder named `简繁转换_<target type>` (e.g. `简繁转换_简体`).
6. Existing files in the output folder are overwritten.
7. Original file extensions are preserved.
8. Custom schemes are configured in Settings > General:
   - Scheme name
   - Base scheme selection
   - Custom replacement pairs (source → target)
9. Custom scheme logic: apply base conversion first, then custom replacements.
10. Regional variants supported: Mainland Simplified, Taiwan Traditional, Hong Kong Traditional.

### Out of scope
- Recursive folder import.
- Real-time preview.
- File formats other than `.txt` and `.epub`.
- Japanese conversion schemes.
- Regex-based custom replacements.

## Acceptance Criteria
1. Right-click menu shows "简繁转换" only for `.txt` and `.epub`.
2. Clicking opens `ChineseConvView` with files loaded.
3. Base schemes available:
   - 简体 → 繁体
   - 繁体 → 简体
   - 简体 → 台湾繁体
   - 台湾繁体 → 简体
   - 简体 → 香港繁体
   - 香港繁体 → 简体
4. Custom schemes can be created/deleted in Settings > General.
5. Custom scheme applies base conversion then custom pairs.
6. EPUB conversion preserves metadata, styles, images; only text nodes in XHTML/HTML are converted.
7. TXT conversion reads/writes entire file content.
8. Output directory is created next to each source file.
9. `go build ./...` and `cd frontend && npm run build` pass.

## Technical Notes
- Use `github.com/longbridgeapp/opencc` for base conversion.
- EPUB is a ZIP archive; iterate entries, convert XHTML/HTML text nodes, copy other entries unchanged.
- Add backend binding `SelectFiles()` for multi-file selection.
- Store custom schemes in settings config as JSON.
