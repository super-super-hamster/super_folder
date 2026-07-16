# Paper Design System and Workspace Prototype

## Goal

Implement a reviewable paper-card design system and apply it to the existing main file-management workspace without changing layout or behavior.

## Requirements

- Add semantic desk, paper, muted-paper, raised-paper, overlay, text, border, accent, danger, radius, shadow, font, and motion tokens.
- Add one seamless 512x512 grayscale paper-fiber asset under 20 KB when practical.
- Apply material surfaces to the app desk, sidebar, top navigation, search panel, operations sidebar, file-list canvas, context menu, and common modals.
- Apply restrained hover, press, selected, focus, drag-over, disabled, loading, empty, and error states without changing element dimensions.
- Keep major paper surfaces near-white; use a light warm-yellow hover and a deeper warm-yellow selected state, with graphite selected text.
- Use 8px major-panel radii and 6px internal control radii; reserve pills for tags, status, toggles, and compact search tokens.
- Respect `prefers-reduced-motion` and preserve existing Lottie behaviors where meaningful.

## Acceptance Criteria

- [x] Main workspace layout geometry and verified browser behaviors are unchanged.
- [x] Paper texture is static, subtle, non-interactive, and absent from dense list rows and content canvases.
- [ ] Revised near-white paper and warm-yellow hover/selection palette is approved by the user.
- [x] All shadows use a coherent upper-left light source and do not clip in the available browser viewport.
- [x] Virtual list row heights and grid geometry remain unchanged during hover, selection, and drag-over.
- [ ] Wails drag/no-drag behavior, panel resizing, sidebar collapse, menus, and modal interactions still work.
- [x] `npm run build` passes.
- [ ] Screenshots at 1024x768, 1366x768, and 1440x900 are ready for user review.

## Out of Scope

- Settings, preview/editor, conversion, similar-image, privacy, and other secondary-page migration.
- Backend or persisted-state changes.
