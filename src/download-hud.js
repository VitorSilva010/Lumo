// === LUMO v2.9.7 — MONITOR DE DOWNLOADS EM TEMPO REAL ===
(function initDownloadHud() {
  let enabled = localStorage.getItem('lumo_dl_monitor') !== 'false';
  let lastDoneFile = '';
  let lastDoneUntil = 0;
  let lastRenderSig = '';
  let pollTimer = null;

  function callRust(cmd, args) {
    if (typeof invoke === 'function') return invoke(cmd, args);
    const fn = window.__TAURI__?.core?.invoke;
    return fn ? fn(cmd, args) : Promise.resolve(null);
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtBytes(b) {
    const n = Number(b) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function fmtSpeed(bps) {
    const n = Number(bps) || 0;
    if (n <= 0) return 'gravando...';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB/s';
    return (n / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  // 1. Injeta chip + barra líquida na cápsula (#lumo-pill)
  const pill = document.getElementById('lumo-pill');
  let chipEl = document.getElementById('pill-dl-chip');
  if (pill && !chipEl) {
    chipEl = document.createElement('div');
    chipEl.id = 'pill-dl-chip';
    chipEl.title = 'Clique para abrir a pasta Downloads';
    chipEl.innerHTML = '<span class="dl-arrow">↓</span><span class="dl-size" id="pill-dl-size">0 MB</span><span class="dl-speed" id="pill-dl-speed"></span>';
    chipEl.addEventListener('click', (e) => {
      e.stopPropagation();
      window.openDownloadsFolder('');
    });
    pill.appendChild(chipEl);
  }

  if (pill && !document.getElementById('pill-dl-track')) {
    const tr = document.createElement('div');
    tr.id = 'pill-dl-track';
    tr.innerHTML = '<div id="pill-dl-bar"></div>';
    pill.appendChild(tr);
  }

  // 2. Injeta card contextual no topo do #view-resumo
  const resumoView = document.getElementById('view-resumo');
  let dlCard = document.getElementById('resumo-dl-card');
  if (resumoView && !dlCard) {
    dlCard = document.createElement('div');
    dlCard.id = 'resumo-dl-card';
    resumoView.insertAdjacentElement('afterbegin', dlCard);
  }

  // 3. Injeta toggle nas Configurações (logo após reduced-motion-toggle ou autohide-toggle)
  const anchorChk = document.getElementById('reduced-motion-toggle') || document.getElementById('autohide-toggle');
  const anchorRow = anchorChk ? anchorChk.closest('label, .toggle-row, div') : null;
  if (anchorRow && !document.getElementById('dl-monitor-toggle')) {
    anchorRow.insertAdjacentHTML(
      'afterend',
      `<label style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; font-size:11.5px; cursor:pointer;">
        <span>Monitorar downloads na cápsula</span>
        <input type="checkbox" id="dl-monitor-toggle" ${enabled ? 'checked' : ''} onchange="setDownloadMonitor(this.checked)" />
      </label>`
    );
  }

  window.setDownloadMonitor = function (on) {
    enabled = Boolean(on);
    localStorage.setItem('lumo_dl_monitor', String(enabled));
    if (!enabled) {
      pill?.classList.remove('dl-active');
      dlCard?.classList.remove('show');
      lastRenderSig = '';
    } else {
      schedulePoll(120);
    }
  };

  window.openDownloadsFolder = function (fileName = '') {
    callRust('open_downloads_folder', { fileName: fileName || null }).catch(() => {});
  };

  window.dismissDownloadCard = function () {
    lastDoneFile = '';
    lastDoneUntil = 0;
    lastRenderSig = '';
    dlCard?.classList.remove('show');
  };

  function celebrateCompletion(fileName) {
    lastDoneFile = fileName;
    lastDoneUntil = Date.now() + 90000;

    const inGame = typeof isGameSessionActive === 'function'
      ? isGameSessionActive()
      : (typeof isHiddenInGame !== 'undefined' && isHiddenInGame);
    const stealth = typeof isStealth === 'function' && isStealth();

    if (pill && !inGame) {
      pill.classList.add('dl-done');
      setTimeout(() => pill.classList.remove('dl-done'), 1800);
      if (typeof hopPill === 'function') hopPill();
    }
    if (!inGame && !stealth) {
      if (typeof playChirp === 'function') {
        playChirp(540, 820, 0.12);
        setTimeout(() => playChirp(740, 1040, 0.13), 100);
      }
      if (typeof setExpression === 'function' && !(typeof isThinking !== 'undefined' && isThinking)) {
        setExpression('happy');
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 2000);
      }
      if (typeof say === 'function') {
        say(`✅ Download pronto: ${fileName.slice(0, 44)}`, 4500, true);
      }
    }
  }

  function renderState(active) {
    if (!pill) return;
    const hasActive = Array.isArray(active) && active.length > 0;
    pill.classList.toggle('dl-active', hasActive);

    if (hasActive) {
      const totalBytes = active.reduce((acc, d) => acc + (d.bytes || 0), 0);
      const totalSpeed = active.reduce((acc, d) => acc + (d.speed_bps || 0), 0);
      const first = active[0];
      const sizeEl = document.getElementById('pill-dl-size');
      const spdEl = document.getElementById('pill-dl-speed');
      if (sizeEl) sizeEl.textContent = active.length > 1 ? `${active.length} arq · ${fmtBytes(totalBytes)}` : fmtBytes(totalBytes);
      if (spdEl) spdEl.textContent = totalSpeed > 0 ? `· ${fmtSpeed(totalSpeed)}` : '';
      if (chipEl) chipEl.title = `Baixando: ${first.name} (${fmtBytes(first.bytes)}) — clique para abrir Downloads`;

      const sig = 'A:' + active.map((d) => `${d.name}|${Math.round(d.bytes / 131072)}|${Math.round(d.speed_bps / 65536)}`).join(',');
      if (dlCard && sig !== lastRenderSig) {
        lastRenderSig = sig;
        dlCard.classList.add('show');
        dlCard.innerHTML = `
          <div class="dl-card-head">
            <span>↓ Baixando ${active.length > 1 ? `(${active.length} arquivos)` : 'agora'}</span>
            <button type="button" class="cp-mini" onclick="openDownloadsFolder('')">Abrir pasta</button>
          </div>
          <div class="dl-card-name" title="${esc(first.name)}">${esc(first.name)}</div>
          <div class="dl-card-bar"><div class="dl-card-bar-fill"></div></div>
          <div class="dl-card-meta">
            <span>${fmtBytes(totalBytes)} baixados</span>
            <span style="color:var(--accent); font-weight:700;">${fmtSpeed(totalSpeed)}</span>
          </div>`;
      }
      return;
    }

    // Sem download ativo: mostra aviso recém-concluído por até 90s no Resumo
    if (dlCard) {
      if (lastDoneFile && Date.now() < lastDoneUntil) {
        const sig = 'D:' + lastDoneFile;
        if (sig !== lastRenderSig) {
          lastRenderSig = sig;
          dlCard.classList.add('show');
          dlCard.innerHTML = `
            <div class="dl-card-head">
              <span>✅ Download concluído</span>
              <button type="button" class="cp-mini" onclick="dismissDownloadCard()">×</button>
            </div>
            <div class="dl-card-name" title="${esc(lastDoneFile)}">${esc(lastDoneFile)}</div>
            <div style="display:flex; gap:6px; margin-top:2px;">
              <button type="button" class="cp-mini" style="flex:1; background:var(--accent); color:#0b0e14; border-color:var(--accent); font-weight:700;" onclick="openDownloadsFolder('${esc(lastDoneFile).replace(/'/g, "\\'")}')">📂 Mostrar na pasta</button>
            </div>`;
        }
      } else if (lastRenderSig !== 'NONE') {
        lastRenderSig = 'NONE';
        dlCard.classList.remove('show');
      }
    }
  }

  function schedulePoll(ms) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollDownloads, ms);
  }

  async function pollDownloads() {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    if (!enabled) { schedulePoll(5000); return; }

    let nextDelay = window.lumoEcoMode ? 6000 : 2800;
    try {
      const res = await callRust('get_active_downloads');
      if (res && typeof res === 'object') {
        const active = Array.isArray(res.active) ? res.active : [];
        const completed = Array.isArray(res.completed) ? res.completed : [];
        if (completed.length > 0) {
          celebrateCompletion(completed[completed.length - 1]);
        }
        renderState(active);
        if (active.length > 0) nextDelay = window.lumoEcoMode ? 3500 : 1200;
      }
    } catch (_) {}
    schedulePoll(nextDelay);
  }

  schedulePoll(2400);
})();
