// === LUMO v4.0 — LUMO VIDEO: WATCH PARTY + VOICE CHAT (LOBBY NA CÁPSULA) ===
(function initLumoVideo() {
  const API = typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev';
  const RECENT_KEY = 'lumo_wp_recent_v1';

  let recentRooms = [];
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    if (Array.isArray(r)) recentRooms = r.slice(0, 5);
  } catch (_) {}

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getProfile() {
    let uid = localStorage.getItem('lumo_ping_uid') || '';
    if (!uid || uid.length < 6) {
      uid = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('lumo_ping_uid', uid);
    }
    const name = (localStorage.getItem('lumo_username') || localStorage.getItem('lumo_name') || (typeof userName !== 'undefined' ? userName : '') || 'Lumo').trim().slice(0, 24) || 'Lumo';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f6b974';
    const surface = document.body.classList.contains('surface-light')
      ? 'light'
      : (document.body.classList.contains('surface-oled') ? 'oled' : 'dark');
    return { uid, name, color: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#f6b974', surface };
  }

  function saveRecent(code, title) {
    recentRooms = [{ code, title: title || `Sala ${code}`, at: Date.now() }, ...recentRooms.filter((x) => x.code !== code)].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentRooms)); } catch (_) {}
    renderRecents();
  }

  async function launchCinemaWindow(code, title) {
    const prof = getProfile();
    const boot = {
      code: String(code || '').toUpperCase().trim(),
      title: String(title || `Sala ${code}`).trim(),
      uid: prof.uid,
      name: prof.name,
      color: prof.color,
      surface: prof.surface,
      api: API
    };
    localStorage.setItem('lumo_wp_boot', JSON.stringify(boot));
    saveRecent(boot.code, boot.title);

    if (typeof invoke === 'function') {
      try {
        await invoke('open_watch_party_window', { roomCode: boot.code, roomTitle: boot.title });
      } catch (err) {
        if (typeof say === 'function') say('Erro ao abrir Lumo Video: ' + String(err), 3400, true);
      }
    } else {
      window.open('./watch-party.html', '_blank');
    }
  }

  async function createRoom(titleInput) {
    const prof = getProfile();
    const btn = document.getElementById('lv-create-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Criando sala...'; }
    try {
      const res = await fetch(`${API}/party/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: prof.uid,
          name: prof.name,
          color: prof.color,
          title: (titleInput || `Cinema de ${prof.name}`).trim().slice(0, 48)
        }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.code) {
        if (typeof say === 'function') say(data.error || 'Erro ao criar sala (verifique o Worker /party/*).', 3600, true);
      } else {
        await launchCinemaWindow(data.code, data.room?.title || titleInput);
      }
    } catch (_) {
      if (typeof say === 'function') say('Sem conexão com o servidor do Lumo Video.', 3200, true);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Criar Sala Cinema'; }
  }

  async function joinRoom(codeInput) {
    const code = String(codeInput || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (code.length < 4) {
      if (typeof say === 'function') say('Digite o código da sala (ex: CINE7K).', 2600, true);
      return;
    }
    const prof = getProfile();
    const btn = document.getElementById('lv-join-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
    try {
      const res = await fetch(`${API}/party/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, uid: prof.uid, name: prof.name, color: prof.color }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (typeof say === 'function') say(data.error || 'Sala não encontrada.', 3200, true);
      } else {
        await launchCinemaWindow(data.code || code, data.room?.title || `Sala ${code}`);
      }
    } catch (_) {
      if (typeof say === 'function') say('Sem conexão com o servidor do Lumo Video.', 3200, true);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
  }

  function ensureVideoTile() {
    const grid = document.querySelector('#view-resumo .hub-grid');
    if (!grid) return;

    let tile = document.getElementById('tile-video');
    if (!tile) {
      tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'hub-tile';
      tile.id = 'tile-video';
      tile.onclick = () => { if (typeof openView === 'function') openView('video'); };
      tile.innerHTML = `
        <div class="tile-icon">
          <svg class="ic" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="14" rx="3"/>
            <polygon points="10 8.5 15.5 11 10 13.5" fill="currentColor" stroke="none"/>
            <path d="M8 21h8"/>
          </svg>
        </div>
        <div>
          <div class="tile-title">Lumo Video</div>
          <div class="tile-sub">Watch Party · Voz</div>
        </div>
      `;
      grid.appendChild(tile);
    }

    const byId = (id) => grid.querySelector('#' + id);
    const allTiles = Array.from(grid.querySelectorAll(':scope > .hub-tile'));
    const tileIa     = byId('tile-ia')     || allTiles.find((t) => /ia /i.test(t.textContent || ''));
    const tilePing   = byId('tile-ping')   || allTiles.find((t) => /lumo ping/i.test(t.textContent || ''));
    const tileMusic  = grid.querySelector('[data-lm-tile="1"]') || byId('tile-midia');
    const tileBolso  = byId('tile-bolso')  || allTiles.find((t) => /bolso/i.test(t.textContent || ''));
    const tileStream = byId('tile-stream') || allTiles.find((t) => /lumo stream/i.test(t.textContent || ''));
    const tileUtil   = byId('tile-util')   || allTiles.find((t) => /foco/i.test(t.textContent || ''));
    const tileKit    = byId('tile-kit')    || allTiles.find((t) => /kit rápido/i.test(t.textContent || ''));

    const ordered = [tileIa, tilePing, tileMusic, tileBolso, tileStream, tile, tileUtil, tileKit].filter(Boolean);
    for (const el of ordered) {
      el.classList.remove('ls-wide-tile');
      const oldArr = el.querySelector('.ls-wide-arrow');
      if (oldArr) oldArr.remove();
      grid.appendChild(el);
    }

    const finalCount = grid.querySelectorAll(':scope > .hub-tile').length;
    grid.classList.toggle('lv-grid-8', finalCount === 8);
  }

  function renderRecents() {
    const box = document.getElementById('lv-recent-list');
    if (!box) return;
    if (!recentRooms.length) {
      box.innerHTML = '<div style="font-size:10.4px; color:var(--muted); text-align:center; padding:6px 0;">Suas salas recentes aparecerão aqui.</div>';
      return;
    }
    box.innerHTML = recentRooms.map((r) => `
      <div class="lv-recent-item">
        <div>
          <div class="lv-recent-title">${esc(r.title)}</div>
          <div class="lv-recent-code">${esc(r.code)}</div>
        </div>
        <button type="button" class="btn-ghost" data-lv-rejoin="${esc(r.code)}" style="padding:5px 10px; font-size:10.5px;">Voltar</button>
      </div>
    `).join('');
  }

  function mountVideoView() {
    let view = document.getElementById('view-video');
    if (!view) {
      const panelBody = document.getElementById('panel-body') || document.querySelector('#view-stream')?.parentElement;
      if (!panelBody) return;
      view = document.createElement('div');
      view.className = 'view';
      view.id = 'view-video';
      panelBody.appendChild(view);
    }
    if (view.dataset.lvMounted === '1') return;
    view.dataset.lvMounted = '1';

    view.innerHTML = `
      <div class="lv-shell">
        <div class="lv-hero">
          <div class="lv-hero-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="14" rx="3"/>
              <polygon points="10 8.5 15.5 11 10 13.5" fill="currentColor" stroke="none"/>
              <path d="M8 21h8"/>
            </svg>
          </div>
          <div>
            <div class="lv-hero-title">Watch Party + Voice Chat</div>
            <div class="lv-hero-sub">Espelhe Max, Disney+, Netflix ou assista YouTube sincronizado com chat, figurinhas, imagens e voz.</div>
          </div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:7px;">
          <div class="label-xs">Criar nova sala</div>
          <form class="inline-form" id="lv-create-form">
            <input type="text" id="lv-room-title" placeholder="Nome da sala (ex: Noite de Filme)..." maxlength="48" />
            <button type="submit" class="btn-primary" id="lv-create-btn">Criar Sala Cinema</button>
          </form>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:7px;">
          <div class="label-xs">Entrar com código</div>
          <form class="inline-form" id="lv-join-form">
            <input type="text" id="lv-room-code" placeholder="Código da sala (ex: CINE7K)" maxlength="8" style="text-transform:uppercase; letter-spacing:1px; font-weight:700;" />
            <button type="submit" class="btn-primary" id="lv-join-btn">Entrar</button>
          </form>
        </div>

        <div class="card">
          <div class="label-xs">Salas recentes</div>
          <div class="lv-recent-list" id="lv-recent-list"></div>
        </div>

        <div class="lv-tip">
          <strong>Dica para Max, Disney+ e Netflix:</strong> antes de espelhar a aba do navegador, desative a <em>Aceleração Gráfica (Hardware Acceleration)</em> nas configurações do navegador para evitar tela preta.
        </div>
      </div>
    `;

    view.querySelector('#lv-create-form').addEventListener('submit', (e) => {
      e.preventDefault();
      createRoom(view.querySelector('#lv-room-title').value);
    });
    view.querySelector('#lv-join-form').addEventListener('submit', (e) => {
      e.preventDefault();
      joinRoom(view.querySelector('#lv-room-code').value);
    });
    view.querySelector('#lv-recent-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lv-rejoin]');
      if (b) joinRoom(b.dataset.lvRejoin);
    });

    renderRecents();
  }

  mountVideoView();
  ensureVideoTile();
  setTimeout(ensureVideoTile, 380);
  setTimeout(ensureVideoTile, 1150);

  window.LumoVideo = { createRoom, joinRoom, launchCinemaWindow };
})();
