# Search Query Parsing Guidelines

---

## Token Boundaries

Search filter tokens are recognized only when the prefix starts at the beginning of the input, after whitespace, or after `&`. Do not match prefixes embedded inside normal keywords.

```ts
// Good: parsed as a tag token
tag:a:b
foo tag:a:b
tag:a:b & tag:c

// Good: remains a plain keyword, not a tag token
notag:a:b
```

The parser must also accept end-of-input as a valid token boundary. A trailing space is optional.

```ts
const regex = /(^|[\s&])(tag|标签|备注|note):([^\s&]+)(?=\s|&|$)/gi
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

Do not use a regex that stops token values at the second colon. Values end at whitespace, `&`, or input end.
