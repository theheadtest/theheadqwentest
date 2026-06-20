# Procedural Galaxy Explorer development notes

## Purpose

`galaxy-explorer.html` unifies the earlier space projects into a single static GitHub Pages-friendly experience:

1. Generate a seeded, gently rotating spiral galaxy.
2. Click one of 100 active catalog stars to generate its named solar system.
3. Click the central star, planets, or satellites to generate a stable visual portrait.

The implementation intentionally uses plain HTML, CSS, and JavaScript with no build step.

## Files

- `galaxy-explorer.html` — page structure, controls, canvas, metrics, cards, and log panel.
- `galaxy-explorer.css` — dark glassmorphism styling aligned with the existing Idea Lab projects.
- `galaxy-explorer.js` — generation, rendering, navigation, hit testing, caching, and logs.

## Generation model

All major objects use hierarchical seed-derived generation. The galaxy seed creates active stars; active star seeds create systems; body seeds create body portraits. This means cache misses should still reproduce the same result.

Default object counts:

- 2,000 decorative galaxy stars.
- 100 active, deterministically named catalog stars.
- 4–9 generated planets per system.
- Satellites are first-class objects for click handling, system rendering, body generation, and planet-view orbit overlays.

## Session cache

The runtime cache is stored in memory inside `app.cache`:

- `systems` caches generated solar systems by active star ID.
- `bodies` caches generated body render states by body ID and render size.

The cache is intentionally session-only. If future work needs reload-surviving state, prefer storing lightweight descriptors in `sessionStorage` instead of serializing canvas pixel data.

## Views

The app has three main modes:

- `galaxy` — spiral galaxy and active catalog stars. The map can rotate gently around the canvas center, and catalog star names can be toggled on for easier navigation.
- `system` — selected star system with animated planets and satellites.
- `body` — portrait renderer for a selected star, planet, or satellite. When viewing a planet with satellites, the body view also draws the planet's moons in orbit around the portrait.

Canvas click handling uses the current frame's `app.hit` array. Any future interactive object should add a hit target while drawing. If a view visually transforms objects, such as the rotating galaxy map, hit targets should be pushed with the transformed screen coordinates.

## Body rendering

Planet and satellite portraits use a compact sphere renderer inspired by `planet-generator.html`: screen pixels map to a rotating sphere, sample seeded 3D noise, then receive simple lighting and optional clouds.

Stars use a separate generator path rather than planet terrain materials. The star path renders self-emissive plasma-like noise, class-specific colors, and stronger glow.

Planet body views render satellite orbit overlays after the main portrait. These overlays respect the existing system labels and satellite visibility toggles, and their moon hit targets allow drilling into satellite portraits directly from planet view.

## Future improvements

- Add URL parameters for the galaxy seed and selected object path.
- Add hover state and keyboard navigation for active stars/body cards.
- Add richer thumbnails in cards using small offscreen renders.
- Improve galaxy rendering with explicit dust-lane curves and central bulge particles.
- Split `galaxy-explorer.js` into small modules if more pages begin reusing the utilities.
- Consider a spatial grid for hit testing if active star count grows significantly.
