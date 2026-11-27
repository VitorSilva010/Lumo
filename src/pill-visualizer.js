// === LUMO v3.7.0 — VISUALIZADOR DE ONDAS NA CÁPSULA (5 ESTILOS · 30 FPS · BAIXA RAM) ===
(function initLumoPillVisualizer() {
  const pill = document.getElementById('lumo-pill');
  if (!pill) return;

  const MODES = ['dual', 'aurora', 'bars', 'wave', 'pulse', 'off'];
  const MODE_LABELS = {
    dual:   'Ondas Duplas',
    aurora: 'Aurora Tripla',
    bars:   'Barras + Pico',
    wave:   'Onda Suave',
    pulse:  'Pulso Central',
    off:    'Desligado'
  };

  let mode = localStorage.getItem('lumo_wave_style') || 'dual';
  if (!MODES.includes(mode)) mode = 'dual';

  let layer = document.getElementById('pill-wave-layer');
  let canvas = document.getElementById('pill-wave-canvas');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'pill-wave-layer';
    canvas = document.createElement('canvas');
    canvas.id = 'pill-wave-canvas';
    layer.appendChild(canvas);
    pill.insertBefore(layer, pill.firstChild);
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 160;
  let height = 54;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let musicPlaying = false;
  let musicVolume = 0.72;
  let energy = 0;
  let phase = 0;
  let accentColor = '#4ade80';
  let lastColorRead = 0;
  let rafId = 0;
  let lastFrame = 0;

  const BAR_COUNT = 17;
  const barLevels = new Float32Array(BAR_COUNT);
  const peakLevels = new Float32Array(BAR_COUNT);
  const barSeeds = Array.from({ length: BAR_COUNT }, (_, i) => ({
    f1: 2.1 + (i % 5) * 0.62 + Math.sin(i * 1.6) * 0.42,
    f2: 4.1 + ((i * 3) % 7) * 0.46,
    off: i * 0.74
  }));

  function resizeCanvas() {
    const r = pill.getBoundingClientRect();
    const w = Math.max(80, Math.round(r.width || 160));
    const h = Math.max(36, Math.round(r.height || 54));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === width && h === height && canvas.width === Math.round(w * dpr)) return;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function readAccent(now) {
    if (now - lastColorRead < 120) return accentColor;
    lastColorRead = now;
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (c) accentColor = c;
    return accentColor;
  }

  function isBlocked() {
    if (mode === 'off') return true;
    if (document.hidden) return true;
    if (window.lumoEcoMode) return true;
    if (document.body.classList.contains('lumo-eco') || document.body.classList.contains('reduced-motion')) return true;
    if (typeof isHiddenInGame !== 'undefined' && isHiddenInGame) return true;
    return false;
  }

  function detectPlayingState() {
    const face = document.getElementById('lumo-face');
    const faceMusic = Boolean(face && face.classList.contains('music'));
    const globalMedia = typeof isMediaPlaying !== 'undefined' && Boolean(isMediaPlaying);
    return Boolean(musicPlaying || faceMusic || globalMedia);
  }

  // 1. Barras simétricas com Peak Hold (pontinhos de pico)
  function drawBars(col, t) {
    const padX = 14;
    const usableW = Math.max(40, width - padX * 2);
    const step = usableW / BAR_COUNT;
    const barW = Math.max(2.3, Math.min(3.9, step * 0.46));
    const maxH = Math.min(22, height * 0.42);
    const center = (BAR_COUNT - 1) / 2;

    const grad = ctx.createLinearGradient(0, height - maxH - 2, 0, height);
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(255,255,255,0.06)');

    for (let i = 0; i < BAR_COUNT; i++) {
      const dist = Math.abs(i - center) / Math.max(1, center);
      const weight = 1 - dist * 0.52;
      const sd = barSeeds[i];

      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 3.5 - dist * 1.15), 2);
      const ripple = 0.5 + 0.5 * Math.sin(t * sd.f1 + sd.off) * Math.cos(t * sd.f2 * 0.65);
      const raw = (0.2 + beat * 0.5 + ripple * 0.3) * weight * energy;

      const prev = barLevels[i];
      barLevels[i] = raw > prev ? prev + (raw - prev) * 0.46 : prev + (raw - prev) * 0.19;
      if (barLevels[i] > peakLevels[i]) peakLevels[i] = barLevels[i];
      else peakLevels[i] = Math.max(barLevels[i], peakLevels[i] - 0.018);

      const h = Math.max(2, barLevels[i] * maxH);
      const x = padX + i * step + (step - barW) / 2;
      const y = height - h - 2;

      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, barW, h, [barW / 2, barW / 2, 1, 1]);
      else ctx.rect(x, y, barW, h);
      ctx.fill();

      // Pontinho de pico flutuando acima da barra
      const py = height - Math.max(3, peakLevels[i] * maxH) - 4.5;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.78 * energy;
      ctx.fillRect(x, py, barW, 1.8);
    }
    ctx.globalAlpha = 1;
  }

  // 2. Onda suave na base (2 camadas)
  function drawWave(col, t) {
    const baseY = height - 9;
    const ampMax = Math.min(10, height * 0.2) * energy;
    for (let k = 0; k < 2; k++) {
      const freq = k === 0 ? 0.048 : 0.072;
      const speed = k === 0 ? 3.8 : -2.9;
      const amp = ampMax * (k === 0 ? 1 : 0.6);

      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const env = Math.sin((x / width) * Math.PI);
        const y = baseY - Math.sin(x * freq + t * speed) * Math.cos(x * 0.02 + t * 1.6) * amp * env;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (k === 0) {
        ctx.save();
        ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
        const fg = ctx.createLinearGradient(0, baseY - ampMax - 2, 0, height);
        fg.addColorStop(0, col); fg.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.2; ctx.fillStyle = fg; ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = k === 0 ? 1.8 : 1.1;
      ctx.globalAlpha = k === 0 ? 0.68 : 0.36;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 3. Ondas Duplas Espelhadas (Topo + Base abraçando o mascote)
  function drawDualWaves(col, t) {
    const ampMax = Math.min(8.5, height * 0.17) * energy;
    const drawEdge = (isTop) => {
      const baseY = isTop ? 8 : height - 8;
      const dir = isTop ? 1 : -1;
      for (let k = 0; k < 2; k++) {
        const freq = k === 0 ? 0.052 : 0.078;
        const speed = (isTop ? -1 : 1) * (k === 0 ? 3.6 : -2.7);
        const amp = ampMax * (k === 0 ? 1 : 0.56);

        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const env = Math.sin((x / width) * Math.PI);
          const wave = Math.sin(x * freq + t * speed) * Math.cos(x * 0.022 + t * 1.45);
          const y = baseY + dir * wave * amp * env;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }

        if (k === 0) {
          ctx.save();
          ctx.lineTo(width, isTop ? 0 : height);
          ctx.lineTo(0, isTop ? 0 : height);
          ctx.closePath();
          const fg = ctx.createLinearGradient(0, isTop ? 0 : height, 0, baseY + dir * ampMax);
          fg.addColorStop(0, col);
          fg.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = fg;
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = k === 0 ? 1.7 : 1.0;
        ctx.globalAlpha = k === 0 ? 0.66 : 0.34;
        ctx.stroke();
      }
    };
    drawEdge(false);
    drawEdge(true);
    ctx.globalAlpha = 1;
  }

  // 4. Aurora Tripla (3 camadas sobrepostas cheias de movimento)
  function drawAurora(col, t) {
    const baseY = height - 11;
    const layers = [
      { freq: 0.036, speed: 3.1, amp: 12, lw: 2.1, alpha: 0.68, fill: 0.22 },
      { freq: 0.058, speed: -2.5, amp: 8.5, lw: 1.5, alpha: 0.48, fill: 0.14 },
      { freq: 0.082, speed: 4.3, amp: 5.5, lw: 1.1, alpha: 0.34, fill: 0.08 }
    ];
    for (const l of layers) {
      const amp = l.amp * energy;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const env = Math.sin((x / width) * Math.PI);
        const y = baseY - Math.sin(x * l.freq + t * l.speed) * Math.cos(x * 0.019 - t * 1.2) * amp * env;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.save();
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
      const fg = ctx.createLinearGradient(0, baseY - amp - 2, 0, height);
      fg.addColorStop(0, col); fg.addColorStop(1, 'transparent');
      ctx.globalAlpha = l.fill; ctx.fillStyle = fg; ctx.fill();
      ctx.restore();

      ctx.strokeStyle = col;
      ctx.lineWidth = l.lw;
      ctx.globalAlpha = l.alpha;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 5. Pulso Central (anéis suaves expandindo no ritmo)
  function drawPulse(col, t) {
    const cx = width / 2;
    const cy = height / 2;
    const maxRx = width * 0.46;
    const maxRy = height * 0.44;

    for (let i = 0; i < 3; i++) {
      const p = (t * 0.55 + i / 3) % 1;
      const ease = 1 - Math.pow(1 - p, 2);
      const rx = Math.max(8, ease * maxRx);
      const ry = Math.max(6, ease * maxRy);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6 * (1 - p * 0.5);
      ctx.globalAlpha = (1 - p) * 0.52 * energy;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    rafId = 0;
    if (isBlocked()) {
      layer.classList.remove('active');
      ctx.clearRect(0, 0, width, height);
      energy = 0;
      return;
    }

    if (now - lastFrame < 32) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.08, (now - lastFrame) / 1000 || 0.033);
    lastFrame = now;

    const active = detectPlayingState();
    const volScale = Math.max(0.38, Math.min(1, musicVolume));
    const targetEnergy = active ? volScale : 0;
    energy += (targetEnergy - energy) * (active ? 0.18 : 0.14);

    if (energy < 0.015 && !active) {
      energy = 0;
      layer.classList.remove('active');
      ctx.clearRect(0, 0, width, height);
      return;
    }

    layer.classList.add('active');
    phase += dt * (0.95 + energy * 0.55);

    ctx.clearRect(0, 0, width, height);
    const col = readAccent(now);
    if (mode === 'dual') drawDualWaves(col, phase);
    else if (mode === 'aurora') drawAurora(col, phase);
    else if (mode === 'wave') drawWave(col, phase);
    else if (mode === 'pulse') drawPulse(col, phase);
    else drawBars(col, phase);

    rafId = requestAnimationFrame(tick);
  }

  function kick() {
    if (isBlocked()) {
      layer.classList.remove('active');
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      ctx.clearRect(0, 0, width, height);
      return;
    }
    if (!detectPlayingState() && energy <= 0.015) return;
    resizeCanvas();
    if (!rafId) {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener('lumo-music-state', (ev) => {
    const d = ev.detail || {};
    musicPlaying = Boolean(d.playing);
    if (typeof d.volume === 'number') musicVolume = Math.max(0, Math.min(1, d.volume / 100));
    kick();
  });

  const face = document.getElementById('lumo-face');
  if (face) new MutationObserver(kick).observe(face, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(kick).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resizeCanvas).observe(pill);

  window.LumoWave = {
    getMode() { return mode; },
    getLabel() { return MODE_LABELS[mode] || 'Ondas Duplas'; },
    setMode(next) {
      mode = MODES.includes(next) ? next : 'dual';
      localStorage.setItem('lumo_wave_style', mode);
      kick();
      return mode;
    },
    cycleMode() {
      const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      this.setMode(next);
      if (typeof say === 'function') say(`Ondas da cápsula: ${MODE_LABELS[next]}`, 1800, true);
      return next;
    },
    refresh: kick
  };

  setTimeout(() => { resizeCanvas(); kick(); }, 350);
})();
