// === LUMO v2.7.0 — 7 POSIÇÕES NA TELA + HUD NA CÁPSULA FECHADA ===
(function initPillHudAndPositions() {
  const VALID_HUD = ['off', 'clock', 'weather', 'cpu', 'cycle'];
  let hudMode = localStorage.getItem('lumo_pill_hud') || 'off';
  if (!VALID_HUD.includes(hudMode)) hudMode = 'off';
  let cycleStep = 0;
  let hudTimer = null;

  // 1. Injeta o elemento #pill-hud dentro da cápsula (#lumo-pill)
  const pill = document.getElementById('lumo-pill');
  let hudEl = document.getElementById('pill-hud');
  if (pill && !hudEl) {
    hudEl = document.createElement('div');
    hudEl.id = 'pill-hud';
    hudEl.innerHTML = '<span class="hud-dot"></span><span id="pill-hud-text"></span>';
    pill.appendChild(hudEl);
  }

  function readHudValue(kind) {
    if (kind === 'clock') {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (kind === 'weather') {
      const chip = document.querySelector('#weather-chip, .weather-chip');
      const txt = (chip?.textContent || '').trim();
      const m = txt.match(/-?\d+\s*°C?/);
      return m ? m[0].replace(/\s+/g, '') : '--°C';
    }
    if (kind === 'cpu') {
      const cpuEl = document.getElementById('cpu-val') || document.querySelector('.telemetry-grid');
      const txt = (cpuEl?.textContent || '').trim();
      const m = txt.match(/\d+\s*%/);
      return m ? `CPU ${m[0].replace(/\s+/g, '')}` : 'CPU --';
    }
    return '';
  }

  function renderPillHud() {
    if (!hudEl) return;
    const textEl = document.getElementById('pill-hud-text');
    const hidden = (typeof isHiddenInGame !== 'undefined' && isHiddenInGame) || hudMode === 'off';
    if (hidden) {
      hudEl.classList.remove('show');
      return;
    }

    let kind = hudMode;
    if (hudMode === 'cycle') {
      const order = ['clock', 'weather', 'cpu'];
      kind = order[cycleStep % order.length];
    }
    const val = readHudValue(kind);
    if (textEl && val) {
      textEl.textContent = val;
      hudEl.classList.add('show');
    } else {
      hudEl.classList.remove('show');
    }
  }

  function restartHudTimer() {
    clearInterval(hudTimer);
    hudTimer = null;
    if (hudMode === 'off') return;
    let ticks = 0;
    hudTimer = setInterval(() => {
      if (document.hidden) return;
      ticks++;
      if (hudMode === 'cycle' && ticks % 2 === 0) cycleStep++;
      renderPillHud();
    }, 4000);
  }

  function setPillHudMode(mode, feedback = false) {
    hudMode = VALID_HUD.includes(mode) ? mode : 'off';
    localStorage.setItem('lumo_pill_hud', hudMode);
    document.querySelectorAll('.hud-mode-btn').forEach((b) => {
      b.classList.toggle('active-btn', b.dataset.hud === hudMode);
    });
    renderPillHud();
    restartHudTimer();
    if (feedback) {
      if (typeof playChirp === 'function') playChirp(540, 820, 0.13);
      if (typeof hopPill === 'function') hopPill();
    }
  }

  // 2. Atualiza a grade de posições nas Configurações para 7 opções + adiciona o seletor da Cápsula
  const posGrid = document.querySelector('.pos-grid');
  if (posGrid && !posGrid.classList.contains('pos-grid-7')) {
    posGrid.classList.add('pos-grid-7');
    posGrid.innerHTML = `
      <button type="button" class="pos-btn" data-pos="top-left" onclick="applyPosition('top-left', true)">Topo Esq.</button>
      <button type="button" class="pos-btn" data-pos="top-center" onclick="applyPosition('top-center', true)">Topo Centro</button>
      <button type="button" class="pos-btn" data-pos="top-right" onclick="applyPosition('top-right', true)">Topo Dir.</button>
      <button type="button" class="pos-btn" data-pos="bottom-left" onclick="applyPosition('bottom-left', true)">Baixo Esq.</button>
      <button type="button" class="pos-btn" data-pos="bottom-center" onclick="applyPosition('bottom-center', true)">Baixo Centro</button>
      <button type="button" class="pos-btn" data-pos="bottom-right" onclick="applyPosition('bottom-right', true)">Relógio</button>
      <button type="button" class="pos-btn" data-pos="free" onclick="applyPosition('free', true)">✦ Posição Livre (fica onde você arrastar)</button>
    `;

    // Seletor "Na cápsula fechada" logo abaixo
    if (!document.getElementById('hud-mode-block')) {
      posGrid.insertAdjacentHTML(
        'afterend',
        `<div id="hud-mode-block" style="margin-top:11px; padding-top:9px; border-top:1px solid var(--border);">
          <div style="font-size:11.5px; font-weight:600;">Na cápsula fechada</div>
          <div style="font-size:10px; color:var(--muted);">Mostra informação discreta ao lado dos olhos</div>
          <div class="hud-mode-grid">
            <button type="button" class="hud-mode-btn" data-hud="off" onclick="setPillHudMode('off', true)">Só olhos</button>
            <button type="button" class="hud-mode-btn" data-hud="clock" onclick="setPillHudMode('clock', true)">Relógio</button>
            <button type="button" class="hud-mode-btn" data-hud="weather" onclick="setPillHudMode('weather', true)">Clima</button>
            <button type="button" class="hud-mode-btn" data-hud="cpu" onclick="setPillHudMode('cpu', true)">CPU</button>
            <button type="button" class="hud-mode-btn" data-hud="cycle" onclick="setPillHudMode('cycle', true)">Misto</button>
          </div>
        </div>`
      );
    }

    // Marca o botão ativo atual
    const savedPos = window.uiPosition || localStorage.getItem('lumo_pos') || 'top-center';
    posGrid.querySelectorAll('.pos-btn').forEach((b) => {
      b.classList.toggle('active-btn', b.dataset.pos === savedPos);
    });
  }

  // 3. No modo Posição Livre, ajusta automaticamente se abre para cima ou para baixo
  window.syncFreePosDirection = function () {
    if ((window.uiPosition || localStorage.getItem('lumo_pos')) !== 'free') return;
    const midY = (window.screenY || 0) + (window.outerHeight || 150) / 2;
    const halfScreen = (window.screen?.availHeight || 800) / 2;
    document.body.classList.toggle('pos-bottom', midY > halfScreen);
  };

  window.setPillHudMode = setPillHudMode;
  setPillHudMode(hudMode, false);
  setTimeout(renderPillHud, 1200);
})();
