# Implementation Plan

1. Generate, inspect, optimize, and save the seamless paper texture asset.
2. Add semantic palette, shadow, radius, font, and motion contracts.
3. Add shared desk/paper/raised/overlay material utilities and reduced-motion behavior.
4. Apply the system to the app shell and main panels without changing geometry.
5. Normalize file item, navigation, search, context-menu, and common modal interaction states.
6. Build the frontend and resolve type/style regressions.
7. Run browser checks for core interactions and capture review screenshots at the required viewports.

Rollback points: texture asset/utilities, shell surfaces, and interaction-state normalization remain separate edits so each can be reverted independently.
