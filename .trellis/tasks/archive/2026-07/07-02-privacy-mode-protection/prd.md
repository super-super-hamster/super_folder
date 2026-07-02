# Implement privacy mode protection

## Goal

Add an application-level privacy mode that hides protected files, folders, and tags while the app is in public mode, and allows protected content to be viewed and configured only after the user unlocks privacy mode.

This is local app privacy, not filesystem encryption. Public mode must behave as if protected content does not exist within the app.

## Confirmed Facts

- The feature proposal is captured in `privacy-mode-plan.md`.
- The app uses Go/Wails bindings through `app.go` and React state through Zustand stores.
- Tags are persisted in SQLite through `models.Tag` and `models.FileTag`.
- General app config is stored in SQLite through `models.Config`.
- Directory listing uses `ReadDirChunked`, including async chunk events.
- Search is handled by a separate local search service that initializes the same SQLite database.
- Favorites and recent items are returned through backend bindings.
- Settings already has a Tags tab, and tag suggestions are used in `TopNav` and `TagPanel`.

## Requirements

- Add public and privacy modes.
- Default to public mode with no privacy password set.
- First switch to privacy mode must require setting a password twice.
- Password must be non-empty, fixed-length, alphanumeric only, and entered through HeroUI `InputOTP`.
- After successful first password setup, enter privacy mode immediately.
- Existing password unlock must be required when switching from public to privacy mode.
- Incorrect password or mismatched setup confirmation must show an error and clear the input fields.
- Provide a setting to restore the previous privacy mode on startup, using scheme B: startup asks for unlock before restoring privacy mode.
- Do not persist an already-unlocked session across app restarts.
- Provide Windows identity verification as the reset path for forgotten privacy passwords. The app must not read or validate Windows PIN directly.
- Preserve all protection markers when resetting the privacy password.
- Allow protected state on files, folders, and tags only while in privacy mode.
- In public mode, do not show protection controls or protected status.
- Protected tags must be hidden in public mode and excluded from tag search, tag suggestions, and add-tag autocomplete.
- Files or folders that contain a protected tag must be hidden in public mode.
- Protected folders must hide all descendants in public mode.
- Parent folder protection must override child protection state.
- If public mode reaches protected content due to an unexpected path, show a generic warning and navigate to `C:\`.
- Public mode must filter protected content from all app entry points that are in scope for this task: directory lists, async chunks, search results, favorites, recent items, tag lists, tag suggestions, tag panel data, and file tag color indicators.
- Public mode must not show hidden item counts.
- In privacy mode, file and folder context menus must show `保护` / `解除保护` below favorite/unfavorite.
- Protected files and folders must show the lock icon at the bottom-left of grid/album item icons, styled similarly to the existing tag marker.
- When the current folder is protected, the breadcrumb leading icon should use the lock icon instead of the folder icon.

## Acceptance Criteria

- [ ] A fresh install starts in public mode with no password configured.
- [ ] First privacy-mode switch opens a setup dialog, accepts only alphanumeric OTP input, requires matching confirmation, and then enters privacy mode.
- [ ] Later privacy-mode switches require the password and reject incorrect input without revealing details.
- [ ] Startup restore setting does not bypass unlock on restart.
- [ ] Public mode hides protected paths from normal directory loading, streamed directory chunks, favorites, recent items, and search results.
- [ ] Public mode hides protected tags from tag management, tag search suggestions, add-tag autocomplete, and selected-file tag displays.
- [ ] Protecting a folder hides all descendants in public mode.
- [ ] Protecting a tag hides files and folders using that tag in public mode.
- [ ] Public mode does not show protection menu items or protected state indicators.
- [ ] Privacy mode shows protect/unprotect in the file context menu below favorite/unfavorite.
- [ ] Privacy mode shows lock badges for directly protected files and folders.
- [ ] If public mode navigates into protected content, a generic warning appears and the tab returns to `C:\`.
- [ ] Frontend build succeeds.
- [ ] Go build or Wails binding generation succeeds far enough to validate exported binding signatures.

## Notes

- Windows identity verification may require a limited first implementation depending on available Go/Windows API support. If the API is not practical within this task, keep the reset entry disabled with clear unavailable-state messaging rather than adding an insecure fallback.
