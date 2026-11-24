const DEFAULT_WIDGETS = {
  telemetry: true,
  motd: true,
  media: true,
  hub: true,
  tasks: true,
  news: true,
  dock: true
};

let uiSurface = localStorage.getItem('lumo_surface') || 'obsidian';
let uiRadius = localStorage.getItem('lumo_radius') || 'round';
let uiOpacity = parseInt(localStorage.getItem('lumo_opacity') || '97', 10);
if (Number.isNaN(uiOpacity) || uiOpacity < 72 || uiOpacity > 100) uiOpacity = 97;

let uiWidgets = { ...DEFAULT_WIDGETS };
try {
  const savedW = JSON.parse(localStorage.getItem('lumo_widgets') || 'null');
  if (savedW && typeof savedW === 'object') uiWidgets = { ...DEFAULT_WIDGETS, ...savedW };
} catch (_) {}

function applySurface(name, feedback = false) {
  uiSurface = name || 'obsidian';
  document.body.classList.remove('surface-obsidian', 'surface-midnight', 'surface-oled', 'surface-graphite', 'surface-light');
  document.body.classList.add('surface-' + uiSurface);
  localStorage.setItem('lumo_surface', uiSurface);
  document.querySelectorAll('.surface-btn').forEach((b) => {
    b.classList.toggle('active-btn', b.dataset.surface === uiSurface);
  });
  if (feedback && typeof playChirp === 'function') {
    playChirp(540, 780, 0.14);
    if (typeof hopPill === 'function') hopPill();
  }
}

function applyRadius(mode, feedback = false) {
  uiRadius = mode || 'round';
  document.body.classList.remove('radius-sharp', 'radius-round', 'radius-soft');
  document.body.classList.add('radius-' + uiRadius);
  localStorage.setItem('lumo_radius', uiRadius);
  document.querySelectorAll('.radius-btn').forEach((b) => {
    b.classList.toggle('active-btn', b.dataset.radius === uiRadius);
  });
  if (feedback && typeof playChirp === 'function') playChirp(520, 700, 0.12);
}

function applyOpacity(val) {
  const pct = Math.max(72, Math.min(100, parseInt(val, 10) || 97));
  uiOpacity = pct;
  document.documentElement.style.setProperty('--panel-alpha', (pct / 100).toFixed(2));
  localStorage.setItem('lumo_opacity', String(pct));
  const lbl = document.getElementById('opacity-val');
  if (lbl) lbl.textContent = pct + '%';
  const rng = document.getElementById('opacity-slider');
  if (rng && String(rng.value) !== String(pct)) rng.value = pct;
}

function getWidgetElement(key) {
  const resumo = document.getElementById('view-resumo');
  if (!resumo) return null;
  if (key === 'telemetry') return resumo.querySelector('.telemetry-grid');
  if (key === 'motd') return resumo.querySelector('.motd-card');
  if (key === 'media') return document.getElementById('mini-media-strip');
  if (key === 'hub') return resumo.querySelector('.hub-grid');
  if (key === 'tasks') return document.getElementById('task-list')?.closest('.card') || null;
  if (key === 'news') return resumo.querySelector('.news-card');
  if (key === 'dock') return resumo.querySelector('.quick-ai-dock');
  return null;
}

function applyAllWidgets() {
  Object.keys(DEFAULT_WIDGETS).forEach((key) => {
    const on = uiWidgets[key] !== false;
    const el = getWidgetElement(key);
    if (el) el.classList.toggle('cust-hidden', !on);
    const chip = document.querySelector(`.widget-chip[data-widget="${key}"]`);
    if (chip) chip.classList.toggle('on', on);
  });
}

function toggleWidget(key) {
  if (!(key in DEFAULT_WIDGETS)) return;
  uiWidgets[key] = uiWidgets[key] === false;
  localStorage.setItem('lumo_widgets', JSON.stringify(uiWidgets));
  applyAllWidgets();
  if (typeof playChirp === 'function') playChirp(uiWidgets[key] ? 580 : 440, uiWidgets[key] ? 780 : 340, 0.12);
}

function resetInterfaceStyle() {
  uiWidgets = { ...DEFAULT_WIDGETS };
  localStorage.setItem('lumo_widgets', JSON.stringify(uiWidgets));
  applySurface('obsidian', false);
  applyRadius('round', false);
  applyOpacity(97);
  applyAllWidgets();
  if (typeof setTheme === 'function') setTheme('amber');
  if (typeof setEyeStyle === 'function') setEyeStyle('classic');
  if (typeof playChirp === 'function') playChirp(560, 840, 0.16);
  if (typeof say === 'function') say('Aparência restaurada para o padrão!', 2400, true);
}

window.applySurface = applySurface;
window.applyRadius = applyRadius;
window.applyOpacity = applyOpacity;
window.toggleWidget = toggleWidget;
window.resetInterfaceStyle = resetInterfaceStyle;

(function initCustomUI() {
  applySurface(uiSurface, false);
  applyRadius(uiRadius, false);
  applyOpacity(uiOpacity);
  applyAllWidgets();
})();
