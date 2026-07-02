# Privacy Mode Protection Implementation Plan

## Checklist

1. Read applicable frontend/backend specs before editing.
2. Add backend models and database helpers for protected paths, tag protection, password hashing, and privacy config.
3. Add privacy filtering helpers shared by app bindings and search service where practical.
4. Update `app.go` bindings for privacy state, password setup/unlock/reset, protected path/tag mutation, and filtered listing/search/favorites/recent/tag reads.
5. Update search request/response flow to filter public-mode protected results.
6. Regenerate Wails bindings.
7. Add frontend `privacyStore` and privacy modal(s) using HeroUI `InputOTP`.
8. Add Privacy settings tab and controls.
9. Update Tag settings, Tag panel, TopNav suggestions, context menu, file item badges, breadcrumb, and directory hook behavior.
10. Run `gofmt`, frontend build, and Go build where available.

## Validation Commands

- `gofmt` on changed Go files.
- `wails generate module` or available Wails generation command if installed.
- `cd frontend && npm run build`.
- `go build ./...`.

## Risk Points

- Search service is a separate process and must not leak protected results in public mode.
- Directory chunks must be filtered before event emission.
- Generated Wails bindings may require local Wails CLI availability.
- Windows identity verification may need a pragmatic unavailable-state if direct API integration is too large.

## Rollback Points

- Backend schema changes are additive only.
- Frontend privacy UI can be disabled while retaining unprotected default behavior.
- Search filtering is request-gated and should preserve current behavior in privacy mode.
