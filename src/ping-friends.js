// === LUMO v2.9.5 — LISTA DE AMIGOS, STATUS ONLINE/OFFLINE/JOGANDO & ANIMAÇÃO DE MENSAGEM ===
(function initLumoPingFriends() {
  const FRIENDS_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev') + '/friends';

  let myUid = localStorage.getItem('lumo_ping_uid');
  if (!myUid) {
    myUid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem('lumo_ping_uid', myUid);
  }

  let myTag = localStorage.getItem('lumo_ping_tag') || '';
  let showGameStatus = localStorage.getItem('lumo_ping_show_game') !== 'false';
  let subTab = 'friends'; // 'friends' | 'rooms'
  let friends = [];
  let requests = [];
  let activeFriend = null;
  let dmMsgs = [];
  let dmSeen = new Set();
  let dmLastId = 0;
  let dmTimer = null;

  let readMap = {};
  try { readMap = JSON.parse(localStorage.getItem('lumo_dm_read_map') || '{}'); } catch (_) {}
  let alertedIds = new Set();
  let initializedList = false;
  let lastFriendsRenderSig = '';
  let ecoSkipTick = false;

  const NUDGES = {
    wave:  { text: 'deu um oi! 👋',           expr: 'happy',     freq: [520, 780] },
    love:  { text: 'mandou um carinho ❤️',    expr: 'love',      freq: [620, 960] },
    break: { text: 'chamou pra uma pausa ☕', expr: 'happy',     freq: [480, 680] },
    alert: { text: 'chamou sua atenção! ⚡',  expr: 'surprised', freq: [760, 1080] }
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function getMyName() {
    const stored = (localStorage.getItem('lumo_username') || localStorage.getItem('lumo_name') || '').trim();
    if (stored) return stored.slice(0, 24);
    if (typeof userName !== 'undefined' && userName) return String(userName).trim().slice(0, 24);
    return 'Lumo';
  }
  function getMyColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#4ade80';
  }
  let replyTarget = null;
  let lastActivityAt = Date.now();
  let friendsPollTimer = null;

  function loadDmCache(roomCode) {
    try {
      const arr = JSON.parse(localStorage.getItem('lumo_dm_hist_' + roomCode) || '[]');
      return Array.isArray(arr) ? arr.slice(-200) : [];
    } catch (_) { return []; }
  }
  function saveDmCache(roomCode, list) {
    try {
      localStorage.setItem('lumo_dm_hist_' + roomCode, JSON.stringify((list || []).slice(-200)));
    } catch (_) {}
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
  function isPingViewOpen() {
    const v = document.getElementById('view-ping');
    return Boolean(v && v.classList.contains('active') && typeof isExpanded !== 'undefined' && isExpanded);
  }
  function isPingMuted() {
    return localStorage.getItem('lumo_ping_muted') === 'true';
  }

  // === ANIMAÇÃO DE MENSAGEM CHEGANDO NA CÁPSULA ===
  function triggerIncomingMessageAnim(senderName, body, color, isNudge) {
    const pill = document.getElementById('lumo-pill');
    const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : getMyColor();
    const inGame = typeof isGameSessionActive === 'function' ? isGameSessionActive() : (typeof isHiddenInGame !== 'undefined' && isHiddenInGame);
    const stealth = typeof isStealth === 'function' && isStealth();

    if (typeof window.burstPingParticles === 'function') window.burstPingParticles(isNudge ? body : 'msg', col, isNudge ? 6 : 4);

    // 1. Pulinho luminoso na cor do amigo + som suave
    if (pill && !inGame) {
      pill.style.setProperty('--msg-color', col);
      pill.classList.remove('msg-arrive');
      void pill.offsetWidth;
      pill.classList.add('msg-arrive');
      setTimeout(() => pill.classList.remove('msg-arrive'), 820);

      // Partícula de balão/envelope flutuando acima da cápsula
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

    // 2. Expressão dos olhos + toque duplo agradável
    if (!inGame && !isPingMuted()) {
      if (typeof setExpression === 'function' && !(typeof isThinking !== 'undefined' && isThinking)) {
        const expr = isNudge ? (body.includes('❤️') ? 'love' : body.includes('⚡') ? 'surprised' : 'happy') : 'happy';
        setExpression(expr);
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 2200);
      }
      if (typeof playChirp === 'function') {
        playChirp(isNudge ? 620 : 520, isNudge ? 980 : 780, 0.13);
        setTimeout(() => playChirp(isNudge ? 780 : 660, isNudge ? 1120 : 940, 0.14), 105);
      }
    }

    // 3. Balão de fala se não estiver em jogo/furtivo/silenciado e não estiver já no chat
    if (!inGame && !stealth && !isPingMuted() && !(isPingViewOpen() && activeFriend)) {
      const preview = String(body || '').slice(0, 68);
      if (typeof say === 'function') {
        say(`💬 ${senderName}: ${preview}`, 4600, true);
      }
    }
  }

  // === ESTRUTURA DE SUB-ABAS DENTRO DE #view-ping ===
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
      if (f.last_msg_id && f.last_sender_uid !== myUid && (readMap[f.room_code] || 0) < f.last_msg_id) {
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

    // Atualiza também o card Lumo Ping na grade 3x2 do Resumo
    const tileBadge = document.getElementById('ping-unread-badge');
    const tileSub = document.getElementById('ping-strip-sub');
    const tile = document.getElementById('tile-ping');
    const onlineCount = friends.filter((f) => f.online).length;
    if (tile) tile.classList.toggle('connected', onlineCount > 0 || tile.classList.contains('connected'));
    if (tileBadge && total > 0) {
      tileBadge.textContent = total > 9 ? '9+' : String(total);
      tileBadge.classList.add('show');
    }
    if (tileSub && (!localStorage.getItem('lumo_ping_room'))) {
      if (total > 0) tileSub.textContent = `${total} novidade${total > 1 ? 's' : ''} nos Amigos`;
      else if (onlineCount > 0) tileSub.textContent = `${onlineCount} amigo${onlineCount > 1 ? 's' : ''} online`;
      else if (friends.length > 0) tileSub.textContent = `${friends.length} amigo${friends.length > 1 ? 's' : ''}`;
      else tileSub.textContent = 'Chat com amigos';
    }
  }

  function renderFriendsPane() {
    const pane = document.getElementById('pf-friends-pane');
    if (!pane) return;

    // Modo Chat DM aberto
    if (activeFriend) {
      const f = friends.find((x) => x.uid === activeFriend.uid) || activeFriend;
      const statusText = f.online
        ? (f.playing ? `🎮 Jogando ${f.playing}` : '● Online agora')
        : fmtLastSeen(f.last_seen);
      const statusCls = f.online ? (f.playing ? 'playing' : 'online') : '';

      pane.innerHTML = `
        <div class="pf-dm-head">
          <div style="display:flex; align-items:center; gap:7px; min-width:0; flex:1;">
            <button type="button" class="cp-mini" onclick="LumoFriends.closeDm()">←</button>
            <div style="min-width:0; flex:1;">
              <div style="font-size:11.6px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(f.display_name)}</div>
              <div class="pf-sub ${statusCls}">${esc(statusText)}</div>
            </div>
          </div>
          <button type="button" class="cp-mini" title="Remover amigo" onclick="LumoFriends.removeFriend('${esc(f.uid)}')">Remover</button>
        </div>
        <div class="pf-dm-nudges">
          <button type="button" class="cp-mini" style="padding:5px 4px;" onclick="LumoFriends.sendNudge('wave')">👋 Oi</button>
          <button type="button" class="cp-mini" style="padding:5px 4px;" onclick="LumoFriends.sendNudge('love')">❤️ Carinho</button>
          <button type="button" class="cp-mini" style="padding:5px 4px;" onclick="LumoFriends.sendNudge('break')">☕ Pausa</button>
          <button type="button" class="cp-mini" style="padding:5px 4px;" onclick="LumoFriends.sendNudge('alert')">⚡ Atenção</button>
        </div>
        <div class="pf-dm-feed" id="pf-dm-feed"></div>
        <div class="pf-reply-bar" id="pf-reply-bar">
          <span class="pf-reply-preview"></span>
          <button type="button" class="del-btn" onclick="LumoFriends.cancelReply()">×</button>
        </div>
        <form class="pf-dm-form" onsubmit="LumoFriends.submitDm(event)">
          <textarea id="pf-dm-input" rows="1" placeholder="Mensagem... (Shift+Enter quebra linha)" maxlength="400"></textarea>
          <button type="submit" class="cp-mini" style="padding:0 12px; background:var(--accent); color:#0b0e14; border-color:var(--accent); font-weight:700;">Enviar</button>
        </form>`;
      renderDmFeed();
      setTimeout(() => document.getElementById('pf-dm-input')?.focus(), 40);
      return;
    }

    // Modo Lista de Amigos
    const reqHtml = requests.length
      ? `<div style="font-size:10px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Pedidos pendentes (${requests.length})</div>` +
        requests.map((r) => `
          <div class="pf-req-item">
            <div style="min-width:0; flex:1;">
              <div style="font-size:11.3px; font-weight:700;">${esc(r.display_name)}</div>
              <div class="pf-sub">${esc(r.tag)} quer te adicionar</div>
            </div>
            <div style="display:flex; gap:4px;">
              <button type="button" class="cp-mini" style="background:var(--accent); color:#0b0e14; border-color:var(--accent);" onclick="LumoFriends.respond(${r.id}, true)">Aceitar</button>
              <button type="button" class="cp-mini" onclick="LumoFriends.respond(${r.id}, false)">×</button>
            </div>
          </div>`).join('')
      : '';

    const friendsHtml = friends.length
      ? friends.map((f) => {
          const unread = Boolean(f.last_msg_id && f.last_sender_uid !== myUid && (readMap[f.room_code] || 0) < f.last_msg_id);
          const dotCls = f.online ? (f.playing ? 'playing' : 'online') : '';
          const statusLine = unread && f.last_body
            ? `💬 ${f.last_body}`
            : (f.online ? (f.playing ? `🎮 Jogando ${f.playing}` : 'Online agora') : fmtLastSeen(f.last_seen));
          const subCls = unread ? 'online' : (f.online ? (f.playing ? 'playing' : 'online') : '');
          const initial = (f.display_name || '?').trim().charAt(0).toUpperCase();
          return `
            <div class="pf-friend-item ${f.online ? '' : 'offline'} ${unread ? 'has-unread' : ''}" onclick="LumoFriends.openDm('${esc(f.uid)}')">
              <div class="pf-avatar-wrap" style="background:${esc(f.color || '#4ade80')};">
                ${esc(initial)}
                <span class="pf-status-dot ${dotCls}"></span>
              </div>
              <div class="pf-info">
                <div class="pf-name-row">
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(f.display_name)}</span>
                  <span style="font-size:9.5px; color:var(--muted); font-weight:500;">${esc(f.tag)}</span>
                </div>
                <div class="pf-sub ${subCls}">${esc(statusLine)}</div>
              </div>
              ${unread ? '<span class="pf-badge show">!</span>' : '<span style="font-size:11px; color:var(--muted);">›</span>'}
            </div>`;
        }).join('')
      : `<div style="text-align:center; color:var(--muted); font-size:11px; padding:18px 8px; line-height:1.45;">
          Nenhum amigo adicionado ainda.<br>Copie sua <strong>Lumo Tag</strong> acima ou cole a Tag de um amigo para conversar direto!
        </div>`;

    pane.innerHTML = `
      <div class="pf-tag-card">
        <div>
          <div style="font-size:9.5px; color:var(--muted);">Sua Lumo Tag</div>
          <div class="pf-tag-code" id="pf-my-tag">${esc(myTag || 'Gerando...')}</div>
        </div>
        <button type="button" class="cp-mini" onclick="LumoFriends.copyTag()">Copiar Tag</button>
      </div>
      <form class="pf-add-row" onsubmit="LumoFriends.addFriend(event)">
        <input type="text" id="pf-add-input" placeholder="Adicionar amigo (ex: NOME#4K2P)" maxlength="20" autocomplete="off" />
        <button type="submit" class="cp-mini" style="padding:0 11px; background:var(--accent-soft); border-color:var(--accent-glow); color:var(--accent);">+ Add</button>
      </form>
      <div class="pf-privacy-row">
        <span>Mostrar jogo que estou jogando</span>
        <label style="display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
          <input type="checkbox" ${showGameStatus ? 'checked' : ''} onchange="LumoFriends.toggleGamePrivacy(this.checked)" />
          <span style="color:var(--text);">${showGameStatus ? 'Ativo' : 'Oculto'}</span>
        </label>
      </div>
      <div class="pf-list">
        ${reqHtml}
        ${friendsHtml}
      </div>`;
  }

  function renderDmFeed() {
    const feed = document.getElementById('pf-dm-feed');
    if (!feed) return;
    if (!dmMsgs.length) {
      feed.innerHTML = '<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:18px 8px;">Nenhuma mensagem ainda. Mande um oi ou um cutucão!</div>';
      return;
    }
    let lastDay = '';
    const html = [];
    for (const m of dmMsgs) {
      const dLbl = dayLabel(m.created_at);
      if (dLbl !== lastDay) {
        lastDay = dLbl;
        html.push(`<div class="pf-date-sep"><span>${esc(dLbl)}</span></div>`);
      }
      const isMe = m.sender_uid === myUid;
      if (m.kind === 'nudge') {
        html.push(`<div class="ping-msg nudge"><span style="color:${esc(m.sender_color || 'var(--accent)')}">${esc(m.sender_name)}</span> ${esc(m.body)} <span style="opacity:0.55; font-size:9px;">${fmtTime(m.created_at)}</span></div>`);
      } else {
        const plainBody = String(m.body || '').replace(/^↪[^\n]+\n/, '');
        html.push(`<div class="pf-dm-row ${isMe ? 'me' : 'them'}">
          <div class="pf-dm-bubble" title="Clique para responder" onclick="LumoFriends.startReply(${JSON.stringify(m.sender_name || '')}, ${JSON.stringify(plainBody.slice(0, 80))})">
            ${renderBodyHtml(m.body)}
            <span class="pf-dm-time">${fmtTime(m.created_at)}</span>
          </div>
        </div>`);
      }
    }
    feed.innerHTML = html.join('');
    feed.scrollTop = feed.scrollHeight;
  }

  async function sendHeartbeat() {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    const playing = (showGameStatus && window.isPlayingGame && window.currentGameName) ? String(window.currentGameName).slice(0, 40) : '';
    try {
      const res = await fetch(FRIENDS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify({
          action: 'heartbeat',
          uid: myUid,
          name: getMyName(),
          color: getMyColor(),
          playing
        })
      });
      const data = await res.json();
      if (data.tag && data.tag !== myTag) {
        myTag = data.tag;
        localStorage.setItem('lumo_ping_tag', myTag);
        const el = document.getElementById('pf-my-tag');
        if (el) el.textContent = myTag;
      }
    } catch (_) {}
  }

  async function pollFriends() {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    // Ping 2.0: nunca pula tick de notificação
    try {
      const res = await fetch(`${FRIENDS_API}?uid=${encodeURIComponent(myUid)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.me?.tag) {
        myTag = data.me.tag;
        localStorage.setItem('lumo_ping_tag', myTag);
      }

      const prevReqCount = requests.length;
      requests = Array.isArray(data.requests) ? data.requests : [];
      friends = Array.isArray(data.friends) ? data.friends : [];

      // Dispara animação de mensagem chegando para novos DMs de amigos
      for (const f of friends) {
        if (!f.last_msg_id) continue;
        const key = `${f.room_code}:${f.last_msg_id}`;
        if (!initializedList) {
          alertedIds.add(key);
          continue;
        }
        if (f.last_sender_uid !== myUid && !alertedIds.has(key)) {
          alertedIds.add(key);
          const alreadyReading = isPingViewOpen() && subTab === 'friends' && activeFriend && activeFriend.uid === f.uid;
          if (alreadyReading) {
            readMap[f.room_code] = f.last_msg_id;
            localStorage.setItem('lumo_dm_read_map', JSON.stringify(readMap));
            pollActiveDm();
          } else {
            triggerIncomingMessageAnim(f.display_name, f.last_body || 'Nova mensagem', f.color, f.last_kind === 'nudge');
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
        const sig = JSON.stringify([myTag, showGameStatus, requests.map(r => r.id), friends.map(f => [f.uid, f.display_name, f.online, f.playing, f.last_msg_id, f.last_seen, readMap[f.room_code] || 0])]);
        if (!focusedAdd && sig !== lastFriendsRenderSig) {
          lastFriendsRenderSig = sig;
          renderFriendsPane();
        }
      }
      else if (subTab === 'friends' && activeFriend) {
        // Atualiza status Online/Jogando/Offline no cabeçalho do DM aberto
        const updated = friends.find((x) => x.uid === activeFriend.uid);
        if (updated) {
          activeFriend = updated;
          const headSub = document.querySelector('#pf-friends-pane .pf-dm-head .pf-sub');
          if (headSub) {
            headSub.textContent = updated.online
              ? (updated.playing ? `🎮 Jogando ${updated.playing}` : '● Online agora')
              : fmtLastSeen(updated.last_seen);
            headSub.className = 'pf-sub ' + (updated.online ? (updated.playing ? 'playing' : 'online') : '');
          }
        }
      }
    } catch (_) {}
  }

  async function pollActiveDm() {
    if (!activeFriend) return;
    try {
      const res = await fetch(`${FRIENDS_API}?room=${encodeURIComponent(activeFriend.room_code)}&since=${dmLastId}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming = Array.isArray(data.messages) ? data.messages : [];
      let changed = false;
      for (const m of incoming) {
        if (dmSeen.has(m.id)) continue;
        dmSeen.add(m.id);
        dmMsgs.push(m);
        if (m.id > dmLastId) dmLastId = m.id;
        changed = true;
        alertedIds.add(`${activeFriend.room_code}:${m.id}`);
        if (m.sender_uid !== myUid) {
          const readingNow = isPingViewOpen() && subTab === 'friends';
          if (readingNow) {
            readMap[activeFriend.room_code] = dmLastId;
            localStorage.setItem('lumo_dm_read_map', JSON.stringify(readMap));
            if (m.kind === 'nudge') {
              triggerIncomingMessageAnim(m.sender_name || activeFriend.display_name, m.body || 'te cutucou!', m.sender_color || activeFriend.color, true);
            }
          } else {
            triggerIncomingMessageAnim(m.sender_name || activeFriend.display_name, m.body || 'Nova mensagem', m.sender_color || activeFriend.color, m.kind === 'nudge');
          }
        }
      }
      if (dmMsgs.length > 200) dmMsgs = dmMsgs.slice(-200);
      if (changed && activeFriend) { lastActivityAt = Date.now(); saveDmCache(activeFriend.room_code, dmMsgs); }
      if (changed) {
        renderDmFeed();
        syncBadges();
      }
    } catch (_) {}
  }

  async function sendDmMessage(kind, body) {
    if (!activeFriend || !body) return;
    const payload = {
      action: 'send_dm',
      uid: myUid,
      room_code: activeFriend.room_code,
      name: getMyName(),
      color: getMyColor(),
      kind,
      body
    };
    try {
      const res = await fetch(FRIENDS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const msg = {
          id: data.id || Date.now(),
          room_code: activeFriend.room_code,
          sender_uid: myUid,
          sender_name: payload.name,
          sender_color: payload.color,
          kind,
          body,
          created_at: data.created_at || Date.now()
        };
        if (!dmSeen.has(msg.id)) {
          dmSeen.add(msg.id);
          dmMsgs.push(msg);
          if (msg.id > dmLastId) dmLastId = msg.id;
          readMap[activeFriend.room_code] = dmLastId;
          localStorage.setItem('lumo_dm_read_map', JSON.stringify(readMap));
          lastActivityAt = Date.now();
          saveDmCache(activeFriend.room_code, dmMsgs);
          renderDmFeed();
        }
      }
    } catch (_) {
      if (typeof say === 'function') say('Sem conexão ao enviar mensagem.', 2200, true);
    }
  }

  window.LumoFriends = {
    syncProfile() { sendHeartbeat().then(pollFriends); },
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
      if (typeof playChirp === 'function') playChirp(580, 860, 0.13);
      if (typeof say === 'function') say(`Tag ${myTag} copiada! Envie pro seu amigo.`, 2500, true);
    },
    toggleGamePrivacy(val) {
      showGameStatus = Boolean(val);
      localStorage.setItem('lumo_ping_show_game', String(showGameStatus));
      lastFriendsRenderSig = '';
      renderFriendsPane();
      sendHeartbeat();
    },
    async addFriend(e) {
      e.preventDefault();
      const inp = document.getElementById('pf-add-input');
      const target = (inp?.value || '').trim().toUpperCase();
      if (!target) return;
      await sendHeartbeat();
      try {
        const res = await fetch(FRIENDS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
          body: JSON.stringify({ action: 'request', uid: myUid, target_tag: target })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
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
      await fetch(FRIENDS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify({ action: 'respond', uid: myUid, request_id: reqId, accept })
      }).catch(() => {});
      pollFriends();
    },
    async removeFriend(fUid) {
      await fetch(FRIENDS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify({ action: 'remove', uid: myUid, friend_uid: fUid })
      }).catch(() => {});
      this.closeDm();
      pollFriends();
    },
    openDm(fUid) {
      const f = friends.find((x) => x.uid === fUid);
      if (!f) return;
      activeFriend = f;
      replyTarget = null;
      lastActivityAt = Date.now();
      dmMsgs = loadDmCache(f.room_code);
      dmSeen = new Set(dmMsgs.map((m) => m.id));
      dmLastId = dmMsgs.reduce((max, m) => (m.id > max ? m.id : max), 0);
      if (f.last_msg_id) {
        readMap[f.room_code] = f.last_msg_id;
        localStorage.setItem('lumo_dm_read_map', JSON.stringify(readMap));
      }
      syncBadges();
      renderFriendsPane();
      pollActiveDm();
      clearInterval(dmTimer);
      dmTimer = setInterval(pollActiveDm, 1800);
    },
    closeDm() {
      activeFriend = null;
      clearInterval(dmTimer);
      dmTimer = null;
      lastFriendsRenderSig = '';
      renderFriendsPane();
      pollFriends();
    },
    sendNudge(type) {
      const n = NUDGES[type] || NUDGES.wave;
      if (typeof window.burstPingParticles === 'function') window.burstPingParticles(type, getMyColor(), 4);
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(n.freq[0], n.freq[1], 0.14);
      sendDmMessage('nudge', n.text);
    },
    submitDm(e) {
      e.preventDefault();
      const inp = document.getElementById('pf-dm-input');
      const v = (inp?.value || '').trim();
      if (!v) return;
      inp.value = '';
      sendDmMessage('text', v);
    }
  };

  renderFriendsPane();
  async function scheduleFriendsPoll() {
    clearTimeout(friendsPollTimer);
    await pollFriends();
    const activeRecently = (Date.now() - lastActivityAt) < 90000;
    const delay = activeFriend ? 1800 : (activeRecently ? 2000 : (window.lumoEcoMode ? 4000 : 2500));
    friendsPollTimer = setTimeout(scheduleFriendsPoll, delay);
  }
  window.addEventListener('focus', () => { pollFriends(); if (activeFriend) pollActiveDm(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pollFriends(); if (activeFriend) pollActiveDm(); } });

  setTimeout(async () => { await sendHeartbeat(); scheduleFriendsPoll(); }, 900);
  setInterval(sendHeartbeat, 20000);
})();
