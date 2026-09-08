(function () {
  const scriptTag = document.currentScript;
  const chartId = scriptTag && scriptTag.getAttribute('data-chart-id');
  if (!chartId) return;

  function init() {
    const replayBtn = document.getElementById('replayBtn');
    const frame = document.getElementById('frame');
    if (!replayBtn || !frame) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute; top:6%; right:6%; z-index:5; display:flex; gap:8px; align-items:center;';
    replayBtn.parentNode.insertBefore(wrap, replayBtn);
    replayBtn.style.position = 'static';
    wrap.appendChild(replayBtn);

    const renderBtn = document.createElement('button');
    renderBtn.type = 'button';
    renderBtn.className = 'replay';
    renderBtn.style.position = 'static';
    renderBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/></svg> Render .mov';
    wrap.appendChild(renderBtn);

    const status = document.createElement('div');
    status.style.cssText =
      'position:absolute; top:calc(6% + 40px); right:6%; z-index:5; max-width:260px; text-align:right; ' +
      'font-family:Rajdhani,sans-serif; font-size:12px; color:#a9c2d6; text-shadow:0 1px 4px rgba(0,0,0,.6);';
    frame.appendChild(status);

    let busy = false;
    renderBtn.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      renderBtn.disabled = true;
      renderBtn.style.opacity = '.6';
      status.textContent = 'Starting render...';

      const es = new EventSource('/api/render?id=' + encodeURIComponent(chartId));
      es.onmessage = (e) => { status.textContent = e.data; };
      es.addEventListener('done', (e) => {
        status.textContent = e.data;
        es.close();
        busy = false;
        renderBtn.disabled = false;
        renderBtn.style.opacity = '';
      });
      es.onerror = () => {
        status.textContent = 'Render connection lost -- check the server terminal.';
        es.close();
        busy = false;
        renderBtn.disabled = false;
        renderBtn.style.opacity = '';
      };
    });

    initRuler(wrap, frame);
  }

  // ---- dev-only pixel ruler: click to drop an anchor, then move the mouse to
  // read the delta (in px) from that anchor -- so gaps/spacing can be reported
  // as real numbers instead of "a little more/less". Reads the chart's own
  // SVG viewBox units when present (matches layout constants like PAD.top in
  // the chart's own JS), otherwise falls back to on-screen CSS px. Off by
  // default, and never injected during a ?export capture.
  function initRuler(wrap, frame) {
    if (document.body.classList.contains('export-mode')) return;

    const rulerBtn = document.createElement('button');
    rulerBtn.type = 'button';
    rulerBtn.className = 'replay';
    rulerBtn.style.position = 'static';
    rulerBtn.title = 'Click to drop an anchor, then move the mouse to read the pixel gap from it. Click again to clear.';
    rulerBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 16 16 3l5 5-13 13z"/><path d="m7.5 11.5 2 2M11 8l2 2M14.5 4.5l2 2"/></svg> Ruler';
    wrap.appendChild(rulerBtn);

    const style = document.createElement('style');
    style.textContent =
      '.dev-ruler-overlay{position:absolute; inset:0; z-index:50; pointer-events:none; display:none;}' +
      '.dev-ruler-overlay.active{pointer-events:auto; cursor:crosshair;}' +
      '.dev-ruler-line{position:absolute; background:rgba(255,90,90,.6); display:none;}' +
      '.dev-ruler-line.h{left:0; right:0; height:1px;}' +
      '.dev-ruler-line.v{top:0; bottom:0; width:1px;}' +
      '.dev-ruler-anchor{position:absolute; width:9px; height:9px; margin:-4px 0 0 -4px; border-radius:50%; background:#ff5a5a; box-shadow:0 0 0 2px rgba(0,0,0,.5); display:none;}' +
      '.dev-ruler-tag{position:absolute; padding:5px 9px; border-radius:5px; background:rgba(10,14,20,.92); ' +
      'color:#f5f7fa; font:600 12px/1.35 ui-monospace,Menlo,Consolas,monospace; white-space:pre; pointer-events:none; ' +
      'box-shadow:0 4px 14px rgba(0,0,0,.4); display:none;}';
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'dev-ruler-overlay';
    overlay.innerHTML =
      '<div class="dev-ruler-line h cursor-h"></div>' +
      '<div class="dev-ruler-line v cursor-v"></div>' +
      '<div class="dev-ruler-line h anchor-h"></div>' +
      '<div class="dev-ruler-line v anchor-v"></div>' +
      '<div class="dev-ruler-anchor"></div>' +
      '<div class="dev-ruler-tag"></div>';
    frame.appendChild(overlay);

    const cursorH = overlay.querySelector('.cursor-h');
    const cursorV = overlay.querySelector('.cursor-v');
    const anchorH = overlay.querySelector('.anchor-h');
    const anchorV = overlay.querySelector('.anchor-v');
    const anchorDot = overlay.querySelector('.dev-ruler-anchor');
    const tag = overlay.querySelector('.dev-ruler-tag');

    let anchor = null; // {xPx, yPx} in frame-relative CSS px
    let rulerOn = false;

    function nativeUnit() {
      const svg = frame.querySelector('#chartSvg[viewBox]') ||
        frame.querySelector('svg.chart-svg[viewBox]') ||
        frame.querySelector('svg[viewBox]');
      const vb = svg && svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width && vb.height) return { w: vb.width, h: vb.height, label: 'u' };
      return null;
    }

    function place(el, xPx, yPx) { el.style.left = xPx + 'px'; el.style.top = yPx + 'px'; }

    function updateReadout(xPx, yPx) {
      const rect = frame.getBoundingClientRect();
      const unit = nativeUnit();
      const uw = unit ? unit.w : rect.width;
      const uh = unit ? unit.h : rect.height;
      const unitLabel = unit ? unit.label : 'px';
      const toUnit = (px, total, u) => Math.round((px / total) * u);
      const ux = toUnit(xPx, rect.width, uw);
      const uy = toUnit(yPx, rect.height, uh);
      const pctX = ((xPx / rect.width) * 100).toFixed(1);
      const pctY = ((yPx / rect.height) * 100).toFixed(1);

      cursorH.style.display = 'block'; place(cursorH, 0, yPx);
      cursorV.style.display = 'block'; place(cursorV, xPx, 0);

      const text = readoutText(xPx, yPx, ux, uy, pctX, pctY, unitLabel, rect, uw, uh, toUnit);
      showTag(text, xPx, yPx, rect);
      return text;
    }

    function readoutText(xPx, yPx, ux, uy, pctX, pctY, unitLabel, rect, uw, uh, toUnit) {
      let text = 'x ' + ux + unitLabel + '  y ' + uy + unitLabel + '\n(' + pctX + '%, ' + pctY + '%)';
      if (anchor) {
        const dux = toUnit(xPx - anchor.xPx, rect.width, uw);
        const duy = toUnit(yPx - anchor.yPx, rect.height, uh);
        text = 'Δx ' + dux + unitLabel + '  Δy ' + duy + unitLabel + '\n' + text;
      }
      return text;
    }

    function showTag(text, xPx, yPx, rect) {
      tag.textContent = text;
      tag.style.display = 'block';
      let tagX = xPx + 14, tagY = yPx + 14;
      if (tagX + 170 > rect.width) tagX = xPx - 170;
      if (tagY + 56 > rect.height) tagY = yPx - 62;
      place(tag, tagX, tagY);
    }

    function turnOff() {
      rulerOn = false;
      overlay.style.display = 'none';
      overlay.classList.remove('active');
      rulerBtn.style.background = '';
      anchor = null;
      anchorDot.style.display = 'none';
      anchorH.style.display = 'none';
      anchorV.style.display = 'none';
      cursorH.style.display = 'none';
      cursorV.style.display = 'none';
      tag.style.display = 'none';
    }

    overlay.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      updateReadout(e.clientX - rect.left, e.clientY - rect.top);
    });
    overlay.addEventListener('mouseleave', () => {
      cursorH.style.display = 'none';
      cursorV.style.display = 'none';
      tag.style.display = 'none';
    });
    overlay.addEventListener('click', (e) => {
      const rect = frame.getBoundingClientRect();
      const xPx = e.clientX - rect.left, yPx = e.clientY - rect.top;
      if (!anchor) {
        anchor = { xPx, yPx };
        anchorDot.style.display = 'block'; place(anchorDot, xPx, yPx);
        anchorH.style.display = 'block'; place(anchorH, 0, yPx);
        anchorV.style.display = 'block'; place(anchorV, xPx, 0);
        return;
      }
      // second click: finalize the measurement, copy it, then close the tool
      const text = updateReadout(xPx, yPx);
      const finish = () => {
        showTag('Copied to clipboard ✓', xPx, yPx, rect);
        setTimeout(turnOff, 700);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(finish, finish);
      } else {
        finish();
      }
    });

    rulerBtn.addEventListener('click', () => {
      if (rulerOn) { turnOff(); return; }
      rulerOn = true;
      overlay.style.display = 'block';
      overlay.classList.add('active');
      rulerBtn.style.background = 'rgba(4,255,186,.18)';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
