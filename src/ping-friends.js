// === LUMO v3.1.1 — LUMO PING 2.5 (SYNC SEM ATRASO VIA WEB WORKER + REDESIGN DO CHAT) ===
(function initLumoPingFriends() {
  const FRIENDS_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev') + '/friends';
  const MAX_REAL_ID = 1e11; // Qualquer ID >= 1e11 era fallback Date.now() antigo e deve ser sanitizado

  const S = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const IC = {
    back:    S('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
    sync:    S('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
    trash:   S('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
    send:    S('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/>'),
    copy:    S('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    palette: S('<circle cx="13.5" cy="6.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".8" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".8" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.6-10-8.6z"/>')
  };

  let myUid = localStorage.getItem('lumo_ping_uid');
  if (!myUid) {
    myUid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem('lumo_ping_uid', myUid);
  }

  let myTag = localStorage.getItem('lumo_ping_tag') || '';
  let showGameStatus = localStorage.getItem('lumo_ping_show_game') !== 'false';
  let subTab = 'friends';
  let friends = [];
  let requests = [];
  let activeFriend = null;
  let dmMsgs = [];
  let dmSeen = new Set();
  let dmLastId = 0;
  let replyTarget = null;
  let confirmRemoveUid = null;
  let confirmRemoveTimer = null;
  let themeBarOpen = false;
  const CHAT_THEMES = [
    { id: 'lumo',     label: 'Cor do Lumo',  dot: 'var(--accent)' },
    { id: 'friend',   label: 'Cor do Amigo', dot: 'var(--friend-col, #4ade80)' },
    { id: 'midnight', label: 'Meia-Noite',   dot: '#6366f1' },
    { id: 'cyber',    label: 'Cyber Neon',   dot: 'linear-gradient(135deg,#e879f9,#22d3ee)' },
    { id: 'forest',   label: 'Floresta',     dot: '#10b981' },
    { id: 'sunset',   label: 'Pôr do Sol',   dot: 'linear-gradient(135deg,#fb923c,#f43f5e)' },
    { id: 'minimal',  label: 'Minimal',      dot: '#94a3b8' }
  ];
  let chatThemeMap = {};
  try { chatThemeMap = JSON.parse(localStorage.getItem('lumo_ping_chat_themes') || '{}') || {}; } catch (_) {}
  function getChatTheme(roomCode) {
    return chatThemeMap[roomCode] || 'lumo';
  }
  function renderLumoAvatar(color, online, playing) {
    const _isMusicAv = online && String(playing || '').startsWith('music:');
    const _hpSvg = _isMusicAv ? `<path d="M5.5 17v-3.5a12.5 12.5 0 0 1 25 0V17" stroke="${/^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#f6b974'}" stroke-width="2.1" stroke-linecap="round" fill="none"/>` : '';
    const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#4ade80';
    const eyes = online
      ? (playing
          ? `<rect x="9.5" y="15.5" width="5.5" height="3.2" rx="1.6" fill="${col}"/><rect x="21" y="15.5" width="5.5" height="3.2" rx="1.6" fill="${col}"/>`
          : `<rect x="10.2" y="13.8" width="4.4" height="6.8" rx="2.2" fill="${col}"/><rect x="21.4" y="13.8" width="4.4" height="6.8" rx="2.2" fill="${col}"/>`)
      : `<path d="M10 17.5c1 1.3 3 1.3 4 0" stroke="${col}" stroke-width="1.9" stroke-linecap="round" opacity="0.72"/><path d="M22 17.5c1 1.3 3 1.3 4 0" stroke="${col}" stroke-width="1.9" stroke-linecap="round" opacity="0.72"/>`;
    return `<svg class="pf-lumo-svg" viewBox="0 0 36 36" fill="none">
      <rect x="1.8" y="6.2" width="32.4" height="23.6" rx="11.8" fill="#0b0f18" stroke="${col}" stroke-width="2.1"/>
      <rect x="4" y="8.4" width="28" height="19.2" rx="9.6" fill="${col}" fill-opacity="0.11"/>
      ${eyes}
    </svg>`;
  }

  let readMap = {};
  try {
    const raw = JSON.parse(localStorage.getItem('lumo_dm_read_map') || '{}');
    for (const [k, v] of Object.entries(raw || {})) {
      const n = Number(v);
      readMap[k] = Number.isFinite(n) && n > 0 && n < MAX_REAL_ID ? n : 0;
    }
  } catch (_) {}

  let alertedIds = new Set();
  let initializedList = false;
  let lastFriendsRenderSig = '';
  let friendsInFlight = false;
  let dmInFlight = false;
  let lastPollFriendsAt = 0;
  let lastPollDmAt = 0;
  let newlyArrivedIds = new Set();
  const JAM_PREFIX = '::LJAM::';
  let jamWatchRooms = new Set();
  let jamLastIds = {};
  let jamSeenMsgs = new Set();

  function parseJamBody(body) {
    const s = String(body || '');
    if (!s.startsWith(JAM_PREFIX)) return null;
    try { return JSON.parse(s.slice(JAM_PREFIX.length)); } catch (_) { return null; }
  }
  function emitJamPacket(roomCode, senderUid, senderName, senderColor, msgId, pkt) {
    if (!pkt || senderUid === myUid) return;
    const k = roomCode + ':' + msgId;
    if (jamSeenMsgs.has(k)) return;
    jamSeenMsgs.add(k);
    if (jamSeenMsgs.size > 400) jamSeenMsgs.clear();
    window.dispatchEvent(new CustomEvent('lumo-jam-packet', {
      detail: { roomCode, senderUid, senderName, senderColor, msgId, packet: pkt }
    }));
  }

  const NUDGES = {
    wave:  { text: 'deu um oi! 👋',           expr: 'happy',     freq: [520, 780] },
    love:  { text: 'mandou um carinho ❤️',    expr: 'love',      freq: [620, 960] },
    break: { text: 'chamou pra uma pausa ☕', expr: 'happy',     freq: [480, 680] },
    alert: { text: 'chamou sua atenção! ⚡',  expr: 'surprised', freq: [760, 1080] }
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function isRealId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 && n < MAX_REAL_ID;
  }
  function getMyName() {
    const stored = (localStorage.getItem('lumo_username') || localStorage.getItem('lumo_name') || '').trim();
    if (stored) return stored.slice(0, 24);
    if (typeof userName !== 'undefined' && userName) return String(userName).trim().slice(0, 24);
    return 'Lumo';
  }
  function fmtPlayingStatus(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    return s.startsWith('music:') ? ('Ouvindo ' + s.slice(6).trim()) : (fmtPlayingStatus(s));
  }
  function getMyColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#f6b974';
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; }
  }
  function fmtLastSeen(ts) {
    if (!ts) return 'Offline';
    const diff = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (diff < 2) return 'Offline · agora';
    if (diff < 60) return `Offline · há ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Offline · há ${h}h`;
    return `Offline · há ${Math.floor(h / 24)}d`;
  }
  function dayLabel(ts) {
    const d = new Date(ts || Date.now());
    const now = new Date();
    const key = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    if (key(d) === key(now)) return 'Hoje';
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (key(d) === key(yest)) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  function isPingViewOpen() {
    const v = document.getElementById('view-ping');
    return Boolean(v && v.classList.contains('active') && typeof isExpanded !== 'undefined' && isExpanded);
  }
  function isPingMuted() {
    return localStorage.getItem('lumo_ping_muted') === 'true';
  }
  function saveReadMap() {
    try { localStorage.setItem('lumo_dm_read_map', JSON.stringify(readMap)); } catch (_) {}
  }

  // Sanitiza cache local removendo qualquer ID corrompido (Date.now) de versões anteriores
  function loadDmCache(roomCode) {
    try {
      const arr = JSON.parse(localStorage.getItem('lumo_dm_hist_' + roomCode) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((m) => m && isRealId(m.id))
        .map((m) => ({ ...m, id: Number(m.id) }))
        .slice(-200);
    } catch (_) {
      return [];
    }
  }
  function saveDmCache(roomCode, list) {
    try {
      const clean = (list || []).filter((m) => m && isRealId(m.id)).slice(-200);
      localStorage.setItem('lumo_dm_hist_' + roomCode, JSON.stringify(clean));
    } catch (_) {}
  }

  function formatBodyWithLinks(text) {
    const safe = esc(text);
    return safe.replace(/(https?:\/\/[^\s<]+)/gi, (url) =>
      `<a class="pf-msg-link" href="#" onclick="event.stopPropagation(); event.preventDefault(); if(typeof invoke==='function') invoke('open_external_url',{url:'${url.replace(/'/g, "%27")}'});">${url}</a>`
    );
  }
  function renderBodyHtml(body) {
    const str = String(body || '');
    const qm = str.match(/^↪\s*([^:\n]+):\s*"([^\n]*)"\n([\s\S]+)$/);
    if (qm) {
      return `<div class="pf-quote-box"><strong>${esc(qm[1])}:</strong> ${esc(qm[2])}</div>${formatBodyWithLinks(qm[3])}`;
    }
    return formatBodyWithLinks(str);
  }
  function syncReplyBar() {
    const bar = document.getElementById('pf-reply-bar');
    if (!bar) return;
    if (!replyTarget) {
      bar.classList.remove('show');
      return;
    }
    bar.classList.add('show');
    const pv = bar.querySelector('.pf-reply-preview');
    if (pv) pv.textContent = `Respondendo ${replyTarget.name}: "${replyTarget.text.slice(0, 48)}"`;
  }

  // Fetch seguro com anti-cache + timeout curto (nunca trava o loop!)
  async function apiGet(query) {
    const sep = query.includes('?') ? '&' : '?';
    const url = `${FRIENDS_API}${query}${sep}_t=${Date.now()}`;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async function apiPost(payload) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    try {
      const res = await fetch(FRIENDS_API, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // === ANIMAÇÃO DE MENSAGEM CHEGANDO NA CÁPSULA ===
  function triggerIncomingMessageAnim(senderName, body, color, isNudge) {
    const pill = document.getElementById('lumo-pill');
    const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : getMyColor();
    const inGame = typeof isGameSessionActive === 'function' ? isGameSessionActive() : (typeof isHiddenInGame !== 'undefined' && isHiddenInGame);
    const stealth = typeof isStealth === 'function' && isStealth();

    if (typeof window.burstPingParticles === 'function') window.burstPingParticles(isNudge ? body : 'msg', col, isNudge ? 6 : 4);

    if (pill && !inGame) {
      pill.style.setProperty('--msg-color', col);
      pill.classList.remove('msg-arrive');
      void pill.offsetWidth;
      pill.classList.add('msg-arrive');
      setTimeout(() => pill.classList.remove('msg-arrive'), 820);

      const r = pill.getBoundingClientRect();
      if (r.width > 0) {
        const badge = document.createElement('div');
        badge.className = 'pf-float-mail';
        badge.style.setProperty('--msg-color', col);
        badge.style.left = (r.left + r.width / 2) + 'px';
        badge.style.top = Math.max(12, r.top - 4) + 'px';
        badge.textContent = isNudge ? `⚡ ${senderName}` : `💬 ${senderName}`;
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 1400);
      }
    }

    if (!inGame && !isPingMuted()) {
      if (typeof setExpression === 'function' && !(typeof isThinking !== 'undefined' && isThinking)) {
        const expr = isNudge ? (String(body).includes('❤️') ? 'love' : String(body).includes('⚡') ? 'surprised' : 'happy') : 'happy';
        setExpression(expr);
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 2200);
      }
      if (typeof playChirp === 'function') {
        playChirp(isNudge ? 620 : 520, isNudge ? 980 : 780, 0.13);
        setTimeout(() => playChirp(isNudge ? 780 : 660, isNudge ? 1120 : 940, 0.14), 105);
      }
    }

    if (!inGame && !stealth && !isPingMuted() && !(isPingViewOpen() && activeFriend)) {
      const cleanPrev = String(body || '').replace(/^↪[^\n]+\n/, '').slice(0, 68);
      if (typeof say === 'function') {
        say(`💬 ${senderName}: ${cleanPrev}`, 4600, true);
      }
    }
  }

  // === MONTA ESTRUTURA DE SUB-ABAS DENTRO DE #view-ping ===
  const viewPing = document.getElementById('view-ping');
  if (!viewPing || document.getElementById('pf-subtabs')) return;

  const roomsPane = document.createElement('div');
  roomsPane.id = 'pf-rooms-pane';
  while (viewPing.firstChild) roomsPane.appendChild(viewPing.firstChild);

  const tabsHtml = `
    <div class="pf-subtabs" id="pf-subtabs">
      <button type="button" class="pf-subtab active" data-tab="friends" onclick="LumoFriends.setTab('friends')">
        Amigos <span class="pf-badge" id="pf-friends-badge">0</span>
      </button>
      <button type="button" class="pf-subtab" data-tab="rooms" onclick="LumoFriends.setTab('rooms')">
        Salas
      </button>
    </div>
    <div id="pf-friends-pane"></div>`;

  viewPing.insertAdjacentHTML('afterbegin', tabsHtml);
  viewPing.appendChild(roomsPane);
  roomsPane.classList.add('hidden');

  function countUnreadFriends() {
    let unread = 0;
    for (const f of friends) {
      const _jp = parseJamBody(f.last_body);
      if (isRealId(f.last_msg_id) && f.last_sender_uid !== myUid && (readMap[f.room_code] || 0) < Number(f.last_msg_id) && (!_jp || _jp.t === 'inv')) {
        unread++;
      }
    }
    return unread + requests.length;
  }

  function syncBadges() {
    const total = countUnreadFriends();
    const fb = document.getElementById('pf-friends-badge');
    if (fb) {
      fb.textContent = total > 9 ? '9+' : String(total);
      fb.classList.toggle('show', total > 0);
    }

    const tileBadge = document.getElementById('ping-unread-badge');
    const tileSub = document.getElementById('ping-strip-sub');
    const tile = document.getElementById('tile-ping');
    const onlineCount = friends.filter((f) => f.online).length;
    if (tile) tile.classList.toggle('connected', onlineCount > 0 || tile.classList.contains('connected'));
    if (tileBadge) {
      if (total > 0) {
        tileBadge.textContent = total > 9 ? '9+' : String(total);
        tileBadge.classList.add('show');
      } else if (!localStorage.getItem('lumo_ping_room')) {
        tileBadge.classList.remove('show');
      }
    }
    if (tileSub && !localStorage.getItem('lumo_ping_room')) {
      if (total > 0) tileSub.textContent = `${total} novidade${total > 1 ? 's' : ''} nos Amigos`;
      else if (onlineCount > 0) tileSub.textContent = `${onlineCount} amigo${onlineCount > 1 ? 's' : ''} online`;
      else if (friends.length > 0) tileSub.textContent = `${friends.length} amigo${friends.length > 1 ? 's' : ''}`;
      else tileSub.textContent = 'Chat com amigos';
    }
  }

  function renderFriendsPane() {
    const pane = document.getElementById('pf-friends-pane');
    if (!pane) return;

    // === MODO DM ABERTO ===
    if (activeFriend) {
      const f = friends.find((x) => x.uid === activeFriend.uid) || activeFriend;
      const dotCls = f.online ? (f.playing ? 'playing' : 'online') : '';
      const statusText = f.online
        ? (f.playing ? (String(f.playing).startsWith('music:') ? `Ouvindo ${String(f.playing).slice(6)}` : fmtPlayingStatus(f.playing)) : 'Online agora')
        : fmtLastSeen(f.last_seen);
      const statusCls = f.online ? (f.playing ? 'playing' : 'online') : '';
      const initial = (f.display_name || '?').trim().charAt(0).toUpperCase();
      const confirming = confirmRemoveUid === f.uid;

      pane.innerHTML = `
        <div class="pf-dm-shell" data-chat-theme="${esc(getChatTheme(f.room_code))}" style="--friend-col:${esc(f.color || '#4ade80')};">
          <div class="pf-dm-head">
            <div class="pf-dm-head-left">
              <button type="button" class="pf-icon-btn" title="Voltar" onclick="LumoFriends.closeDm()">${IC.back}</button>
              <div class="pf-avatar-wrap sm lumo-av">
                ${renderLumoAvatar(f.color, f.online, f.playing)}
                <span class="pf-status-dot ${dotCls}"></span>
              </div>
              <div class="pf-info">
                <div class="pf-name-row">
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(f.display_name)}</span>
                </div>
                <div class="pf-sub ${statusCls}" id="pf-dm-head-sub">${esc(statusText)}</div>
              </div>
            </div>
            <div class="pf-dm-head-actions">
              <button type="button" class="pf-icon-btn ${themeBarOpen ? 'active' : ''}" id="pf-theme-btn" title="Tema da conversa" onclick="LumoFriends.toggleThemeBar()">${IC.palette}</button>
              <button type="button" class="pf-icon-btn" id="pf-sync-btn" title="Sincronizar agora" onclick="LumoFriends.forceSync()">${IC.sync}</button>
              <button type="button" class="pf-icon-btn danger ${confirming ? 'confirm' : ''}" id="pf-rem-btn" title="Remover amigo" onclick="LumoFriends.removeFriend('${esc(f.uid)}')">${confirming ? 'Confirmar?' : IC.trash}</button>
            </div>
          </div>

          <div class="pf-theme-bar ${themeBarOpen ? 'show' : ''}" id="pf-theme-bar">
            ${CHAT_THEMES.map((t) => `<button type="button" class="pf-theme-chip ${getChatTheme(f.room_code) === t.id ? 'active' : ''}" onclick="LumoFriends.setChatTheme('${t.id}')"><span class="pf-theme-dot" style="background:${t.dot};"></span>${t.label}</button>`).join('')}
          </div>
          <div class="pf-dm-nudges">
            <button type="button" class="pf-nudge-btn" onclick="LumoFriends.sendNudge('wave')">👋 Oi</button>
            <button type="button" class="pf-nudge-btn" onclick="LumoFriends.sendNudge('love')">❤️ Carinho</button>
            <button type="button" class="pf-nudge-btn" onclick="LumoFriends.sendNudge('break')">☕ Pausa</button>
            <button type="button" class="pf-nudge-btn" onclick="LumoFriends.sendNudge('alert')">⚡ Atenção</button>
          </div>

          <div class="pf-feed-wrap">
            <div id="pf-dm-feed"></div>
            <button type="button" class="pf-jump-bottom" id="pf-jump-bottom" onclick="LumoFriends.scrollToBottom()">↓ Novas mensagens</button>
          </div>

          <div class="pf-reply-bar" id="pf-reply-bar">
            <span class="pf-reply-preview"></span>
            <button type="button" class="del-btn" onclick="LumoFriends.cancelReply()">×</button>
          </div>

          <form class="pf-dm-form" onsubmit="LumoFriends.submitDm(event)">
            <textarea id="pf-dm-input" rows="1" placeholder="Mensagem para ${esc(f.display_name)}..." maxlength="400"></textarea>
            <button type="submit" class="pf-send-btn" title="Enviar (Enter)">${IC.send}</button>
          </form>
        </div>`;

      const feed = document.getElementById('pf-dm-feed');
      if (feed) {
        feed.addEventListener('scroll', () => {
          const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
          if (nearBottom) document.getElementById('pf-jump-bottom')?.classList.remove('show');
        });
      }
      renderDmFeed(true);
      syncReplyBar();
      setTimeout(() => document.getElementById('pf-dm-input')?.focus(), 40);
      return;
    }

    // === MODO LISTA DE AMIGOS ===
    const reqHtml = requests.length
      ? `<div class="pf-sec-title" style="color:var(--accent);">Pedidos pendentes (${requests.length})</div>` +
        requests.map((r) => `
          <div class="pf-req-item">
            <div class="pf-info">
              <div class="pf-name-row">${esc(r.display_name)}</div>
              <div class="pf-sub">${esc(r.tag)} quer te adicionar</div>
            </div>
            <div style="display:flex; gap:5px;">
              <button type="button" class="pf-add-btn" style="padding:5px 10px;" onclick="LumoFriends.respond(${r.id}, true)">Aceitar</button>
              <button type="button" class="pf-icon-btn danger" onclick="LumoFriends.respond(${r.id}, false)">×</button>
            </div>
          </div>`).join('')
      : '';

    const friendsHtml = friends.length
      ? `<div class="pf-sec-title">Seus amigos (${friends.length})</div>` +
        friends.map((f) => {
          const _jp = parseJamBody(f.last_body);
          const unread = Boolean(isRealId(f.last_msg_id) && f.last_sender_uid !== myUid && (readMap[f.room_code] || 0) < Number(f.last_msg_id) && (!_jp || _jp.t === 'inv'));
          const dotCls = f.online ? (f.playing ? 'playing' : 'online') : '';
          const cleanLast = _jp ? (_jp.t === 'inv' ? ('Convite Lumo Jam · ' + (_jp.ti || 'Ouvir juntos')) : '') : String(f.last_body || '').replace(/^↪[^\n]+\n/, '');
          const statusLine = unread && cleanLast
            ? `${cleanLast}`
            : (f.online ? (f.playing ? (String(f.playing).startsWith('music:') ? `Ouvindo ${String(f.playing).slice(6)}` : fmtPlayingStatus(f.playing)) : 'Online agora') : fmtLastSeen(f.last_seen));
          const subCls = unread ? 'unread-preview' : (f.online ? (f.playing ? 'playing' : 'online') : '');
          const initial = (f.display_name || '?').trim().charAt(0).toUpperCase();
          return `
            <div class="pf-friend-item ${f.online ? '' : 'offline'} ${unread ? 'has-unread' : ''}" onclick="LumoFriends.openDm('${esc(f.uid)}')">
              <div class="pf-avatar-wrap lumo-av">
                ${renderLumoAvatar(f.color, f.online, f.playing)}
                <span class="pf-status-dot ${dotCls}"></span>
              </div>
              <div class="pf-info">
                <div class="pf-name-row">
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(f.display_name)}</span>
                  <span class="pf-tag-mini">${esc(f.tag)}</span>
                </div>
                <div class="pf-sub ${subCls}">${esc(statusLine)}</div>
              </div>
              ${unread ? '<span class="pf-badge show">!</span>' : '<span style="font-size:13px; color:var(--muted);">›</span>'}
            </div>`;
        }).join('')
      : `<div style="text-align:center; color:var(--muted); font-size:11px; padding:22px 10px; line-height:1.5;">
          Nenhum amigo adicionado ainda.<br>Copie sua <strong>Lumo Tag</strong> acima ou cole a Tag de um amigo para conversar em tempo real!
        </div>`;

    pane.innerHTML = `
      <div class="pf-tag-card">
        <div style="min-width:0;">
          <div class="pf-tag-label">Sua Lumo Tag</div>
          <div class="pf-tag-code" id="pf-my-tag">${esc(myTag || 'Gerando...')}</div>
        </div>
        <button type="button" class="pf-copy-btn" id="pf-copy-tag-btn" onclick="LumoFriends.copyTag()">${IC.copy}<span>Copiar</span></button>
      </div>
      <form class="pf-add-row" onsubmit="LumoFriends.addFriend(event)">
        <input type="text" id="pf-add-input" placeholder="Adicionar amigo (ex: NOME#4K2P)" maxlength="22" autocomplete="off" />
        <button type="submit" class="pf-add-btn">+ Add</button>
      </form>
      <div class="pf-privacy-row">
        <span>Mostrar jogo que estou jogando</span>
        <label class="pf-switch">
          <input type="checkbox" ${showGameStatus ? 'checked' : ''} onchange="LumoFriends.toggleGamePrivacy(this.checked)" />
          <span class="pf-switch-track"></span>
        </label>
      </div>
      <div class="pf-list">
        ${reqHtml}
        ${friendsHtml}
      </div>`;
  }

  function renderDmFeed(forceBottom = false) {
    const feed = document.getElementById('pf-dm-feed');
    if (!feed) return;
    const wasNearBottom = forceBottom || (feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90);

    if (!dmMsgs.length) {
      feed.innerHTML = '<div style="font-size:11px; color:var(--muted); text-align:center; padding:26px 10px; line-height:1.45;">Nenhuma mensagem ainda.<br>Mande um oi ou um cutucão acima!</div>';
      return;
    }

    let lastDay = '';
    let prevSender = '';
    let prevKind = '';
    const html = [];

    for (const m of dmMsgs) {
      const dLbl = dayLabel(m.created_at);
      if (dLbl !== lastDay) {
        lastDay = dLbl;
        prevSender = '';
        html.push(`<div class="pf-date-sep"><span>${esc(dLbl)}</span></div>`);
      }

      if (m.kind === 'nudge') {
        prevSender = '';
        prevKind = 'nudge';
        html.push(`<div class="pf-nudge-pill"><strong style="color:${esc(m.sender_color || 'var(--accent)')}">${esc(m.sender_name)}</strong> ${esc(m.body)} <span style="opacity:0.55; font-size:9px; margin-left:3px;">${fmtTime(m.created_at)}</span></div>`);
        continue;
      }

      const isMe = m.sender_uid === myUid;
      const grouped = prevKind === 'text' && prevSender === m.sender_uid;
      prevSender = m.sender_uid;
      prevKind = 'text';

      const _jp = parseJamBody(m.body);
      if (_jp && _jp.t !== 'inv') continue;
      const plainBody = _jp ? ('Convite Lumo Jam: ' + (_jp.ti || '')) : String(m.body || '').replace(/^↪[^\n]+\n/, '');
      const statusCls = m._pending ? 'pending' : (m._failed ? 'failed' : '');
      const isNew = newlyArrivedIds.has(m.id);
      const timeLabel = m._pending ? 'enviando...' : (m._failed ? 'falhou' : fmtTime(m.created_at));

      html.push(`<div class="pf-dm-row ${isMe ? 'me' : 'them'} ${grouped ? 'grouped' : ''} ${statusCls} ${isNew ? 'is-new' : ''}">
        <div class="pf-dm-bubble">
          <div>${_jp && _jp.t === 'inv' ? `<div class="pf-jam-card">
      <div class="pf-jam-card-head">Lumo Jam</div>
      <div class="pf-jam-card-track">${esc(_jp.ti || 'Sessão ao vivo')}</div>
      ${_jp.ar ? `<div class="pf-jam-card-art">${esc(_jp.ar)}</div>` : ''}
      ${!isMe ? `<button type="button" class="pf-jam-join-btn" onclick="window.LumoJam && window.LumoJam.joinFromInvite('${esc(activeFriend?.room_code || '')}','${esc(_jp.h || m.sender_uid)}','${esc(_jp.n || m.sender_name || '')}')">Entrar na Jam</button>` : '<div class="pf-jam-card-art">Convite enviado</div>'}
    </div>` : renderBodyHtml(m.body)}</div>
          <div class="pf-dm-meta">
            <button type="button" class="pf-reply-trig" title="Responder" onclick="LumoFriends.startReply(${JSON.stringify(m.sender_name || '')}, ${JSON.stringify(plainBody.slice(0, 80))})">↩</button>
            <span class="pf-dm-time">${esc(timeLabel)}</span>
          </div>
        </div>
      </div>`);
    }

    feed.innerHTML = html.join('');
    newlyArrivedIds.clear();

    if (wasNearBottom) {
      feed.scrollTop = feed.scrollHeight;
      document.getElementById('pf-jump-bottom')?.classList.remove('show');
    } else {
      document.getElementById('pf-jump-bottom')?.classList.add('show');
    }
  }

  // === HEARTBEAT & POLLING DE ALTA CONFIABILIDADE ===
  async function sendHeartbeat() {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    /* V396_PING_MUSIC_STATUS */
    const _lmPlaying = Boolean(window._lumoPingMusicTitle);
    const playing = (showGameStatus && window.isPlayingGame && window.currentGameName)
      ? String(window.currentGameName).slice(0, 40)
      : (_lmPlaying ? ('music:' + window._lumoPingMusicTitle).slice(0, 44) : '');
    const _unusedOld = (false) ? '' : '';
    try {
      const { ok, data } = await apiPost({
        action: 'heartbeat',
        uid: myUid,
        name: getMyName(),
        color: getMyColor(),
        playing
      });
      if (ok && data?.tag) {
        myTag = data.tag;
        localStorage.setItem('lumo_ping_tag', myTag);
        const tagEl = document.getElementById('pf-my-tag');
        if (tagEl && tagEl.textContent !== myTag) tagEl.textContent = myTag;
      }
    } catch (_) {}
  }

  async function pollFriends() {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    if (friendsInFlight && (Date.now() - lastPollFriendsAt) < 9000) return;
    friendsInFlight = true;
    lastPollFriendsAt = Date.now();
    try {
      const data = await apiGet(`?uid=${encodeURIComponent(myUid)}`);
      if (!data) return;
      if (data.me?.tag) {
        myTag = data.me.tag;
        localStorage.setItem('lumo_ping_tag', myTag);
      }

      const prevReqCount = requests.length;
      requests = Array.isArray(data.requests) ? data.requests : [];
      friends = Array.isArray(data.friends) ? data.friends : [];

      let shouldPullActiveDm = false;
      for (const f of friends) {
        if (!isRealId(f.last_msg_id)) continue;
        const msgId = Number(f.last_msg_id);
        const key = `${f.room_code}:${msgId}`;
        if (!initializedList) {
          alertedIds.add(key);
          continue;
        }
        if (f.last_sender_uid !== myUid && !alertedIds.has(key)) {
          alertedIds.add(key);
          const _jp = parseJamBody(f.last_body);
          if (_jp) {
            emitJamPacket(f.room_code, f.last_sender_uid, f.display_name, f.color, msgId, _jp);
            if (_jp.t !== 'inv') {
              readMap[f.room_code] = msgId;
              saveReadMap();
              continue;
            }
            triggerIncomingMessageAnim(f.display_name, 'convidou para uma Lumo Jam!', f.color, true);
            continue;
          }
          const alreadyReading = isPingViewOpen() && subTab === 'friends' && activeFriend && activeFriend.uid === f.uid;
          if (alreadyReading) {
            readMap[f.room_code] = msgId;
            saveReadMap();
            shouldPullActiveDm = true;
            if (f.last_kind === 'nudge') {
              triggerIncomingMessageAnim(f.display_name, f.last_body || 'te cutucou!', f.color, true);
            }
          } else {
            triggerIncomingMessageAnim(f.display_name, f.last_body || 'Nova mensagem', f.color, f.last_kind === 'nudge');
            if (activeFriend && activeFriend.uid === f.uid) shouldPullActiveDm = true;
          }
        }
      }

      if (initializedList && requests.length > prevReqCount) {
        const newest = requests[0];
        if (newest) triggerIncomingMessageAnim(newest.display_name, 'enviou pedido de amizade!', newest.color, true);
      }

      initializedList = true;
      syncBadges();

      if (subTab === 'friends' && !activeFriend) {
        const focusedAdd = document.activeElement && document.activeElement.id === 'pf-add-input';
        const sig = JSON.stringify([
          myTag,
          showGameStatus,
          requests.map((r) => r.id),
          friends.map((f) => [f.uid, f.display_name, f.online, f.playing, f.last_msg_id, f.last_seen, readMap[f.room_code] || 0])
        ]);
        if (!focusedAdd && sig !== lastFriendsRenderSig) {
          lastFriendsRenderSig = sig;
          renderFriendsPane();
        }
      } else if (subTab === 'friends' && activeFriend) {
        const updated = friends.find((x) => x.uid === activeFriend.uid);
        if (updated) {
          activeFriend = updated;
          const headSub = document.getElementById('pf-dm-head-sub');
          if (headSub) {
            headSub.textContent = updated.online
              ? (updated.playing ? fmtPlayingStatus(updated.playing) : 'Online agora')
              : fmtLastSeen(updated.last_seen);
            headSub.className = 'pf-sub ' + (updated.online ? (updated.playing ? 'playing' : 'online') : '');
          }
        }
        if (shouldPullActiveDm) pollActiveDm();
      }
    } catch (_) {
    } finally {
      friendsInFlight = false;
    }
  }

  async function pollActiveDm() {
    if (!activeFriend) return;
    if (dmInFlight && (Date.now() - lastPollDmAt) < 7000) return;
    dmInFlight = true;
    lastPollDmAt = Date.now();
    const roomCode = activeFriend.room_code;
    const friendSnapshot = activeFriend;
    try {
      const safeSince = isRealId(dmLastId) ? dmLastId : 0;
      const data = await apiGet(`?room=${encodeURIComponent(roomCode)}&since=${safeSince}`);
      if (!data || !activeFriend || activeFriend.room_code !== roomCode) return;

      const incoming = Array.isArray(data.messages) ? data.messages : [];
      let changed = false;

      for (const raw of incoming) {
        if (!isRealId(raw.id)) continue;
        const m = { ...raw, id: Number(raw.id) };
        if (dmSeen.has(m.id)) continue;

        // Reconcilia mensagem otimista enviada por mim caso ainda esteja pendente
        if (m.sender_uid === myUid) {
          const pIdx = dmMsgs.findIndex((x) => x._pending && x.body === m.body && x.kind === m.kind);
          if (pIdx >= 0) dmMsgs.splice(pIdx, 1);
        }

        dmSeen.add(m.id);
        const _jp = parseJamBody(m.body);
        if (_jp) {
          emitJamPacket(roomCode, m.sender_uid, m.sender_name || friendSnapshot.display_name, m.sender_color || friendSnapshot.color, m.id, _jp);
          if (_jp.t !== 'inv') {
            if (m.id > dmLastId) dmLastId = m.id;
            continue;
          }
        }
        dmMsgs.push(m);
        newlyArrivedIds.add(m.id);
        if (m.id > dmLastId) dmLastId = m.id;
        changed = true;

        const alertKey = `${roomCode}:${m.id}`;
        const alreadyAlerted = alertedIds.has(alertKey);
        alertedIds.add(alertKey);

        if (m.sender_uid !== myUid) {
          const readingNow = isPingViewOpen() && subTab === 'friends';
          if (readingNow) {
            readMap[roomCode] = dmLastId;
            saveReadMap();
            if (m.kind === 'nudge' && !alreadyAlerted) {
              triggerIncomingMessageAnim(m.sender_name || friendSnapshot.display_name, m.body || 'te cutucou!', m.sender_color || friendSnapshot.color, true);
            }
          } else if (!alreadyAlerted) {
            triggerIncomingMessageAnim(m.sender_name || friendSnapshot.display_name, m.body || 'Nova mensagem', m.sender_color || friendSnapshot.color, m.kind === 'nudge');
          }
        }
      }

      if (dmMsgs.length > 200) dmMsgs = dmMsgs.slice(-200);
      if (changed) {
        saveDmCache(roomCode, dmMsgs);
        renderDmFeed(false);
        syncBadges();
      }
    } catch (_) {
    } finally {
      dmInFlight = false;
    }
  }

  async function sendDmMessage(kind, body) {
    if (!activeFriend || !body) return;
    const roomCode = activeFriend.room_code;
    const payload = {
      action: 'send_dm',
      uid: myUid,
      room_code: roomCode,
      name: getMyName(),
      color: getMyColor(),
      kind,
      body
    };

    // Envio otimista imediato na tela
    const tmpId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const optimistic = {
      id: tmpId,
      room_code: roomCode,
      sender_uid: myUid,
      sender_name: payload.name,
      sender_color: payload.color,
      kind,
      body,
      created_at: Date.now(),
      _pending: true
    };
    dmMsgs.push(optimistic);
    newlyArrivedIds.add(tmpId);
    renderDmFeed(true);

    try {
      const { ok, data } = await apiPost(payload);
      if (ok && data.ok) {
        if (isRealId(data.id)) {
          const realId = Number(data.id);
          optimistic.id = realId;
          optimistic._pending = false;
          if (data.created_at) optimistic.created_at = data.created_at;
          dmSeen.add(realId);
          if (realId > dmLastId) dmLastId = realId;
          readMap[roomCode] = dmLastId;
          saveReadMap();
          saveDmCache(roomCode, dmMsgs);
          renderDmFeed(true);
        } else {
          // Se o servidor não devolveu o ID numérico, busca imediatamente para reconciliar sem corromper dmLastId
          pollActiveDm();
        }
      } else {
        optimistic._pending = false;
        optimistic._failed = true;
        renderDmFeed(false);
      }
    } catch (_) {
      optimistic._pending = false;
      optimistic._failed = true;
      renderDmFeed(false);
      if (typeof say === 'function') say('Sem conexão ao enviar mensagem.', 2200, true);
    }
  }

  async function pollJamRooms() {
    if (!jamWatchRooms.size) return;
    for (const rc of Array.from(jamWatchRooms)) {
      try {
        const since = isRealId(jamLastIds[rc]) ? jamLastIds[rc] : 0;
        const data = await apiGet(`?room=${encodeURIComponent(rc)}&since=${since}`);
        if (!data || !Array.isArray(data.messages)) continue;
        const f = friends.find((x) => x.room_code === rc);
        for (const raw of data.messages) {
          if (!isRealId(raw.id)) continue;
          const mid = Number(raw.id);
          if (mid > (jamLastIds[rc] || 0)) jamLastIds[rc] = mid;
          const pkt = parseJamBody(raw.body);
          if (pkt) {
            emitJamPacket(rc, raw.sender_uid, raw.sender_name || f?.display_name || 'Amigo', raw.sender_color || f?.color || '#4ade80', mid, pkt);
            if (pkt.t !== 'inv' && mid > (readMap[rc] || 0)) {
              readMap[rc] = mid;
              saveReadMap();
            }
          }
        }
      } catch (_) {}
    }
  }

  // === API PÚBLICA ===
  window.LumoFriends = {
    getMe() { return { uid: myUid, name: getMyName(), tag: myTag, color: getMyColor() }; },
    getFriends() { return friends.map((f) => ({ ...f })); },
    watchJamRooms(codes) {
      jamWatchRooms = new Set((codes || []).filter(Boolean));
      for (const rc of jamWatchRooms) {
        if (!jamLastIds[rc]) {
          const f = friends.find((x) => x.room_code === rc);
          const seed = f && isRealId(f.last_msg_id) ? Math.max(0, Number(f.last_msg_id) - 1) : 0;
          jamLastIds[rc] = seed;
        }
      }
      if (jamWatchRooms.size) pollJamRooms();
    },
    async sendJamPacket(roomCode, pkt) {
      if (!roomCode || !pkt) return false;
      try {
        const { ok, data } = await apiPost({
          action: 'send_dm',
          uid: myUid,
          room_code: roomCode,
          name: getMyName(),
          color: getMyColor(),
          kind: 'text',
          body: JAM_PREFIX + JSON.stringify(pkt)
        });
        if (ok && data?.ok && isRealId(data.id)) {
          const id = Number(data.id);
          if (id > (jamLastIds[roomCode] || 0)) jamLastIds[roomCode] = id;
          readMap[roomCode] = Math.max(readMap[roomCode] || 0, id);
          saveReadMap();
          return true;
        }
      } catch (_) {}
      return false;
    },
    syncProfile() {
      sendHeartbeat().then(pollFriends);
    },
    setTab(tab) {
      subTab = tab === 'rooms' ? 'rooms' : 'friends';
      document.querySelectorAll('.pf-subtab').forEach((b) => b.classList.toggle('active', b.dataset.tab === subTab));
      document.getElementById('pf-friends-pane')?.classList.toggle('hidden', subTab !== 'friends');
      document.getElementById('pf-rooms-pane')?.classList.toggle('hidden', subTab !== 'rooms');
      if (subTab === 'friends') {
        lastFriendsRenderSig = '';
        renderFriendsPane();
        pollFriends();
      }
    },
    copyTag() {
      if (!myTag) return;
      if (typeof invoke === 'function') invoke('set_clipboard_text', { text: myTag }).catch(() => {});
      navigator.clipboard?.writeText(myTag).catch(() => {});
      const btn = document.getElementById('pf-copy-tag-btn');
      if (btn) {
        const prev = btn.innerHTML;
        btn.innerHTML = '✓ Copiado';
        setTimeout(() => { if (document.getElementById('pf-copy-tag-btn')) btn.innerHTML = prev; }, 1400);
      }
      if (typeof playChirp === 'function') playChirp(580, 860, 0.13);
      if (typeof say === 'function') say(`Tag ${myTag} copiada! Envie pro seu amigo.`, 2500, true);
    },
    toggleGamePrivacy(val) {
      showGameStatus = Boolean(val);
      localStorage.setItem('lumo_ping_show_game', String(showGameStatus));
      sendHeartbeat();
    },
    async addFriend(e) {
      e.preventDefault();
      const inp = document.getElementById('pf-add-input');
      const target = (inp?.value || '').trim().toUpperCase();
      if (!target) return;
      await sendHeartbeat();
      try {
        const { ok, data } = await apiPost({ action: 'request', uid: myUid, target_tag: target });
        if (ok && data.ok) {
          if (inp) inp.value = '';
          if (typeof hopPill === 'function') hopPill();
          if (typeof say === 'function') {
            say(data.accepted ? `Agora você e ${data.name} são amigos! 🎉` : `Pedido enviado para ${data.name}!`, 2600, true);
          }
          pollFriends();
        } else if (typeof say === 'function') {
          say(data.error || 'Não consegui adicionar essa Tag.', 2800, true);
        }
      } catch (_) {}
    },
    async respond(reqId, accept) {
      await apiPost({ action: 'respond', uid: myUid, request_id: reqId, accept }).catch(() => {});
      pollFriends();
    },
    async removeFriend(fUid) {
      // Confirmação em 2 cliques para evitar remover sem querer
      if (confirmRemoveUid !== fUid) {
        confirmRemoveUid = fUid;
        clearTimeout(confirmRemoveTimer);
        const btn = document.getElementById('pf-rem-btn');
        if (btn) { btn.classList.add('confirm'); btn.textContent = 'Confirmar?'; }
        confirmRemoveTimer = setTimeout(() => {
          confirmRemoveUid = null;
          const b = document.getElementById('pf-rem-btn');
          if (b) { b.classList.remove('confirm'); b.innerHTML = IC.trash; }
        }, 4000);
        return;
      }
      confirmRemoveUid = null;
      clearTimeout(confirmRemoveTimer);
      await apiPost({ action: 'remove', uid: myUid, friend_uid: fUid }).catch(() => {});
      this.closeDm();
      pollFriends();
    },
    openDm(fUid) {
      const f = friends.find((x) => x.uid === fUid);
      if (!f) return;
      activeFriend = f;
      replyTarget = null;
      confirmRemoveUid = null;
      dmMsgs = loadDmCache(f.room_code);
      dmSeen = new Set(dmMsgs.map((m) => m.id));
      dmLastId = dmMsgs.reduce((max, m) => (m.id > max ? m.id : max), 0);
      if (isRealId(f.last_msg_id)) {
        readMap[f.room_code] = Number(f.last_msg_id);
        saveReadMap();
      }
      syncBadges();
      renderFriendsPane();
      pollActiveDm();
    },
    toggleThemeBar() {
      themeBarOpen = !themeBarOpen;
      document.getElementById('pf-theme-bar')?.classList.toggle('show', themeBarOpen);
      document.getElementById('pf-theme-btn')?.classList.toggle('active', themeBarOpen);
    },
    setChatTheme(themeId) {
      if (!activeFriend) return;
      chatThemeMap[activeFriend.room_code] = themeId;
      try { localStorage.setItem('lumo_ping_chat_themes', JSON.stringify(chatThemeMap)); } catch (_) {}
      const shell = document.querySelector('.pf-dm-shell');
      if (shell) shell.setAttribute('data-chat-theme', themeId);
      document.querySelectorAll('#pf-theme-bar .pf-theme-chip').forEach((b) => {
        b.classList.toggle('active', (b.getAttribute('onclick') || '').includes("'" + themeId + "'"));
      });
    },
    closeDm() {
      themeBarOpen = false;
      activeFriend = null;
      replyTarget = null;
      confirmRemoveUid = null;
      lastFriendsRenderSig = '';
      renderFriendsPane();
      pollFriends();
    },
    async forceSync() {
      const btn = document.getElementById('pf-sync-btn');
      btn?.classList.add('spinning');
      await Promise.all([pollFriends(), activeFriend ? pollActiveDm() : Promise.resolve()]);
      setTimeout(() => btn?.classList.remove('spinning'), 380);
    },
    scrollToBottom() {
      const feed = document.getElementById('pf-dm-feed');
      if (feed) {
        feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
        document.getElementById('pf-jump-bottom')?.classList.remove('show');
      }
    },
    sendNudge(type) {
      const n = NUDGES[type] || NUDGES.wave;
      if (typeof window.burstPingParticles === 'function') window.burstPingParticles(type, getMyColor(), 4);
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(n.freq[0], n.freq[1], 0.14);
      sendDmMessage('nudge', n.text);
    },
    startReply(name, text) {
      if (window.getSelection && window.getSelection().toString().trim().length > 0) return;
      replyTarget = { name: String(name || 'Amigo').slice(0, 20), text: String(text || '').slice(0, 80) };
      syncReplyBar();
      document.getElementById('pf-dm-input')?.focus();
    },
    cancelReply() {
      replyTarget = null;
      syncReplyBar();
    },
    submitDm(e) {
      e.preventDefault();
      const inp = document.getElementById('pf-dm-input');
      const v = (inp?.value || '').trim();
      if (!v) return;
      inp.value = '';
      inp.style.height = 'auto';
      const finalBody = replyTarget ? `↪ ${replyTarget.name}: "${replyTarget.text.replace(/"/g, "'")}"\n${v}` : v;
      replyTarget = null;
      syncReplyBar();
      sendDmMessage('text', finalBody);
    }
  };

  // === RELÓGIO ANTI-THROTTLING VIA WEB WORKER (NÃO DESACELERA EM SEGUNDO PLANO) ===
  let tickCount = 0;
  let lastTickAt = 0;
  function onClockTick() {
    lastTickAt = Date.now();
    tickCount++;
    pollFriends();
    if (activeFriend) pollActiveDm();
    if (jamWatchRooms.size) pollJamRooms();
    if (tickCount % 10 === 0) sendHeartbeat();
  }

  function startReliableClock() {
    let fallbackInterval = null;
    const ensureFallback = () => {
      if (!fallbackInterval) fallbackInterval = setInterval(onClockTick, 2000);
    };
    try {
      const code = 'setInterval(() => postMessage(1), 2000);';
      const blob = new Blob([code], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = onClockTick;
      worker.onerror = ensureFallback;
    } catch (_) {
      ensureFallback();
    }
    // Watchdog: se o Worker ficar parado por mais de 3.5s, força tick
    setInterval(() => {
      if (Date.now() - lastTickAt > 3500) onClockTick();
    }, 3500);
  }

  window.addEventListener('focus', () => { pollFriends(); if (activeFriend) pollActiveDm(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pollFriends(); if (activeFriend) pollActiveDm(); } });

  renderFriendsPane();
  setTimeout(async () => {
    await sendHeartbeat();
    await pollFriends();
    startReliableClock();
  }, 600);

  let _pingMusicTimer = 0;
  window.addEventListener('lumo-music-state', (ev) => {
    const d = ev.detail || {};
    const nextTitle = d.playing && d.title ? String(d.title).trim().slice(0, 36) : '';
    if (nextTitle !== (window._lumoPingMusicTitle || '')) {
      window._lumoPingMusicTitle = nextTitle;
      clearTimeout(_pingMusicTimer);
      _pingMusicTimer = setTimeout(() => { if (typeof sendHeartbeat === 'function') sendHeartbeat(); }, 1200);
    }
  });

  window.addEventListener('lumo-profile-changed', () => {
    if (typeof sendHeartbeat === 'function') sendHeartbeat();
  });
})();
