function _safeParse(raw, fallbackJson) {
  try { return JSON.parse(raw || fallbackJson); }
  catch (_) { try { return JSON.parse(fallbackJson); } catch (__) { return []; } }
}
const invoke = window.__TAURI__?.core?.invoke || null;
const listen = window.__TAURI__?.event?.listen || null;
const API_BASE = 'https://lumo-ai.sivavieiravitor.workers.dev';

let userName = localStorage.getItem('lumo_username') || '';
let isPro = localStorage.getItem('lumo_pro') === 'true';
let personality = localStorage.getItem('lumo_personality') || 'balanced';
let voiceMode = localStorage.getItem('lumo_voice') || 'mascot';
let autoCloseOnBlur = localStorage.getItem('lumo_autoclose') !== 'false';
let trayOnlyMode = localStorage.getItem('lumo_trayonly') === 'true';
let mobileSyncEnabled = localStorage.getItem('lumo_mobsync') === 'true';
let lastGlobalCursorX = -1, lastGlobalCursorY = -1, lastCursorMoveMs = Date.now();
function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
let autoInstallUpdates = localStorage.getItem('lumo_autoupdate') !== 'false';

let isPinned = false, suppressBlur = false, justOpenedUntil = 0;
let stealthManual = false, stealthAuto = false;
let isExpanded = false, isClosing = false, isHiddenInGame = false, isShuttingDown = false, isThinking = false;
let isTypingLook = false, pcUnderLoad = false, isMediaPlaying = false;
let manualSummonUntil = 0, lastInteraction = Date.now(), startTime = Date.now();
let petCombo = 0, lastPetTime = 0, activeAmbient = null, keepAwakeActive = false;
let bubbleCopyPayload = null, usdRate = 5.8, eurRate = 6.25;
let lastWeatherFetch = 0, celebratedTasks = false, activeReminder = null;
let isUpdating = false, pendingAutoUpdate = null;
let lastCursorX = 0, lastDir = 0, shakeCount = 0, lastShakeReset = Date.now();
let activeGamePendingHide = false;

let tasks = _safeParse(localStorage.getItem('lumo_tasks'), '[{"text":"Testar a base limpa v1.8","done":false},{"text":"Beber água","done":true}]');
let clipHistory = _safeParse(localStorage.getItem('lumo_clips'), '[]');
let colorHistory = _safeParse(localStorage.getItem('lumo_colors'), '["#F6B974","#34D399","#67E8F9"]');
let pocketFiles = [];

const viewTitles = {
  resumo: 'Lumo', kit: 'Kit Rápido', midia: 'Lumo Music',
  bolso: 'Bandeja Mágica', ia: 'IA Lumo', util: 'Foco & PC',
  mobile: 'Lumo Celular', aparencia: 'Aparência', stream: 'Stream', config: 'Configurações'
};

const themes = {
  amber: { accent: '#f6b974', soft: 'rgba(246, 185, 116, 0.14)', glow: 'rgba(246, 185, 116, 0.36)' },
  lunar: { accent: '#f3f4f6', soft: 'rgba(243, 244, 246, 0.13)', glow: 'rgba(243, 244, 246, 0.28)' },
  cyan: { accent: '#67e8f9', soft: 'rgba(103, 232, 249, 0.14)', glow: 'rgba(103, 232, 249, 0.36)' },
  cobalt: { accent: '#60a5fa', soft: 'rgba(96, 165, 250, 0.15)', glow: 'rgba(96, 165, 250, 0.38)' },
  lavender: { accent: '#c4b5fd', soft: 'rgba(196, 181, 253, 0.14)', glow: 'rgba(196, 181, 253, 0.36)' },
  violet: { accent: '#a78bfa', soft: 'rgba(167, 139, 250, 0.15)', glow: 'rgba(167, 139, 250, 0.38)' },
  sakura: { accent: '#f472b6', soft: 'rgba(244, 114, 182, 0.15)', glow: 'rgba(244, 114, 182, 0.38)' },
  crimson: { accent: '#fb7185', soft: 'rgba(251, 113, 133, 0.15)', glow: 'rgba(251, 113, 133, 0.38)' },
  sunset: { accent: '#fb923c', soft: 'rgba(251, 146, 60, 0.15)', glow: 'rgba(251, 146, 60, 0.38)' },
  gold: { accent: '#facc15', soft: 'rgba(250, 204, 21, 0.14)', glow: 'rgba(250, 204, 21, 0.36)' },
  emerald: { accent: '#34d399', soft: 'rgba(52, 211, 153, 0.14)', glow: 'rgba(52, 211, 153, 0.36)' },
  lime: { accent: '#a3e635', soft: 'rgba(163, 230, 53, 0.14)', glow: 'rgba(163, 230, 53, 0.36)' }
};

const gameTipsDB = [
  { keys: ['minecraft'], name: 'Minecraft', tips: ['F3 + G mostra as bordas dos chunks — ótimo pra farms!', 'Carregue sempre um balde de água na barra quente contra quedas.'] },
  { keys: ['valorant'], name: 'Valorant', tips: ['Mantenha a mira na altura da cabeça antes de abrir o pixel.', 'Cheque a economia do time antes de forçar compra!'] },
  { keys: ['counter-strike', 'cs2'], name: 'CS2', tips: ['Contra-strafe (A/D) zera sua imprecisão antes do primeiro tiro.', 'Use utilitários antes de morrer!'] },
  { keys: ['dead by daylight'], name: 'Dead by Daylight', tips: ['Olhe para trás nos loops para ler a luz vermelha do killer.', 'Evite deixar os últimos 3 geradores muito próximos (3-gen).'] },
  { keys: ['rimworld'], name: 'RimWorld', tips: ['Evite paredes de madeira perto de fiações!', 'Uma mesa perto da cozinha evita o debuff de comer sem mesa.'] },
  { keys: ['roblox'], name: 'Roblox', tips: ['Shift Lock facilita muito parkour e câmera em jogos de ação.', 'Boa jogatina! Use Alt+Espaço se precisar de mim.'] },
  { keys: ['five nights', 'fnaf'], name: 'FNAF', tips: ['Ouça bem os passos nos fones — o som entrega antes das câmeras!'] },
  { keys: ['outlast'], name: 'Outlast', tips: ['Desligue a visão noturna onde há luz para poupar bateria.'] },
  { keys: ['r.e.p.o'], name: 'R.E.P.O.', tips: ['Cuidado com itens frágeis nas curvas — bater reduz o valor!'] },
  { keys: ['grand theft auto', 'gta'], name: 'GTA', tips: ['Use o menu rápido para comer snacks em cobertura.'] }
];

function lockBlur() { suppressBlur = true; }
function unlockBlur() { setTimeout(() => { suppressBlur = false; }, 350); }
function isStealth() { return stealthManual || stealthAuto; }
function getGreetingBase() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

// === OLHOS REATIVOS (Interpolação contínua via GPU — sem travar fora de foco) ===
let eyeTargetX = 0, eyeTargetY = 0, eyeCurX = 0, eyeCurY = 0, lastPointerEyeMs = 0, eyeAnimTimer = null;

function ensureEyeLoop() {
  if (eyeAnimTimer) return;
  eyeAnimTimer = setInterval(() => {
    if (isHiddenInGame || isShuttingDown || window.cinemaPlaying || (trayOnlyMode && !isExpanded)) {
      clearInterval(eyeAnimTimer);
      eyeAnimTimer = null;
      return;
    }
    const dx = eyeTargetX - eyeCurX;
    const dy = eyeTargetY - eyeCurY;
    if (Math.abs(dx) < 0.04 && Math.abs(dy) < 0.04) {
      eyeCurX = eyeTargetX;
      eyeCurY = eyeTargetY;
      const face = document.getElementById('lumo-face');
      if (face) face.style.transform = `translate3d(${eyeCurX.toFixed(2)}px, ${eyeCurY.toFixed(2)}px, 0)`;
      clearInterval(eyeAnimTimer);
      eyeAnimTimer = null;
      return;
    }
    eyeCurX += dx * 0.24;
    eyeCurY += dy * 0.24;
    const face = document.getElementById('lumo-face');
    if (face) face.style.transform = `translate3d(${eyeCurX.toFixed(2)}px, ${eyeCurY.toFixed(2)}px, 0)`;
  }, 20);
}

function setEyeTarget(x, y) {
  if (isHiddenInGame || (trayOnlyMode && !isExpanded)) return;
  eyeTargetX = Math.max(-10, Math.min(10, Number(x) || 0));
  eyeTargetY = Math.max(-4.5, Math.min(5.5, Number(y) || 0));
  if (Math.abs(eyeTargetX - eyeCurX) >= 0.05 || Math.abs(eyeTargetY - eyeCurY) >= 0.05) {
    ensureEyeLoop();
  }
}

let typingTimer = null;
function onUserTyping() {
  isTypingLook = true;
  setEyeTarget((Math.random() - 0.5) * 4, 5);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTypingLook, 1200);
}
function stopTypingLook() { isTypingLook = false; }

window.addEventListener('pointermove', (ev) => {
  if (isHiddenInGame || isTypingLook || window.cinemaPlaying) return;
  const p = document.getElementById('lumo-pill');
  if (!p) return;
  lastPointerEyeMs = Date.now();
  const r = p.getBoundingClientRect();
  setEyeTarget((ev.clientX - (r.left + r.width / 2)) / 18, (ev.clientY - (r.top + r.height / 2)) / 18);
});

// === ÁUDIO E EXPRESSÕES ===
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
window.addEventListener('pointerdown', () => { try { getAudioCtx(); } catch (_) {} }, { once: true });

function playChirp(startFreq = 540, endFreq = 760, dur = 0.18) {
  if (voiceMode === 'mute' || isStealth()) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur * 0.7);
    g.gain.setValueAtTime(0.038, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
  } catch (_) {}
}

function speakText(text) {
  if (isStealth() || voiceMode === 'mute' || voiceMode === 'chimes') return;
  if (voiceMode === 'mascot') {
    try {
      const ctx = getAudioCtx();
      const count = Math.min(8, Math.max(3, Math.floor(text.length / 8)));
      for (let i = 0; i < count; i++) {
        const t = ctx.currentTime + i * 0.068;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle';
        const base = 420 + ((text.charCodeAt((i * 2) % text.length) % 10) * 38);
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * 1.18, t + 0.045);
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.065);
      }
    } catch (_) {}
    return;
  }
  if (voiceMode === 'spoken' && 'speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim());
      u.lang = 'pt-BR'; u.rate = 1.08; u.pitch = 1.1;
      const voices = speechSynthesis.getVoices();
      const best = voices.find(v => v.lang.includes('pt') && (v.name.includes('Francisca') || v.name.includes('Natural'))) || voices.find(v => v.lang.includes('pt'));
      if (best) u.voice = best;
      speechSynthesis.speak(u);
    } catch (_) {}
  }
}

function setEmote(sym) {
  const el = document.getElementById('float-emote');
  el.textContent = sym;
  el.classList.toggle('show', Boolean(sym));
}

function hopPill() {
  const p = document.getElementById('lumo-pill');
  p.classList.remove('hop');
  void p.offsetWidth;
  p.classList.add('hop');
}

function setExpression(type) {
  const face = document.getElementById('lumo-face');
  const style = localStorage.getItem('lumo_eyestyle') || 'classic';
  face.className = 'face style-' + style;
  if (type !== 'normal') face.classList.add(type);
  if (type === 'sleepy') setEmote('zZz');
  else if (type === 'love') setEmote('♥');
  else if (type === 'music') setEmote('♪');
  else if (type === 'thinking') setEmote('✦');
  else if (keepAwakeActive) setEmote('☕');
  else if (type !== 'dizzy') setEmote('');
}

function restoreIdleExpression() {
  if (isThinking) setExpression('thinking');
  else if (activeAmbient || isMediaPlaying) setExpression('music');
  else if (timerInterval) setExpression('focused');
  else if (pcUnderLoad) setExpression('sweat');
  else setExpression('normal');
}

function spawnParticles(x, y, symbols, colors, count = 8) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'fx-particle';
    el.textContent = symbols[i % symbols.length];
    el.style.color = colors[i % colors.length];
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 32 + Math.random() * 42;
    el.style.setProperty('--tx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
    el.style.setProperty('--ty', `${(Math.sin(angle) * dist - 14).toFixed(1)}px`);
    el.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 90)}deg`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

function burstPillLove(intense = false) {
  const r = document.getElementById('lumo-pill').getBoundingClientRect();
  spawnParticles(r.left + r.width / 2, r.top + r.height / 2,
    intense ? ['♥', '✦', '♥', '★'] : ['✦', '♥', '·'],
    ['#fb7185', '#f6b974', '#fff3d6', '#c4b5fd'], intense ? 12 : 7);
}

let bubbleTimeout;
function say(text, duration = 4200, force = false, copyValue = null, voice = false) {
  if (!force && (isHiddenInGame || isExpanded)) return;
  const bubble = document.getElementById('speech-bubble');
  bubble.textContent = text;
  bubbleCopyPayload = copyValue;
  bubble.classList.toggle('clickable', Boolean(copyValue));
  bubble.classList.add('show');
  if (voice) speakText(text);
  clearTimeout(bubbleTimeout);
  bubbleTimeout = setTimeout(() => { bubble.classList.remove('show', 'clickable'); bubbleCopyPayload = null; }, duration);
}

async function onBubbleClick() {
  if (!bubbleCopyPayload) return;
  if (invoke) await invoke('set_clipboard_text', { text: bubbleCopyPayload });
  playChirp(680, 920, 0.14);
  say('Copiado!', 1500, true);
}

// === JANELA, PAINEL E NAVEGAÇÃO ===
async function syncWindowMode(mode) { if (invoke) try { const anchor = window.uiPosition || localStorage.getItem('lumo_pos') || 'top-center'; await invoke('set_window_mode', { mode, anchor }); } catch (_) {} }

function tryCollapseOnOutside(reasonTitle = '') {
  const tag = document.activeElement?.tagName;
  if (!isExpanded || !autoCloseOnBlur || isPinned || suppressBlur || tag === 'SELECT' || Date.now() <= justOpenedUntil) return;
  const outsideTitle = reasonTitle && !reasonTitle.toLowerCase().includes('lumo');
  if (!document.hasFocus() || outsideTitle) togglePanel(false);
}

async function togglePanel(forceState) {
  if (isShuttingDown || isClosing) return;
  lastInteraction = Date.now();
  const _f = document.getElementById('lumo-face');
  if (_f && (_f.classList.contains('sleepy') || _f.classList.contains('bored') || _f.classList.contains('happy'))) {
    restoreIdleExpression();
  }
  if (typeof syncFreePosDirection === 'function') syncFreePosDirection();
  if (isHiddenInGame) await wakeFromGame();
  const next = typeof forceState === 'boolean' ? forceState : !isExpanded;
  if (next === isExpanded) return;
  const panel = document.getElementById('panel');

  if (next) {
    isExpanded = true;
    justOpenedUntil = Date.now() + 700;
    document.getElementById('speech-bubble').classList.remove('show');
    refreshSummaryNow();
    await syncWindowMode('expanded');
    panel.classList.remove('closing');
    panel.classList.add('open');
    playChirp(480, 680, 0.15);
  } else {
    isClosing = true;
    isExpanded = false;
    panel.classList.remove('open');
    panel.classList.add('closing');
    playChirp(620, 440, 0.12);
    setTimeout(async () => {
      panel.classList.remove('closing');
      await syncWindowMode(trayOnlyMode ? 'tray_hidden' : 'pill');
      isClosing = false;
    }, 155);
  }
}

function openView(viewName) {
  const _prevView = document.querySelector('.view.active');
  const _nextView = document.getElementById('view-' + viewName);
  const _goingBack = viewName === 'resumo' && _prevView && _prevView.id !== 'view-resumo';
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('v39-enter-fwd', 'v39-enter-back');
    v.classList.toggle('active', v.id === 'view-' + viewName);
  });
  if (_nextView && _prevView !== _nextView && !window.lumoEcoMode) {
    void _nextView.offsetWidth;
    const _cls = _goingBack ? 'v39-enter-back' : 'v39-enter-fwd';
    _nextView.classList.add(_cls);
    _nextView.addEventListener('animationend', () => _nextView.classList.remove(_cls), { once: true });
  }
  document.getElementById('back-btn').classList.toggle('show', viewName !== 'resumo');
  document.getElementById('topbar-label').textContent = viewTitles[viewName] || 'Lumo';
  document.getElementById('cfg-btn').classList.toggle('active-btn', viewName === 'config');
  document.getElementById('look-btn')?.classList.toggle('active-btn', viewName === 'aparencia');
  document.getElementById('mobile-btn').classList.toggle('active-btn', viewName === 'mobile');
  if (viewName === 'resumo') refreshSummaryNow();
  if (viewName === 'ia') { const box = document.getElementById('chat-box'); box.scrollTop = box.scrollHeight; }
}

function togglePin() {
  isPinned = !isPinned;
  document.getElementById('pin-btn').classList.toggle('active-btn', isPinned);
  playChirp(isPinned ? 620 : 460, isPinned ? 820 : 340, 0.14);
}
function toggleAutoClose(val) { autoCloseOnBlur = val; localStorage.setItem('lumo_autoclose', String(val)); }
function toggleTrayOnly(val) {
  trayOnlyMode = Boolean(val);
  localStorage.setItem('lumo_trayonly', String(trayOnlyMode));
  playChirp(trayOnlyMode ? 480 : 600, trayOnlyMode ? 360 : 840, 0.14);
  if (trayOnlyMode) say('Modo Bandeja ativo! Ao fechar, fico só perto do relógio.', 3200, true);
  else say('Cápsula flutuante reativada na tela!', 2400, true);
}
function toggleStealth() {
  stealthManual = !stealthManual;
  document.getElementById('stealth-btn').classList.toggle('active-btn', stealthManual);
  if (stealthManual && window.speechSynthesis) speechSynthesis.cancel();
  say(stealthManual ? 'Modo Furtivo ativado.' : 'Modo Furtivo desativado.', 1800, true);
}

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  stopAmbient();
  if (isExpanded) { isExpanded = false; document.getElementById('panel').classList.remove('open', 'closing'); await syncWindowMode(trayOnlyMode && localStorage.getItem('lumo_intro_v1') ? 'tray_hidden' : 'pill'); }
  setExpression('goodbye');
  playChirp(520, 260, 0.42);
  say(`Tô indo descansar${userName ? ', ' + userName : ''}... até mais!`, 1400, true, null, true);
  setTimeout(() => document.getElementById('app').classList.add('shutting-down'), 650);
  setTimeout(async () => { if (invoke) await invoke('quit_app'); }, 1400);
}

// === RELÓGIO, CLIMA E RESUMO ===
function updateLiveClock() {
  const now = new Date();
  document.getElementById('live-clock').innerHTML = `${String(now.getHours()).padStart(2, '0')}<span class="colon">:</span>${String(now.getMinutes()).padStart(2, '0')}`;
  document.getElementById('daily-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function updateGreetingUI() {
  const base = getGreetingBase();
  document.getElementById('greeting-text').textContent = userName ? `${base}, ${userName}!` : `${base}!`;
  document.getElementById('onboarding-card').classList.toggle('show', !userName);
  document.getElementById('cfg-name-input').value = userName;
}
function saveUserName(e, inputId) {
  e.preventDefault();
  userName = document.getElementById(inputId).value.trim();
  setTimeout(() => window.dispatchEvent(new Event('lumo-profile-changed')), 80);
  setTimeout(() => window.LumoFriends?.syncProfile?.(), 150);
  localStorage.setItem('lumo_username', userName);
  updateGreetingUI(); hopPill(); setExpression('happy'); burstPillLove(false); playChirp(580, 900, 0.2);
  if (userName) say(`Prazer, ${userName}! Tô sempre por aqui.`, 3200, true, null, true);
  setTimeout(() => restoreIdleExpression(), 1800);
}
function refreshSummaryNow() {
  updateLiveClock(); updateGreetingUI(); updateDailySummary(); updateReminderUI();
  const upMin = Math.floor((Date.now() - startTime) / 60000);
  const hrs = Math.floor(upMin / 60), mins = upMin % 60;
  document.getElementById('uptime-text').textContent = isStealth() ? 'Modo Furtivo' : `Ativo há ${hrs > 0 ? hrs + 'h ' : ''}${mins}m`;
  if (Date.now() - lastWeatherFetch > 900000) fetchWeather(false);
}

const FAMOUS_QUOTES = [
  '“A imaginação é mais importante que o conhecimento.” — Albert Einstein',
  '“No meio da dificuldade encontra-se a oportunidade.” — Albert Einstein',
  '“A simplicidade é o último grau de sofisticação.” — Leonardo da Vinci',
  '“Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que são difíceis.” — Sêneca',
  '“Sofremos mais na imaginação do que na realidade.” — Sêneca',
  '“A única maneira de fazer um ótimo trabalho é amar o que você faz.” — Steve Jobs',
  '“Nada na vida deve ser temido, somente compreendido.” — Marie Curie',
  '“O presente é deles; o futuro, pelo qual realmente trabalhei, é meu.” — Nikola Tesla',
  '“Em algum lugar, algo incrível está esperando para ser descoberto.” — Carl Sagan',
  '“Somos o que fazemos repetidamente. A excelência não é um ato, mas um hábito.” — Aristóteles',
  '“Sempre parece impossível até que seja feito.” — Nelson Mandela',
  '“A disciplina é a ponte entre metas e realizações.” — Jim Rohn',
  '“Quem olha para fora sonha; quem olha para dentro desperta.” — Carl Jung',
  '“A vida encolhe ou se expande na proporção da sua coragem.” — Anaïs Nin',
  '“A persistência é o caminho do êxito.” — Charles Chaplin',
  '“O segredo de seguir em frente é começar.” — Mark Twain',
  '“A criatividade é a inteligência se divertindo.” — Albert Einstein',
  '“A melhor forma de prever o futuro é criá-lo.” — Peter Drucker',
  '“Liberdade é pouco. O que eu desejo ainda não tem nome.” — Clarice Lispector',
  '“O tempo é um tecido invisível em que se pode bordar tudo.” — Machado de Assis'
];

function pickStartupQuote() {
  const last = parseInt(localStorage.getItem('lumo_last_quote') || '-1', 10);
  let idx = Math.floor(Math.random() * FAMOUS_QUOTES.length);
  if (idx === last) idx = (idx + 1) % FAMOUS_QUOTES.length;
  localStorage.setItem('lumo_last_quote', String(idx));
  return FAMOUS_QUOTES[idx];
}

async function fetchWeather(manual = false) {
  const el = document.getElementById('weather-text');
  if (manual && el) el.textContent = '...';
  try {
    const geo = await fetch('https://get.geojs.io/v1/ip/geo.json').then(r => r.json());
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r => r.json());
    const temp = Math.round(w?.current?.temperature_2m);
    if (!Number.isNaN(temp)) {
      lastWeatherFetch = Date.now();
      const c = w.current.weather_code;
      const desc = c === 0 ? 'Limpo' : c <= 3 ? 'Nublado' : (c >= 51 && c <= 82) ? 'Chuva' : c >= 95 ? 'Tempestade' : 'Ameno';
      const city = String(geo.city || '').trim();
      const label = city ? `${city} · ${temp}°C · ${desc}` : `${temp}°C · ${desc}`;
      if (el) {
        el.textContent = label;
        const chip = el.closest('.weather-chip');
        if (chip) chip.title = label + ' (clique para atualizar)';
      }
      return;
    }
  } catch (_) {}
  if (el) el.textContent = 'Offline';
}

// === LOOP PRINCIPAL DO WINDOWS (CPU/RAM + OLHOS + AUTO-COLLAPSE + MÍDIA + JOGOS) ===
function applyMetricColor(valEl, barEl, pct) {
  const isHot = pct >= 86, isWarn = pct >= 68 && !isHot;
  valEl.classList.toggle('hot', isHot); valEl.classList.toggle('warn', isWarn);
  barEl.classList.toggle('hot', isHot); barEl.classList.toggle('warn', isWarn);
  barEl.style.width = `${Math.min(100, Math.max(4, pct))}%`;
}

async function pollWindowsLoop() {
  if (isShuttingDown) return;
  if (window.cinemaPlaying) { setTimeout(pollWindowsLoop, 220); return; }
  if (trayOnlyMode && !isExpanded) {
    setTimeout(pollWindowsLoop, 600);
    return;
  }
  if (invoke) {
    try {
      const st = await invoke('get_desktop_state');
      // 1. Olhos (sempre primeiro!)
      if (typeof st.cursor_x === 'number' && (st.cursor_x !== lastGlobalCursorX || st.cursor_y !== lastGlobalCursorY)) {
        lastGlobalCursorX = st.cursor_x; lastGlobalCursorY = st.cursor_y; lastCursorMoveMs = Date.now();
      }
      if (!isHiddenInGame && !(trayOnlyMode && !isExpanded) && !isTypingLook && (Date.now() - lastPointerEyeMs > 160) && typeof st.cursor_x === 'number') {
        const halfW = Math.max(480, (st.screen_w || 1920) * 0.42);
        const tx = ((st.cursor_x - st.win_center_x) / halfW) * 10;
        const pillOffsetY = (window.uiPosition || '').startsWith('bottom-') ? (isExpanded ? 600 : 105) : 35;
        const ty = ((st.cursor_y - (st.win_y + pillOffsetY)) / 420) * 5.5;
        setEyeTarget(tx, ty);
      }

      // 2. CPU e RAM
      const usedGb = ((st.used_ram_mb || 0) / 1024).toFixed(1);
      const totalGb = ((st.total_ram_mb || 0) / 1024).toFixed(0);
      const ramPct = st.total_ram_mb > 0 ? Math.round((st.used_ram_mb / st.total_ram_mb) * 100) : 0;
      const cpu = st.cpu_percent || 0;
      document.getElementById('cpu-val').textContent = `${cpu}%`;
      document.getElementById('ram-val').textContent = `${usedGb}/${totalGb}G`;
      applyMetricColor(document.getElementById('cpu-val'), document.getElementById('cpu-bar'), cpu);
      applyMetricColor(document.getElementById('ram-val'), document.getElementById('ram-bar'), ramPct);

      const prevLoad = pcUnderLoad;
      pcUnderLoad = cpu >= 85 || ramPct >= 90;
      if (pcUnderLoad !== prevLoad && !isExpanded && !isHiddenInGame && !isThinking && !activeAmbient && !timerInterval) restoreIdleExpression();

      // 3. Janela ativa: encolher fora + título de mídia + furtivo + jogos
      const rawTitle = st.active_window || '';
      const title = rawTitle.toLowerCase();
      tryCollapseOnOutside(rawTitle);
      detectMediaTitle(rawTitle);

      stealthAuto = ['obs ', 'google meet', 'zoom meeting', 'microsoft teams'].some(k => title.includes(k));
      document.getElementById('stealth-btn').classList.toggle('active-btn', isStealth());

      if (isHiddenInGame) {
        if (typeof evaluateUniversalGame === 'function') evaluateUniversalGame(st);
        if (st.cursor_x >= st.screen_w - 25 && st.cursor_y <= 25) wakeFromGame();
      } else {
        const dxMouse = st.cursor_x - lastCursorX;
        const pillYRef = st.win_y + ((window.uiPosition || '').startsWith('bottom-') ? (isExpanded ? 600 : 105) : 35);
        const nearLumo = Math.abs(st.cursor_x - st.win_center_x) < 220 && Math.abs(st.cursor_y - pillYRef) < 150;
        if (nearLumo && Math.abs(dxMouse) > 45) {
          const dir = Math.sign(dxMouse);
          if (dir !== 0 && dir !== lastDir) { shakeCount++; lastDir = dir; }
        }
        lastCursorX = st.cursor_x;
        if (Date.now() - lastShakeReset > 1300) { shakeCount = 0; lastShakeReset = Date.now(); }
        if (shakeCount >= 5 && personality !== 'zen') {
          shakeCount = 0; setExpression('dizzy'); playChirp(420, 290, 0.32);
          say('Eitaa, calma que eu fico tonto!', 2600, false, null, true);
          setTimeout(() => restoreIdleExpression(), 2400);
        }

        const gRes = typeof evaluateUniversalGame === 'function'
          ? evaluateUniversalGame(st)
          : { detected: false, name: '', tipGame: null };
        if (gRes.detected && !trayOnlyMode && document.getElementById('autohide-toggle').checked && !activeGamePendingHide && Date.now() > manualSummonUntil) {
          activeGamePendingHide = true;
          const msg = gRes.tipGame
            ? `${gRes.tipGame.name}: ${gRes.tipGame.tips[Math.floor(Math.random() * gRes.tipGame.tips.length)]}`
            : `Bom jogo em ${gRes.name || 'tela cheia'}! Vou pro cantinho 🎮`;
          const waitMs = gRes.tipGame ? 5000 : 3400;
          setExpression('focused'); hopPill();
          if (isExpanded) await togglePanel(false);
          say(msg, waitMs, true, null, true);
          setTimeout(() => { activeGamePendingHide = false; hideForGame('', 150); }, waitMs);
        }
      }
    } catch (_) {}
  }
  const idleCursor = Date.now() - lastCursorMoveMs > 1500;
  const nextPoll = (isHiddenInGame || (trayOnlyMode && !isExpanded)) ? 500 : (idleCursor ? 160 : 60);
  setTimeout(pollWindowsLoop, nextPoll);
}

// === MÍDIA & AMBIENTE ===
function syncPlayVisuals() {
  const playing = Boolean(isMediaPlaying || activeAmbient);
  document.getElementById('mini-media-strip').classList.toggle('playing', playing);
  document.getElementById('eq-bars').classList.toggle('show', playing);
  const svgInner = playing
    ? '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'
    : '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/>';
  document.getElementById('mm-play-svg').innerHTML = svgInner;
  document.getElementById('main-play-svg').innerHTML = svgInner;
  if (!isThinking && !timerInterval) setExpression(playing ? 'music' : 'normal');
}

function detectMediaTitle(rawTitle) {
  if (!rawTitle || activeAmbient) return;
  const lower = rawTitle.toLowerCase();
  let track = '';
  if (lower.includes(' - youtube music')) track = rawTitle.replace(/\s*-\s*youtube music.*$/i, '').trim();
  else if (lower.includes(' - youtube')) track = rawTitle.replace(/\s*-\s*youtube.*$/i, '').trim();
  else if (rawTitle.includes(' - ') && (lower.includes('spotify') || lower.includes('soundcloud'))) {
    track = rawTitle.replace(/\s*-\s*(spotify|soundcloud).*$/i, '').trim();
  }
  if (track && track.length > 2 && !['youtube', 'spotify', 'youtube music'].includes(track.toLowerCase())) {
    document.getElementById('mini-media-title').textContent = track;
    document.getElementById('midia-view-track').textContent = track;
    document.getElementById('mini-media-sub').textContent = isMediaPlaying ? 'Tocando agora' : 'Pausado · Clique p/ tocar';
  }
}

async function sendMedia(action) {
  playChirp(520, 660, 0.12); hopPill();
  if (invoke) await invoke('media_control', { action });
  if (action === 'play_pause') {
    isMediaPlaying = !isMediaPlaying;
    document.getElementById('mini-media-sub').textContent = isMediaPlaying ? 'Tocando agora' : 'Pausado';
    syncPlayVisuals();
  } else if (action === 'next' || action === 'prev') {
    isMediaPlaying = true; syncPlayVisuals();
  }
}

let ambientNodes = [], ambientGain = null, lofiTimer = null;
function stopAmbient() {
  clearInterval(lofiTimer); lofiTimer = null;
  ambientNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch (_) {} });
  if (ambientGain) { try { ambientGain.disconnect(); } catch (_) {} ambientGain = null; }
  ambientNodes = []; activeAmbient = null;
  document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tile-midia').classList.remove('active-tile');
  document.getElementById('mm-lofi-btn').classList.remove('active');
  document.getElementById('sub-midia').textContent = 'Lo-fi · Chuva';
  document.getElementById('mini-media-title').textContent = 'Controle de Mídia';
  syncPlayVisuals();
}

function toggleAmbient(mode) {
  if (!isPro) { playChirp(320, 240, 0.18); openView('config'); say('Sons ambiente são do Lumo Pro!', 2400, true); return; }
  if (activeAmbient === mode) { stopAmbient(); return; }
  stopAmbient(); activeAmbient = mode;
  document.getElementById('amb-' + mode).classList.add('active');
  document.getElementById('tile-midia').classList.add('active-tile');
  document.getElementById('mm-lofi-btn').classList.toggle('active', mode === 'lofi');
  const label = mode === 'lofi' ? 'Lo-fi Zen (Offline)' : mode === 'rain' ? 'Som de Chuva' : 'Som de Foco';
  document.getElementById('sub-midia').textContent = label;
  document.getElementById('mini-media-title').textContent = label;
  document.getElementById('mini-media-sub').textContent = 'Tocando ambiente';
  syncPlayVisuals();

  const ctx = getAudioCtx();
  ambientGain = ctx.createGain();
  ambientGain.gain.value = ((document.getElementById('ambient-vol').value || 35) / 100) * 0.28;
  ambientGain.connect(ctx.destination);

  if (mode === 'rain' || mode === 'brown') {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = mode === 'brown' ? lastOut * 3.5 : white * 0.35;
    }
    const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = mode === 'rain' ? 950 : 280;
    noise.connect(filter); filter.connect(ambientGain); noise.start(); ambientNodes.push(noise);
  } else if (mode === 'lofi') {
    const chords = [[261.63,329.63,392,493.88],[220,261.63,329.63,392],[174.61,220,261.63,329.63],[196,246.94,293.66,349.23]];
    let step = 0;
    const playChord = () => {
      chords[step++ % chords.length].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        const now = ctx.currentTime + idx * 0.04;
        g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.09, now + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        osc.connect(g); g.connect(ambientGain); osc.start(now); osc.stop(now + 2.5);
      });
    };
    playChord(); lofiTimer = setInterval(playChord, 2600);
  }
}
function updateAmbientVol(v) { if (ambientGain) ambientGain.gain.value = (v / 100) * 0.28; }

// === BARRA INTELIGENTE, KIT RÁPIDO, FOCO & BOLSO ===
function fillCmd(prefix) { const inp = document.getElementById('quick-ai-input'); inp.value = prefix; inp.focus(); }
function runCmdDirect(cmd) { const inp = document.getElementById('quick-ai-input'); inp.value = cmd; quickCommand(new Event('submit')); }

async function quickCommand(e) {
  e.preventDefault(); stopTypingLook();
  const input = document.getElementById('quick-ai-input'), raw = input.value.trim();
  if (!raw) return;
  input.value = '';
  const lower = raw.toLowerCase();

  if (raw.startsWith('=')) {
    const expr = raw.slice(1).trim().replace(/,/g, '.');
    if (/^[\d\s+\-*/().%]+$/.test(expr)) {
      try {
        const res = Function('"use strict"; return (' + expr + ')')();
        if (typeof res === 'number' && Number.isFinite(res)) {
          const out = Number.isInteger(res) ? String(res) : res.toFixed(2).replace('.', ',');
          if (invoke) await invoke('set_clipboard_text', { text: out });
          hopPill(); playChirp(620, 880, 0.16); say(`Resultado: ${out} (copiado!)`, 3400, true); return;
        }
      } catch (_) {}
    }
  }
  if (lower.startsWith('/g ') || lower.startsWith('/google ')) {
    const q = raw.replace(/^\/(g|google)\s+/i, '').trim();
    if (q && invoke) { await invoke('open_external_url', { url: `https://www.google.com/search?q=${encodeURIComponent(q)}` }); hopPill(); return; }
  }
  if (lower.startsWith('/yt ')) {
    const q = raw.slice(4).trim();
    if (q && invoke) { await invoke('open_external_url', { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` }); hopPill(); return; }
  }
  if (lower === '/cor') { openView('kit'); pickScreenColor(); return; }
  if (lower === '/senha') { openView('kit'); generatePassword(); return; }
  if (lower.startsWith('/qr ')) { openView('kit'); document.getElementById('qr-input').value = raw.slice(4).trim(); generateQR(new Event('submit')); return; }
  if (lower === '/cafe' || lower === '/café') { toggleKeepAwake(!keepAwakeActive); return; }
  if (lower === '/respirar') { startBreathing(); return; }
  if (lower === '/dado' || /^\/d(\d+)$/.test(lower)) {
    const m = lower.match(/^\/d(\d+)$/);
    const sides = m ? Math.min(100, Math.max(2, parseInt(m[1], 10))) : 20;
    const roll = Math.floor(Math.random() * sides) + 1;
    hopPill(); playChirp(roll === sides ? 700 : 480, roll === sides ? 1100 : 720, 0.2);
    if (roll === sides) burstPillLove(true);
    say(`D${sides}: caiu ${roll}${roll === sides ? ' (CRÍTICO!)' : ''}!`, 3600, true, null, true); return;
  }
  openView('ia');
  await executePrompt(raw);
}

function renderColorHistory() {
  const box = document.getElementById('color-history'); box.innerHTML = '';
  colorHistory.forEach(hex => {
    const btn = document.createElement('button'); btn.className = 'color-chip';
    btn.innerHTML = `<span class="swatch-dot" style="background:${hex}"></span><span>${hex}</span>`;
    btn.onclick = async () => { if (invoke) await invoke('set_clipboard_text', { text: hex }); playChirp(620, 860, 0.14); say(`Cor ${hex} copiada!`, 2000, true); };
    box.appendChild(btn);
  });
}
async function pickScreenColor() {
  if (!('EyeDropper' in window)) { say('Conta-gotas indisponível.', 2200, true); return; }
  lockBlur();
  try {
    const result = await new EyeDropper().open();
    if (result?.sRGBHex) {
      const hex = result.sRGBHex.toUpperCase();
      colorHistory = [hex, ...colorHistory.filter(c => c !== hex)].slice(0, 6);
      localStorage.setItem('lumo_colors', JSON.stringify(colorHistory)); renderColorHistory();
      if (invoke) await invoke('set_clipboard_text', { text: hex });
      hopPill(); playChirp(640, 960, 0.16); say(`Cor ${hex} copiada!`, 2400, true);
    }
  } catch (_) {} finally { unlockBlur(); }
}
function generateQR(e) {
  e.preventDefault(); const val = document.getElementById('qr-input').value.trim(); if (!val) return;
  document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(val)}`;
  document.getElementById('qr-preview').classList.add('show'); hopPill(); playChirp(540, 820, 0.15);
}
async function qrFromClipboard() {
  if (!invoke) return; const txt = await invoke('get_clipboard_text');
  if (txt) { document.getElementById('qr-input').value = txt; generateQR(new Event('submit')); }
  else say('Nenhum texto no Ctrl+C.', 2000, true);
}
async function generatePassword() {
  const len = parseInt(document.getElementById('pwd-len').value, 10) || 16;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-';
  const arr = new Uint32Array(len); crypto.getRandomValues(arr);
  let pwd = ''; for (let i = 0; i < len; i++) pwd += chars[arr[i] % chars.length];
  document.getElementById('pwd-output').textContent = pwd;
  if (invoke) await invoke('set_clipboard_text', { text: pwd });
  hopPill(); playChirp(600, 920, 0.15); say('Senha forte copiada!', 2200, true);
}

// Tarefas
let isApplyingRemoteSync = false;
function updateDailySummary() {
  const total = tasks.length, done = tasks.filter(t => t.done).length, pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('summary-progress').style.width = `${pct}%`;
  document.getElementById('summary-pct').textContent = `${pct}%`;
  const cap = isPro ? '' : ' · máx 5';
  document.getElementById('daily-note').textContent = total && done === total ? 'Dia zerado!' : `${done}/${total} concluídas${cap}`;
  if (total && done === total && !celebratedTasks) { celebratedTasks = true; burstPillLove(true); setExpression('happy'); setTimeout(() => restoreIdleExpression(), 1800); }
  else if (done < total) celebratedTasks = false;
}
function renderTasks(syncOut = true) {
  const list = document.getElementById('task-list'); list.innerHTML = '';
  tasks.forEach((t, idx) => {
    const div = document.createElement('div'); div.className = 'task-item' + (t.done ? ' done' : '');
    div.innerHTML = `<div class="task-left" onclick="toggleTask(${idx})"><div class="check-circle">${t.done ? '✓' : ''}</div><span>${t.text.replace(/</g, '&lt;')}</span></div><button class="del-btn" onclick="deleteTask(${idx})">×</button>`;
    list.appendChild(div);
  });
  localStorage.setItem('lumo_tasks', JSON.stringify(tasks));
  updateDailySummary();
  if (syncOut && !isApplyingRemoteSync) { lastRemoteTasksTs = Date.now(); pushPcSync({ tasks }); }
}
function addTask(e) {
  e.preventDefault();
  if (!isPro && tasks.length >= 5) { playChirp(300, 220, 0.16); openView('config'); return; }
  const input = document.getElementById('new-task-input'), val = input.value.trim(); if (!val) return;
  tasks.push({ text: val, done: false }); input.value = ''; playChirp(520, 680, 0.12); renderTasks();
}
function toggleTask(idx) { tasks[idx].done = !tasks[idx].done; if (tasks[idx].done) { playChirp(620, 880, 0.16); hopPill(); } renderTasks(); }
function deleteTask(idx) { tasks.splice(idx, 1); renderTasks(); }

// Pomodoro, Lembrete, Café, Respiração e Soneca
let timerSeconds = 25 * 60, timerInterval = null;
function updateTimerUI() {
  const f = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
  document.getElementById('timer-display').textContent = f;
  document.getElementById('sub-util').textContent = timerInterval ? `Foco ${f}` : `${f} · Café`;
  document.getElementById('tile-util').classList.toggle('active-tile', Boolean(timerInterval));
  const b = document.getElementById('pill-badge'); b.textContent = f; b.classList.toggle('show', Boolean(timerInterval));
}
function setTimer(m) { clearInterval(timerInterval); timerInterval = null; document.getElementById('timer-toggle-btn').textContent = 'Iniciar'; timerSeconds = m * 60; restoreIdleExpression(); updateTimerUI(); }
function toggleTimer() {
  const btn = document.getElementById('timer-toggle-btn');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; btn.textContent = 'Retomar'; restoreIdleExpression(); updateTimerUI(); }
  else {
    btn.textContent = 'Pausar'; setExpression('focused');
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) { timerSeconds--; updateTimerUI(); }
      else { clearInterval(timerInterval); timerInterval = null; btn.textContent = 'Iniciar'; updateTimerUI(); setExpression('happy'); hopPill(); burstPillLove(true); say('Sessão de foco concluída!', 4500, true, null, true); }
    }, 1000);
    updateTimerUI();
  }
}

function startReminder(mins) {
  const label = document.getElementById('rem-label-input').value.trim() || 'Lembrete do Lumo';
  activeReminder = { label, endTime: Date.now() + mins * 60000 };
  document.getElementById('rem-label-input').value = '';
  hopPill(); playChirp(560, 820, 0.16); updateReminderUI();
  say(`Te lembro de "${label}" em ${mins}m!`, 3000, true);
}
function cancelReminder() { activeReminder = null; updateReminderUI(); }
function updateReminderUI() {
  const strip = document.getElementById('active-reminder-strip'), st = document.getElementById('rem-status');
  if (!activeReminder) { strip.classList.remove('show'); st.textContent = 'Nenhum ativo'; st.style.color = 'var(--muted)'; return; }
  const sec = Math.max(0, Math.ceil((activeReminder.endTime - Date.now()) / 1000));
  const fmt = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  document.getElementById('active-reminder-text').textContent = `🔔 ${activeReminder.label} · ${fmt}`;
  strip.classList.add('show'); st.textContent = `Falta ${fmt}`; st.style.color = 'var(--accent)';
}

async function toggleKeepAwake(val) {
  keepAwakeActive = Boolean(val);
  document.getElementById('cafe-toggle').checked = keepAwakeActive;
  document.getElementById('cafe-status').textContent = keepAwakeActive ? 'Ativo · PC não vai dormir' : 'Impede tela de apagar e hibernação';
  document.getElementById('cafe-status').style.color = keepAwakeActive ? 'var(--accent)' : 'var(--muted)';
  if (invoke) { try { await invoke('set_keep_awake', { enabled: keepAwakeActive }); } catch (_) {} }
  playChirp(keepAwakeActive ? 600 : 440, keepAwakeActive ? 880 : 320, 0.15); hopPill();
  setEmote(keepAwakeActive ? '☕' : '');
  say(keepAwakeActive ? 'Modo Café ligado!' : 'Modo Café desligado.', 2200, true);
}

let breathingTimer = null;
async function startBreathing() {
  const p = document.getElementById('lumo-pill');
  if (breathingTimer) {
    clearInterval(breathingTimer); breathingTimer = null;
    p.classList.remove('breathing-in', 'breathing-hold', 'breathing-out');
    document.getElementById('breath-btn').textContent = 'Iniciar'; restoreIdleExpression(); if (trayOnlyMode) syncWindowMode('tray_hidden'); return;
  }
  if (isExpanded) {
    isExpanded = false;
    document.getElementById('panel').classList.remove('open', 'closing');
  }
  await syncWindowMode('pill');
  document.getElementById('breath-btn').textContent = 'Parar';
  const phases = [
    { cls: 'breathing-in', msg: 'Inspire devagar... (4s)', f1: 360, f2: 520 },
    { cls: 'breathing-hold', msg: 'Segure o ar... (4s)', f1: 520, f2: 520 },
    { cls: 'breathing-out', msg: 'Solte suavemente... (4s)', f1: 520, f2: 340 }
  ];
  let step = 0;
  const run = () => {
    p.classList.remove('breathing-in', 'breathing-hold', 'breathing-out');
    if (step >= 15) { clearInterval(breathingTimer); breathingTimer = null; document.getElementById('breath-btn').textContent = 'Iniciar'; setExpression('happy'); say('Pausa concluída!', 3000, true); setTimeout(() => { restoreIdleExpression(); if (trayOnlyMode && !isExpanded) syncWindowMode('tray_hidden'); }, 2200); return; }
    const cur = phases[step % 3]; p.classList.add(cur.cls); setExpression(step % 3 === 1 ? 'sleepy' : 'normal');
    playChirp(cur.f1, cur.f2, 0.3); say(cur.msg, 3800, true); step++;
  };
  run(); breathingTimer = setInterval(run, 4000);
}

async function schedulePcSleep(mins) {
  if (!invoke) return;
  try { await invoke('schedule_shutdown', { minutes: mins }); document.getElementById('sleep-status').textContent = `Desliga em ${mins}m`; document.getElementById('sleep-status').style.color = 'var(--accent)'; say(`Desligo o PC em ${mins} min.`, 2800, true); } catch (_) {}
}
async function cancelPcSleep() {
  if (!invoke) return;
  try { await invoke('cancel_shutdown'); document.getElementById('sleep-status').textContent = 'Cancelado'; document.getElementById('sleep-status').style.color = 'var(--muted)'; } catch (_) {}
}

// Bolso (JPG/PNG/WebP/PDF)
function openFilePicker() { lockBlur(); document.getElementById('file-picker').click(); window.addEventListener('focus', () => unlockBlur(), { once: true }); }
function onFilePicked(files) { unlockBlur(); handleFiles(files); }
function setupDragAndDrop() {
  [document.getElementById('lumo-pill'), document.getElementById('drop-zone')].forEach(el => {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add(el.id === 'lumo-pill' ? 'drag-over' : 'active'); setExpression('surprised'); });
    el.addEventListener('dragleave', () => { el.classList.remove('drag-over', 'active'); restoreIdleExpression(); });
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drag-over', 'active'); if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files); });
  });
}
async function handleFiles(fileList) {
  const files = Array.from(fileList); if (!files.length) return;
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) { say('Arquivo acima de 20 MB ignorado.', 3000, true); continue; }
    const r = new FileReader();
    r.onload = () => { pocketFiles.unshift({ name: file.name, size: file.size, type: file.type, dataUrl: r.result }); pocketFiles = pocketFiles.slice(0, 8); renderPocket(); };
    r.readAsDataURL(file);
  }
  hopPill(); playChirp(580, 860, 0.16);
  if (!isExpanded) await togglePanel(true); openView('bolso');
}
function formatSize(b) { return b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }
function renderPocket() {
  document.getElementById('sub-bolso').textContent = pocketFiles.length ? `${pocketFiles.length} arquivo(s)` : 'JPG · WebP · PDF';
  const list = document.getElementById('pocket-list');
  if (!pocketFiles.length) { list.innerHTML = '<div style="font-size:11.5px; color:var(--muted); text-align:center; margin-top:12px;">Salvos em <strong>Área de Trabalho\\Lumo_Arquivos</strong>.</div>'; return; }
  list.innerHTML = '';
  pocketFiles.forEach((f, idx) => {
    const isImg = f.type.startsWith('image/');
    const div = document.createElement('div'); div.className = 'pocket-item';
    div.innerHTML = `<div class="pocket-head"><div style="display:flex; align-items:center; gap:8px; overflow:hidden;">${isImg ? `<img class="pocket-thumb" src="${f.dataUrl}" />` : `<div class="pocket-thumb">📄</div>`}<div style="overflow:hidden;"><div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:255px;">${f.name.replace(/</g, '&lt;')}</div><div style="font-size:10.5px; color:var(--muted);">${formatSize(f.size)}</div></div></div><button class="del-btn" onclick="removePocket(${idx})">×</button></div><div class="pocket-actions">${isImg ? `<button class="btn-ghost" onclick="convertImage(${idx},'image/webp','webp')">→ WebP</button><button class="btn-ghost" onclick="convertImage(${idx},'image/jpeg','jpg')">→ JPG</button><button class="btn-ghost" onclick="convertImage(${idx},'image/png','png')">→ PNG</button><button class="btn-ghost" onclick="convertImageToPdf(${idx})">→ PDF</button>` : `<button class="btn-ghost" onclick="saveRawPocket(${idx})">Salvar</button>`}</div>`;
    list.appendChild(div);
  });
}
function removePocket(idx) { pocketFiles.splice(idx, 1); renderPocket(); }
async function saveRawPocket(idx) {
  const f = pocketFiles[idx]; if (!f || !invoke) return;
  const buf = new Uint8Array(await (await fetch(f.dataUrl)).arrayBuffer());
  try { await invoke('save_file_bytes', { filename: f.name, bytes: Array.from(buf) }); say('Salvo em Lumo_Arquivos!', 2600, true); } catch (e) { say('Erro ao salvar: ' + e, 3200, true); }
}
async function convertImage(idx, mime, ext) {
  if (!isPro && ext === 'webp') { openView('config'); say('WebP é do Lumo Pro!', 2200, true); return; }
  const f = pocketFiles[idx]; if (!f) return;
  const q = (parseInt(document.getElementById('img-quality').value, 10) || 80) / 100;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0);
    c.toBlob(async blob => {
      if (!blob || !invoke) return;
      try { await invoke('save_file_bytes', { filename: `${f.name.replace(/\.[^.]+$/, '')}_lumo.${ext}`, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) }); hopPill(); playChirp(640, 960, 0.2); say(`Salvo (${formatSize(blob.size)}) em Lumo_Arquivos!`, 3000, true); } catch (e) { say('Erro ao converter: ' + e, 3200, true); }
    }, mime, q);
  };
  img.src = f.dataUrl;
}
async function convertImageToPdf(idx) {
  const f = pocketFiles[idx]; if (!f || !invoke) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    c.toBlob(async blob => {
      if (!blob) return;
      const jpg = new Uint8Array(await blob.arrayBuffer()), w = c.width, h = c.height, pW = 595.28, pH = 841.89;
      const sc = Math.min((pW - 40) / w, (pH - 40) / h), dw = (w * sc).toFixed(2), dh = (h * sc).toFixed(2);
      const dx = ((pW - dw) / 2).toFixed(2), dy = ((pH - dh) / 2).toFixed(2);
      const enc = new TextEncoder(), chunks = []; let off = 0;
      const ps = s => { const b = enc.encode(s); chunks.push(b); off += b.length; };
      const pb = b => { chunks.push(b); off += b.length; };
      ps('%PDF-1.4\n'); const offs = [0];
      const obj = (id, b, bin = null, tail = '') => { offs[id] = off; ps(`${id} 0 obj\n${b}`); if (bin) pb(bin); ps(`${tail}\nendobj\n`); };
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
      obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
      obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
      obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream');
      const ct = `q ${dw} 0 0 ${dh} ${dx} ${dy} cm /Im0 Do Q`;
      obj(5, `<< /Length ${ct.length} >>\nstream\n${ct}\nendstream`);
      const xr = off; ps('xref\n0 6\n0000000000 65535 f \n');
      for (let i = 1; i <= 5; i++) ps(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
      ps(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
      const pdf = new Uint8Array(chunks.reduce((a, b) => a + b.length, 0)); let pos = 0;
      for (const ch of chunks) { pdf.set(ch, pos); pos += ch.length; }
      try { await invoke('save_file_bytes', { filename: f.name.replace(/\.[^.]+$/, '') + '_lumo.pdf', bytes: Array.from(pdf) }); hopPill(); playChirp(640, 960, 0.2); say('PDF salvo em Lumo_Arquivos!', 3000, true); } catch (e) { say('Erro ao gerar PDF: ' + e, 3200, true); }
    }, 'image/jpeg', 0.9);
  };
  img.src = f.dataUrl;
}

// === IA, VOZ, CONFIGURAÇÕES, TEMAS, AUTO-UPDATE & MOBILE SYNC ===
async function saveGeminiKey(e) { e.preventDefault(); const inp = document.getElementById('api-key-input'); if (!inp.value.trim() || !invoke) return; try { await invoke('save_api_key', { provider: 'gemini', apiKey: inp.value.trim() }); inp.value = ''; playChirp(600, 860, 0.16); say('Chave própria salva no cofre!', 2600, true); } catch (err) { say('Erro ao salvar chave: ' + err, 3200, true); } }
async function removeGeminiKey() { if (invoke) { await invoke('delete_api_key', { provider: 'gemini' }); say('Usando IA integrada.', 2200, true); } }
function clearChat() { document.getElementById('chat-box').innerHTML = '<div class="msg ai">Conversa limpa! Como posso ajudar?</div>'; }
function appendMsg(text, who) {
  const box = document.getElementById('chat-box'), div = document.createElement('div');
  div.className = 'msg ' + who; div.textContent = text;
  if (who === 'ai') {
    const c = document.createElement('div'); c.className = 'copy-mini'; c.textContent = 'Copiar resposta';
    c.onclick = () => { if (invoke) invoke('set_clipboard_text', { text }); c.textContent = 'Copiado ✓'; };
    div.appendChild(c);
  }
  box.appendChild(div); box.scrollTop = box.scrollHeight;
}
async function sendPrompt(e) { e.preventDefault(); stopTypingLook(); const i = document.getElementById('ai-input'), p = i.value.trim(); if (!p) return; i.value = ''; await executePrompt(p); }
async function executePrompt(prompt) {
  appendMsg(prompt, 'user');
  const btn = document.getElementById('ai-send-btn'); btn.disabled = true; btn.textContent = '...';
  isThinking = true; document.getElementById('lumo-pill').classList.add('thinking'); setExpression('thinking');
  const box = document.getElementById('chat-box'), tb = document.createElement('div');
  tb.id = 'typing-bubble'; tb.className = 'msg ai'; tb.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  box.appendChild(tb); box.scrollTop = box.scrollHeight;
  if (invoke) {
    try { /* V395_AI_PERSONA_BRIDGE */
      let promptToSend = prompt;
      if (isPro) {
        const _pKey = localStorage.getItem('lumo_pro_persona') || 'default';
        const _pMap = {
          dev: '[Responda como engenheiro de software sênior: direto, técnico e com código limpo quando ajudar]\n\n',
          study: '[Explique de forma didática para estudos, com tópicos claros e um exemplo prático]\n\n',
          short: '[Responda de forma ultra objetiva, em no máximo 3 frases diretas]\n\n',
          en: '[Reply naturally in English and include a brief Portuguese tip if helpful]\n\n'
        };
        if (_pMap[_pKey]) promptToSend = _pMap[_pKey] + prompt;
      }
      const reply = await invoke('ask_gemini', { prompt: promptToSend, userName: userName || null }); tb.remove(); appendMsg(reply, 'ai'); hopPill(); speakText(reply); }
    catch (err) { tb.remove(); appendMsg(String(err), 'ai'); }
  }
  isThinking = false; document.getElementById('lumo-pill').classList.remove('thinking'); restoreIdleExpression(); btn.disabled = false; btn.textContent = 'Enviar';
}

function toggleVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { say('Reconhecimento de voz indisponível neste PC.', 3000, true); return; }
  const btn = document.getElementById('mic-btn'), rec = new SR(); rec.lang = 'pt-BR';
  btn.classList.add('recording'); setExpression('listening');
  rec.onresult = ev => {
    const t = ev.results[0][0].transcript, l = t.toLowerCase();
    if (l.includes('música') || l.includes('pausar')) { openView('midia'); sendMedia('play_pause'); }
    else if (l.includes('desligar') && l.includes('pc')) { const m = l.match(/(\d+)/); schedulePcSleep(m ? parseInt(m[1], 10) : 30); }
    else if (l.includes('tchau') || l.includes('dormir')) gracefulShutdown();
    else { openView('ia'); executePrompt(t); }
  };
  rec.onerror = () => { btn.classList.remove('recording'); restoreIdleExpression(); say('Não consegui ouvir o microfone.', 2600, true); };
  rec.onend = () => { btn.classList.remove('recording'); restoreIdleExpression(); };
  rec.start();
}

function applyPlanUI() {
  document.getElementById('plan-status-badge').textContent = isPro ? 'PRO ATIVO' : 'GRÁTIS';
  document.getElementById('license-btn').textContent = isPro ? 'Ativo' : 'Ativar';
  ['ambient-pro-badge', 'notes-pro-badge', 'clip-pro-badge', 'theme-pro-badge'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = isPro ? 'none' : 'inline-block';
  });
  const notes = document.getElementById('quick-notes');
  notes.disabled = !isPro;
  notes.placeholder = isPro ? 'Anote ideias... (sincroniza com o celular)' : 'Recurso Lumo Pro.';
  updateDailySummary(); renderClipboard();
}

async function activateLicense(e) {
  e.preventDefault();
  const inp = document.getElementById('license-input'), btn = document.getElementById('license-btn'), code = inp.value.trim().toUpperCase();
  if (!code) return;
  if (code === 'FREE') { isPro = false; localStorage.setItem('lumo_pro', 'false'); inp.value = ''; applyPlanUI(); say('Modo Grátis ativado.', 2000, true); return; }
  if (!invoke) return;
  btn.disabled = true; btn.textContent = '...';
  try {
    const msg = await invoke('activate_license', { key: code });
    isPro = true; localStorage.setItem('lumo_pro', 'true'); localStorage.setItem('lumo_license_key', code);
    inp.value = ''; applyPlanUI(); setExpression('love'); burstPillLove(true); playChirp(600, 980, 0.28); say(msg, 3600, true);
    setTimeout(() => restoreIdleExpression(), 2400);
  } catch (err) { playChirp(260, 180, 0.2); say(String(err), 3600, true); }
  finally { btn.disabled = false; btn.textContent = isPro ? 'Ativo' : 'Ativar'; }
}

function setPersonality(v) { personality = v; localStorage.setItem('lumo_personality', v); }
function setVoiceMode(v) { voiceMode = v; localStorage.setItem('lumo_voice', v); speakText('Agora falo assim!'); }
async function toggleAutostart(v) { if (invoke) try { await invoke('set_autostart', { enabled: v }); } catch (_) { document.getElementById('autostart-toggle').checked = !v; } }

function applyCustomHex(hex, done = false) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.15)`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.38)`);
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.theme === 'custom'));
  document.getElementById('custom-theme-input').value = hex;
  localStorage.setItem('lumo_theme', 'custom'); localStorage.setItem('lumo_custom_hex', hex);
  if (done) { unlockBlur(); hopPill(); playChirp(600, 900, 0.14); }
}
function openCustomColorPicker() {
  if (!isPro) { say('Cor livre é exclusiva do Lumo Pro!', 2400, true); return; }
  lockBlur(); document.getElementById('custom-theme-input').click();
  window.addEventListener('focus', () => unlockBlur(), { once: true });
}
function setTheme(name, el, proOnly = false) {
  if (proOnly && !isPro) { say('Temas extras são do Lumo Pro!', 2400, true); return; }
  if (name === 'custom') { applyCustomHex(localStorage.getItem('lumo_custom_hex') || '#f6b974', false); return; }
  const t = themes[name] || themes.amber;
  document.documentElement.style.setProperty('--accent', t.accent);
  document.documentElement.style.setProperty('--accent-soft', t.soft);
  document.documentElement.style.setProperty('--accent-glow', t.glow);
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.theme === name));
  if (el) { hopPill(); playChirp(560, 820, 0.14); }
  localStorage.setItem('lumo_theme', name);
}
function setEyeStyle(style, btnEl) {
  localStorage.setItem('lumo_eyestyle', style);
  const f = document.getElementById('lumo-face');
  f.classList.remove('style-classic', 'style-kawaii', 'style-cyber');
  f.classList.add('style-' + style);
  document.querySelectorAll('.eye-style-btn').forEach(b => b.classList.toggle('active-btn', b.dataset.style === style));
  if (btnEl) { hopPill(); playChirp(560, 840, 0.14); }
}

// Auto-update
function toggleAutoUpdate(v) { autoInstallUpdates = v; localStorage.setItem('lumo_autoupdate', String(v)); }
async function checkForUpdates(silent = true) {
  if (!invoke || isUpdating || isShuttingDown) return;
  try {
    const res = await invoke('check_update');
    if (res) {
      const newVer = typeof res === 'string' ? res : res.version;
      const mandatory = Boolean(typeof res === 'object' && res.mandatory);
      document.getElementById('update-text').textContent = mandatory
        ? `Atualização obrigatória v${newVer}!`
        : `Lumo v${newVer} pronto!`;
      document.getElementById('update-banner').classList.add('show');
      document.getElementById('update-cfg-status').textContent = mandatory
        ? `Atualização crítica v${newVer} obrigatória`
        : `Nova versão v${newVer} disponível`;

      const inGame = typeof isGameSessionActive === 'function' ? isGameSessionActive() : isHiddenInGame;
      if (mandatory) {
        if (inGame) {
          pendingAutoUpdate = newVer;
          window.pendingUpdateMandatory = true;
          return;
        }
        say(`Atualização importante v${newVer}! Instalando em instantes...`, 3600, true);
        setTimeout(() => installRealUpdate(true, newVer, true), 3500);
        return;
      }

      const canAutoNow = autoInstallUpdates && !inGame && !isThinking && !isExpanded && !timerInterval;
      if (canAutoNow) await installRealUpdate(true, newVer, false);
      else if (autoInstallUpdates) pendingAutoUpdate = newVer;
    } else if (!silent) {
      document.getElementById('update-cfg-status').textContent = 'Você já está na v3.10.2 (mais recente)!';
    }
  } catch (err) {
    if (!silent) document.getElementById('update-cfg-status').textContent = 'Erro: ' + String(err).slice(0, 58);
  }
}
async function manualCheckUpdate() { document.getElementById('update-cfg-status').textContent = 'Verificando no GitHub...'; await checkForUpdates(false); }
async function installRealUpdate(autoMode = false, verLabel = '', mandatory = false) {
  if (!invoke || isUpdating) return;
  if (autoMode && typeof isGameSessionActive === 'function' && isGameSessionActive()) {
    pendingAutoUpdate = verLabel || pendingAutoUpdate || 'nova';
    if (mandatory) window.pendingUpdateMandatory = true;
    return;
  }
  isUpdating = true; pendingAutoUpdate = null; window.pendingUpdateMandatory = false;
  const btn = document.getElementById('update-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Atualizando...'; }
  document.getElementById('update-cfg-status').textContent = 'Baixando atualização...';
  if (autoMode && !mandatory) say(`Atualizando para v${verLabel}... volto já!`, 3800, true);
  try { await invoke('install_update'); }
  catch (err) { isUpdating = false; if (btn) { btn.disabled = false; btn.textContent = 'Tentar de novo'; } document.getElementById('update-cfg-status').textContent = 'Falha: ' + String(err).slice(0, 50); }
}

// Clipboard & Notas
let lastClipSeen = '', notesSyncTimer = null;
function saveQuickNotes(val) {
  localStorage.setItem('lumo_notes', val);
  clearTimeout(notesSyncTimer);
  notesSyncTimer = setTimeout(() => { lastRemoteNotesTs = Date.now(); pushPcSync({ notes: val }); }, 1200);
}
function renderClipboard() {
  const list = document.getElementById('clipboard-list'); list.innerHTML = '';
  if (!isPro) { list.innerHTML = '<div style="font-size:11px; color:var(--muted);">Recurso exclusivo Lumo Pro.</div>'; return; }
  if (!clipHistory.length) { list.innerHTML = '<div style="font-size:11px; color:var(--muted);">Copie algo no PC para aparecer aqui.</div>'; return; }
  clipHistory.forEach((txt, idx) => {
    const div = document.createElement('div'); div.className = 'task-item';
    div.innerHTML = `<div class="task-left" onclick="copyClip(${idx})"><span>${txt.replace(/</g, '&lt;')}</span></div><button class="del-btn" onclick="deleteClip(${idx})">×</button>`;
    list.appendChild(div);
  });
}
async function copyClip(idx) { if (clipHistory[idx] && invoke) { await invoke('set_clipboard_text', { text: clipHistory[idx] }); playChirp(640, 820, 0.14); hopPill(); } }
function deleteClip(idx) { clipHistory.splice(idx, 1); localStorage.setItem('lumo_clips', JSON.stringify(clipHistory)); renderClipboard(); }

function analyzeClipHelp(text) {
  if (isExpanded || isHiddenInGame) return;
  if (/^https?:\/\//i.test(text)) {
    try {
      const u = new URL(text); let rem = false;
      ['utm_source','utm_medium','utm_campaign','fbclid','gclid','igshid','igsh','si'].forEach(k => { if (u.searchParams.has(k)) { u.searchParams.delete(k); rem = true; } });
      if (rem) { say('Link com rastreadores! Clique p/ copiar limpo.', 4800, false, u.toString()); return; }
    } catch (_) {}
  }
  const usd = text.match(/^(?:US\$|\$|USD)\s*(\d+(?:[.,]\d{1,2})?)$/i);
  if (usd) { const v = parseFloat(usd[1].replace(',', '.')); if (!isNaN(v)) { const b = (v * usdRate).toFixed(2).replace('.', ','); say(`US$ ${v} ≈ R$ ${b} (clique p/ copiar)`, 4500, false, `R$ ${b}`); } }
}

// Modo Jogo
async function hideForGame(msg, delayMs = 900) {
  if (isHiddenInGame) return;
  if (isExpanded) { isExpanded = false; document.getElementById('panel').classList.remove('open', 'closing'); await syncWindowMode('pill'); }
  if (msg) say(msg, 1800, true);
  setTimeout(async () => {
    isHiddenInGame = true;
    document.getElementById('lumo-pill').style.display = 'none';
    document.getElementById('speech-bubble').classList.remove('show');
    document.getElementById('corner-sensor').style.display = 'flex';
    await syncWindowMode('hidden');
  }, delayMs);
}
async function wakeFromGame() {
  if (!isHiddenInGame) return;
  isHiddenInGame = false; manualSummonUntil = Date.now() + 45000;
  document.getElementById('corner-sensor').style.display = 'none';
  document.getElementById('lumo-pill').style.display = 'flex';
  setExpression('surprised'); hopPill(); playChirp(520, 780, 0.16);
  await syncWindowMode('pill');
  setTimeout(() => restoreIdleExpression(), 1400);
}

// Ponte Mobile (PWA)
let syncToken = localStorage.getItem('lumo_sync_token') || '', lastRemoteTasksTs = 0, lastRemoteNotesTs = 0, lastRemoteCmdId = '';
function createPairCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = 'LUMO-'; for (let i = 0; i < 6; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }
function renderMobileQR() {
  if (!syncToken) { syncToken = createPairCode(); localStorage.setItem('lumo_sync_token', syncToken); }
  const url = 'https://vitorsilva010.github.io/Lumo/app/?pair=' + encodeURIComponent(syncToken);
  document.getElementById('mob-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=' + encodeURIComponent(url);
  document.getElementById('mob-token-text').textContent = syncToken;
}
async function copyMobileUrl() { const u = 'https://vitorsilva010.github.io/Lumo/app/?pair=' + encodeURIComponent(syncToken); if (invoke) await invoke('set_clipboard_text', { text: u }); say('Link copiado!', 2000, true); }
function resetMobileToken() { syncToken = createPairCode(); localStorage.setItem('lumo_sync_token', syncToken); renderMobileQR(); pushPcSync({ tasks, notes: localStorage.getItem('lumo_notes') || '' }); }
function updateMobileSyncUI() {
  const chk = document.getElementById('mobsync-toggle');
  const st = document.getElementById('mob-sync-status');
  if (chk) chk.checked = mobileSyncEnabled;
  if (st) { st.textContent = mobileSyncEnabled ? 'Ativo' : 'Desativado'; st.style.color = mobileSyncEnabled ? 'var(--ok)' : 'var(--muted)'; }
}
function toggleMobileSync(val) {
  mobileSyncEnabled = Boolean(val);
  localStorage.setItem('lumo_mobsync', String(mobileSyncEnabled));
  updateMobileSyncUI();
  playChirp(mobileSyncEnabled ? 560 : 440, mobileSyncEnabled ? 820 : 320, 0.14);
  if (mobileSyncEnabled) { pollMobileCommands(); say('Sincronização com celular ativada!', 2600, true); }
  else say('Sincronização pausada.', 2000, true);
}
async function pushPcSync(payload) { if (!mobileSyncEnabled || !syncToken) return; try { await fetch(`${API_BASE}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' }, body: JSON.stringify({ token: syncToken, source: 'pc', ...payload }) }); } catch (_) {} }
async function sendPcClipToMobile() { if (!invoke) return; if (!mobileSyncEnabled) toggleMobileSync(true); const t = await invoke('get_clipboard_text'); if (!t) { say('Nenhum texto no Ctrl+C.', 2200, true); return; } await pushPcSync({ clip: t }); hopPill(); say('Ctrl+C enviado pro celular!', 2400, true); }
async function pollMobileCommands() {
  if (!mobileSyncEnabled || !syncToken || isShuttingDown) return;
  try {
    const res = await fetch(`${API_BASE}/sync?token=${encodeURIComponent(syncToken)}`); if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.tasks) && (data.tasksUpdatedAt || 0) > lastRemoteTasksTs) { lastRemoteTasksTs = data.tasksUpdatedAt; isApplyingRemoteSync = true; tasks = data.tasks; renderTasks(false); isApplyingRemoteSync = false; }
    if (typeof data.notes === 'string' && (data.notesUpdatedAt || 0) > lastRemoteNotesTs) { lastRemoteNotesTs = data.notesUpdatedAt; const el = document.getElementById('quick-notes'); if (el && el.value !== data.notes) { el.value = data.notes; localStorage.setItem('lumo_notes', data.notes); } }
    const cmd = data.lastCmd;
    if (cmd && cmd.id && cmd.id !== lastRemoteCmdId && (Date.now() - (cmd.ts || 0)) < 35000) {
      lastRemoteCmdId = cmd.id;
      if (cmd.action === 'media' && cmd.value) await sendMedia(cmd.value);
      else if (cmd.action === 'sleep_pc' && cmd.value) await schedulePcSleep(Number(cmd.value) || 30);
      else if (cmd.action === 'cancel_sleep') await cancelPcSleep();
      else if (cmd.action === 'keep_awake') await toggleKeepAwake(!keepAwakeActive);
      else if (cmd.action === 'set_clip' && cmd.value && invoke) { await invoke('set_clipboard_text', { text: String(cmd.value) }); hopPill(); say('Texto recebido do celular!', 2800, true); }
      else if (cmd.action === 'open_url' && cmd.value && invoke) await invoke('open_external_url', { url: String(cmd.value) });
    }
  } catch (_) {}
}

// === INTERAÇÕES DA PÍLULA, SPOTLIGHT & TIMERS ===
const pill = document.getElementById('lumo-pill');
pill.addEventListener('animationend', ev => { if (ev.animationName === 'hopBounce') pill.classList.remove('hop'); });

let downX = 0, downY = 0, dragged = false, clickTimer = null;
pill.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; dragged = false; });
pill.addEventListener('pointermove', async e => {
  const r = pill.getBoundingClientRect();
  pill.style.setProperty('--tilt', (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + 'deg');
  if (e.buttons === 1 && !dragged && invoke && Math.hypot(e.clientX - downX, e.clientY - downY) > 10) {
    dragged = true; setExpression('surprised'); await invoke('start_drag'); setTimeout(() => restoreIdleExpression(), 1000);
  }
});
pill.addEventListener('pointerleave', () => pill.style.setProperty('--tilt', '0deg'));
pill.addEventListener('click', () => {
  if (dragged || isShuttingDown) return;
  const _faceNow = document.getElementById('lumo-face');
  if (_faceNow && _faceNow.classList.contains('sleepy')) {
    clearTimeout(clickTimer); clickTimer = null;
    lastInteraction = Date.now();
    pill.classList.remove('wake-stretch');
    void pill.offsetWidth;
    pill.classList.add('wake-stretch');
    setTimeout(() => pill.classList.remove('wake-stretch'), 540);
    setExpression('happy');
    playChirp(420, 760, 0.16);
    say('Opa, acordei! 👀', 2200, true);
    setTimeout(() => restoreIdleExpression(), 1250);
    return;
  }
  if (clickTimer) {
    clearTimeout(clickTimer); clickTimer = null;
    lastInteraction = Date.now(); hopPill();
    petCombo = (Date.now() - lastPetTime < 4500) ? petCombo + 1 : 1; lastPetTime = Date.now();
    setExpression(petCombo >= 2 ? 'love' : 'happy'); burstPillLove(petCombo >= 2);
    playChirp(petCombo >= 2 ? 680 : 620, petCombo >= 2 ? 1020 : 860, 0.22);
    say(petCombo >= 2 ? `Aí eu fico mal acostumado${userName ? ', ' + userName : ''}!` : 'Hehe, valeu pelo carinho!', 2400, false, null, true);
    setTimeout(() => restoreIdleExpression(), 2400);
  } else {
    clickTimer = setTimeout(() => { clickTimer = null; togglePanel(); }, 210);
  }
});

(() => {
  const _panelEl = document.getElementById('panel');
  let _spotRaf = 0, _lastEv = null;
  _panelEl.addEventListener('pointermove', (e) => {
    _lastEv = e;
    if (_spotRaf) return;
    _spotRaf = requestAnimationFrame(() => {
      _spotRaf = 0;
      const ev = _lastEv;
      if (!ev || !ev.target || !ev.target.closest) return;
      const activeView = document.querySelector('.view.active');
      if (activeView && (activeView.classList.contains('is-scrolling') || activeView.querySelector('.home-scroll.is-scrolling'))) return;
      const t = ev.target.closest('.hub-tile, .hero-bento, .mini-media-strip, .card, .motd-card, .news-card');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (ev.clientX - r.left).toFixed(1) + 'px');
      t.style.setProperty('--my', (ev.clientY - r.top).toFixed(1) + 'px');
    });
  }, { passive: true });
})();

window.addEventListener('keydown', e => { if (e.key === 'Escape' && isExpanded) togglePanel(false); });
window.addEventListener('blur', () => setTimeout(() => tryCollapseOnOutside(''), 150));

function scheduleBlink() {
  setTimeout(() => {
    const f = document.getElementById('lumo-face');
    if (f && !isShuttingDown && !isHiddenInGame && !['happy','sleepy','goodbye','dizzy','love','thinking'].some(c => f.classList.contains(c))) {
      f.classList.add('blink'); setTimeout(() => f.classList.remove('blink'), 130);
    }
    scheduleBlink();
  }, 2600 + Math.random() * 3400);
}

setInterval(() => {
  if (isShuttingDown) return;
  if (isExpanded) updateLiveClock();
  if (activeReminder) {
    if (Date.now() >= activeReminder.endTime) {
      const m = activeReminder.label; activeReminder = null; updateReminderUI();
      if (isHiddenInGame) wakeFromGame();
      setExpression('surprised'); hopPill(); burstPillLove(true); playChirp(640, 1080, 0.3);
      say(`Lembrete: ${m}!`, 7000, true, null, true); setTimeout(() => restoreIdleExpression(), 3200);
    } else updateReminderUI();
  }
}, 1000);

setInterval(async () => {
  if (!invoke || isShuttingDown || isHiddenInGame || (trayOnlyMode && !isExpanded && !isPro)) return;
  try {
    const text = await invoke('get_clipboard_text');
    if (text && text !== lastClipSeen) {
      const first = lastClipSeen === ''; lastClipSeen = text;
      if (!first) analyzeClipHelp(text);
      if (isPro && clipHistory[0] !== text) { clipHistory = [text, ...clipHistory.filter(c => c !== text)].slice(0, 10); localStorage.setItem('lumo_clips', JSON.stringify(clipHistory)); renderClipboard(); }
    }
  } catch (_) {}
}, 1800);

setInterval(() => {
  if (isShuttingDown) return;
  if (pendingAutoUpdate && (autoInstallUpdates || window.pendingUpdateMandatory) && !isUpdating && !(typeof isGameSessionActive === 'function' ? isGameSessionActive() : isHiddenInGame) && !isThinking && !isExpanded && !timerInterval) installRealUpdate(true, pendingAutoUpdate, Boolean(window.pendingUpdateMandatory));
  const f = document.getElementById('lumo-face');
  if (f && !isHiddenInGame && !['blink','happy','sleepy','goodbye','dizzy','love','thinking'].some(c => f.classList.contains(c)) && Math.random() < 0.3) {
    f.classList.add('wink'); setTimeout(() => f.classList.remove('wink'), 240);
  }
  const idleSec = (Date.now() - lastInteraction) / 1000;
  if (!isExpanded && !isHiddenInGame && !activeAmbient && !isMediaPlaying && !timerInterval && !isThinking && !pcUnderLoad) {
    if (idleSec > 240) setExpression('sleepy');
    else if (idleSec > 100) setExpression('bored');
  }
}, 10000);

// === INICIALIZAÇÃO ===
(async function init() {
  setTheme(localStorage.getItem('lumo_theme') || 'amber');
  setEyeStyle(localStorage.getItem('lumo_eyestyle') || 'classic');
  document.getElementById('personality-select').value = personality;
  document.getElementById('voice-select').value = voiceMode;
  document.getElementById('autoclose-toggle').checked = autoCloseOnBlur;
  const trayChk = document.getElementById('trayonly-toggle'); if (trayChk) trayChk.checked = trayOnlyMode;
  updateMobileSyncUI();
  document.getElementById('autoupdate-toggle').checked = autoInstallUpdates;
  document.getElementById('quick-notes').value = localStorage.getItem('lumo_notes') || '';

  updateLiveClock(); updateGreetingUI(); renderMobileQR(); renderColorHistory(); renderTasks(false); applyPlanUI();
  setupDragAndDrop(); scheduleBlink();

  if (invoke) { try { document.getElementById('autostart-toggle').checked = await invoke('get_autostart'); } catch (_) {} }
  if (listen) {
    listen('toggle-lumo', () => togglePanel());
    listen('tray-toggle', () => togglePanel());
    listen('window-blur', () => setTimeout(() => tryCollapseOnOutside(''), 150));
  }

  syncWindowMode('pill');
  fetchWeather(false);
  fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).then(d => { if (d?.rates?.BRL) { usdRate = d.rates.BRL; if (d.rates.EUR) eurRate = d.rates.BRL / d.rates.EUR; } }).catch(() => {});

  pollWindowsLoop();
  setInterval(pollMobileCommands, 8000);
  setTimeout(() => checkForUpdates(true), 3500);
  setInterval(() => checkForUpdates(true), 30 * 60 * 1000);

  setTimeout(() => {
    if (!localStorage.getItem('lumo_intro_v1') && typeof window.playArrivalCinema === 'function') {
      window.playArrivalCinema();
      return;
    }
    if (trayOnlyMode) return;
    setExpression('happy');
    playChirp(420, 740, 0.25);
    say(pickStartupQuote(), 6800, true);
    setTimeout(() => {
      const f = document.getElementById('lumo-face');
      if (f && f.classList.contains('happy') && !isThinking && !isShuttingDown) {
        restoreIdleExpression();
      }
    }, 3600);
  }, 450);
})();
