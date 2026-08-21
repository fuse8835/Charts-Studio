# "Cooling Curve" Chart Series — Visual & Motion Style Guide

Reference template: worldwide climate-mortality decline chart, built as a two-act animated data-reveal. This guide captures the design language established for that piece so future charts in the series stay consistent. **Status: design is provisional — not yet signed off by the client.** Treat every value below as "current," not "final," until confirmed locked.

---

## 1. Palette

| Role | Color | Hex | Usage |
|---|---|---|---|
| Base background | Deep midnight navy | `#05131F` → `#071B2C` → `#01060C` | Dark gradient vignette, near-black at the edges, never flat/pure black |
| Primary data accent | Bright turquoise / mint | `#04FFBA` | The data line, big stat numbers, ring fill, leading glow-dot — the single "hero" color, used sparingly and always with a soft glow |
| Secondary accent | Vivid blue | `#043FC5` | Small UI accents only (e.g. a status dot) — never used for data itself |
| Primary text | Near-white | `#EEF3FA` / `#F8FBFF` | Headlines, ring percentage number |
| Secondary text | Muted grey-blue ("mist") | `#A9C2D6` / `#7EA0BD` | Captions, axis labels, gridlines, axis titles — always de-emphasized relative to the data |

**Rule:** only one saturated "hero" color (the turquoise) ever appears in the data itself. Everything else is either near-white, muted grey-blue, or the near-black background. Don't introduce a third bright color.

## 2. Typography

- **Typeface:** Rajdhani — a condensed, geometric, technical-feeling sans-serif. This is a deliberate choice; it should read as "data instrument," not generic corporate sans.
- **Weight hierarchy:**
  - **700 (bold):** headlines, big stat numbers, ring percentage
  - **600 (semibold):** captions and labels — always uppercase, with letter-spacing
  - **500 (medium):** axis numbers specifically — kept lighter than captions so the axis recedes and never competes with the data
- **Never** let two paired elements (e.g. two captions under a side-by-side comparison) differ in size or weight from each other — visual parity between compared items is a hard rule.

## 3. Composition

- **Aspect ratio:** 16:10 canvas (not 16:9 — this has been a recurring mix-up; double-check before generating).
- **Margins:** content sits ~6% in from the left/right edges, consistently.
- **Two-act structure** is the core narrative shape of this series:
  1. **Act 1 — the full historical chart.** Axis, gridlines, and a single glowing line draw in, tracing the whole trend, ending on a bright leading dot at the most recent data point. Hold on this completed state for a beat before transitioning.
  2. **Act 2 — the payoff.** The full chart dissolves as one unit (not element-by-element) into a focused, centered comparison: a counted-up **hero statistic** on the left paired with a **circular progress ring** on the right, each with a caption beneath. This side-by-side "duo" layout is the template for any "here's the headline number" moment in the series.

## 4. Motion Language

This is the most important section to carry into a new tool — it's the actual choreography, independent of how it gets rendered.

- **Staggered, sequential reveals.** Nothing fades in all at once. Background → gridlines → line → data points → supporting text, each slightly offset in time.
- **The line draws left-to-right**, tip-first, with a glowing dot riding at the leading edge — it is *traced*, not faded or scaled in.
- **Data point markers pop in with a slight overshoot bounce**, timed to land exactly when the line reaches that point — never before, never as a separate unsynced beat.
- **Area-fill-under-the-curve reveals as a left-to-right wipe** — think of a mask sliding open, not the shape scaling or fading up from the bottom. The shape itself must never move or distort; only its visibility grows.
- **Scene transitions are a single dissolve.** The outgoing scene fades/scales-down/blurs as one whole unit; the incoming scene's fade-in overlaps it slightly rather than waiting for a hard cut.
- **Numbers actually count up** — a visible incrementing counter, not a fade-to-final-value. This applies to both the hero stat and the ring's percentage.
- **When two stats are being compared, they land sequentially, not simultaneously** — one counts up and settles first, then the second begins. This creates a clear "beat 1, beat 2" rhythm rather than a busy simultaneous reveal.
- **A counting number can crossfade into a cleaner final label** at the moment it finishes — e.g. a raw counted number resolving into a rounded, comma-formatted headline figure. This is a nice "settle" beat, not required for every number.
- **The progress ring draws clockwise from 12 o'clock**, and its ends are **flat/squared, never rounded** — this is what makes it read as a hollow pie-style ring rather than a generic rounded progress bar. Easy to get wrong by default; call it out explicitly in any generation prompt.

## 5. Copy & Tone

- Headlines: plain, declarative, sentence case. No exclamation points, no unnecessary flourish.
- Captions/labels: uppercase, letter-spaced, always the muted secondary color — they support the data, never compete with it.
- Keep numbers honest and specific rather than vague where possible (an exact counted figure reads more credible than a rounded one, even in a chart built for emotional impact).

## 6. Pacing Reference

- Full sequence so far: **~8 seconds** for a two-act chart.
- Rough split: roomy time establishing the historical trend and letting it hold before transitioning; the payoff comparison (Act 2) gets a few seconds with its own sequential internal pacing (stat lands, brief pause, ring begins).
- Don't rush the transition — a beat of stillness on the completed Act 1 chart before it dissolves is part of the rhythm, not dead time.

## 7. Notes for Prompting an AI Video Tool (e.g. Higgsfield)

Since generative video tools work from natural-language/visual prompts rather than CSS, translate the above as descriptors like:

> Dark near-black navy background with a soft glowing vignette. A single glowing mint-green (#04FFBA) line or data element as the only saturated color accent, everything else near-white or muted blue-grey. Clean, condensed, technical geometric sans-serif typography (Rajdhani-style), bold for headlines and big numbers, medium weight and smaller for axis/supporting labels. Motion should feel like a precise data instrument: elements draw/trace in left-to-right rather than fade, numbers visibly count upward rather than appearing instantly, a circular progress ring fills clockwise with flat (not rounded) ends. Sequential, staggered reveals — not everything appearing at once. 16:10 aspect ratio.

**Before that new chat can actually call Higgsfield**, the Higgsfield connector needs to be authorized (via your Claude connector settings, or `/mcp` in an interactive session) — it wasn't yet connected in this session.

---

*Carried over from the technical build of this template (may not be directly relevant to a Higgsfield-based workflow, but worth keeping if any part of the pipeline still involves HTML/CSS rendering): any responsive text sizing must have its scaling ceiling tested at the actual final export resolution, not just at preview size — a value tuned to look right small can silently stay capped and look undersized once rendered large.*
