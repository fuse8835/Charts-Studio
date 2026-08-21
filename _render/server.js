const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8793;
const charts = JSON.parse(fs.readFileSync(path.join(__dirname, 'charts.json'), 'utf8'));

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

async function renderChart(chart, send) {
  const { chromium } = require('playwright-core');
  const outDir = path.join(__dirname, `frames_${chart.id}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  send('Launching headless Chrome...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 1,
  });

  await page.goto(`http://localhost:${PORT}/${chart.html}?export`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));

  const fps = 30;
  const holdSec = 1.0;
  const totalFrames = Math.round((chart.duration + holdSec) * fps);
  const animEndMs = chart.duration * 1000;

  for (let i = 0; i < totalFrames; i++) {
    const tMs = Math.min(i * (1000 / fps), animEndMs);
    await page.evaluate((t) => {
      document.getAnimations().forEach(a => { a.currentTime = t; });
    }, tMs);
    await page.screenshot({
      path: path.join(outDir, `frame_${String(i).padStart(5, '0')}.png`),
      omitBackground: true,
    });
    if (i % 15 === 0) send(`Capturing frame ${i}/${totalFrames}...`);
  }

  await browser.close();
  send(`Captured ${totalFrames} frames. Encoding HEVC with alpha...`);

  const outPath = path.join(ROOT, chart.mov);
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-r', '30', '-i', path.join(outDir, 'frame_%05d.png'),
      '-c:v', 'hevc_videotoolbox', '-tag:v', 'hvc1', '-pix_fmt', 'bgra',
      '-alpha_quality', '0.9', '-allow_sw', '1', '-vf', 'setsar=1:1', outPath,
    ]);
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });

  fs.rmSync(outDir, { recursive: true, force: true });
  send(`Done -- saved to ${chart.mov}`, true);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (u.pathname === '/api/charts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(charts));
  }

  if (u.pathname === '/api/render') {
    const id = u.searchParams.get('id');
    const chart = charts.find((c) => c.id === id);
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
    renderChart(chart, send)
      .catch((err) => send(`Render failed: ${err.message}`, true))
      .finally(() => { rendering = false; });
    return;
  }

  serveStatic(req, res, u.pathname);
});

server.listen(PORT, () => {
  console.log(`Chart studio running at http://localhost:${PORT}`);
});
