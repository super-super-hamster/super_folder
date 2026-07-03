# Preserve action panel state and navigate search paths

## Goal

Keep left action panel state when collapsed and let the search box navigate to existing typed paths while respecting public-mode protection.

## Requirements

- Collapsing the left operation panel must not destroy its mounted component tree or reset local UI state.
- Reopening the left operation panel should restore the same internal state the panel had before collapse, including active advanced/tag management UI where applicable.
- The top search input must detect when the typed value is a valid existing local filesystem path and navigate automatically.
- If the typed path points to a directory, navigate to that directory.
- If the typed path points to a file, navigate to the file's containing folder only.
- Path navigation must not trigger for incomplete or invalid paths.
- In public mode, protected folders/files must behave as if they do not exist; the UI should show only "path does not exist" style feedback instead of navigating.
- Existing tag/note search query behavior must continue to work.
- File panel marquee selection auto-scroll must stop at the real bottom of the virtualized content and must not create a temporary larger scroll range while dragging.

## Acceptance Criteria

- [ ] Collapse and reopen the left operation panel without losing its selected sub-panel/input state.
- [ ] The panel collapse animation/width behavior stays visually consistent.
- [ ] Typing an existing directory path into the search box navigates to that directory automatically.
- [ ] Typing an existing file path into the search box navigates to that file's parent directory automatically.
- [ ] Typing a non-existent path does not navigate.
- [ ] Typing a protected path in public mode does not navigate and reports it as not existing.
- [ ] Normal keyword, tag, and note searches still behave as before.
- [ ] Dragging a marquee selection to the bottom auto-scrolls only until the real bottom, then stops without expanding the scroll range.
- [ ] Frontend build succeeds.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
