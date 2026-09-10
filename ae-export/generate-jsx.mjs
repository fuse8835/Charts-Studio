#!/usr/bin/env node
/**
 * ae-export/generate-jsx.mjs
 *
 * Reads ../1a-cooling-curve.html (READ-ONLY — never modified) and generates an
 * ExtendScript (.jsx) file that builds a matching After Effects composition.
 *
 * This does NOT hand-transcribe numbers. It:
 *   1. Parses the chart's own :root CSS custom properties for every
 *      animation-delay / animation-duration value.
 *   2. Parses the chart's own `DATA` array (year/value pairs).
 *   3. Parses the chart's own `catmullRom2bezier`, `x(i)`, `y(v)` function
 *      SOURCE TEXT out of the file and evaluates that exact source in Node
 *      (via `new Function`) to compute the identical SVG path geometry the
 *      browser would compute — instead of re-deriving the math by hand.
 *   4. Re-implements (new, generic, chart-agnostic) cubic-bezier arc-length
 *      sampling, because Node has no DOM / SVG getPointAtLength() — the
 *      chart's own JS relies on that browser API for the leading-dot /
 *      data-point timing, and there is no way to reuse it outside a browser.
 *      The CONTROL POINTS fed into that sampler still come straight from the
 *      parsed geometry above, not from guesses.
 *   5. Parses static decorative background paths, ring geometry, hero/ring
 *      target numbers, and all copy text straight out of the HTML/CSS.
 *
 * Run: node ae-export/generate-jsx.mjs
 * Output: ae-export/output/1a-cooling-curve.jsx
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHART_HTML_PATH = path.join(__dirname, '..', '1a-cooling-curve.html');
const RUNTIME_TEMPLATE_PATH = path.join(__dirname, 'lib', 'runtime-template.jsx');
const OUTPUT_PATH = path.join(__dirname, 'output', '1a-cooling-curve.jsx');

const src = fs.readFileSync(CHART_HTML_PATH, 'utf8');

// ---------------------------------------------------------------------------
// small extraction helpers
// ---------------------------------------------------------------------------

function must(re, s, label) {
  const m = s.match(re);
  if (!m) throw new Error('Could not find ' + label + ' in source HTML (regex: ' + re + ')');
  return m;
}

function evalExpr(exprText, scopeNames, scopeValues) {
  // eslint-disable-next-line no-new-func
  const fn = new Function(...scopeNames, 'return (' + exprText + ');');
  return fn(...scopeValues);
}

/** Extract `function NAME(...) { ... }` by counting braces (regex can't
 *  reliably match nested braces). Returns the full function source text. */
function extractFunctionSource(s, name) {
  const startMatch = s.match(new RegExp('function\\s+' + name + '\\s*\\('));
  if (!startMatch) throw new Error('Could not find function ' + name);
  let i = startMatch.index + startMatch[0].length;
  // find the opening brace of the body
  const braceStart = s.indexOf('{', i);
  let depth = 0;
  let j = braceStart;
  for (; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') {
      depth--;
      if (depth === 0) { j++; break; }
    }
  }
  return s.slice(startMatch.index, j);
}

function hexToRgb01(hex) {
  const h = hex.trim().replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

// ---------------------------------------------------------------------------
// 1. :root CSS custom properties (every delay/duration lives here)
// ---------------------------------------------------------------------------

const rootBlock = must(/:root\s*\{([\s\S]*?)\}/, src, ':root { } block')[1];
const cssVars = {};
for (const m of rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
  cssVars[m[1]] = m[2].trim();
}

function secs(name) {
  const raw = cssVars[name];
  if (raw === undefined) throw new Error('Missing CSS var --' + name);
  const m = raw.match(/^([\d.]+)s$/);
  if (!m) throw new Error('CSS var --' + name + ' = "' + raw + '" is not a plain "Ns" duration');
  return parseFloat(m[1]);
}

const T = {
  durBg: secs('dur-bg'),
  durGrid: secs('dur-grid'),
  durHead: secs('dur-head'),
  durLine: secs('dur-line'),
  startGrid: secs('start-grid'),
  startAxis: secs('start-axis'),
  startHead: secs('start-head'),
  startLine: secs('start-line'),
  startFill: secs('start-fill'),
  durFill: secs('dur-fill'),
  startScene2: secs('start-scene2'),
  durCollapse: secs('dur-collapse'),
  startHeadline2: secs('start-headline2'),
  durHeadline2: secs('dur-headline2'),
  startHero: secs('start-hero'),
  durHeroCount: secs('dur-hero-count'),
  durHeroSwap: secs('dur-hero-swap'),
  startRing: secs('start-ring'),
  durRing: secs('dur-ring'),
  total: secs('total'),
};

const COLORS = {
  ash950: hexToRgb01(cssVars['ash-950']),
  ash900: hexToRgb01(cssVars['ash-900']),
  mistFaint: hexToRgb01(cssVars['mist-400']), // gridlines / ring track
  mist300: hexToRgb01(cssVars['mist-300']), // tick labels / captions
  mint400: hexToRgb01(cssVars['mint-400']), // line / area / hero / ring progress
  paper050: hexToRgb01(cssVars['paper-050']), // headlines / leading dot / ring pct
  paper100: hexToRgb01(cssVars['paper-100']), // body text default
};

// ---------------------------------------------------------------------------
// 2. DATA array + chart geometry constants
// ---------------------------------------------------------------------------

const dataText = must(/const DATA = (\[[\s\S]*?\]);/, src, 'DATA array')[1];
const DATA = evalExpr(dataText, [], []);

const whMatch = must(/const W = (\d+), H = (\d+);/, src, 'W/H constants');
const W = parseInt(whMatch[1], 10);
const H = parseInt(whMatch[2], 10);

const padText = must(/const PAD = (\{[^}]*\});/, src, 'PAD object')[1];
const PAD = evalExpr(padText, [], []);

const maxVal = parseInt(must(/const maxVal = (\d+);/, src, 'maxVal constant')[1], 10);

const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

// pull the chart's OWN x(i)/y(v) mapping function source and evaluate it,
// instead of re-deriving the formula by hand
const xFnText = must(/const x = (i => [^\n;]+);/, src, 'x(i) mapping fn')[1];
const yFnText = must(/const y = (v => [^\n;]+);/, src, 'y(v) mapping fn')[1];
const xFn = evalExpr(xFnText, ['PAD', 'DATA', 'plotW'], [PAD, DATA, plotW]);
const yFn = evalExpr(yFnText, ['PAD', 'plotH', 'maxVal'], [PAD, plotH, maxVal]);

// pull the chart's own catmull-rom -> bezier path builder and run it verbatim
const catmullSrc = extractFunctionSource(src, 'catmullRom2bezier');
const catmullFn = evalExpr('(function(){' + catmullSrc + '; return catmullRom2bezier;})()', [], []);

const pts = DATA.map((d, i) => [xFn(i), yFn(d.value)]);
const lineD = catmullFn(pts);
const lastPt = pts[pts.length - 1];
const firstPt = pts[0];
const bottomY = PAD.top + plotH;
const areaD = lineD + ' L ' + lastPt[0] + ' ' + bottomY + ' L ' + firstPt[0] + ' ' + bottomY + ' Z';

const stepsText = must(/const steps = (\[[^\]]*\]);/, src, 'gridline steps array')[1];
const steps = evalExpr(stepsText, [], []);

// ---------------------------------------------------------------------------
// 3. per-element stagger multipliers (extracted from the chart's own template
//    strings, so a future re-tuning of the stagger amount is picked up too)
// ---------------------------------------------------------------------------

function numOrDefault(re, s, group, fallback, label) {
  const m = s.match(re);
  if (!m) {
    console.warn('  (warning) could not extract ' + label + ' — using default ' + fallback);
    return fallback;
  }
  return parseFloat(m[group]);
}

// horizontal gridlines + Y tick labels are both built inside the same
// `steps.forEach((v, i) => { ... });` loop
const stepsLoopBlock = must(/steps\.forEach\(\(v, i\) => \{([\s\S]*?)\n {2}\}\);/, src, 'Y-axis steps.forEach loop')[1];
const gridHMult = numOrDefault(
  /line\.style\.animationDelay = `calc\(var\(--start-grid\) \+ \$\{i \* ([\d.]+)\}s\)`;/,
  stepsLoopBlock, 1, 0.35, 'horizontal gridline stagger multiplier',
);
const tickYMult = numOrDefault(
  /label\.style\.animationDelay = `calc\(var\(--start-axis\) \+ \$\{i \* ([\d.]+)\}s\)`;/,
  stepsLoopBlock, 1, 0.55, 'Y tick label stagger multiplier',
);

// vertical gridlines + X tick labels are both built inside the same
// `DATA.forEach((d, i) => { ... });` loop
const dataLoopBlock = must(/DATA\.forEach\(\(d, i\) => \{([\s\S]*?)\n {2}\}\);/, src, 'X-axis DATA.forEach loop')[1];
const gridVBase = numOrDefault(
  /vline\.style\.animationDelay = `calc\(var\(--start-grid\) \+ \$\{([\d.]+) \+ xi \* [\d.]+\}s\)`;/,
  dataLoopBlock, 1, 0.05, 'vertical gridline stagger base',
);
const gridVMult = numOrDefault(
  /vline\.style\.animationDelay = `calc\(var\(--start-grid\) \+ \$\{[\d.]+ \+ xi \* ([\d.]+)\}s\)`;/,
  dataLoopBlock, 1, 0.35, 'vertical gridline stagger multiplier',
);
const tickXBase = numOrDefault(
  /label\.style\.animationDelay = `calc\(var\(--start-axis\) \+ \$\{([\d.]+) \+ xi \* [\d.]+\}s\)`;/,
  dataLoopBlock, 1, 0.2, 'X tick label stagger base',
);
const tickXMult = numOrDefault(
  /label\.style\.animationDelay = `calc\(var\(--start-axis\) \+ \$\{[\d.]+ \+ xi \* ([\d.]+)\}s\)`;/,
  dataLoopBlock, 1, 0.55, 'X tick label stagger multiplier',
);

const pointsConstMatch = must(
  /const drawDurSec = ([\d.]+), drawStartSec = ([\d.]+), firstDotPause = ([\d.]+);/,
  src,
  'data-point delay constants',
);
const drawDurSec = parseFloat(pointsConstMatch[1]);
const drawStartSec = parseFloat(pointsConstMatch[2]);
const firstDotPause = parseFloat(pointsConstMatch[3]);

// ---------------------------------------------------------------------------
// 4. copy text, straight from the markup
// ---------------------------------------------------------------------------

function text1(re, label) {
  return must(re, src, label)[1].replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').trim();
}

// The two duo-cap captions (hero, then ring) used to be extracted by
// pattern-matching whatever markup happened to follow each one in the
// source — fragile, and it silently overran into the wrong div's content
// (leaking a literal "</div>" into the captured text) as soon as the real
// markup's nesting didn't match what the regex assumed. Grabbing every
// ".duo-cap" div directly, in document order, is both simpler and correct:
// the source always puts the hero caption first, ring caption second.
const duoCapDivs = [...src.matchAll(/<div class="duo-cap">([\s\S]*?)<\/div>/g)];
if (duoCapDivs.length < 2) {
  throw new Error('Expected 2 ".duo-cap" captions (hero, ring) in source HTML, found ' + duoCapDivs.length);
}
function duoCapText(m) {
  return m[1].replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/<br>/g, '\r').trim();
}

const COPY = {
  headline: text1(/<h1 class="headline">([\s\S]*?)<\/h1>/, 'act-1 headline'),
  axisTitle: text1(/<div class="axis-title">([^<]*)<\/div>/, 'axis title'),
  sourceNote: text1(/<div class="source-note">([^<]*)<\/div>/, 'source note'),
  headline2: text1(/<h1 class="headline-2">([\s\S]*?)<\/h1>/, 'act-2 headline'),
  heroLessThan: text1(/<div class="hero-less-than">([^<]*)<\/div>/, 'hero "less than" label'),
  heroFinal: text1(/<span class="hero-final">([^<]*)<\/span>/, 'hero final value'),
  duoCapHero: duoCapText(duoCapDivs[0]),
  duoCapRing: duoCapText(duoCapDivs[1]),
};

const heroFinalCount = parseInt(
  must(/@keyframes heroCount \{ from \{ --heroval: 0; \} to \{ --heroval: (\d+); \} \}/, src, 'hero count target')[1],
  10,
);
const ringPctTarget = parseInt(
  must(/@keyframes pctCount \{ from \{ --pct: 0; \} to \{ --pct: (\d+); \} \}/, src, 'ring pct target')[1],
  10,
);
const ringRadius = parseFloat(
  must(/<circle class="ring-progress"[^>]*r="([\d.]+)"/, src, 'ring radius')[1],
);

// ---------------------------------------------------------------------------
// 5. static decorative background contour paths (never animated)
// ---------------------------------------------------------------------------

const contoursBlock = must(/<svg class="contours"[\s\S]*?<\/svg>/, src, 'contours background svg')[0];
const contourPaths = [...contoursBlock.matchAll(/<path d="([^"]+)"\s*\/>/g)].map((m) => m[1]);
const contourStroke = must(/<g fill="none" stroke="(#[0-9a-fA-F]{6})"/, contoursBlock, 'contour stroke color')[1];

// ---------------------------------------------------------------------------
// 6. generic SVG path -> cubic-bezier-segment parser (new infra: SVG path
//    math is generic, not chart-specific business logic — Node has no DOM to
//    borrow it from). Supports the commands actually used by this chart:
//    M, L, C, Q, T, Z.
// ---------------------------------------------------------------------------

function parseSvgPath(d) {
  const tokens = d.match(/[MLCQTZ]|-?[\d.]+(?:e-?\d+)?/gi);
  let i = 0;
  const next = () => parseFloat(tokens[i++]);
  let cur = [0, 0];
  let start = [0, 0];
  let prevQuadCtrl = null;
  const vertices = [];
  const inTangents = []; // relative to vertex
  const outTangents = []; // relative to vertex
  let closed = false;

  function pushVertex(p) {
    vertices.push(p);
    inTangents.push([0, 0]);
    outTangents.push([0, 0]);
  }

  function setOutTangent(idx, ctrlAbs) {
    outTangents[idx] = [ctrlAbs[0] - vertices[idx][0], ctrlAbs[1] - vertices[idx][1]];
  }
  function setInTangent(idx, ctrlAbs) {
    inTangents[idx] = [ctrlAbs[0] - vertices[idx][0], ctrlAbs[1] - vertices[idx][1]];
  }

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      cur = [next(), next()];
      start = cur;
      pushVertex(cur);
      prevQuadCtrl = null;
    } else if (cmd === 'L') {
      const p = [next(), next()];
      pushVertex(p);
      cur = p;
      prevQuadCtrl = null;
    } else if (cmd === 'C') {
      const c1 = [next(), next()];
      const c2 = [next(), next()];
      const p = [next(), next()];
      const idx0 = vertices.length - 1;
      pushVertex(p);
      setOutTangent(idx0, c1);
      setInTangent(idx0 + 1, c2);
      cur = p;
      prevQuadCtrl = null;
    } else if (cmd === 'Q') {
      const qc = [next(), next()];
      const p = [next(), next()];
      const idx0 = vertices.length - 1;
      const c1 = [cur[0] + (2 / 3) * (qc[0] - cur[0]), cur[1] + (2 / 3) * (qc[1] - cur[1])];
      const c2 = [p[0] + (2 / 3) * (qc[0] - p[0]), p[1] + (2 / 3) * (qc[1] - p[1])];
      pushVertex(p);
      setOutTangent(idx0, c1);
      setInTangent(idx0 + 1, c2);
      cur = p;
      prevQuadCtrl = qc;
    } else if (cmd === 'T') {
      const qc = prevQuadCtrl ? [2 * cur[0] - prevQuadCtrl[0], 2 * cur[1] - prevQuadCtrl[1]] : cur;
      const p = [next(), next()];
      const idx0 = vertices.length - 1;
      const c1 = [cur[0] + (2 / 3) * (qc[0] - cur[0]), cur[1] + (2 / 3) * (qc[1] - cur[1])];
      const c2 = [p[0] + (2 / 3) * (qc[0] - p[0]), p[1] + (2 / 3) * (qc[1] - p[1])];
      pushVertex(p);
      setOutTangent(idx0, c1);
      setInTangent(idx0 + 1, c2);
      cur = p;
      prevQuadCtrl = qc;
    } else if (cmd === 'Z' || cmd === 'z') {
      closed = true;
      cur = start;
    } else {
      throw new Error('Unsupported path command "' + cmd + '" in: ' + d);
    }
  }

  // drop a redundant duplicate closing vertex identical to the start vertex
  if (closed && vertices.length > 1) {
    const a = vertices[vertices.length - 1];
    const b = vertices[0];
    if (Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01) {
      vertices.pop();
      inTangents.pop();
      outTangents.pop();
    }
  }

  return { vertices, inTangents, outTangents, closed };
}

// ---------------------------------------------------------------------------
// 7. arc-length sampler for the main line path (new infra: cubic-bezier
//    arc-length math; the CONTROL POINTS it samples come from `lineD` above,
//    which was generated by the chart's own catmullRom2bezier). This stands
//    in for the browser's SVGGeometryElement.getPointAtLength(), which the
//    chart's own `lengthFractionForX` relies on and which does not exist
//    outside a DOM.
// ---------------------------------------------------------------------------

function cubicPoint(p0, c1, c2, p3, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const dd = t * t * t;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + dd * p3[0],
    a * p0[1] + b * c1[1] + c * c2[1] + dd * p3[1],
  ];
}

function buildArcLengthTable(parsedPath, samplesPerSegment) {
  const { vertices, inTangents, outTangents } = parsedPath;
  const table = [{ len: 0, x: vertices[0][0], y: vertices[0][1] }];
  let acc = 0;
  for (let s = 0; s < vertices.length - 1; s++) {
    const p0 = vertices[s];
    const p3 = vertices[s + 1];
    const c1 = [p0[0] + outTangents[s][0], p0[1] + outTangents[s][1]];
    const c2 = [p3[0] + inTangents[s + 1][0], p3[1] + inTangents[s + 1][1]];
    let prev = p0;
    for (let k = 1; k <= samplesPerSegment; k++) {
      const t = k / samplesPerSegment;
      const pt = cubicPoint(p0, c1, c2, p3, t);
      acc += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      table.push({ len: acc, x: pt[0], y: pt[1] });
      prev = pt;
    }
  }
  return { table, total: acc };
}

function fractionForX(arc, targetX) {
  const { table, total } = arc;
  // table.x is monotonic increasing for this chart's line (x always advances
  // with index), so a linear scan/binary search on x is safe here.
  let lo = 0;
  let hi = table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].x < targetX) lo = mid; else hi = mid;
  }
  return table[lo].len / total;
}

function pointAtFraction(arc, frac) {
  const { table, total } = arc;
  const targetLen = frac * total;
  let lo = 0;
  let hi = table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].len < targetLen) lo = mid; else hi = mid;
  }
  const a = table[lo];
  const b = table[hi];
  const span = b.len - a.len || 1;
  const t = (targetLen - a.len) / span;
  return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];
}

const parsedLine = parseSvgPath(lineD);
const arc = buildArcLengthTable(parsedLine, 60);

// ---------------------------------------------------------------------------
// 8. assemble the layer list AE will build
// ---------------------------------------------------------------------------

const layers = [];

function fadeUpKeyframes(t0, dur) {
  return {
    opacity: [{ t: t0, v: 0 }, { t: t0 + dur, v: 100 }],
    positionOffset: [{ t: t0, v: [0, 4] }, { t: t0 + dur, v: [0, 0] }],
  };
}
function riseInKeyframes(t0, dur) {
  return {
    opacity: [{ t: t0, v: 0 }, { t: t0 + dur, v: 100 }],
    positionOffset: [{ t: t0, v: [0, 8] }, { t: t0 + dur, v: [0, 0] }],
  };
}

// Box (paragraph) text's Anchor Point / position behavior turned out to be
// unreliable across AE versions (two separate fix attempts still put the
// headline off-canvas) — point text's positioning is proven correct
// everywhere else in this file, so headlines are wrapped into explicit
// lines ourselves and rendered as point text instead of fighting AE's box
// text anchor semantics further. A rough chars-per-line estimate is fine
// here since line breaks are approximate by design — hand-tune in AE if a
// break lands awkwardly.
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? line + ' ' + word : word;
    if (candidate.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.join('\r');
}

// -- background --
layers.push({
  kind: 'solid',
  name: 'BG — ash-950',
  color: COLORS.ash950,
  opacity: [{ t: 0, v: 0 }, { t: T.durBg, v: 100 }],
});

// -- static decorative contour lines (outside .scene1, persist whole comp) --
contourPaths.forEach((d, idx) => {
  const parsed = parseSvgPath(d);
  layers.push({
    kind: 'shape',
    name: 'Contour ' + (idx + 1) + ' (static bg)',
    path: parsed,
    stroke: { color: hexToRgb01(contourStroke), width: 1.5, opacity: 35 },
  });
});

// -- SCENE 1 --------------------------------------------------------------
layers.push({ kind: 'null', name: 'SCENE 1 (controls exit collapse)', id: 'scene1Null' });

layers.push({
  kind: 'text',
  name: 'Axis title',
  text: COPY.axisTitle,
  fontSize: 26,
  fontWeight: 600,
  color: COLORS.mist300,
  position: [PAD.left * 0.16 + 40, H * 0.56],
  rotation: -90,
  justification: 'center',
  parent: 'scene1Null',
  ...fadeUpKeyframes(T.startAxis, 0.5),
});

layers.push({
  kind: 'text',
  name: 'Headline (act 1)',
  text: wrapText(COPY.headline, 40),
  fontSize: 46,
  fontWeight: 700,
  color: COLORS.paper050,
  position: [W * 0.06, H * 0.06 + 46 * 0.75],
  justification: 'left',
  parent: 'scene1Null',
  ...riseInKeyframes(T.startHead, T.durHead),
});

layers.push({
  kind: 'text',
  name: 'Source note',
  text: COPY.sourceNote,
  fontSize: 14,
  fontWeight: 500,
  color: COLORS.mistFaint,
  position: [W * 0.94, H * 0.96],
  justification: 'right',
  parent: 'scene1Null',
  ...fadeUpKeyframes(T.startAxis, 0.5),
});

// gridlines: horizontal (value steps)
steps.forEach((v, i) => {
  const gy = yFn(v);
  const t0 = T.startGrid + i * gridHMult;
  layers.push({
    kind: 'shape',
    name: 'Gridline H ' + v.toLocaleString('en-US'),
    parent: 'scene1Null',
    path: { vertices: [[PAD.left, gy], [W - PAD.right, gy]], inTangents: [[0, 0], [0, 0]], outTangents: [[0, 0], [0, 0]], closed: false },
    stroke: { color: COLORS.mistFaint, width: 1, opacity: 22 },
    trimPath: { t0, t1: t0 + T.durGrid, from: 0, to: 100 },
  });

  layers.push({
    kind: 'text',
    name: 'Tick label Y ' + v.toLocaleString('en-US'),
    text: v.toLocaleString('en-US'),
    fontSize: 22,
    fontWeight: 500,
    color: COLORS.mist300,
    position: [PAD.left - 24, gy + 4],
    justification: 'right',
    parent: 'scene1Null',
    ...fadeUpKeyframes(T.startAxis + i * tickYMult, 0.7),
  });
});

// gridlines: vertical (every other data point) + X tick labels
let xLabelIndex = 0;
DATA.forEach((d, i) => {
  if (i % 2 !== 0) return;
  const gx = xFn(i);
  const xi = xLabelIndex;
  const t0 = T.startGrid + gridVBase + xi * gridVMult;

  layers.push({
    kind: 'shape',
    name: 'Gridline V ' + d.year,
    parent: 'scene1Null',
    path: { vertices: [[gx, PAD.top + plotH], [gx, PAD.top]], inTangents: [[0, 0], [0, 0]], outTangents: [[0, 0], [0, 0]], closed: false },
    stroke: { color: COLORS.mistFaint, width: 1, opacity: 22 },
    trimPath: { t0, t1: t0 + T.durGrid, from: 0, to: 100 },
  });

  layers.push({
    kind: 'text',
    name: 'Tick label X ' + d.year,
    text: String(d.year),
    fontSize: 22,
    fontWeight: 500,
    color: COLORS.mist300,
    position: [gx, PAD.top + plotH + 55],
    justification: 'center',
    parent: 'scene1Null',
    ...fadeUpKeyframes(T.startAxis + tickXBase + xi * tickXMult, 0.7),
  });
  xLabelIndex++;
});

// area fill (wipe reproduced as a keyframed mask rectangle, matching the
// chart's own clipPath rect: x fixed at PAD.left, width 0 -> plotW)
{
  const parsedArea = parseSvgPath(areaD);
  layers.push({
    kind: 'shape',
    name: 'Area fill',
    parent: 'scene1Null',
    path: parsedArea,
    fill: { color: COLORS.mint400, opacity: 18 },
    maskRect: {
      t0: T.startFill,
      t1: T.startFill + T.durFill,
      x0: PAD.left,
      x1: PAD.left, // width starts at 0
      x1End: PAD.left + plotW,
      yTop: 0,
      yBottom: H,
    },
  });
}

// main line (trim path draw-on)
layers.push({
  kind: 'shape',
  name: 'Line path',
  parent: 'scene1Null',
  path: parsedLine,
  stroke: { color: COLORS.mint400, width: 3.2, opacity: 100, cap: 'round' },
  trimPath: { t0: T.startLine, t1: T.startLine + T.durLine, from: 0, to: 100 },
});

// leading dot: sampled position along the arc length (linear-time == linear
// arc-length, matching the chart's CSS offset-distance 0%->100% linear)
{
  const N = 28;
  const positionKf = [];
  for (let s = 0; s <= N; s++) {
    const frac = s / N;
    const pt = pointAtFraction(arc, frac);
    positionKf.push({ t: T.startLine + frac * T.durLine, v: pt });
  }
  layers.push({
    kind: 'shape',
    name: 'Leading dot',
    parent: 'scene1Null',
    ellipse: { r: 6 },
    fill: { color: COLORS.paper050, opacity: 100 },
    opacity: [{ t: T.startLine, v: 0 }, { t: T.startLine + 0.3, v: 100 }],
    position: positionKf,
  });
}

// data point markers (pop in as the line reaches them)
DATA.forEach((d, i) => {
  const px = xFn(i);
  const py = yFn(d.value);
  const frac = i === 0 ? 0 : i === DATA.length - 1 ? 1 : fractionForX(arc, px);
  const delay = i === 0 ? drawStartSec - firstDotPause : drawStartSec + frac * drawDurSec;
  layers.push({
    kind: 'shape',
    name: 'Datapoint ' + d.year,
    parent: 'scene1Null',
    ellipse: { r: 5.5 },
    fill: { color: COLORS.ash950, opacity: 100 },
    stroke: { color: COLORS.mint400, width: 2, opacity: 100 },
    position: [{ t: delay, v: [px, py] }],
    popIn: { t0: delay, dur: 0.45 },
  });
});

// -- SCENE 1 EXIT (whole scene 1 collapses out) --
layers.push({
  kind: 'nullAnim',
  targetId: 'scene1Null',
  opacity: [{ t: T.startScene2, v: 100 }, { t: T.startScene2 + T.durCollapse, v: 0 }],
  scale: [{ t: T.startScene2, v: 100 }, { t: T.startScene2 + T.durCollapse, v: 97 }],
  fastBlur: [{ t: T.startScene2, v: 0 }, { t: T.startScene2 + T.durCollapse, v: 2 }],
});

// -- SCENE 2 ----------------------------------------------------------------
layers.push({
  kind: 'text',
  name: 'Headline (act 2)',
  text: wrapText(COPY.headline2, 40),
  fontSize: 46,
  fontWeight: 700,
  color: COLORS.paper050,
  position: [W * 0.06, H * 0.06 + 46 * 0.75],
  justification: 'left',
  ...riseInKeyframes(T.startHeadline2, T.durHeadline2),
});

layers.push({ kind: 'null', name: 'DUO — hero column', id: 'duoHeroNull' });
{
  const rise = riseInKeyframes(T.startHero, 0.5);
  layers.push({ kind: 'nullAnim', targetId: 'duoHeroNull', opacity: rise.opacity, positionOffset: rise.positionOffset });
}

layers.push({
  kind: 'text',
  name: 'Hero — "Less than"',
  text: COPY.heroLessThan,
  fontSize: 20,
  fontWeight: 600,
  color: COLORS.mist300,
  position: [W * 0.30, H * 0.44],
  justification: 'center',
  parent: 'duoHeroNull',
  ...fadeUpKeyframes(T.startHero, 0.4),
});

// hero counting number: discrete Source Text keyframes standing in for the
// CSS counter() animation (0 -> heroFinalCount, linear)
{
  const steps_ = 24;
  const textKf = [];
  for (let s = 0; s <= steps_; s++) {
    const frac = s / steps_;
    const val = Math.round(frac * heroFinalCount);
    textKf.push({ t: T.startHero + frac * T.durHeroCount, v: val.toLocaleString('en-US') });
  }
  layers.push({
    kind: 'text',
    name: 'Hero — counting number',
    textKeyframes: textKf,
    fontSize: 96,
    fontWeight: 700,
    color: COLORS.mint400,
    position: [W * 0.30, H * 0.60],
    justification: 'center',
    parent: 'duoHeroNull',
    opacity: [
      { t: T.startHero, v: 0 },
      { t: T.startHero + 0.15, v: 100 },
      { t: T.startHero + T.durHeroCount, v: 100 },
      { t: T.startHero + T.durHeroCount + 0.3, v: 0 },
    ],
  });
}

layers.push({
  kind: 'text',
  name: 'Hero — final value',
  text: COPY.heroFinal,
  fontSize: 96,
  fontWeight: 700,
  color: COLORS.mint400,
  position: [W * 0.30, H * 0.60],
  justification: 'center',
  parent: 'duoHeroNull',
  opacity: [
    { t: T.startHero + T.durHeroCount, v: 0 },
    { t: T.startHero + T.durHeroCount + T.durHeroSwap, v: 100 },
  ],
});

layers.push({
  kind: 'text',
  name: 'Hero caption',
  text: COPY.duoCapHero,
  fontSize: 16,
  fontWeight: 600,
  color: COLORS.mist300,
  position: [W * 0.30, H * 0.74],
  justification: 'center',
  parent: 'duoHeroNull',
  ...fadeUpKeyframes(T.startHero, 0.4),
});

layers.push({ kind: 'null', name: 'DUO — ring column', id: 'duoRingNull' });
{
  const rise = riseInKeyframes(T.startRing, 0.5);
  layers.push({ kind: 'nullAnim', targetId: 'duoRingNull', opacity: rise.opacity, positionOffset: rise.positionOffset });
}

layers.push({
  kind: 'shape',
  name: 'Ring — track',
  parent: 'duoRingNull',
  ellipseRing: { r: ringRadius },
  position: [W * 0.68, H * 0.58],
  stroke: { color: COLORS.mistFaint, width: 10, opacity: 20 },
  opacity: [{ t: T.startRing, v: 0 }, { t: T.startRing + 0.4, v: 100 }],
});

layers.push({
  kind: 'shape',
  name: 'Ring — progress',
  parent: 'duoRingNull',
  ellipseRing: { r: ringRadius },
  position: [W * 0.68, H * 0.58],
  rotation: -90,
  stroke: { color: COLORS.mint400, width: 10, opacity: 100 },
  trimPath: { t0: T.startRing, t1: T.startRing + T.durRing, from: 0, to: ringPctTarget },
  opacity: [{ t: T.startRing, v: 0 }, { t: T.startRing + 0.4, v: 100 }],
});

{
  const steps_ = 24;
  const textKf = [];
  for (let s = 0; s <= steps_; s++) {
    const frac = s / steps_;
    const val = Math.round(frac * ringPctTarget);
    textKf.push({ t: T.startRing + frac * T.durRing, v: val + '%' });
  }
  layers.push({
    kind: 'text',
    name: 'Ring — percent counter',
    textKeyframes: textKf,
    fontSize: 96,
    fontWeight: 700,
    color: COLORS.paper050,
    position: [W * 0.68, H * 0.58],
    justification: 'center',
    parent: 'duoRingNull',
    opacity: [{ t: T.startRing, v: 0 }, { t: T.startRing + 0.4, v: 100 }],
  });
}

layers.push({
  kind: 'text',
  name: 'Ring caption',
  text: COPY.duoCapRing,
  fontSize: 16,
  fontWeight: 600,
  color: COLORS.mist300,
  position: [W * 0.68, H * 0.74],
  justification: 'center',
  parent: 'duoRingNull',
  ...fadeUpKeyframes(T.startRing, 0.4),
});

// ---------------------------------------------------------------------------
// 8b. Scene 1 exit fade. AE layer parenting only inherits transform
// (position/rotation/scale/anchor) — NOT opacity. The "SCENE 1 (controls
// exit collapse)" null's own opacity ramp-down (see the nullAnim block
// above) never reaches its children, so every Scene 1 layer would
// otherwise sit at its own default 100% opacity for the entire comp,
// permanently overlapping Scene 2 once it starts. Give every Scene 1
// layer its own fade-out across the same collapse window the null uses,
// appended onto whatever opacity keyframes (entrance fade, pop-in, etc.)
// it already has — order doesn't matter, setValueAtTime just places each
// keyframe at its own time regardless of call order.
// ---------------------------------------------------------------------------
const scene1ExitT0 = T.startScene2;
const scene1ExitT1 = T.startScene2 + T.durCollapse;
layers.forEach((spec) => {
  if (spec.parent !== 'scene1Null') return;
  if (spec.kind !== 'shape' && spec.kind !== 'text') return;
  const existing = Array.isArray(spec.opacity) ? spec.opacity : [];
  spec.opacity = existing.concat([
    { t: scene1ExitT0, v: 100 },
    { t: scene1ExitT1, v: 0 },
  ]);
});

// ---------------------------------------------------------------------------
// 9. write out CHART JSON + ES3 runtime
// ---------------------------------------------------------------------------

const CHART = {
  meta: {
    compName: 'Cooling Curve — AE Export',
    width: W,
    height: H,
    frameRate: 30,
    durationSeconds: Math.ceil(T.total) + 1,
    bgColor: COLORS.ash950,
  },
  layers,
};

const generatedComment = [
  '// AUTO-GENERATED by ae-export/generate-jsx.mjs — do not hand-edit.',
  '// Source chart: 1a-cooling-curve.html (read-only reference; never modified).',
  '// Regenerate with: node ae-export/generate-jsx.mjs',
  '// Generated: ' + new Date().toISOString(),
  '',
].join('\n');

const dataDeclaration = 'var CHART = ' + JSON.stringify(CHART, null, 2) + ';\n\n';

const runtimeTemplate = fs.readFileSync(RUNTIME_TEMPLATE_PATH, 'utf8');

const output = generatedComment + dataDeclaration + runtimeTemplate;

// ---------------------------------------------------------------------------
// 10. lightweight ES3-safety self-check on the file we are about to emit
// ---------------------------------------------------------------------------

function assertEs3Safe(text) {
  const problems = [];
  // strip strings/comments crudely before scanning for forbidden tokens
  const stripped = text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

  if (/=>/.test(stripped)) problems.push('arrow function ("=>") found');
  if (/\bconst\b/.test(stripped)) problems.push('"const" found');
  if (/\blet\b/.test(stripped)) problems.push('"let" found');
  if (/`/.test(stripped)) problems.push('template literal backtick found');
  if (/\bclass\s+\w+/.test(stripped)) problems.push('"class" declaration found');
  if (/\.\.\./.test(stripped)) problems.push('spread/rest ("...") found');
  return problems;
}

const problems = assertEs3Safe(output);
if (problems.length) {
  console.error('ES3-safety check FAILED for generated output:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, output, 'utf8');

console.log('ES3-safety check passed.');
console.log('Wrote ' + OUTPUT_PATH + ' (' + layers.length + ' layer specs, ' + output.length + ' bytes).');
console.log('Timeline total: ' + T.total + 's; line-draw ' + T.startLine + 's -> ' + (T.startLine + T.durLine) + 's; ring ' + T.startRing + 's -> ' + (T.startRing + T.durRing) + 's.');
