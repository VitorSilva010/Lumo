// === LUMO v3.6.0 — MIXER DE SONS AMBIENTE NATIVO EM WEB AUDIO (OFFLINE & ULTRA-LEVE) ===
(function initLumoAmbientMixer() {
  const pane = document.getElementById('lm-ambient-pane');
  if (!pane) return;

  // Só monta o mixer se a aba estiver vazia (ou sem cartões)
  if (pane.querySelector('.card, button')) return;

  const S = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const SOUNDS = [
    { id: 'rain',   name: 'Chuva',         sub: 'Gota contínua',   ic: S('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M8 19v2"/><path d="M12 19v2"/><path d="M16 19v2"/>'), defVol: 55 },
    { id: 'vinyl',  name: 'Lo-Fi Vinil',   sub: 'Estalo quente',   ic: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 7a5 5 0 0 1 5 5"/>'), defVol: 45 },
    { id: 'fire',   name: 'Fogueira',      sub: 'Brasa & estalo',  ic: S('<path d="M12 2c.5 3.5-3 5.5-3 9.5a5 5 0 0 0 10 0c0-2.5-1.5-4.5-3-6 0 2-1.2 3-2 3 0-2.5.8-4.5-2-6.5z"/>'), defVol: 50 },
    { id: 'cafe',   name: 'Cafeteria',     sub: 'Murmúrio suave',  ic: S('<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/>'), defVol: 45 },
    { id: 'brown',  name: 'Ruído Marrom',  sub: 'Foco profundo',   ic: S('<path d="M2 12h3l2-5 4 10 3-7 2 2h6"/>'), defVol: 40 },
    { id: 'wind',   name: 'Brisa Noturna', sub: 'Vento suave',     ic: S('<path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/><path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/>'), defVol: 45 }
  ];

  let ctx = null;
  let mixWithMusic = localStorage.getItem('lumo_amb_mix_music') !== 'false';
  const activeNodes = new Map(); // id -> { gain, stop() }
  const volumes = {};
  for (const s of SOUNDS) volumes[s.id] = s.defVol;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function createNoiseBuffer(ac, type, seconds = 4) {
    const len = ac.sampleRate * seconds;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const out = buf.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        out[i] = (last + 0.02 * w) / 1.02;
        last = out[i];
        out[i] *= 3.2;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08;
        b6 = w * 0.115926;
      }
    } else {
      // Vinyl / fire crackle buffer
      for (let i = 0; i < len; i++) {
        const r = Math.random();
        out[i] = r > 0.9986 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.015;
      }
    }
    return buf;
  }

  function startSound(id) {
    if (activeNodes.has(id)) return;
    const ac = ensureCtx();
    const masterGain = ac.createGain();
    const vol = (volumes[id] || 45) / 100;
    masterGain.gain.setValueAtTime(0.001, ac.currentTime);
    masterGain.gain.linearRampToValueAtTime(vol * 0.42, ac.currentTime + 0.35);
    masterGain.connect(ac.destination);

    const sources = [];
    const lfos = [];

    if (id === 'rain') {
      const src = ac.createBufferSource();
      src.buffer = createNoiseBuffer(ac, 'pink', 5);
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1050; bp.Q.value = 0.55;
      src.connect(bp); bp.connect(masterGain);
      src.start(); sources.push(src);
    } else if (id === 'brown') {
      const src = ac.createBufferSource();
      src.buffer = createNoiseBuffer(ac, 'brown', 5);
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 340;
      src.connect(lp); lp.connect(masterGain);
      src.start(); sources.push(src);
    } else if (id === 'vinyl') {
      const crk = ac.createBufferSource();
      crk.buffer = createNoiseBuffer(ac, 'crackle', 4);
      crk.loop = true;
      const hp = ac.createBiquadFilter();
      hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 0.8;
      crk.connect(hp); hp.connect(masterGain);
      crk.start(); sources.push(crk);

      const warm = ac.createBufferSource();
      warm.buffer = createNoiseBuffer(ac, 'brown', 4);
      warm.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 180;
      const wg = ac.createGain(); wg.gain.value = 0.32;
      warm.connect(lp); lp.connect(wg); wg.connect(masterGain);
      warm.start(); sources.push(warm);
    } else if (id === 'fire') {
      const base = ac.createBufferSource();
      base.buffer = createNoiseBuffer(ac, 'brown', 4);
      base.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 230;
      base.connect(lp); lp.connect(masterGain);
      base.start(); sources.push(base);

      const pop = ac.createBufferSource();
      pop.buffer = createNoiseBuffer(ac, 'crackle', 4);
      pop.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.2;
      const pg = ac.createGain(); pg.gain.value = 0.65;
      pop.connect(bp); bp.connect(pg); pg.connect(masterGain);
      pop.start(); sources.push(pop);
    } else if (id === 'cafe') {
      const src = ac.createBufferSource();
      src.buffer = createNoiseBuffer(ac, 'pink', 5);
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.9;
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = 0.16; lfoG.gain.value = 120;
      lfo.connect(lfoG); lfoG.connect(bp.frequency);
      lfo.start(); lfos.push(lfo);
      src.connect(bp); bp.connect(masterGain);
      src.start(); sources.push(src);
    } else if (id === 'wind') {
      const src = ac.createBufferSource();
      src.buffer = createNoiseBuffer(ac, 'pink', 5);
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 2.1;
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = 0.11; lfoG.gain.value = 210;
      lfo.connect(lfoG); lfoG.connect(bp.frequency);
      lfo.start(); lfos.push(lfo);
      src.connect(bp); bp.connect(masterGain);
      src.start(); sources.push(src);
    }

    activeNodes.set(id, {
      gain: masterGain,
      stop() {
        try {
          masterGain.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.18);
          setTimeout(() => {
            sources.forEach((s) => { try { s.stop(); } catch (_) {} });
            lfos.forEach((l) => { try { l.stop(); } catch (_) {} });
            try { masterGain.disconnect(); } catch (_) {}
          }, 210);
        } catch (_) {}
      }
    });
  }

  function stopSound(id) {
    const n = activeNodes.get(id);
    if (!n) return;
    n.stop();
    activeNodes.delete(id);
  }

  function stopAllAmbient(force = false) {
    if (!force && mixWithMusic) return;
    for (const id of Array.from(activeNodes.keys())) stopSound(id);
    render();
  }

  function setSoundVol(id, val) {
    const v = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    volumes[id] = v;
    const n = activeNodes.get(id);
    if (n && ctx) {
      n.gain.gain.setTargetAtTime((v / 100) * 0.42, ctx.currentTime, 0.05);
    }
  }

  function render() {
    const activeCount = activeNodes.size;
    pane.innerHTML = `
      <div class="card">
        <div class="lm-amb-head">
          <div>
            <div class="label-xs" style="margin:0;">Mixer de Sons Ambiente</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">Misture sons leves para foco, estudo ou relaxar</div>
          </div>
          ${activeCount ? `<button type="button" class="btn-ghost" data-ambact="stopall" style="font-size:10px; padding:4px 9px;">Parar (${activeCount})</button>` : ''}
        </div>
        <div class="lm-amb-grid">
          ${SOUNDS.map((s) => {
            const on = activeNodes.has(s.id);
            return `<div class="lm-amb-card ${on ? 'on' : ''}" data-ambid="${s.id}">
              <div class="lm-amb-top">
                <span class="lm-amb-ic">${s.ic}</span>
                <div style="min-width:0; flex:1;">
                  <div class="lm-amb-name">${s.name}</div>
                  <div class="lm-amb-sub">${on ? volumes[s.id] + '% ativo' : s.sub}</div>
                </div>
              </div>
              <input type="range" class="lm-amb-slider" data-ambvol="${s.id}" min="5" max="100" value="${volumes[s.id]}" />
            </div>`;
          }).join('')}
        </div>
        <div class="lm-amb-foot">
          <span>Tocar junto com o Lumo Music</span>
          <label class="lp-switch">
            <input type="checkbox" ${mixWithMusic ? 'checked' : ''} data-ambmix="1" />
            <span class="lp-switch-track"></span>
          </label>
        </div>
      </div>`;
  }

  pane.addEventListener('click', (e) => {
    if (e.target.closest('[data-ambvol]') || e.target.closest('.lp-switch')) return;
    if (e.target.closest('[data-ambact="stopall"]')) { stopAllAmbient(true); return; }
    const card = e.target.closest('[data-ambid]');
    if (!card) return;
    const id = card.dataset.ambid;
    if (activeNodes.has(id)) stopSound(id);
    else startSound(id);
    render();
  });

  pane.addEventListener('input', (e) => {
    const sl = e.target.closest('[data-ambvol]');
    if (!sl) return;
    const id = sl.dataset.ambvol;
    if (!activeNodes.has(id)) startSound(id);
    setSoundVol(id, sl.value);
    const sub = sl.closest('.lm-amb-card')?.querySelector('.lm-amb-sub');
    if (sub) sub.textContent = sl.value + '% ativo';
    sl.closest('.lm-amb-card')?.classList.add('on');
  });

  pane.addEventListener('change', (e) => {
    if (e.target.dataset?.ambmix) {
      mixWithMusic = e.target.checked;
      localStorage.setItem('lumo_amb_mix_music', String(mixWithMusic));
    }
  });

  const prevStopAmbient = window.stopAmbient;
  window.stopAmbient = function () {
    stopAllAmbient(false);
    if (typeof prevStopAmbient === 'function' && !mixWithMusic) {
      try { prevStopAmbient(); } catch (_) {}
    }
  };

  render();
})();
