# AE Export — Cooling Curve prototype

Generates a native After Effects composition directly from
`1a-cooling-curve.html`'s own timing/geometry data, as an alternative
delivery path alongside this repo's baked ProRes 4444 render pipeline
(`_render/`, `render-client.js`). This track never touches that pipeline —
everything lives under this `ae-export/` directory, and the chart HTML file
is read-only source data for the generator.

## What this is

`generate-jsx.mjs` is a Node script that:

1. Reads `../1a-cooling-curve.html` as **text** (never executes it in a
   browser — there's no browser here).
2. Parses the chart's own `:root` CSS custom properties (every
   `--start-*` / `--dur-*` value that drives `animation-delay` /
   `animation-duration` in the real chart).
3. Parses the chart's own `DATA` array (year/value pairs) and the exact
   source text of its `x(i)`, `y(v)`, and `catmullRom2bezier(pts)`
   functions, then **evaluates that extracted source** in Node (via
   `new Function`) to compute the identical SVG line/area path the browser
   would draw — instead of re-deriving or eyeballing the curve.
4. Re-implements (from scratch, since Node has no DOM) generic cubic-bezier
   arc-length sampling to stand in for the browser's
   `SVGGeometryElement.getPointAtLength()`, which the chart's own
   `lengthFractionForX()` depends on for staggering the data-point pop-ins
   and driving the leading dot. The *control points* fed into that sampler
   still come straight from the parsed path above.
5. Parses the static decorative background contour paths, the ring's
   radius/dash-offset target, the hero/ring target numbers, and every piece
   of on-screen copy straight out of the markup.
6. Emits a single ExtendScript file (`output/1a-cooling-curve.jsx`) that
   builds a 1200×750 composition with:
   - A background solid matching the chart's `--ash-950` color.
   - The 4 static decorative background contour lines.
   - 12 gridline shape layers with keyframed Trim Paths (matching the
     chart's staggered `draw` animation).
   - 12 axis tick-label text layers with fade-up keyframes.
   - An area-fill shape layer with a keyframed rectangular mask reproducing
     the chart's `clip-path` wipe.
   - A line-path shape layer with a keyframed Trim Path (the big line draw).
   - A leading-dot shape layer with ~28 sampled Position keyframes walking
     the same arc length the CSS `offset-path` motion would.
   - 11 data-point marker shape layers with pop-in (scale+opacity overshoot)
     keyframes timed to when the line reaches each one.
   - A Null Object parenting all of the above, with the opacity/scale/blur
     keyframes that reproduce the "Scene 1 exit" collapse.
   - Act 2: headline, hero counter (Source-Text keyframes standing in for
     the CSS `counter()` animation), hero final-value swap, and the
     97% ring (Trim Path + Source-Text percent counter), each grouped under
     their own Null so the "rise in" happens as a group the same way the
     CSS does it on `.duo-col`.

Nothing is hand-typed pixel/second guesswork — every number in the output
traces back to a regex extraction (or a re-executed function) from the
chart's own source. Where extraction of a minor stagger constant fails for
any reason, the generator logs a warning and falls back to a documented
default rather than silently producing wrong output.

## Running it

```
node ae-export/generate-jsx.mjs
```

This overwrites `ae-export/output/1a-cooling-curve.jsx` and prints a short
summary (layer count, byte size, key timeline milestones). The script exits
non-zero if the ES3-safety self-check (below) fails, or if it can't find one
of the values it's looking for in the HTML (e.g. because the chart's markup
changed shape) — read the error message, it names exactly what it expected.

## Running the generated .jsx in After Effects

1. Open (or create) any project in After Effects.
2. **File → Scripts → Run Script File…**, pick `ae-export/output/1a-cooling-curve.jsx`.
   (If your AE has scripting file-access disabled, enable
   *Allow Scripts to Write Files and Access Network* in
   Preferences → Scripting & Expressions first — this script only writes
   inside the AE project, but AE's script sandbox still gates it.)
3. It creates a new comp named **"Cooling Curve — AE Export"** (1200×750,
   30fps, ~14s) and builds every layer described above.
4. AE shows an `alert()` summary at the end: how many layers were created,
   and — if anything failed on your specific AE version (see
   *Compatibility notes* below) — which ones, and why, so you can patch
   those manually rather than guessing something silently didn't work.
5. Rajdhani is assumed to already be installed as a system font (per the
   prototype brief) — the script sets it by family name (`Rajdhani`) with a
   try/catch fallback; if AE can't resolve it, text layers fall back to
   AE's default font and you'll need to reassign it by hand.

## What you should still hand-tune

The brief for this prototype explicitly allows approximate timing —
a human tunes easing and adds time-remapping afterward in AE. Specifically:

- **Easing.** The chart uses `cubic-bezier(.3,.8,.4,1)` for gridlines,
  `linear` for the line/dot/counters, and a bouncy
  `cubic-bezier(.34,1.56,.64,1)` for the data-point pop. The generated
  keyframes are **linear or plain two/three-point holds** — no bezier
  easing is applied by the script. Select the keyframes per layer and dial
  in Easy Ease / F9 + the Graph Editor to match.
- **Glow / drop-shadow.** The chart's line, leading dot, hero number, and
  ring progress all have CSS `filter: drop-shadow(...)` glows. Not
  reproduced — add a Glow effect by hand.
- **Blur on Scene 1 exit.** The generator *does* try to add a keyframed
  Fast Blur effect to the Scene 1 null (matching the CSS
  `filter: blur(0px) → blur(2px)`), wrapped in a try/catch since the exact
  effect match-name differs across AE versions. If your alert() summary
  lists it as failed, add a Fast Blur / Gaussian Blur effect to the
  "SCENE 1" null yourself with the same 0 → 2px keyframes at the times the
  summary/track data names.
- **Area fill gradient.** The chart's area fill is a top-to-bottom
  gradient fading to transparent; the generated layer is a flat low-opacity
  fill. Swap in a Gradient Fill effect if you want the gradient back.
- **Grain / noise overlay** and the **replay button** are UI chrome from
  the review tool wrapped around the chart, not part of the chart's own
  animation — intentionally not reproduced.
- **Text box sizing.** Headline text layers are built as AE paragraph
  ("box") text sized off the chart's CSS percentages; check word-wrap
  against the real Rajdhani metrics and adjust the box if needed.

## ExtendScript / ES3 compatibility note

ExtendScript's JS engine is ES3-plus-some-ES5 (no arrow functions, no
`let`/`const`, no template literals, no classes, no destructuring or
spread). **`generate-jsx.mjs` itself is modern Node ESM** (imports, arrow
functions, template literals) — that only matters for running the
generator in Node and is irrelevant to AE. The *file it emits*
(`output/1a-cooling-curve.jsx`, built from `lib/runtime-template.jsx` plus a
generated JSON data block) is written entirely in `var`/`function` ES3
syntax on purpose, and the generator runs a lightweight self-check
(`assertEs3Safe`) before writing the file that scans for arrow functions,
`const`/`let`, backticks, `class`, and spread/rest syntax outside of string
literals and comments, refusing to write the file if it finds any. This
was verified by running the generator in this sandbox (no After Effects
available here) — the check passed and the resulting `.jsx` was inspected
by hand for sane keyframe times/values (cross-checked against the source
chart's own CSS variables; e.g. gridline draws start at 1.3s and stagger by
0.35s, the line draws from 5.35s–7.05s, the hero counter lands on 9,800 at
10.15s, the ring hits 97% at 12.05s — all match the chart's `--start-*` /
`--dur-*` variables and its `heroCount`/`pctCount` keyframe targets exactly).
What was **not** verified — because no After Effects install is available
in this environment — is that every AE scripting match-name used
(`ADBE Vector Shape - Group`, `ADBE Mask Atom`, `ADBE Fast Blur 2`, etc.) is
100% correct for your AE version. Each layer's construction is wrapped in
its own `try`/`catch` inside `main()` in `lib/runtime-template.jsx`, so a
mismatch on one layer type reports itself in the closing `alert()` and skips
just that layer, instead of aborting the whole build.

## Files

- `generate-jsx.mjs` — the Node generator (run this).
- `lib/runtime-template.jsx` — the ES3 AE-side runtime the generator
  appends its data to. Edit this if you want to change *how* AE builds
  layers; edit `generate-jsx.mjs` if you want to change *what* gets built
  or *which chart values* feed it.
- `output/1a-cooling-curve.jsx` — the generated, ready-to-run script
  (checked in so it doesn't have to be regenerated to be used — but it's
  fully reproducible by re-running the generator against the current
  `1a-cooling-curve.html`).

## Re-running after the chart changes

If someone hand-tunes `1a-cooling-curve.html`'s numbers later (new DATA
values, retimed `--start-*`/`--dur-*` variables, a different hero/ring
target), just re-run `node ae-export/generate-jsx.mjs` — it re-parses the
file from scratch, so the `.jsx` stays in sync without anyone needing to
hand-edit AE keyframes to match.
