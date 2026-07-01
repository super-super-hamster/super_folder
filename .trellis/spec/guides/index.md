# Thinking Guides

> **Purpose**: Expand your thinking to catch things you might not have considered.

---

## Why Thinking Guides?

**Most bugs and tech debt come from "didn't think of that"**, not from lack of skill:

- Didn't think about what happens at layer boundaries → cross-layer bugs
- Didn't think about code patterns repeating → duplicated code everywhere
- Didn't think about edge cases → runtime errors
- Didn't think about future maintainers → unreadable code

These guides help you **ask the right questions before coding**.

---

## Available Guides

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | Identify patterns and reduce duplication | When you notice repeated patterns |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Think through data flow across layers | Features spanning multiple layers |
| [Requirements Clarification Guide](./requirements-clarification-guide.md) | Confirm unclear requirements before coding | When a requirement is ambiguous or a previous fix was rejected |

---

## Quick Reference: Thinking Triggers

### When to Stop and Ask for Clarification

- [ ] The user describes a visual issue without showing a reference or mock
- [ ] Multiple valid interpretations exist for the requirement
- [ ] The user rejects an implementation but has not stated the desired target state
- [ ] You find yourself guessing dimensions, colors, ratios, thresholds, or behavior
- [ ] A previous fix was rejected for being “not what I meant”

→ Read [Requirements Clarification Guide](./requirements-clarification-guide.md)

### When to Think About Cross-Layer Issues

- [ ] Feature touches 3+ layers (API, Service, Component, Database)
- [ ] Data format changes between layers
- [ ] Multiple consumers need the same data
- [ ] You're not sure where to put some logic
- [ ] You are adding an event kind, JSONL record, RPC payload, or config field
- [ ] UI / command code starts casting raw payload fields directly

→ Read [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md)

### When to Think About Code Reuse

- [ ] You're writing similar code to something that exists
- [ ] You see the same pattern repeated 3+ times
- [ ] You're adding a new field to multiple places
- [ ] **You're modifying any constant or config**
- [ ] **You're creating a new utility/helper function** ← Search first!
- [ ] Two files read the same untyped payload field with local casts
- [ ] Multiple branches update the same derived state from `kind` / `action`

→ Read [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md)

### When Verifying AI Cross-Review Results

- [ ] Reviewer claims "user input can be malicious" → Check the actual data source (internal manifest? user config? external API?)
- [ ] Reviewer flags "missing validation" → Is the data from a trusted internal source?
- [ ] Reviewer says "behavior change" → Read the code comments — is it intentional design?
- [ ] Reviewer identifies a "bug" in test → Mentally delete the feature being tested — does the test still pass? If yes → tautological test

### When to Reach for codebase-memory MCP

优先使用 codebase-memory MCP 的场景：

- [ ] 需要分析函数/模块的调用链路或影响面
- [ ] 需要理解模块架构、服务边界或跨层数据流
- [ ] 需要用自然语言查询不确定命名/拼写的函数、类、路由或变量
- [ ] 需要进行多条件组合查询（如某层 + 某数据字段 + 某种调用关系）
- [ ] 简单的 grep/glob 无法快速定位，或结果噪音太高

→ 先尝试 `search_graph` / `search_code` / `trace_path` / `query_graph` 等 codebase-memory 工具，再回退到手动 grep/glob。

**Common AI reviewer false-positive patterns**:
1. **Trust boundary confusion**: Treating internal data (bundled JSON manifests) as untrusted external input
2. **Ignoring design comments**: Flagging intentional behavior documented in code comments as bugs
3. **Variable misreading**: Not tracing a variable to its actual definition (e.g., Map keyed by path vs name)

**Verification rule**: Every CRITICAL/WARNING finding must be verified against the actual code before prioritizing. Budget ~35% false-positive rate for AI reviews.

---

## Pre-Modification Rule (CRITICAL)

> **Before changing ANY value, ALWAYS search first!**

```bash
# Search for the value you're about to change
grep -r "value_to_change" .
```

This single habit prevents most "forgot to update X" bugs.

---

## Commit Rule (CRITICAL)

> **Never commit changes without explicit user approval.**

- Do not run `git commit`, `git push`, create pull requests, or merge branches unless the user explicitly asks you to.
- After finishing work, stop and wait for the user to review. Present a concise summary of changes and ask whether to commit.
- This rule applies to all repositories, branches, and file types in this project.

This preserves user control over the codebase and prevents unintended changes from being persisted.

---

## How to Use This Directory

1. **Before coding**: Skim the relevant thinking guide
2. **During coding**: If something feels repetitive or complex, check the guides
3. **After bugs**: Add new insights to the relevant guide (learn from mistakes)

---

## Contributing

Found a new "didn't think of that" moment? Add it to the relevant guide.

---

**Core Principle**: 30 minutes of thinking saves 3 hours of debugging.
