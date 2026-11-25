// === LUMO v2.9.0 — DETECTOR UNIVERSAL DE JOGOS + TRAVA RÍGIDA DE UPDATE ===
(function initGameGuard() {
  let customGames = [];
  let ignoredApps = [];
  try { customGames = JSON.parse(localStorage.getItem('lumo_custom_games') || '[]'); } catch (_) {}
  try { ignoredApps = JSON.parse(localStorage.getItem('lumo_ignored_games') || '[]'); } catch (_) {}

  window.isPlayingGame = false;
  window.currentGameName = '';
  window.lastGameSeenMs = 0;
  window.pendingUpdateMandatory = false;
  let lastSeenExe = '';
  let lastSeenTitle = '';

  const SYSTEM_BLOCK = [
    'lumo.exe', 'explorer.exe', 'taskmgr.exe', 'searchhost.exe', 'shellexperiencehost.exe',
    'startmenuexperiencehost.exe', 'snippingtool.exe', 'screenclippinghost.exe', 'dwm.exe'
  ];

  function saveLists() {
    localStorage.setItem('lumo_custom_games', JSON.stringify(customGames));
    localStorage.setItem('lumo_ignored_games', JSON.stringify(ignoredApps));
    renderGameGuardUI();
  }

  function normExe(exe) {
    return String(exe || '').trim().toLowerCase();
  }

  // Trava rígida: impede qualquer update automático durante o jogo e nos 45s após sair
  window.isGameSessionActive = function () {
    const hidden = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
    const pending = typeof activeGamePendingHide !== 'undefined' && activeGamePendingHide;
    const cooldown = window.lastGameSeenMs > 0 && (Date.now() - window.lastGameSeenMs) < 45000;
    return Boolean(window.isPlayingGame || hidden || pending || cooldown);
  };

  window.evaluateUniversalGame = function (st) {
    const rawTitle = String(st?.active_window || '');
    const titleLower = rawTitle.toLowerCase();
    const exe = normExe(st?.active_exe);

    if (exe && !SYSTEM_BLOCK.includes(exe)) {
      lastSeenExe = exe;
      lastSeenTitle = rawTitle.slice(0, 42);
      const lbl = document.getElementById('gg-last-app');
      if (lbl) lbl.textContent = `${exe}${lastSeenTitle ? ' · ' + lastSeenTitle : ''}`;
    }

    const isUserIgnored = exe && ignoredApps.includes(exe);
    const isUserCustom = exe && customGames.includes(exe);

    // 1. Checa banco local de dicas personalizadas (mantém dicas específicas dos jogos conhecidos)
    const ignoredTitle = ['sobreposição', 'captura', 'snipping', 'youtube', 'twitch', 'discord', 'whatsapp', 'visual studio', 'codespaces', 'github', 'lumo'].some((w) => titleLower.includes(w));
    const isBrowser = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe', 'opera_gx.exe', 'vivaldi.exe'].includes(exe);
    let tipGame = null;
    if (!isUserIgnored && !ignoredTitle && (!isBrowser || st?.is_game) && rawTitle && typeof gameTipsDB !== 'undefined') {
      const norm = (s) => ' ' + s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
      const nt = norm(rawTitle);
      tipGame = gameTipsDB.find((g) => g.keys.some((k) => nt.includes(norm(k)))) || null;
    }

    const detected = !isUserIgnored && Boolean(st?.is_game || isUserCustom || tipGame);
    const name = tipGame
      ? tipGame.name
      : (st?.game_name || (isUserCustom ? (rawTitle.slice(0, 34) || exe.replace(/\.exe$/i, '')) : ''));

    window.isPlayingGame = detected;
    window.currentGameName = detected ? name : '';
    if (detected || (typeof isHiddenInGame !== 'undefined' && isHiddenInGame)) {
      window.lastGameSeenMs = Date.now();
    }

    const statusEl = document.getElementById('gg-live-status');
    if (statusEl) {
      statusEl.textContent = detected
        ? `🎮 Jogando: ${name || exe} (updates pausados)`
        : 'Detector universal ativo · Updates bloqueados em jogo';
    }

    return { detected, name, tipGame, exe };
  };

  window.markLastAppAsGame = function () {
    if (!lastSeenExe) return;
    ignoredApps = ignoredApps.filter((x) => x !== lastSeenExe);
    if (!customGames.includes(lastSeenExe)) customGames.push(lastSeenExe);
    saveLists();
    if (typeof say === 'function') say(`${lastSeenExe} marcado como jogo! 🎮`, 2400, true);
  };

  window.ignoreLastAppAsGame = function () {
    if (!lastSeenExe) return;
    customGames = customGames.filter((x) => x !== lastSeenExe);
    if (!ignoredApps.includes(lastSeenExe)) ignoredApps.push(lastSeenExe);
    saveLists();
    if (typeof say === 'function') say(`${lastSeenExe} ignorado pelo Modo Jogo.`, 2400, true);
  };

  window.removeGameGuardEntry = function (listType, exe) {
    if (listType === 'custom') customGames = customGames.filter((x) => x !== exe);
    else ignoredApps = ignoredApps.filter((x) => x !== exe);
    saveLists();
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderGameGuardUI() {
    const box = document.getElementById('gg-chips');
    if (!box) return;
    if (!customGames.length && !ignoredApps.length) {
      box.innerHTML = '<span style="font-size:10px; color:var(--muted);">Nenhuma regra manual ainda (detecção automática cuida de quase tudo).</span>';
      return;
    }
    const cHtml = customGames.map((e) =>
      `<button type="button" class="cp-mini" title="Clique para remover" onclick="removeGameGuardEntry('custom','${esc(e)}')">🎮 ${esc(e)} ×</button>`
    ).join('');
    const iHtml = ignoredApps.map((e) =>
      `<button type="button" class="cp-mini" title="Clique para remover" onclick="removeGameGuardEntry('ignored','${esc(e)}')">🚫 ${esc(e)} ×</button>`
    ).join('');
    box.innerHTML = cHtml + iHtml;
  }

  // Injeta controles do Detector Universal nas Configurações (logo após autohide-toggle)
  const autoHideChk = document.getElementById('autohide-toggle');
  const hostCard = autoHideChk ? autoHideChk.closest('.card') : null;
  if (hostCard && !document.getElementById('game-guard-box')) {
    hostCard.insertAdjacentHTML(
      'beforeend',
      `<div id="game-guard-box" style="margin-top:9px; padding-top:9px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="font-size:10.5px; color:var(--accent); font-weight:600;" id="gg-live-status">Detector universal ativo · Updates bloqueados em jogo</div>
        <div style="font-size:10px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Último app: <span id="gg-last-app" style="color:var(--text);">aguardando...</span></div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="cp-mini" style="flex:1; padding:5px 6px;" onclick="markLastAppAsGame()">+ Marcar como jogo</button>
          <button type="button" class="cp-mini" style="flex:1; padding:5px 6px;" onclick="ignoreLastAppAsGame()">Ignorar app</button>
        </div>
        <div id="gg-chips" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
      </div>`
    );
    renderGameGuardUI();
  }
})();
