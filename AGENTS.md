# AGENTS.md — ANKUZО / 22 personal site

## Product intent

This repository is a personal interactive website for Aleksandr. It is not a SaaS UI, dashboard, operating-system parody, hacker terminal, resume template, or conventional portfolio.

The goal is an Awwwards/SOTD-level authored web experience that expresses gaming, technology, making things, and internet culture through art direction, motion, spatial composition, and interaction rather than explanatory sections.

## Core narrative

Keep the experience roughly in this order:

1. `22` — identity / entry object
2. PC gaming — Steam-inspired library world without copying Steam UI
3. Console gaming — PlayStation-inspired cinematic world without copying PlayStation UI
4. Exploded gaming hardware — tactile bridge between play and making
5. MAKE — code, AI, experiments, projects
6. CACHE — streams, media, screenshots, internet fragments, personal archive
7. `22` — return / loop

Avoid sections named About, Skills, Projects, My Setup, Games I Play, Contact, etc. If semantic labels are needed internally, keep them subtle and editorial.

## Visual language

- Base palette: black, graphite, off-white, chrome, smoked glass.
- One restrained signal accent is allowed; avoid RGB rainbow styling.
- Materials: polished chrome, matte black ABS, glass, translucent acrylic, soft industrial reflections.
- Typography: very large editorial display type paired with tiny technical metadata.
- Composition should use asymmetry, depth, masking, cropping, and negative space.
- Do not default to cards, rounded dashboard panels, neon cyberpunk grids, Matrix green, HUD clutter, or generic developer visuals.

## Motion and interaction

- Treat the page as connected scenes, not stacked sections.
- Transitions should transform one scene into the next through scale, masks, depth, brightness, blur, or object motion.
- Cursor interaction should be subtle and purposeful.
- Prefer scroll-linked cinematic motion, inertia, parallax, and layered depth.
- When adding WebGL/Three.js, make it materially improve the scene instead of using it as decoration.
- Respect `prefers-reduced-motion` and keep mobile usable.

## Gaming direction

Gaming should be presented through platforms and personal gaming culture, not by centering the whole site on one title.

PC / Steam-inspired scene:
- darker, denser, desktop/industrial feel
- library/archive metaphor
- personal statistics or game history may appear as small metadata

Console / PlayStation-inspired scene:
- brighter, spatial, cinematic feel
- soft light, glass, controller symbolism
- may use triangle/circle/cross/square as generic controller glyphs, but do not reproduce Sony UI or logos

## Assets

Generated visual assets live in `assets/` as optimized WebP files. Keep the project self-contained unless there is a clear reason to introduce an asset pipeline. Preserve the common chrome / black ABS / smoked-glass material language when replacing or adding assets.

Optimize imagery for the web. Prefer WebP/AVIF where practical and avoid shipping multi-megabyte hero assets unnecessarily.

## Code expectations

Current implementation is intentionally dependency-free and lives in `index.html`.

When making small iterations, preserve the zero-build setup.

If the site evolves into substantial WebGL, complex scene orchestration, reusable components, or multiple routes, migration to Vite + TypeScript is acceptable. Do not introduce a framework only for organization.

Keep:
- semantic HTML where possible
- responsive layout
- accessible labels for interactive controls
- fast first render
- local assets with no fragile hotlinks

## What “better” means

Prioritize, in order:

1. stronger art direction
2. better scene-to-scene transitions
3. personal specificity
4. interaction quality
5. performance
6. additional content

Do not improve the project by merely adding more text, more cards, more glow, or more UI chrome.
