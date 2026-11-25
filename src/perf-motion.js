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

  // 1. Injeta Mini Equalizador (#pill-eq) e Barra de Progresso do Pomodoro (#pill-pomo-track) na cápsula
  const pill = document.getElementById('lumo-pill');
  const face = document.getElementById('lumo-face');

  let eqEl = document.getElementById('pill-eq');
  if (pill && !eqEl) {
    eqEl = document.createElement('div');
    eqEl.id = 'pill-eq';
    eqEl.setAttribute('aria-hidden', 'true');
    eqEl.innerHTML = '<span></span><span></span><span></span>';
    if (face && face.nextSibling) pill.insertBefore(eqEl, face.nextSibling);
    else pill.appendChild(eqEl);
  }

  let pomoTrack = document.getElementById('pill-pomo-track');
  let pomoFill = document.getElementById('pill-pomo-fill');
  if (pill && !pomoTrack) {
    pomoTrack = document.createElement('div');
    pomoTrack.id = 'pill-pomo-track';
    pomoTrack.innerHTML = '<div id="pill-pomo-fill"></div>';
    pill.appendChild(pomoTrack);
    pomoFill = pomoTrack.firstElementChild;
  }

  // 2. Sincroniza Equalizador via MutationObserver no #lumo-face (zero polling!)
  function syncEq() {
    if (!eqEl || !face) return;
    const playing = face.classList.contains('music') && !window.lumoEcoMode;
    eqEl.classList.toggle('active', playing);
  }
  if (face) {
    new MutationObserver(syncEq).observe(face, { attributes: true, attributeFilter: ['class'] });
    syncEq();
  }

  // 3. Sincroniza estado visual da cápsula quando painel abre/fecha (MutationObserver em #panel)
  const panel = document.getElementById('panel');
  if (panel && pill) {
    new MutationObserver(() => {
      pill.classList.toggle('pill-open', panel.classList.contains('open'));
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  // 4. Barra de progresso do Pomodoro sem invadir o timer original
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

  // 5. Motor de Modo Economia Automático (1 check leve a cada 1.5s)
  function syncEcoState() {
    const inGame = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
    const inTray = typeof trayOnlyMode !== 'undefined' && trayOnlyMode && !(typeof isExpanded !== 'undefined' && isExpanded);
    const hidden = document.hidden;
    const nextEco = Boolean(inGame || inTray || hidden);
    if (nextEco !== window.lumoEcoMode) {
      window.lumoEcoMode = nextEco;
      document.body.classList.toggle('lumo-eco', nextEco);
      syncEq();
    }
    updatePomoBar();
  }
  document.addEventListener('visibilitychange', syncEcoState);
  setInterval(syncEcoState, 1500);
  syncEcoState();

  // 6. Pulso discreto na cápsula ao copiar conteúdo novo (quando a função global disparar)
  window.flashPillClip = function () {
    if (!pill || window.lumoEcoMode || reducedMotion) return;
    pill.classList.remove('clip-flash');
    void pill.offsetWidth;
    pill.classList.add('clip-flash');
    setTimeout(() => pill.classList.remove('clip-flash'), 440);
  };

  // 7. Injeta toggle "Modo Ultra-Leve" nas Configurações (logo após autohide-toggle)
  const autoHide = document.getElementById('autohide-toggle');
  const cfgRow = autoHide ? autoHide.closest('.toggle-row, label, div') : null;
  if (cfgRow && !document.getElementById('reduced-motion-toggle')) {
    cfgRow.insertAdjacentHTML(
      'afterend',
      `<label style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; font-size:11.5px; cursor:pointer;">
        <span>Modo Ultra-Leve <span style="color:var(--muted); font-size:10px;">(menos animações)</span></span>
        <input type="checkbox" id="reduced-motion-toggle" ${reducedMotion ? 'checked' : ''} onchange="setReducedMotion(this.checked)" />
      </label>`
    );
  }
})();
