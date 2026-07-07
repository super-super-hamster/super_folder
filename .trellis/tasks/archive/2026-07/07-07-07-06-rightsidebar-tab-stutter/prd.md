# Fix RightSidebar advanced tab indicator stutter with deferred rendering and skeleton

## Goal

Make the RightSidebar tab indicator animation smooth when switching to the `高级` tab, just like it is for `预览` and `信息`.

## Requirements

1. Decouple the tab indicator update from the heavy content panel render so the indicator animation can start immediately.
2. Show a HeroUI `Skeleton` placeholder while the deferred panel is preparing to render.
3. Keep the existing tab pill UI and `layoutId="activeTabRight"` indicator behavior unchanged.
4. Preserve correct content rendering for all three tabs (`预览`, `信息`, `高级`).

## Acceptance Criteria

- [ ] Switching from `预览`/`信息` to `高级` no longer causes the active tab indicator to stutter.
- [ ] A HeroUI Skeleton placeholder is visible in the content area during the brief deferred transition.
- [ ] Switching between `预览` and `信息` remains smooth.
- [ ] The `高级` panel still mounts and functions correctly (TagPanel, selects, similar-image search).
- [ ] Frontend build (`cd frontend && npm run build`) passes without errors.

## Notes

- Root cause: `高级` synchronously mounts `RightSidebarAdvanced` → `TagPanel`, which contains framer-motion `Reorder.Group`, HeroUI `ComboBox`/`Select`, and backend calls. This blocks the main thread and delays the framer-motion `layoutId` indicator animation.
- Implementation approach: use `useDeferredValue(activeTab)` in `RightSidebar.tsx` for content rendering while the tab UI uses `activeTab` directly; render a HeroUI `Skeleton` when `deferredActiveTab !== activeTab`.
