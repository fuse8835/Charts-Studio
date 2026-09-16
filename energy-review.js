(() => {
 if(document.body.classList.contains('export-mode'))return;
 const player=window.energyPlayer;
 const frame=document.getElementById('frame');
 const scrubber=document.getElementById('scrubber');
 const scrubTimeEl=document.getElementById('scrubTime');
 const scrubPlayBtn=document.getElementById('scrubPlayBtn');
 function setScrubTime(ms){player.seek(ms);update();}
 function update(){scrubber.value=player.now();scrubTimeEl.textContent=(player.now()/1000).toFixed(1)+'s';scrubPlayBtn.textContent=player.isPlaying()?'Ⅱ':'▶';}
 scrubber.addEventListener('input',()=>setScrubTime(Number(scrubber.value)));
 scrubPlayBtn.addEventListener('click',()=>{if(player.isPlaying())player.pause();else player.resume();update();});
 setInterval(update,100);update();
  // ---- review & annotate: pins + notes ----
  const pinsLayer = document.getElementById('pinsLayer');
  const notesList = document.getElementById('notesList');
  const addPinBtn = document.getElementById('addPinBtn');
  const copyNotesBtn = document.getElementById('copyNotesBtn');
  const feedbackOut = document.getElementById('feedbackOut');

  let pinMode = false;
  let pinSeq = 0;
  const pins = [];

  addPinBtn.addEventListener('click', () => {
    pinMode = !pinMode;
    if(pinMode) player.seek(player.now());
    addPinBtn.classList.toggle('is-active', pinMode);
    frame.classList.toggle('pin-mode', pinMode);
  });

  frame.addEventListener('click', (e) => {
    if (!pinMode) return;
    if (e.target.closest('.replay') || e.target.closest('.pin') || e.target.closest('.dev-ruler-overlay')) return;
    const rect = frame.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    pinSeq += 1;
    const pin = { id: pinSeq, num: pinSeq, xPct, yPct, timeMs: player.now(), text: '', variant: Number(frame.dataset.style) };
    pins.push(pin);
    renderPins();
    renderNotes();
    pinMode = false;
    addPinBtn.classList.remove('is-active');
    frame.classList.remove('pin-mode');
    requestAnimationFrame(() => {
      const ta = notesList.querySelector(`.note-text[data-id="${pin.id}"]`);
      if (ta) ta.focus();
    });
  });

  function renumberPins() { pins.forEach((p, i) => { p.num = i + 1; }); }

  function highlightPin(id) {
    const idx = pins.findIndex(p => p.id === id);
    Array.from(pinsLayer.children).forEach((el, i) => el.classList.toggle('is-active', i === idx));
  }

  function renderPins() {
    pinsLayer.innerHTML = '';
    pins.forEach(p => {
      const el = document.createElement('button');
      el.type='button';el.setAttribute('aria-label','Annotation '+p.num);
      el.className = 'pin';
      el.style.left = p.xPct + '%';
      el.style.top = p.yPct + '%';
      el.textContent = p.num;
      el.hidden = p.variant !== Number(frame.dataset.style);
      el.title = 'V'+p.variant+' · t=' + (p.timeMs / 1000).toFixed(1) + 's';
      el.addEventListener('click', () => { window.setEnergyVariant(p.variant); setScrubTime(p.timeMs); highlightPin(p.id); });
      pinsLayer.appendChild(el);
    });
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function renderNotes() {
    notesList.innerHTML = '';
    pins.forEach(p => {
      const li = document.createElement('li');
      li.className = 'note-row';

      const num = document.createElement('div');
      num.className = 'note-num';
      num.textContent = p.num;

      const time = document.createElement('button');
      time.type = 'button';
      time.className = 'note-time';
      time.textContent = 'V'+p.variant+' · t=' + (p.timeMs / 1000).toFixed(1) + 's';
      time.addEventListener('click', () => { window.setEnergyVariant(p.variant); setScrubTime(p.timeMs); highlightPin(p.id); });

      const textEl = document.createElement('textarea');
      textEl.className = 'note-text';
      textEl.rows = 1;
      textEl.placeholder = 'What should change here?';
      textEl.setAttribute('aria-label','Note '+p.num);
      textEl.value = p.text;
      textEl.dataset.id = p.id;
      textEl.addEventListener('input', () => { p.text = textEl.value; autoGrow(textEl); });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'note-del';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Delete note');
      del.addEventListener('click', () => {
        const i = pins.findIndex(x => x.id === p.id);
        if (i >= 0) pins.splice(i, 1);
        renumberPins();
        renderPins();
        renderNotes();
      });

      li.appendChild(num);
      li.appendChild(time);
      li.appendChild(textEl);
      li.appendChild(del);
      notesList.appendChild(li);
      autoGrow(textEl);
    });
  }

  function regionLabel(xPct, yPct) {
    const h = xPct < 33 ? 'left' : xPct < 67 ? 'center' : 'right';
    const v = yPct < 33 ? 'top' : yPct < 67 ? 'middle' : 'bottom';
    if (h === 'center' && v === 'middle') return 'center';
    if (v === 'middle') return h;
    if (h === 'center') return v;
    return `${v}-${h}`;
  }

  copyNotesBtn.addEventListener('click', async () => {
    const lines = pins.map(p => `${p.num}. [style=${p.variant} · t=${(p.timeMs / 1000).toFixed(1)}s · ${regionLabel(p.xPct, p.yPct)}, x=${p.xPct.toFixed(0)}%/y=${p.yPct.toFixed(0)}%] ${p.text.trim() || '(no note text)'}`);
    const text = lines.length ? 'Energy transition feedback\n'+lines.join('\n') : 'No notes added yet.';
    feedbackOut.value = text;
    autoGrow(feedbackOut);
    const original = copyNotesBtn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyNotesBtn.textContent = 'Copied!';
    } catch (err) {
      feedbackOut.focus();
      feedbackOut.select();
      copyNotesBtn.textContent = 'Select below ↓';
    }
    setTimeout(() => { copyNotesBtn.textContent = original; }, 1600);
  });

window.addEventListener('energy-style-change',renderPins);
})();
