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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
