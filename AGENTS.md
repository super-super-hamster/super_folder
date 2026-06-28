<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# Super Folder — Agent Guide

## Stack

- **Desktop framework**: [Wails v2](https://wails.io) — Go backend + Web frontend
- **Backend**: Go 1.25, Windows-only (NTFS USN Journal, ConPTY, COM/OLE, recycle bin)
- **Frontend**: React 19 + TypeScript 4.6 + Vite 8 + TailwindCSS v4 + HeroUI
- **State**: Zustand (14 stores under `frontend/src/store/`)
- **DB**: SQLite via GORM at `C:\ProgramData\file-manager\config.db` (WAL mode)
- **Module**: `super_folder`

## Dev Commands

| What | Command |
|------|---------|
| Full-stack dev | `wails dev` |
| Production build | `wails build` |
| Frontend only | `cd frontend && npm run dev` |
| Frontend build | `cd frontend && npm run build` (runs `tsc && vite build`) |
| Search service | `super_folder.exe --service` (Windows service mode) |

## Key Architecture

- **`main.go`**: Entrypoint — init DB, rename schemes, then `wails.Run()`
- **`app.go`**: All Go→frontend bindings (file ops, tags, search, terminal, undo, settings)
- **`internal/`**: Package-per-concern — `database/`, `fs/`, `models/`, `rename/`, `search/`, `terminal/`, `thumbnail/`, `converter/`, `undo/`
- **`frontend/src/`**: React app with `components/` (10 subdirs), `store/` (14 Zustand stores), `utils/`
- **Search**: Separate Windows service (`--service` flag); communicates via HTTP on dynamic localhost port (written to `%APPDATA%\super_folder\search_port.txt`)
- **Thumbnails**: Custom `http.Handler` injected into Wails `AssetServer` (`internal/thumbnail/handler.go`), also cached in DB
- **Tags**: Dual persistence — SQLite + NTFS Alternate Data Streams (ADS) via `internal/fs/tags_ads.go`
- **Terminal**: Embedded xterm.js + ConPTY via `internal/terminal/`
- **Window**: Frameless, self-drawn; bounds persisted to DB on close
- **Frontend dev mock**: `main.tsx` provides `window.go.main.App` stubs for browser preview (no Wails runtime)

## Important Constraints

- **Windows-only**: Uses `golang.org/x/sys/windows`, COM/OLE, USN Journal API, recycle bin
- **No tests exist** (zero `_test.go` or `.test.ts` files)
- **No CI/CD** — no GitHub workflows configured
- **DB schema** auto-migrated by GORM (`database.InitDB()` → `AutoMigrate`)
- **Undo/redo**: In-memory only; cleared on app restart
- **No Go `//` comments or excessive inline comments** in new code (project convention)
