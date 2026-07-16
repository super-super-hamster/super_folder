# Design

The parent task owns the material language and integration acceptance criteria. Implementation is split into two children so visual direction can be reviewed before broad migration.

The first child defines semantic Tailwind/CSS tokens, a local seamless paper texture, shared material utilities, typography, motion, and all main-workspace states. The second child migrates settings, previews, editors, feature pages, privacy surfaces, and progress feedback after approval.

The material system is frontend-only. It must not add runtime settings or alter backend/state contracts. Major surfaces use a fixed pseudo-element texture with pointer events disabled. Dense rows, inputs, media, code, and terminal content remain texture-free.

Rollback is child-scoped: the migration child does not start until the prototype is accepted, and semantic tokens keep visual changes centralized.
