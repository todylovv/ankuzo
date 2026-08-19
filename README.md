# ankuzo — personal interactive site

Personal gaming / tech / internet identity site built as a cinematic single-page experience.

## Structure

- `index.html` — the complete interactive site
- `assets/22.webp` — hero identity object
- `assets/steam-world.webp` — PC / Steam-inspired gaming world
- `assets/ps-world.webp` — console / PlayStation-inspired world
- `assets/exploded-tech.webp` — gaming hardware exploded view
- `assets/make-world.webp` — development / making scene
- `assets/cache-world.webp` — personal internet archive scene
- `AGENTS.md` — design and implementation guidance for Codex

## Run locally

No build step is required.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

You can also open `index.html` directly, but a local HTTP server is recommended while editing.

## Direction

The site is intentionally not a conventional portfolio. It should feel like one continuous authored experience moving through identity → PC gaming → console gaming → hardware → things being made → internet archive → identity again.
