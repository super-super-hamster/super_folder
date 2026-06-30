# Requirements Clarification Guide

> **Purpose**: Avoid building the wrong thing by confirming requirements before writing code.

---

## Core Rule

**If a requirement is ambiguous, do not write code. Clarify first.**

Writing code based on assumptions leads to:

- Wasted implementation effort
- Reverts and rework
- Features that miss the user's actual intent
- Friction in review and demo

---

## When to Stop and Ask

Stop implementation and ask the user when you encounter any of the following:

- [ ] The user describes a visual issue without showing a reference or mock (e.g. “太细了”, “不好看”)
- [ ] Multiple valid interpretations exist for the requirement
- [ ] The user rejects an implementation but has not stated the desired target state
- [ ] You find yourself guessing dimensions, colors, ratios, thresholds, or behavior
- [ ] A previous fix was rejected for being “not what I meant”

---

## Clarification Checklist

Before writing or changing code, confirm the concrete details:

1. **What is the exact target?**
   - Provide measurements, proportions, colors, or a reference image when relevant.
2. **What is wrong with the current state?**
   - Separate “looks bad” from specific defects (size, ratio, alignment, color, spacing).
3. **Are there edge cases?**
   - Empty state, max length, error state, different screen sizes, etc.
4. **Is there a preferred approach?**
   - Library component vs custom, icon vs text, backend vs frontend filtering.
5. **Who is the final arbiter?**
   - Confirm the user will review the visual/interaction outcome before further code is written.

---

## What NOT to Do

### Don't

- Guess visual proportions, icon shapes, colors, or spacing.
- Commit a speculative fix and hope it matches.
- Refactor unrelated code while the requirement is still unclear.
- Assume “make it bigger/nicer/cleaner” has a single obvious interpretation.

### Do

- Ask targeted questions with examples or options.
- Request screenshots, sketches, or references when visual design is involved.
- State your understanding back to the user for confirmation.
- Only write code after the user has approved the proposed direction.

---

## Example

**User says**: “这个图标还是不对。”

**Wrong response**: Immediately tweak SVG paths and commit.

**Right response**: Ask follow-up questions:

- 你期望的图标比例是什么？（正方形、横图、竖图）
- 描边还是填充？
- 在 24×24 的图标里，图形占多大？
- 有没有参考图或现有组件可以对照？

Wait for answers, then implement.

---

## Relationship to Other Guides

- [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) — reuse patterns, but only after you know what to build
- [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) — think through data flow, but only after the feature shape is clear

---

**Core Principle**: Clarifying takes minutes; reworking takes hours.
