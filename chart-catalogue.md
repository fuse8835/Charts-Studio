# Chart Catalogue

Master reference for the Fraser Institute climate chart video series. One entry per chart. Update this file whenever a chart is added, renamed, or its design/pacing is revised.

Design system (applies to all charts unless noted): dark navy background (~#032C4E), Bright Turquoise `#04FFBA` primary data color, Vivid Blue `#043FC5` secondary accent, Rajdhani font. Export: transparent background, transparent rounded corners, ProRes 4444 alpha `.mov` (`prores_ks`, `-pix_fmt yuva444p10le`, `-bits_per_mb 1222`, `-alpha_bits 8`), 1920x1200, 30fps, ~500-550MB per 8-13s clip. Two codec swaps (HEVC-with-alpha via `avconvert`, GoPro CineForm) were tried on 2026-08-21 and both failed real After Effects import despite passing every automated test. The actual fix (2026-08-24) was tuning ProRes 4444's own encoder settings instead — the hardware encoder (`prores_videotoolbox`) had been running at ~3x Apple's nominal ProRes 4444 rate, plus using unnecessarily high 16-bit alpha precision. An initial pass at `-bits_per_mb 200` introduced visible banding on smooth background gradients (missed by verification that only checked sharp text); 1222 — Apple's own nominal 4444 rate — is the lowest value confirmed clean. Same codec throughout, confirmed working transparency in a real After Effects import. See the `chart-hevc-alpha-encoding` memory for the full history.

**Pacing standard (locked 2026-08-25, established on 1A):** every chart's reveal should run slow enough to see each value populate and each grid line draw in individually — no instant/snap-in state changes. **Grid line draw direction is bottom-left-origin:** horizontal gridlines draw left-to-right (`x1` at the left edge), vertical gridlines draw bottom-to-top (`y1` at the baseline/bottom, `y2` at the top) — for an SVG `<line>`, draw direction always runs from `(x1,y1)` toward `(x2,y2)`, so this is set purely by which end is tagged x1/y1 vs x2/y2. Apply to all new charts and when revising existing ones with gridlines.

**Chart Studio:** [index.html](index.html) is a landing page listing every chart below with an "Open chart" link and a "Render .mov" button; the same render button also appears on each chart's own page next to Replay. Both call a local render server (`_render/server.js`, registered as the `chart-studio` launch config on port 8793) that runs the exact headless-Chrome-capture + ffmpeg-encode pipeline used throughout this project, streaming live progress ("Capturing frame X/Y...", "Encoding...") back to the button. Start it with `node _render/server.js` from this directory (or the `chart-studio` launch config), then visit `http://localhost:8793`. Chart files are named by catalogue ID (`1a-*`, `1b-*`, `2a-*`, `2b-*`) specifically so the landing page and file system stay in the same order as this catalogue — keep new charts' filenames prefixed the same way, and add an entry to `_render/charts.json` plus a `<script src="render-client.js" data-chart-id="...">` tag at the end of the file for the render button to work.

---

## Script 1

### 1A — Cooling Curve
- **Subject:** Worldwide climate-related mortality decline over the past century
- **Files:** [1a-cooling-curve.html](1a-cooling-curve.html) · [1a-cooling-curve-alpha.mov](1a-cooling-curve-alpha.mov) · [cooling-curve-style-guide.md](cooling-curve-style-guide.md)
- **Structure:** Two-act — Act 1 animated line chart (grid, axis, line-draw with leading dot); Act 2 hero-stat + progress-ring comparison
- **Data source:** Originally an approximate reading of a Fraser Institute reference image; corrected 2026-08-25 against a client-provided vector (`Asset 1.svg`) via gridline pixel calibration. Corrected decade values (dead/year avg): 1920: 485,000 · 1930: 446,000 (was 425,000) · 1940: 371,000 (was 345,000) · 1950: 210,000 · 1960: 169,000 (was 200,000) · 1970: 56,000 (was 175,000) · 1980: 67,000 (was 50,000) · 1990: 32,000 (was 66,000) · 2000: 24,000 (was 52,000) · 2010: 11,000 (was 24,000) · 2020: 13,000 (was 9,800). Act 2's ring percentage still rounds to 97% against the corrected data, no change needed. Its hero-stat number stays "10,000" (not 13,000) — that number is pinned to the narrator's spoken line in the actual voiceover script, not derived from the decade-average data, so it's intentionally decoupled from `DATA`'s 2020 value.
- **Status:** Design confirmed working. Pacing: title-first with reading pause, first dot animates alone before line draws, pause before Act 2 transition. Grid reveal is slow (visible value population + grid-line draw-in); vertical gridlines draw bottom-to-top, horizontal gridlines draw left-to-right — this is the reference build for the pacing/gridline-direction standard above.
- **Last revised:** 2026-08-25

### 1B — Canada Death Rate
- **Subject:** Canada's climate-related death rate per 1,000,000 population by decade, 1901–2020
- **Files:** [1b-canada-death-rate.html](1b-canada-death-rate.html) · [1b-canada-death-rate-alpha.mov](1b-canada-death-rate-alpha.mov)
- **Structure:** Single-act — animated bar chart, 12 decade bars, "Source: Public Safety Canada, 2025; Statista 2026" bottom-right (matching 2A/2B's `.source-note` style)
- **Data source:** `chart2.pdf` / `chart2.svg` (client-provided)
- **Headline:** "Climate-related deaths from storms, droughts, floods, and wildfires in Canada (1901-2020) are at their lowest level in decades" — wraps to 2 lines (`.headline` `max-width` raised from 78% to 88% after the "(1901-2020)" insert pushed it to 3 lines)
- **Y-axis label:** "Average annual deaths (per 1,000,000 pop.)" — note this is a large unit jump from the original "(per 1000 pop.)"; implemented exactly as requested (2026-08-21) but flagged in case "1,000,000" was meant to read "100,000" (a more common population-rate denominator) rather than an intentional 1000x change — the underlying bar data values were not rescaled, only the label text changed.
- **Status:** Delivered. Pacing: title-first with reading pause before axes/grid, first 2 bars + numbers animate in, pause, then remaining 10 bars.
- **Last revised:** 2026-08-18

---

## Script 2

### 2A — Heat vs. Cold Deaths by Region
- **Subject:** The Lancet's global finding that cold-related deaths vastly outnumber heat-related deaths in every world region (grouped bar chart — Northern America, Latin America, Europe, Africa, Asia, Oceania)
- **Files:** [2a-heat-cold-region.html](2a-heat-cold-region.html) · [2a-heat-cold-region-alpha.mov](2a-heat-cold-region-alpha.mov)
- **Structure:** Single-act — grouped bar chart, 6 regions x 2 series (Cold left / Heat right per group), legend, source footnote
- **Data source:** `Script Chart 2A.pdf` (client-provided vector) + reference PNG for title/legend/footer text not present in the PDF. Exact values extracted directly from the PDF's vector bar geometry (measured against its gridlines), not eyeballed — see values below.
- **Data values (deaths/year):** N. America: cold 173k / heat 32k · Latin America: cold 166k / heat 39k · Europe: cold 658k / heat 184k · Africa: cold 1,189k / heat 30k · Asia: cold 2,391k / heat 225k · Oceania: cold 25k / heat 9k — held internally in the `DATA` array only; **no numeric labels are rendered on the bars** (the source reference doesn't show them, so we don't either — bars communicate via height + the shared axis only).
- **New accent color:** Heat Deaths use `#E30063` (magenta-red, pulled from the PDF's own fill value) — the one intentional deviation from the 1A/1B palette, called out per Kevin's instruction. Cold Deaths stays `--mint-400` (#04FFBA), matching 1A/1B exactly. Note: the source reference's Asia bars use odd one-off teal/rust colors — not carried over; every region uses the same two series colors.
- **Status:** Delivered. Pacing: title + legend read alone first, pause, grid/axes settle, pause, then each region animates in as its own beat (cold bar, then heat bar 0.09s later) — Northern America, Latin America, and Europe overlap slightly with each other, then **pause**, Africa, **pause**, Asia, Oceania (no overlap on these three). Bar growth itself is slower with a pronounced ease-out (`--dur-bar: .65s`, `cubic-bezier(.16,1,.3,1)`). Per-region start times live in the `REGION_START` array in the source, specifically so they can be hand-edited to time-remap against narration.
- **Last revised:** 2026-08-18

### 2B — Cold vs. Heat Death Rate Trend
- **Subject:** Cold-death and heat-death rates as a percent of all deaths in the US & Canada, 2000-2019, shown as two trend lines each with a start-to-end delta annotation
- **Files:** [2b-cold-heat-trend.html](2b-cold-heat-trend.html) · [2b-cold-heat-trend-alpha.mov](2b-cold-heat-trend-alpha.mov)
- **Structure:** Single-act — dual-line chart (5 time periods: 2000-03 through 2016-19), title reads first (matching 1A/1B/2A), each line paired with a dashed reference line + measurement bracket + arrowhead + delta percentage, plus two large payoff text callouts, "Source: The Lancet, 2021" bottom-right. Headline text: "Deaths in the US and Canada Related to Cold and Heat Exposure, 2000-2019."
- **Data source:** `Script Chart 2B.pdf` (client-provided vector). Line-point values extracted from the PDF's vector path geometry (measured against its gridlines), then nudged by ~0.01-0.02 percentage points so each line's start-minus-end exactly matches the PDF's own printed delta text (0.78% / 0.28%) — those two numbers, and the "24,000 cold deaths" / "9,000 heat deaths" callout copy, are verbatim from the source. Note: the original PDF/reference actually printed "9,000 **cold** deaths" for the heat-deaths callout — a copy error in the source Kevin caught and had corrected (2026-08-19) to "9,000 heat deaths."
- **Data values (% of all deaths):** Cold deaths by period: 6.70, 6.34, 6.67, 5.96, 5.92. Heat deaths by period: 0.62, 0.68, 0.74, 0.74, 0.90.
- **Colors:** Cold deaths `--mint-400` (#04FFBA), Heat deaths `--heat-500` (#E30063) — same heat accent introduced in 2A, reused here as instructed ("colours should match the last one including what was used for heat deaths").
- **Status:** Delivered. Pacing: title reads alone first with a reading pause, then grid/axis settle, then heat line draws in with its delta bracket (arrow tip lands exactly on the curve's end point), pause, cold line draws in with its delta bracket, pause, "Higher temps cause / 9,000 heat deaths" (pink) text lands, pause, "Higher temps avoid / 24,000 cold deaths" (turquoise) text lands last. Line draws and all pop-ins use the same slower ease-out motion (`cubic-bezier(.16,1,.3,1)`) established for 2A's bars. Total runtime 12.5s.
- **Last revised:** 2026-08-18

---

---

## Script 3

### 3A — Globally Burned Area
- **Subject:** Share of Earth's land surface burned by wildfire each year, worldwide, 2000-2025
- **Files:** [3a-burned-area.html](3a-burned-area.html) · 3a-burned-area-alpha.mov (not yet rendered)
- **Structure:** Single-act — animated line chart (horizontal gridlines only), jagged data line (straight segments, not smoothed — matches the source's shape), a dashed linear-regression trend line that draws in *after* the data line, then two highlighted/circled data points (2022 low, 2025 latest) with value labels, "Source: NASA, 2026" bottom-right
- **Data source:** Client-provided vector files (`Essay 03-A.svg` / `.pdf`, from the shared Google Drive script folder). The SVG was far more useful than the PDF — real coordinates, directly parseable — so SVG-only was agreed as the format going forward. Values were reconstructed from the SVG's gridline pixel calibration (y-axis) and point-spacing pattern (x-axis/years); years 2000, 2008, and 2010 are absent from the source data. Cross-validated against the production script's own narrated figures (2022: 2.17%, 2025: 2.2% — both matched exactly), and the independently-computed regression trend line matched the source SVG's dashed trend line's start/end values closely, confirming it's a true least-squares fit, not a simple endpoint-to-endpoint line.
- **Choreography source:** the actual documentary script (`M1 Copy of #3 - Docu Script - Planet is Not Burning - Final.docx`) was provided and used directly for beat timing — main data line draws under "What's clear from the data...", the dashed trend line explicitly animates in *after* the main line ("Animate the dotted trend line in Chart #1"), then the 2022/2025 points get circled under the "lowest level... quite close" narration line.
- **Deviation called out and confirmed:** the client reference image uses a full forest-photo background and a Fraser Institute logo; Kevin confirmed to keep the series' standard navy-gradient background (transparent for compositing) and to omit the logo, matching every other chart in the series.
- **Status:** Delivered. Trend line uses a clip-rect wipe reveal (not stroke-dashoffset) so it can keep a genuine dot pattern; both the 2022/2025 value labels sit below their circles.
- **Last revised:** 2026-08-25

### 3B — Burned Area by Region
- **Subject:** Annual burned land area by world region, 2001-2025 — North America, Europe, South America, Oceania, Africa, Asia
- **Files:** [3b-burned-area-by-region.html](3b-burned-area-by-region.html) · 3b-burned-area-by-region-alpha.mov (not yet rendered)
- **Structure:** Six sequential full-frame scenes in one file, each its own bar chart (25 yearly bars, region-specific axis scale/gridlines, a live least-squares regression trend line matching 3A's dotted-line technique) — North America first, then Europe/South America/Oceania (order arbitrary), then Africa, then Asia, per Kevin's explicit ordering requirement. Each scene builds in (~1.4s: grid → axis labels → bars → trend line), holds (~2.1s pause for review/time-remapping), then hard-cuts to the next region's empty axes. `SCENE_WINDOW` (3.9s, in the source) controls the per-scene pacing uniformly — meant to be quick, since Kevin plans to time-remap this in post rather than have exact pacing baked in.
- **Data source:** Six client-provided vector SVGs (`Assets 1-6, 3rd Script`, from the FRASER BACKUP volume) — one bar-chart-with-trend-line per region, each with its own y-axis scale (e.g. Africa to 3,500,000; Europe to 140,000). Values parsed programmatically from each SVG's bar-rect path data (`M x,y h w v h`) against its own gridline calibration, rounded to the nearest 1,000. Cross-checked against the production script's narration ("Africa and Asia... recorded exceptionally low burned areas in 2025" — both regions' 2025 values sit near the low end of their series).
- **Choreography source:** the same docx as 3A. The script's literal beats are more layered than what's built here (North America alone → "introduce the other five" as a group into a small-multiples grid → Africa/Asia individually highlighted within it) — Kevin explicitly chose the simpler "6 full-screen charts one at a time" structure instead after seeing that discrepancy pointed out.
- **Deviation called out and confirmed:** the source SVGs use default Excel-style colors (blue bars, gray gridlines, red dotted trend); Kevin confirmed to match the series' established look instead (navy bg, mint bars, white dotted trend, Rajdhani) — the SVGs are data sources only. Y-axis units are each region's raw absolute values (not converted to "thousands" like Kevin's own comparison mockup).
- **Status:** Built and verified in live preview (all 6 scenes checked, transitions confirmed clean); not yet rendered to video.
- **Last revised:** 2026-08-26

## Template for new entries

```
### [ID] — [Name]
- **Subject:**
- **Files:**
- **Structure:**
- **Data source:**
- **Status:**
- **Last revised:**
```
