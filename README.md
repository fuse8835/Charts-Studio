# Charts Studio

Animated data-viz charts for the Fraser Institute climate-mortality video series. Each chart is a single self-contained HTML file — CSS custom properties drive the timing, native CSS/Web Animations do the motion (no `requestAnimationFrame`), so every animation is individually seekable for deterministic frame capture.

See [chart-catalogue.md](chart-catalogue.md) for the full list of charts, their data sources, and design notes.

## Running it

```bash
npm install --prefix _render
node _render/server.js
```

Then open **http://localhost:8793**. The landing page lists every chart with an "Open chart" link and a "Render .mov" button; the same render button also lives inside each chart's own page next to Replay.

## Rendering a video

Clicking "Render .mov" runs a headless-Chrome capture (deterministically seeking each frame via `document.getAnimations()`) and encodes the result to HEVC with an alpha channel via `ffmpeg` (`hevc_videotoolbox`, tagged `hvc1` so QuickTime/Premiere/After Effects read it correctly). Requirements on the machine running the server:

- Node.js
- Google Chrome installed (Playwright drives your real local Chrome via `channel: 'chrome'`, no separate browser download)
- `ffmpeg` with the `hevc_videotoolbox` encoder (macOS only) — swap the encoder in `_render/server.js` if you're on another platform

HEVC-with-alpha needs Premiere 2020+ or After Effects with the Apple HEVC decoder to import (standard on macOS, occasionally missing on Windows). It produces roughly 1/100th the file size of the ProRes 4444 this pipeline used originally, at visually indistinguishable quality — verified by pixel-diffing a ProRes export against an HEVC one frame-for-frame.

Rendered `.mov` files are **not** committed to this repo — they're written straight to the project root and are gitignored. Regenerate them locally via the button above.

## Adding a new chart

1. Build the chart as a new `.html` file following the existing files' structure (CSS timing vars in `:root`, a `<g>`-based SVG chart, the review/timeline panel markup, a `replayBtn`).
2. Add an entry to `_render/charts.json` (`id`, `name`, `subtitle`, `html`, `mov`, `duration` in seconds).
3. Add `<script src="render-client.js" data-chart-id="..."></script>` at the end of the file to get a working "Render .mov" button on that chart's own page.
4. It'll show up automatically on the landing page.
