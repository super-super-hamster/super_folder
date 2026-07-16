# Paper Card Visual and Interaction Refresh

## Goal

Refresh the full desktop UI with a restrained, realistic paper-card material system while preserving the current layout, dimensions, navigation, workflows, and backend contracts.

## Requirements

- Use a cool gray desk, warm white paper, graphite text, ink-green primary states, and vermilion danger states.
- Keep the application light-theme only and preserve current information architecture and panel geometry.
- Use a seamless low-contrast local paper texture only on major paper surfaces and overlays.
- Use one coherent upper-left light source for paper edge highlights and down-right shadows.
- Use system sans-serif fonts for UI copy and JetBrains Mono for paths, metadata, code, and terminal content.
- Preserve virtual-list dimensions, drag/drop hit areas, Wails drag regions, and all business behavior.
- Deliver in two review-gated children: the core workspace prototype, then the full application migration.

## Acceptance Criteria

- [ ] The workspace prototype is implemented and reviewed before global page migration begins.
- [ ] The final UI uses the shared semantic material and interaction tokens across all application surfaces.
- [ ] No Go, Wails binding, database, or persisted-state contract changes are introduced.
- [ ] Frontend build passes and desktop viewport checks show no overlap, clipping, or virtual-list layout shift.

## Out of Scope

- Dark theme support or a runtime theme switcher.
- Navigation, layout, or business-workflow redesign.
- Decorative aging, folds, tape, stains, holes, glass blur, glow, or dynamic spotlight effects.
