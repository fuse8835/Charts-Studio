# The energy transition

`energy-transition.html` is a animated SVG explainer using the series' embedded Rajdhani font and navy/mint palette. It combines a centered title with two rounded, softly shaded source panels and a central arrow.

## Sequence

- 0–3.5s: oil, gas and coal reveal sequentially across the frame.
- 3.5–5.2s: the three sources compress into the left panel as its width contracts.
- 4.5–5.95s: the renewable panel opens; the central arrow appears and draws.
- 6.1–7.8s: wind, then solar, appear in the right panel.
- 8–11.2s: fossil sources soften without losing their shaded forms; renewable fills build and the turbine rotates.
- 11.2–12s: the completed composition holds. The existing exporter adds its normal one-second final hold.

This illustrates the replacement idea described by the narration; it is not a measured energy mix, forecast, or claim about the historical rate of replacement. No quantities or dates are displayed.

## Preview and export

Start the existing server with `node _render/server.js`, then open `/energy-transition.html` or select **The energy transition** from `/explainers.html`.

The timeline supports keyboard scrubbing, play/pause, replay and scene shortcuts. Reduced-motion users see the final frame initially and can explicitly play the sequence. Review controls are excluded from `?export` captures.

All motion is built at load time with native Web Animations and a shared start time. The existing renderer can pause and seek every animation via `document.getAnimations()`. Motion is native and seekable; small UI timers only update controls. Styling and annotation helpers are local files, with no new production dependencies. Export is registered at 1920×1200 for the existing ProRes 4444 `.mov` workflow.

## Validation

Run `node --test test/energy-transition.test.cjs` for sequencing and catalogue integration checks. Inline JavaScript also passes `node --check`.

Browser preview was blocked by the environment's browser security check during authoring. Visual playback, frame capture and an actual `.mov` export still require verification; these checks are not represented as complete.

## Five visual treatments

The selector below the frame offers Original, Satin, Copper & jade, Glass and Obsidian gold. Each uses the same choreography, with progressively richer surface materials, edge lighting, inset borders and object bases. No background imagery or decorative data is added. Icons are smaller throughout, especially the turbine.

The selection is encoded in `?variant=1` through `?variant=5`, survives a reload and preserves the current playhead when changed. The MOV button reads that selection and exports `energy-transition-vN-alpha.mov`. The catalogue's default Render button keeps the original filename and treatment.

Pumpjack and turbine loops run from time zero on the shared native timeline, including the final export hold (`continuousHold`). Pause, scrubbing and reduced-motion mode also pause those loops. During ordinary playback the machines continue moving after the main reveal settles.

The shared Render MOV and Ruler tools now appear below the video frame. Review & annotate is adapted from the battery explainer: numbered pins, timestamps, text notes, deletion and copy feedback. Notes include the treatment number and clicking a note restores its treatment and time. Notes remain in the current page session. All selectors, tools and review pins are hidden from export.

Validation: `node --test test/*.test.cjs` passes ten checks covering sequence timing, continuous motion, review hooks, catalogue integration and safe per-treatment output selection. Browser security still blocks visual inspection and an actual render has not been performed.

## Rebuilt compositions

The five previous surface-only treatments have been replaced with independent SVG architectures and per-design choreography:

1. Modular — asymmetric floating source tiles and a right-hand renewable gallery.
2. Orbital — fossil satellite cards surrounding a central circular renewable lens.
3. Glass cascade — three tall overlapping glass panes stepping diagonally through depth.
4. Architectural — an elevated polygonal stage, inset fossil bays and a raised renewable gallery.
5. Aurum — an obsidian housing with recessed fossil wells and gold renewable rings.

`energy-layouts.js` owns independent title positions, opening and settled source positions, scales and arrow positions. Switching designs reconstructs the native animation tracks at the current playhead; review pins and export selection retain their existing treatment numbers. The icons, controls and narrative are shared, while the composition and source movement change for each option. Every design is drawn in HTML/SVG/CSS without generated background imagery.
