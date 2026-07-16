# Design

Define the palette and surface hierarchy in Tailwind configuration and global CSS. Major surfaces receive semantic classes rather than repeated one-off color/shadow declarations. Texture is implemented as an inherited-radius pseudo-element positioned above the surface background and below interactive content.

Palette: desk `#D7D9D4`, paper `#FFF6D7`, muted paper `#FBF2D8`, edge `#E4DAC0`, hover `#F1E2B4`, selected `#E4CE91`, ink `#272923`, muted ink `#686B64`, accent `#416B57`, danger `#A84E45`.

Major surfaces use 8px radii. Controls use 6px radii. Resting paper shadow is `1px 2px 2px rgba(45,42,35,.10), 3px 5px 12px rgba(45,42,35,.06)`. Raised overlays use `2px 4px 8px rgba(45,42,35,.12), 8px 16px 32px rgba(45,42,35,.14)`.

Interactions use color and shadow transitions without layout-affecting border changes. Hover uses a light warm-yellow background and selected uses a deeper warm-yellow background with graphite text. Selected file items retain the selected background while hovered. Active controls translate down by 1px. Reduced-motion mode removes translations and transforms. The virtualized file list keeps its exact existing heights and widths.
