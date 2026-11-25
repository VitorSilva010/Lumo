// === LUMO v2.9.6 — MOTOR DE OTIMIZAÇÃO, MODO ECONOMIA & MICRO-ANIMAÇÕES ===
(function initLumoPerfMotion() {
  window.lumoEcoMode = false;
  let reducedMotion = localStorage.getItem('lumo_reduced_motion') === 'true';

  function applyReducedMotion(on) {
    reducedMotion = Boolean(on);
    localStorage.setItem('lumo_reduced_motion', String(reducedMotion));
    document.body.classList.toggle('reduced-motion', reducedMotion);
    const chk = document.getElementById('reduced-motion-toggle');
    if (chk) chk.checked = reducedMotion;
  }
  applyReducedMotion(reducedMotion);
  window.setReducedMotion = applyReducedMotion;

  const pill = document.getElementById('lumo-pill');

  // 1. Injeta Barra de Progresso do Pomodoro (#pill-pomo-track) na cápsula
  let pomoTrack = document.getElementById('pill-pomo-track');
  let pomoFill = document.getElementById('pill-pomo-fill');
  if (pill && !pomoTrack) {
    pomoTrack = document.createElement('div');
    pomoTrack.id = 'pill-pomo-track';
    pomoTrack.innerHTML = '<div id="pill-pomo-fill"></div>';
    pill.appendChild(pomoTrack);
    pomoFill = pomoTrack.firstElementChild;
  }

  // 2. Sincroniza estado visual da cápsula quando painel abre/fecha
  const panel = document.getElementById('panel');
  if (panel && pill) {
    new MutationObserver(() => {
      pill.classList.toggle('pill-open', panel.classList.contains('open'));
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  // 3. Barra de progresso do Pomodoro sem invadir o timer original
  let pomoPeakSec = 0;
  let lastRatio = -1;
  function parseTimerSeconds() {
    const el = document.getElementById('timer-display') || document.querySelector('.timer-display');
    if (!el) return null;
    const m = (el.textContent || '').trim().match(/^(\d{1,3}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function updatePomoBar() {
    if (!pomoTrack || !pomoFill) return;
    const active = typeof timerInterval !== 'undefined' && Boolean(timerInterval);
    if (!active) {
      if (lastRatio !== -1) {
        pomoTrack.classList.remove('active');
        pomoFill.style.transform = 'scaleX(0)';
        pomoPeakSec = 0;
        lastRatio = -1;
      }
      return;
    }
    const sec = parseTimerSeconds();
    if (sec === null) return;
    if (sec > pomoPeakSec) pomoPeakSec = sec;
    const ratio = pomoPeakSec > 0 ? Math.max(0.02, Math.min(1, sec / pomoPeakSec)) : 1;
    if (Math.abs(ratio - lastRatio) >= 0.005) {
      lastRatio = ratio;
      pomoTrack.classList.add('active');
      pomoFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
  }

  // 4. Motor de Modo Economia Automático
  function syncEcoState() {
    const inGame = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
    const inTray = typeof trayOnlyMode !== 'undefined' && trayOnlyMode && !(typeof isExpanded !== 'undefined' && isExpanded);
    const hidden = document.hidden;
    const nextEco = Boolean(inGame || inTray || hidden);
    if (nextEco !== window.lumoEcoMode) {
      window.lumoEcoMode = nextEco;
      document.body.classList.toggle('lumo-eco', nextEco);
    }
    updatePomoBar();
  }
  document.addEventListener('visibilitychange', syncEcoState);
  setInterval(syncEcoState, 1500);
  syncEcoState();

  window.flashPillClip = function () {
    if (!pill || window.lumoEcoMode || reducedMotion) return;
    pill.classList.remove('clip-flash');
    void pill.offsetWidth;
    pill.classList.add('clip-flash');
    setTimeout(() => pill.classList.remove('clip-flash'), 440);
  };

  // 5. Toggle "Modo Ultra-Leve" no padrão exato dos outros switches (.card-row + .switch)
  const autoHide = document.getElementById('autohide-toggle');
  const cfgRow = autoHide ? autoHide.closest('.card-row') : null;
  if (cfgRow && !document.getElementById('reduced-motion-toggle')) {
    cfgRow.insertAdjacentHTML(
      'afterend',
      `<div class="card-row">
        <div>
          <div style="font-size:12px; font-weight:600;">Modo Ultra-Leve</div>
          <div style="font-size:10.5px; color:var(--muted);">Reduz animações para economizar ainda mais CPU</div>
        </div>
        <label class="switch"><input type="checkbox" id="reduced-motion-toggle" ${reducedMotion ? 'checked' : ''} onchange="setReducedMotion(this.checked)" /><span class="slider"></span></label>
      </div>`
    );
  }
})();
