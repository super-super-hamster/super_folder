# Search Query Parsing Guidelines

---

## Token Boundaries

Search filter tokens are recognized only when the prefix starts at the beginning of the input, after whitespace, or after `&`. Do not match prefixes embedded inside normal keywords.

```ts
// Good: parsed as a tag token after the shown trailing space delimiter
"tag:a:b "
"foo tag:a:b "
"tag:a:b & tag:c "

// Good: remains a plain keyword, not a tag token
notag:a:b
```

The parser must not accept end-of-input as a valid token boundary. A trailing whitespace delimiter or `&` is required before a typed prefix becomes an active filter token; this prevents `tag:a` from turning into a chip while the user is still typing.

```ts
const regex = /(^|[\s&])(tag|标签|备注|note):([^\s&]+)(?=\s|&)/gi
```

---

## Colon Values

Tag and remark values may contain additional colons. Split only the first prefix separator when sending filters to the backend.

```ts
// Input token
tag:a:b

// Backend filter value
a:b
```

Do not use a regex that stops token values at the second colon. Values end at whitespace or `&`, and only become active tokens after one of those delimiters is typed.

For tag filters, the backend must treat `a:b` as both:

- a plain tag name `a:b`
- a typed tag with `type = a` and `name = b`

This matches how the UI displays typed tags while still supporting plain tag names that contain colons.
