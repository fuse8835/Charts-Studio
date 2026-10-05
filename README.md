# Charts Studio

Animated data-viz charts for the Fraser Institute climate-mortality video series. Each chart is a single self-contained HTML file — CSS custom properties drive the timing, native CSS/Web Animations do the motion (no `requestAnimationFrame`), so every animation is individually seekable for deterministic frame capture.

See [chart-catalogue.md](chart-catalogue.md) for the full list of charts, their data sources, and design notes.

## Design reference

**All future charts and explainers must use the [Style Sampler](style-sampler.html) and [written style reference](style-sampler-guide.md) as the default design standard**, approved by Kevin on October 5, 2026. Open the sampler through the local Charts Studio menu to compare chart types, colours, fills, edges, shadows and textures.

The standard extends Chart 8A’s visual language to bars, lines, areas, points, distributions, composition charts and annotations. Read the applicable recipe before starting a build. Preserve truthful data encoding: reduce decorative effects where they impair readability. For a chart type not illustrated, apply the shared rules and the guide’s extension guidance.

This reference supersedes conflicting visual rules in the older [Cooling Curve guide](cooling-curve-style-guide.md). Explicit user directions take precedence. Existing charts are not automatically restyled; apply the standard to new builds and requested restyles. See [AGENTS.md](AGENTS.md) for contributor instructions.

**Client continuity:** The first five charts already seen by the client are the visual baseline. Mint (#04FFBA) and ocean (#07669E) are the main colours, with mint as the major highlight and ocean supporting it. Use 8A’s gradients, shadows and waves as refinements to that identity. Gold orange is a secondary accent, not the default highlight. Preserve approved energy-category colours and existing chart designs unless explicitly asked to change them.

## Running it

Open Terminal in the project folder first. For the Desktop checkout on Kevin’s Mac:

```bash
cd ~/Desktop/Charts-Studio
npm install --prefix _render
node _render/server.js
```

Then open **http://localhost:8793**. The landing page lists every chart with an "Open chart" link and a "Render .mov" button; the same render button also lives inside each chart's own page next to Replay.

## Rendering a video

Clicking "Render .mov" runs a headless-Chrome capture (deterministically seeking each frame via `document.getAnimations()`) and encodes the result to ProRes 4444 with an alpha channel via `ffmpeg`. Requirements on the machine running the server:

- Node.js
- Google Chrome installed (Playwright drives your real local Chrome via `channel: 'chrome'`, no separate browser download)
- `ffmpeg` with the `prores_videotoolbox` encoder (macOS only) — swap the encoder in `_render/server.js` if you're on another platform

Rendered `.mov` files are **not** committed to this repo (they're multi-hundred-MB to multi-GB alpha-channel exports) — they're always written to `~/Desktop/Charts-Studio` (`/Users/kevincave/Desktop/Charts-Studio` on Kevin's Mac), regardless of which checkout runs the server. The folder is created if needed, and the completion message shows the full file path. Restart an already-running render server after updating to pick up this destination. Regenerate them locally via the button above.

Two smaller alternatives were tried (HEVC-with-alpha via Apple's `avconvert`, GoPro CineForm via ffmpeg's `cfhd` encoder) and both failed real Adobe After Effects import despite passing every automated test available, including AVFoundation-level verification (QuickLook thumbnails, a full ProRes round-trip). ProRes 4444 remains the only format verified to reliably preserve alpha across every tool this pipeline needs to feed, including AE specifically.

## Adding a new chart

1. Read the [style reference](style-sampler-guide.md), choose the relevant [sampler](style-sampler.html) recipe, then build the chart as a new `.html` file following the existing files' structure (CSS timing vars in `:root`, a `<g>`-based SVG chart, the review/timeline panel markup, a `replayBtn`).
2. Add an entry to `_render/charts.json` (`id`, `name`, `subtitle`, `html`, `mov`, `duration` in seconds).
3. Add `<script src="render-client.js" data-chart-id="..."></script>` at the end of the file to get a working "Render .mov" button on that chart's own page.
4. It'll show up automatically on the landing page.
