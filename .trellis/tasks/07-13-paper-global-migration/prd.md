# Global Paper Surface Migration

## Goal

After prototype approval, migrate all remaining frontend surfaces to the accepted paper material and interaction system.

## Requirements

- Migrate settings, previews, editors, batch rename, conversion, similar images, Chinese conversion, privacy screens, progress feedback, and secondary panels.
- Keep terminal and code-preview content dark while applying paper styling to their surrounding chrome.
- Replace one-off gray, radius, and shadow declarations with approved semantic tokens where behavior permits.
- Preserve all business logic and component state contracts.

## Acceptance Criteria

- [ ] User has explicitly approved the core workspace prototype.
- [ ] Remaining frontend surfaces use the approved tokens and state semantics.
- [ ] No nested decorative cards or texture on dense/content canvases are introduced.
- [ ] Full frontend build and multi-viewport visual verification pass.

## Dependency

Do not start this task until `07-13-paper-workspace-prototype` is accepted by the user.
