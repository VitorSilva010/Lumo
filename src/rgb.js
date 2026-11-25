// === LUMO v2.6.1 — MODO RGB (CHROMA SUAVE DE BAIXO CONSUMO) ===
(function initLumoRgb() {
  let rgbTimer = null;
  let rgbActive = false;
  let hue = parseFloat(localStorage.getItem('lumo_rgb_hue') || '150') || 150;

  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  function toHex(r, g, b) {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function paintHue(deg) {
    const [r, g, b] = hslToRgb(((deg % 360) + 360) % 360, 0.88, 0.68);
    const root = document.documentElement.style;
    root.setProperty('--accent', toHex(r, g, b));
    root.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.15)`);
    root.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.44)`);
  }

  function stopRgb() {
    rgbActive = false;
    if (rgbTimer) {
      clearInterval(rgbTimer);
      rgbTimer = null;
    }
    document.body.classList.remove('theme-rgb');
  }

  function startRgb(withFeedback = false) {
    stopRgb();
    rgbActive = true;
    document.body.classList.add('theme-rgb');
    localStorage.setItem('lumo_theme', 'rgb');
    document.querySelectorAll('.theme-dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.theme === 'rgb');
    });

    paintHue(hue);
    let ticks = 0;
    rgbTimer = setInterval(() => {
      if (window.lumoEcoMode || document.hidden) return;
      if (!rgbActive || document.hidden) return;
      hue = (hue + 1.3) % 360;
      paintHue(hue);
      if (++ticks % 40 === 0) {
        localStorage.setItem('lumo_rgb_hue', String(Math.round(hue)));
      }
    }, 80);

    if (withFeedback) {
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(520, 920, 0.18);
      if (typeof say === 'function') say('Modo RGB ativado! 🌈', 2400, true);
    }
  }

  // Injeta a bolinha arco-íris na paleta de temas
  const dotsWrap = document.querySelector('.theme-dots');
  if (dotsWrap && !dotsWrap.querySelector('[data-theme="rgb"]')) {
    const dot = document.createElement('div');
    dot.className = 'theme-dot theme-dot-rgb';
    dot.dataset.theme = 'rgb';
    dot.title = 'Modo RGB (troca de cor sozinho)';
    dot.onclick = () => window.setTheme('rgb', dot);
    dotsWrap.appendChild(dot);
  }

  // Intercepta setTheme e applyCustomHex para ligar/desligar o RGB sem conflito
  if (typeof window.setTheme === 'function') {
    const _origSetTheme = window.setTheme;
    window.setTheme = function (name, el, proOnly = false) {
      if (name === 'rgb') {
        startRgb(Boolean(el));
        return;
      }
      stopRgb();
      return _origSetTheme.call(this, name, el, proOnly);
    };
  }

  if (typeof window.applyCustomHex === 'function') {
    const _origCustom = window.applyCustomHex;
    window.applyCustomHex = function (...args) {
      stopRgb();
      return _origCustom.apply(this, args);
    };
  }

  window.startLumoRgb = startRgb;
  window.stopLumoRgb = stopRgb;

  // Restaura o Modo RGB automaticamente se era o tema salvo
  const restoreIfSaved = () => {
    if (localStorage.getItem('lumo_theme') === 'rgb' && !rgbActive) {
      startRgb(false);
    }
  };
  restoreIfSaved();
  window.addEventListener('DOMContentLoaded', () => setTimeout(restoreIfSaved, 120));
})();
