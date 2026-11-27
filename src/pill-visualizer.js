// === LUMO v3.2.1 — VISUALIZADOR DE ONDAS & BARRAS NA CÁPSULA (30 FPS / BAIXA RAM) ===
(function initLumoPillVisualizer() {
  const pill = document.getElementById('lumo-pill');
  if (!pill || document.getElementById('pill-wave-layer')) return;

  const MODES = ['bars', 'wave', 'off'];
  const MODE_LABELS = { bars: 'Barras', wave: 'Onda', off: 'Desligado' };

  let mode = localStorage.getItem('lumo_wave_style') || 'bars';
  if (!MODES.includes(mode)) mode = 'bars';

  const layer = document.createElement('div');
  layer.id = 'pill-wave-layer';
  const canvas = document.createElement('canvas');
  canvas.id = 'pill-wave-canvas';
  layer.appendChild(canvas);
  pill.insertBefore(layer, pill.firstChild);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 160;
  let height = 54;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let musicPlaying = false;
  let musicVolume = 0.7;
  let energy = 0;
  let phase = 0;
  let accentColor = '#4ade80';
  let lastColorRead = 0;
  let rafId = 0;
  let lastFrame = 0;

  const BAR_COUNT = 15;
  const barLevels = new Float32Array(BAR_COUNT);
  const barSeeds = Array.from({ length: BAR_COUNT }, (_, i) => ({
    f1: 2.1 + (i % 5) * 0.63 + Math.sin(i * 1.7) * 0.4,
    f2: 4.3 + ((i * 3) % 7) * 0.48,
    off: i * 0.78
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

  function drawBars(col, t) {
    const padX = 16;
    const usableW = Math.max(40, width - padX * 2);
    const step = usableW / BAR_COUNT;
    const barW = Math.max(2.4, Math.min(4.2, step * 0.48));
    const maxH = Math.min(20, height * 0.38);
    const center = (BAR_COUNT - 1) / 2;

    // Gradiente vertical suave para as barras não disputarem foco com os olhos
    const grad = ctx.createLinearGradient(0, height - maxH - 2, 0, height);
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(255,255,255,0.06)');

    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.42;

    for (let i = 0; i < BAR_COUNT; i++) {
      const dist = Math.abs(i - center) / Math.max(1, center);
      const weight = 1 - dist * 0.55; // Graves mais altos no centro
      const sd = barSeeds[i];

      // Pulso orgânico simulando batida + harmônicos médios/agudos
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 3.4 - dist * 1.1), 2);
      const ripple = 0.5 + 0.5 * Math.sin(t * sd.f1 + sd.off) * Math.cos(t * sd.f2 * 0.65);
      const raw = (0.22 + beat * 0.48 + ripple * 0.3) * weight * energy;

      // Interpolação suave (ataque rápido, decaimento macio)
      const prev = barLevels[i];
      barLevels[i] = raw > prev ? prev + (raw - prev) * 0.46 : prev + (raw - prev) * 0.2;

      const h = Math.max(2, barLevels[i] * maxH);
      const x = padX + i * step + (step - barW) / 2;
      const y = height - h - 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barW, h, [barW / 2, barW / 2, 1, 1]);
      } else {
        ctx.rect(x, y, barW, h);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawWave(col, t) {
    const baseY = height - 9;
    const ampMax = Math.min(10, height * 0.2) * energy;

    for (let layerIdx = 0; layerIdx < 2; layerIdx++) {
      const freq = layerIdx === 0 ? 0.048 : 0.072;
      const speed = layerIdx === 0 ? 3.8 : -2.9;
      const amp = ampMax * (layerIdx === 0 ? 1 : 0.58);

      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const norm = x / width;
        const env = Math.sin(norm * Math.PI); // Zera suavemente nas bordas esquerda/direita
        const y = baseY - Math.sin(x * freq + t * speed) * Math.cos(x * 0.02 + t * 1.6) * amp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Preenchimento translúcido sutil abaixo da onda principal
      if (layerIdx === 0) {
        ctx.save();
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const fg = ctx.createLinearGradient(0, baseY - ampMax - 2, 0, height);
        fg.addColorStop(0, col);
        fg.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = fg;
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = col;
      ctx.lineWidth = layerIdx === 0 ? 1.8 : 1.1;
      ctx.globalAlpha = layerIdx === 0 ? 0.62 : 0.34;
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

    // Trava em ~30 FPS para economizar CPU/GPU
    if (now - lastFrame < 32) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.08, (now - lastFrame) / 1000 || 0.033);
    lastFrame = now;

    const active = detectPlayingState();
    const volScale = Math.max(0.35, Math.min(1, musicVolume));
    const targetEnergy = active ? volScale : 0;
    energy += (targetEnergy - energy) * (active ? 0.18 : 0.14);

    if (energy < 0.015 && !active) {
      energy = 0;
      layer.classList.remove('active');
      ctx.clearRect(0, 0, width, height);
      return;
    }

    layer.classList.add('active');
    phase += dt * (0.9 + energy * 0.55);

    ctx.clearRect(0, 0, width, height);
    const col = readAccent(now);
    if (mode === 'wave') drawWave(col, phase);
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

  // Ouve estado direto do Lumo Music (play/pause/volume)
  window.addEventListener('lumo-music-state', (ev) => {
    const d = ev.detail || {};
    musicPlaying = Boolean(d.playing);
    if (typeof d.volume === 'number') musicVolume = Math.max(0, Math.min(1, d.volume / 100));
    kick();
  });

  // Observa a classe .music no rosto (cobre também Spotify/Edge via GSMTC, Rádios e Músicas locais)
  const face = document.getElementById('lumo-face');
  if (face) {
    new MutationObserver(kick).observe(face, { attributes: true, attributeFilter: ['class'] });
  }
  new MutationObserver(kick).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resizeCanvas).observe(pill);
  }

  window.LumoWave = {
    getMode() { return mode; },
    getLabel() { return MODE_LABELS[mode] || 'Barras'; },
    setMode(next) {
      mode = MODES.includes(next) ? next : 'bars';
      localStorage.setItem('lumo_wave_style', mode);
      kick();
      return mode;
    },
    cycleMode() {
      const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      this.setMode(next);
      if (typeof say === 'function') say(`Visualizador da cápsula: ${MODE_LABELS[next]}`, 1800, true);
      return next;
    },
    refresh: kick
  };

  setTimeout(() => { resizeCanvas(); kick(); }, 350);
})();
