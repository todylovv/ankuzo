# ANKUZO Continuous Experience — Design QA

Source visual truth: `C:\Users\tsikl\.codex\attachments\1abe8e26-4412-45de-9438-0cf0defb4a03\pasted-text.txt`

Implementation: `http://localhost:3000/`

Target viewports: 1920 × 1080, 1440 × 900, 390 × 844, 430 × 932.

Review states:

- `portal / pristine`
- `portal / stress`
- `portal / cracks`
- `portal / fracture`
- `portal / breakthrough`
- `library / arrival`
- `library / active`
- `platforms / split`
- `platforms / merge`
- `online / active`
- `build / active`
- `final / 22`

## Evidence

Source dimensions: written art-direction brief; no single raster mockup was provided for the extended journey.

Implementation screenshot path: unavailable. The in-app browser control connection could not initialize, and no alternate browser was opened because the user asked to avoid additional browser windows/tabs.

CSS viewport and density normalization: not available without a browser-rendered capture.

Full-view comparison evidence: blocked by missing implementation screenshots.

Focused-region comparison evidence: blocked by missing implementation screenshots.

Primary interaction checks: server routes, master progress source, wheel/touch prevention, keyboard controls, chapter navigation, reduced-motion mode, and direct review-state URLs were verified from implementation and automated tests. Browser interaction and console inspection remain unverified.

## Findings

- [P1] Rendered composition cannot be visually approved yet.
  Location: all desktop and mobile review states.
  Evidence: every review URL responds successfully, but no browser-rendered screenshot is available for comparison.
  Impact: chrome reflections, media crop, focal hierarchy, negative space, and mobile framing cannot be honestly approved from code alone.
  Fix: manually inspect the prepared review states in the existing in-app tab, then capture or annotate any state that needs adjustment.

## Open Questions

- Final game artwork is intentionally provisional. The current `library-atlas.webp` is used as a replaceable source until the user supplies the next asset set.

## Implementation Checklist

- Inspect all nine review states at 1440 × 900.
- Inspect portal, Library arrival, Online, Build, and final 22 at 390 × 844.
- Check polished chrome highlight balance and fracture interiors.
- Check that media crops remain intentional through portrait-to-display transformation.
- Check that chapter typography stays peripheral and never competes with the focal media surface.
- Check complete forward and reverse wheel/touch behavior.

## Follow-up Polish

- Replace provisional atlas crops when final game media is available.
- Tune camera and plane coordinates from the rendered compositions rather than numeric assumptions.

final result: blocked
