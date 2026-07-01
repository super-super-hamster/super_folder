# PRD: EPUB In-App Viewer

## Goal

Add an in-app EPUB viewer so users can read `.epub` e-books inside the application, with table-of-contents navigation, reading-progress persistence, keyboard/mouse controls, and adaptive image sizing.

## Scope

### In scope
1. Double-clicking / "Open in app" on `.epub` files renders the EPUB viewer.
2. EPUB files show a dedicated book icon in the file list.
3. Viewer layout:
   - Top toolbar with previous-chapter button, current chapter title, next-chapter button, and table-of-contents button.
   - Chapter title is centered, vertically aligned, max-width ~50%, and wraps if too long.
   - Left/right arrow buttons use Lottie animations (`left.json` / `right.json`).
   - Table-of-contents button uses `menu_line.svg`.
4. Table of contents is shown in a HeroUI `Dropdown`; clicking a chapter jumps to it.
5. Content rendering uses vertical scrolling (`scrolled-doc` flow).
6. Images inside EPUB content are constrained to `max-width: 100%` so horizontal scrolling is never required.
7. Keyboard controls:
   - Double-press Left / Right arrow keys: previous / next chapter (prevent accidental chapter switch).
   - Up / Down arrow keys: scroll content.
8. Mouse wheel scrolls content.
9. Reading progress (CFI) is persisted per file in `localStorage` using key `epub:<absolute file path>`; reopening a book restores the last position.
10. Right-sidebar `FilePreview` supports EPUB rendering (content only, no toolbar).

### Out of scope
- Text search inside EPUB.
- Font size / theme adjustments.
- Annotations or highlights.
- Full-screen reading mode.
- Pagination (only scrolled flow).

## Acceptance Criteria
1. `.epub` files open in the app via `FullFileEditor`.
2. File list shows `book_2_line.svg` for `.epub` files.
3. Toolbar displays current chapter title and allows chapter navigation via arrows and dropdown.
4. Left/Right arrow keys switch chapters; Up/Down arrow keys scroll.
5. Wheel scrolling works in the content area.
6. Images never exceed the viewer width.
7. Progress is saved on chapter/location change and restored on reopen.
8. `cd frontend && npm run build` passes.
9. `go build ./...` passes (no backend changes expected).

## Technical Notes
- Use `epubjs` with `jszip` for client-side EPUB parsing and rendering.
- Load the EPUB binary via the existing local `/file?path=...&token=...` endpoint.
- Store progress as a CFI string from `rendition.currentLocation()`.
- Use `epubjs` `book.loaded.navigation` to obtain the table of contents.
