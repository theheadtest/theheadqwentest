# Idea Lab agent notes

_Last updated: 2026-06-01._

## Main idea

Idea Lab is a dependency-free, static browser playground for procedural generators, simulations, and small game/worldbuilding tools. The homepage (`index.html`) acts as a catalog and roadmap: live experiments open as standalone pages under `projects/`, while planned ideas remain visible as backlog cards until implemented.

## What has already been done

- The homepage provides search, category tabs, status filtering, sorting, live/roadmap counts, a daily spotlight, and random live-project navigation.
- Existing completed projects cover terrain comparison, planet generation, voxel dioramas, solar systems, nebula art, heraldry, ecosystem simulations, map/city/dungeon tools, FreeGuessr Lite, and the World Bath demo plan.
- This pass promoted four roadmap ideas to live standalone pages:
  - `projects/pathfinding-visualizer.html` compares A\*, Dijkstra, BFS, and greedy search with seeded obstacle/terrain maps, step/run controls, stats, and logs.
  - `projects/board-game-map-generator.html` creates seeded hex-board layouts with resource types, player starts, objectives, fairness notes, PNG export, and logs.
  - `projects/ancient-ruin-cave-painting-generator.html` renders cave-wall textures, symbols, weathering cracks, lore interpretations, PNG export, and logs.
  - `projects/constellation-myth-generator.html` renders star charts, constellation links, seasonal visibility, culture-flavored myths, PNG export, and logs.

## What still needs to be done

High-value remaining roadmap candidates include:

- Biome Evolution Timeline: animate climate and sea-level changes over time.
- Civilization Spread Simulator: model borders, capitals, trade, conflict, and collapses over terrain.
- Watershed & River Basin Lab: simulate rainfall, flow accumulation, erosion, lakes, deltas, and floods.
- Planetary Colony Planner: landing sites, colony modules, power/oxygen/water budgets, hazards, and mission reports.
- Ant Colony Simulator: pheromone trail agents over paintable nests, food, and obstacles.
- Weather System Sandbox: wind, pressure, clouds, rain shadows, storms, seasons, and snowlines.
- Castle & Fortress Generator, Village Life Simulator, Creature Evolution Sandbox, Spaceship Interior Generator, Procedural Language Lab, Procedural Music & Ambience, Terrain Brush Playground, Cellular Automata Zoo, Disease/Rumor Spread Simulator, Trade Route Generator, Seed Explorer, Fire & Disaster Simulator, Material & Texture Lab, Underwater Reef Simulator, Living Planet Simulator, and others still listed as planned on the homepage.

## Technical implementation notes

- Keep projects static and GitHub Pages friendly: plain HTML, CSS, and JavaScript; no build step is currently required.
- The established project style is a dark glassmorphism layout with a back link, large header, sticky controls, canvas/output panel, stat cards, chips, and an in-page event log.
- Prefer deterministic seed helpers for generators so URLs/features can later become shareable.
- Add both `console.log(...)` diagnostics and visible in-page logs for user-facing traceability.
- Canvas-heavy projects should expose export buttons when the output is visual.
- When promoting a planned project, update its object in `index.html` with `href`, `status: "live"`, and a `featured` score so the catalog, counts, spotlight, random-project button, and roadmap stay consistent.
- The homepage render logic currently shows only the first 12 planned projects in the roadmap section; the full backlog remains searchable/filterable in the main catalog.

## General style notes for future agents

- Keep each standalone project self-contained unless a shared asset pipeline is intentionally introduced.
- Match the accessible-control pattern: labels for inputs, semantic buttons, readable stat summaries, and text equivalents in logs/notes.
- Avoid overengineering: the repo is currently optimized for quick creative iteration rather than framework architecture.
- If adding complex simulations, consider a small reusable utility file only after two or more pages need the exact same helper.
