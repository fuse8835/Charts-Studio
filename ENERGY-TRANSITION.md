# The energy transition

`energy-transition.html` is a self-contained animated SVG explainer using the series' embedded Rajdhani font and navy/mint palette. It combines a centered title with two rounded, softly shaded source panels and a central arrow.

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

All motion is built at load time with native Web Animations and a shared start time. The existing renderer can pause and seek every animation via `document.getAnimations()`. There are no frame-driven animation callbacks, external assets, or new production dependencies. Export is registered at 1920×1200 for the existing ProRes 4444 `.mov` workflow.

## Validation

Run `node --test test/energy-transition.test.cjs` for sequencing and catalogue integration checks. Inline JavaScript also passes `node --check`.

Browser preview was blocked by the environment's browser security check during authoring. Visual playback, frame capture and an actual `.mov` export still require verification; these checks are not represented as complete.
