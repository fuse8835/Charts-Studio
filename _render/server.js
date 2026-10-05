const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8793;
const OUTPUT_DIR = path.join(os.homedir(), 'Desktop', 'Charts-Studio');
const CHARTS_PATH = path.join(__dirname, 'charts.json');

// Read fresh on every request instead of caching at startup -- this server stays running for
// hours/days across many chart edits, and a stale in-memory copy silently re-renders with old
// timing/duration values after charts.json changes (caught 2026-08-26: a duration edit meant to
// fix a cut-off ring animation had no effect until the process was restarted).
function getCharts() {
  return JSON.parse(fs.readFileSync(CHARTS_PATH, 'utf8'));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mov': 'video/quicktime',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, decodeURIComponent(rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end('not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

let rendering = false;

// Per-render overrides, honoured only when the caller passes them (today: the CO2 overlay
// explainer, whose duration/resolution/fps are user controls rather than fixed in charts.json).
// Every existing chart renders with opts = {} and is completely unaffected.
function parseRenderOpts(searchParams) {
  const num = (k, lo, hi) => {
    const v = parseFloat(searchParams.get(k));
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined;
  };
  const rawName = (searchParams.get('name') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60);
  return {
    duration: num('duration', 0.5, 180),
    fps: [24, 25, 30, 50, 60].includes(+searchParams.get('fps')) ? +searchParams.get('fps') : undefined,
    width: num('w', 320, 7680),
    height: num('h', 320, 7680),
    name: rawName || undefined,
    cfg: (searchParams.get('cfg') || '').slice(0, 20000) || undefined,
  };
}

async function renderChart(chart, send, opts = {}) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.accessSync(OUTPUT_DIR, fs.constants.W_OK);
  const duration = opts.duration || chart.duration;
  const outPath = path.join(OUTPUT_DIR, opts.name ? `${opts.name}-alpha.mov` : chart.mov);
  send(`Saving export to ${outPath}`);
  const { chromium } = require('playwright-core');
  const outDir = path.join(__dirname, `frames_${chart.id}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  send('Launching headless Chrome...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: opts.width || chart.width || 1920, height: opts.height || chart.height || 1200 },
    deviceScaleFactor: 1,
  });

  const cfgQuery = opts.cfg ? `&cfg=${encodeURIComponent(opts.cfg)}` : '';
  await page.goto(`http://localhost:${PORT}/${chart.html}?export${cfgQuery}`, { waitUntil: 'networkidle' });

  // Pages that animate with something other than CSS/Web Animations (e.g. a WebGL particle
  // simulation) expose window.__chartSeek(tMs): a synchronous, deterministic "draw the frame at
  // this time" function, plus an optional window.__chartReady promise. Everything else keeps the
  // original getAnimations() seeking untouched.
  const seekHook = await page.evaluate(async () => {
    if (typeof window.__chartSeek !== 'function') return false;
    if (window.__chartReady) {
      await Promise.race([
        window.__chartReady,
        new Promise((_, rej) => setTimeout(() => rej(new Error('page never became ready (check the browser console for script errors)')), 30000)),
      ]);
    }
    return true;
  });
  if (!seekHook) await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));

  const fps = opts.fps || 30;
  // Seek-hook pages render exactly [0, duration) with no hold, so a looping clip stays seamless.
  const holdSec = seekHook ? 0 : 1.0;
  const totalFrames = Math.round((duration + holdSec) * fps);
  const animEndMs = duration * 1000;

  for (let i = 0; i < totalFrames; i++) {
    const tMs = seekHook ? i * (1000 / fps) : Math.min(i * (1000 / fps), animEndMs);
    if (seekHook) {
      await page.evaluate((t) => window.__chartSeek(t), tMs);
    } else {
      await page.evaluate((t) => {
        document.getAnimations().forEach(a => { a.currentTime = t; });
      }, tMs);
    }
    await page.screenshot({
      path: path.join(outDir, `frame_${String(i).padStart(5, '0')}.png`),
      omitBackground: true,
    });
    if (i % 15 === 0) send(`Capturing frame ${i}/${totalFrames}...`);
  }

  await browser.close();

  // Verify every expected frame landed and isn't a zero-byte/truncated file before handing
  // the sequence to ffmpeg. ffmpeg's image2 demuxer silently stops (or skips) at a gap in
  // sequential numbering, which can bake a missing/corrupt frame into the encode without any
  // error here -- and a gap partway through a ProRes file is a plausible cause of the kind of
  // "Error retrieving frame N, substituting frame N-1" read failures Premiere logs on import.
  const missing = [];
  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(outDir, `frame_${String(i).padStart(5, '0')}.png`);
    let size = 0;
    try { size = fs.statSync(framePath).size; } catch { /* missing */ }
    if (size < 1024) missing.push(i);
  }
  if (missing.length) {
    throw new Error(
      `Capture produced ${missing.length} missing/empty frame(s) out of ${totalFrames} ` +
      `(first few: ${missing.slice(0, 10).join(', ')}) -- aborting before encoding a bad file. Re-run the render.`
    );
  }

  send(`Captured ${totalFrames} frames. Encoding ProRes 4444...`);

  // ProRes 4444 is the only format verified to reliably preserve alpha across every
  // real tool that matters (QuickTime, Finder, Premiere, After Effects). Two smaller
  // codec alternatives were tried and rejected outright (HEVC-with-alpha, GoPro CineForm
  // -- see chart-hevc-alpha-encoding memory before trying another codec here), but the
  // ProRes 4444 hardware encoder (prores_videotoolbox) turned out to be encoding at
  // roughly 3x Apple's own nominal ProRes 4444 bitrate, plus using 16-bit alpha precision
  // when 8-bit is standard. Switching to the software encoder (prores_ks) fixes both --
  // but bits_per_mb below ~1000 introduces visible banding on smooth background gradients
  // (confirmed via a contrast-stretch test isolating the gradient region; text/detail areas
  // look fine even much lower, which is why the first pass at 200 missed this). 1222 is the
  // lowest value that stayed clean in that test, and not coincidentally lines up with
  // Apple's own documented nominal 4444 rate -- so it's a principled floor, not a guess.
  // Confirmed via a real After Effects import test (Kevin verified transparency renders
  // correctly). Same codec/profile throughout, so no compatibility risk, just ~3.5x smaller
  // files than the old hardware-encoder defaults.
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-r', String(fps), '-i', path.join(outDir, 'frame_%05d.png'),
      '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le',
      '-bits_per_mb', '1222', '-alpha_bits', '8', '-vf', 'setsar=1:1', outPath,
    ]);
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });

  fs.rmSync(outDir, { recursive: true, force: true });
  send(`Done -- saved to ${outPath}`, true);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (u.pathname === '/api/charts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(getCharts()));
  }

  if (u.pathname === '/api/capabilities') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ seekHook: true, renderParams: ['duration', 'fps', 'w', 'h', 'name', 'cfg'] }));
  }

  if (u.pathname === '/api/render') {
    const id = u.searchParams.get('id');
    const chart = getCharts().find((c) => c.id === id);
    if (!chart) {
      res.writeHead(404);
      return res.end('unknown chart id');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const send = (msg, done = false) => {
      res.write(`event: ${done ? 'done' : 'message'}\ndata: ${msg}\n\n`);
      if (done) res.end();
    };

    if (rendering) {
      send('Another render is already in progress on this server -- try again shortly.', true);
      return;
    }
    rendering = true;
    renderChart(chart, send, parseRenderOpts(u.searchParams))
      .catch((err) => send(`Render failed: ${err.message}`, true))
      .finally(() => { rendering = false; });
    return;
  }

  serveStatic(req, res, u.pathname);
});

server.listen(PORT, () => {
  console.log(`Chart studio running at http://localhost:${PORT}`);
});
