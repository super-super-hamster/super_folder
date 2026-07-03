# Fix tag search values containing colon

## Goal

Searching for tag values that contain a colon, such as tag:a:b, currently behaves like no search filter and shows unfiltered file panel contents.

## Requirements

- Searching `tag:<value>` must treat the token as a tag filter when the token is at the end of the search string.
- Tag values may contain additional colons, e.g. `tag:a:b` should search for tag name `a:b`.
- Existing tag, Chinese tag prefix, note/remark prefix, `&` separators, and keyword behavior must keep working.
- The fix should stay in the frontend query parser unless backend behavior is proven to be the cause.

## Acceptance Criteria

- [ ] `tag:a:b` parses as tag token `tag:a:b` with empty keyword.
- [ ] `tag:a:b ` parses as tag token `tag:a:b` with empty keyword.
- [ ] `tag:a:b & tag:c` parses both tag tokens.
- [ ] `note:a:b` / `备注:a:b` parse as remark tokens when they end the input.
- [ ] Searching `tag:a:b` sends backend tag filter `a:b` instead of falling back to unfiltered directory contents.
- [ ] Frontend build succeeds.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
