# Chart Studio — 8A-inspired style sampler

Approved by Kevin on October 5, 2026 as the default style reference for all future Charts Studio charts and explainers. Read this guide and inspect the corresponding example in [the visual sampler](style-sampler.html) before each new build or requested restyle. Explicit user instructions take precedence; this guide supersedes conflicting visual rules in older references. Existing production charts are not automatically restyled. Examples use illustrative data, not research findings.

## Client continuity and colour hierarchy

The first five charts already seen by the client establish the visual identity. Keep future builds recognisably consistent with them. Chart 8A contributes gradient depth, thin edges, shadows and restrained texture; it is not a replacement brand palette.

- **Mint #04FFBA:** main highlight colour and primary emphasis.
- **Ocean #07669E:** main supporting colour for ordinary series, fills and comparisons.
- **Gold orange #FFB21C:** secondary accent when warranted by the story or explicitly requested; never the default highlight.
- Preserve approved energy-category mappings in existing charts. Do not recolour them merely to enforce a two-colour palette.

## Shared treatment

- Canvas: 1200 × 750 (16:10); production export 1920 × 1200. Content inset approximately 6%.
- Background: #071B2C → #05131F → #01060C with a restrained blue/mint vignette.
- Type: Rajdhani 700 for headlines, 600 for labels, 500 for axes. Primary text #F8FBFF / #EEF3FA, secondary #A9C2D6.
- Gradients: bright category colour at 0% / opacity .88; richer middle at 55% / .78; dark accent at 100% / .68.
- At design size, thin filled edges 1.5–2 px; standalone lines 3–4 px. Shadow sits just inside the boundary and stays subtle.
- Clip 24–36 gently varying waves to large fills at .10–.15 opacity. Never let decorative waves imply additional data. Reduce or omit texture on dense/small marks and uncertainty bands.
- During area animation, gradient bounds follow the running highest visible peak, including partial revealed segments. Do not stretch to a future peak.
- Establish axes, reveal data, then annotations. Pause one second between narration stages. Keep final holds motionless. Circle outline precedes fill and text.
- Source credits small at bottom right. Navigation, notes and controls never appear in exported videos.

## Category colours

| Name / 8A meaning | Bright | Middle | Dark |
|---|---|---|---|
| Gold orange / traditional wood and biomass | #FFB21C | #BC6412 | #652508 |
| Mint / solar, wind and other renewables | #04FFBA | #079B79 | #064A3E |
| Coral / coal | #D45463 | #913142 | #451322 |
| Orchid / oil | #A51B91 | #691B70 | #2E103E |
| Magenta / gas | #E30063 | #9B0847 | #490C2C |
| Forest / hydro | #0F875F | #08553F | #043128 |
| Ocean / modern biofuels | #07669E | #08436D | #06283F |

Retain those meanings for energy charts. For unrelated subjects, use ocean for supporting data and mint for the major highlight. Use labels, markers or dashes in addition to colour. Small ocean marks need clear outlines against navy.

## Chart recipes

### Area — Growth with weight

A single quantity through time. The fill makes magnitude visible while the bright upper edge carries the exact shape.

- Family: Time & trends
- Colours: Mint
- Motion: Trace left to right; anchor the gradient to the highest revealed value. Hold for one second at narration breaks.

### Stacked area — How a total accumulates

The closest relative of 8A. Give each band its own dark accent, thin edge and clipped waves. Keep category order consistent.

- Family: Time & trends
- Colours: Ocean · Orchid · Mint
- Motion: Reveal all bands together through time; expand axes only at explicit era boundaries.

### Line — The change is the story

Use a crisp mint stroke with restrained glow and an endpoint marker. Keep the plot open when area is not meaningful.

- Family: Time & trends
- Colours: Mint
- Motion: Draw the actual path; reveal markers when the line reaches them.

### Multiple lines — Compare trajectories

Use distinct colours and dash patterns, plus direct labels. Avoid several overlapping gradient fills.

- Family: Time & trends
- Colours: Ocean · Mint · Coral
- Motion: Introduce series in voiceover order, then hold the complete comparison.

### Uncertainty band — Show the range honestly

Use a faint band behind a solid central estimate. Decorative waves stay off here so they cannot be confused with observations.

- Family: Time & trends
- Colours: Mint
- Motion: Reveal the band with the estimate; label the interval and distinguish forecasts from observations.

### Column — Compare discrete amounts

Use square-ended bars, bright caps and individual gradients. Start the value axis at zero; keep category gaps even.

- Family: Comparison
- Colours: Ocean · Mint highlight
- Motion: Grow each bar from the baseline in sequence; introduce the highlight after the comparison.

### Horizontal bar — Rank long labels

Leave room for labels, use equal bar thickness and put values just beyond the ends. Fade colour downward within each bar.

- Family: Comparison
- Colours: Ocean · Mint emphasis
- Motion: Reveal top to bottom. Highlight a narrated category after the ranking settles.

### Grouped bar — Side-by-side categories

Use consistent left/right order and a shared baseline. Give related bars matching widths and avoid unnecessary outlines on all four sides.

- Family: Comparison
- Colours: Ocean · Mint
- Motion: Reveal each pair together so the comparison is immediately readable.

### Stacked bar — Parts of a total

Apply a separate gradient to every segment. Thin boundaries keep the dark bases from merging; use a stable legend order.

- Family: Composition
- Colours: Ocean · Orchid · Mint
- Motion: Build the base category first, then add each layer without shifting the baseline.

### Diverging bar — Above and below a reference

Make the zero line unmistakable. Put labels outside each end, and use colour plus position to distinguish direction.

- Family: Comparison
- Colours: Ocean · Mint
- Motion: Extend bars outward from zero. Never animate through values that change the sign.

### Waterfall — Explain a net change

Floating bars connect successive totals. Use neutral dotted connectors; reserve a full baseline bar for the start and finish.

- Family: Comparison
- Colours: Ocean · Mint · Coral
- Motion: Introduce each change, update the running total, then reveal the final total.

### Scatter — Individual observations

Small solid points use bright outlines and minimal glow. Label selected observations; keep texture in large callouts, not behind every point.

- Family: Relationships
- Colours: Ocean · Mint focus
- Motion: Populate points in a deliberate order; bring in interpretation only after the observations.

### Bubble — Add a third quantity

Scale circle area, not radius, to the third variable. Use translucent gradients and thin outlines; label sizes explicitly.

- Family: Relationships
- Colours: Ocean · Mint · Orchid
- Motion: Place centres first, then grow bubbles to their correct area without an overshoot.

### Dumbbell — Before and after

Connect two observations with a quiet line. Make endpoint colours and labels explicit; the connector shows distance, not intermediate measurements.

- Family: Comparison
- Colours: Ocean · Mint
- Motion: Reveal the first point, extend the connector, then reveal the second point.

### Histogram — Show the shape of a population

Touching bars represent equal-width bins. Use one hue so the silhouette carries the distribution; waves stay very subtle.

- Family: Distribution
- Colours: Ocean
- Motion: Reveal bins left to right while keeping their widths and boundaries fixed.

### Box plot — Compare spread and median

Use gradients inside the interquartile boxes only. White medians and thin whiskers must remain stronger than texture. Dots mark outliers.

- Family: Distribution
- Colours: Mint
- Motion: Reveal whiskers, boxes, then medians and outliers; explain the whisker convention in the source note.

### Donut — A few parts of one whole

Keep category count small and include percentages. Use bright rim strokes and dark accented fills; a bar is better for close comparisons.

- Family: Composition
- Colours: Ocean · Mint · Orchid
- Motion: Reveal sectors clockwise from twelve o’clock, then settle labels and the centre total.

### Heatmap — Find patterns in a matrix

Colour intensity encodes value, so use a single sequential scale and no decorative per-cell gradient. Keep 8A’s frame, type and restrained edges.

- Family: Distribution
- Colours: Mint intensity scale
- Motion: Reveal rows or columns in reading order. Always show a numeric colour key.

### Treemap — Nested parts of a whole

Rectangle area represents share. Use gradients within each region, thin boundaries and direct labels. Avoid this for precise ranking.

- Family: Composition
- Colours: Ocean · Mint · Orchid · Coral
- Motion: Reveal parent groups first, then their children; keep final areas fixed during comparison.

### Callout circle — Circle the conclusion

Use a true circle with mint-to-deep-teal fill, clipped waves and an inner rim shadow. Keep the headline number large and the text centred.

- Family: Annotation
- Colours: Mint · White
- Motion: Draw the outline first in about 0.8 seconds, then fill, then text. Hold the final state still.

## Extending the library

For a new chart type, inherit the canvas, type, palette and annotation rules first. Apply the gradient/wave treatment only to shapes whose size and fill are not themselves a colour scale. Keep bars at a zero baseline, size bubbles by area, preserve stacked category order, and state units and scale transformations. Choropleths and other intensity maps follow the heatmap rule: honest sequential colour, no decorative per-region shading. For networks and flows, use crisp labelled connections and reserve gradients for larger nodes or bands. Prefer a simple familiar chart when it conveys the same relationship more clearly.
