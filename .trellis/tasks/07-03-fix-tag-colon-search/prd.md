# Fix tag search values containing colon

## Goal

Searching for tag values that contain a colon, such as tag:a:b, currently behaves like no search filter and shows unfiltered file panel contents.

## Requirements

- Searching `tag:<value>` must not become a tag filter until the token is explicitly terminated by whitespace or `&`.
- Tag values may contain additional colons, e.g. `tag:a:b` should search for tag name `a:b`.
- Existing tag, Chinese tag prefix, note/remark prefix, `&` separators, and keyword behavior must keep working.
- Searching typed tags displayed as `type:name` must match tags stored as `type` + `name`, as well as plain tag names containing colons.
- Clearing a search after a tag/name search must not duplicate file rows or icons from stale directory chunk results.

## Acceptance Criteria

- [ ] `tag:a:b` remains keyword input until the user types a delimiter.
- [ ] `tag:a:b ` parses as tag token `tag:a:b` with empty keyword.
- [ ] `tag:a:b & tag:c ` parses both tag tokens.
- [ ] `note:a:b` / `备注:a:b` remain keyword input until the user types a delimiter.
- [ ] Searching `tag:a:b ` sends backend tag filter `a:b` instead of falling back to unfiltered directory contents.
- [ ] `tag:a:b ` matches tags stored as `type = a`, `name = b` and plain tags named `a:b`.
- [ ] Clearing `tag:a:* ` or filename search restores the directory view without duplicate file rows/icons.
- [ ] Frontend build succeeds.
- [ ] Go build succeeds.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
