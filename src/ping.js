// === LUMO v2.6.0 — MOTOR DO LUMO PING (CHAT ENTRE AMIGOS + CUTUCÕES) ===
(function initLumoPing() {
  const PING_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev') + '/ping';

  const NUDGES = {
    wave:  { icon: '👋', label: 'Oi',      text: 'deu um oi! 👋',              expr: 'happy',     freq: [520, 780] },
    love:  { icon: '❤️', label: 'Carinho', text: 'mandou um carinho ❤️',       expr: 'love',      freq: [620, 940] },
    break: { icon: '☕', label: 'Pausa',   text: 'chamou pra uma pausa ☕',     expr: 'happy',     freq: [480, 660] },
    alert: { icon: '⚡', label: 'Atenção', text: 'chamou sua atenção! ⚡',      expr: 'surprised', freq: [760, 1080] }
  };

  let myId = localStorage.getItem('lumo_ping_uid');
  if (!myId) {
    myId = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem('lumo_ping_uid', myId);
  }

  let currentRoom = (localStorage.getItem('lumo_ping_room') || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
  let muted = localStorage.getItem('lumo_ping_muted') === 'true';
  let recents = [];
  try { recents = JSON.parse(localStorage.getItem('lumo_ping_recents') || '[]'); } catch (_) { recents = []; }
  if (!Array.isArray(recents)) recents = [];

  let messages = [];
  let seenIds = new Set();
  let lastId = 0;
  let unread = 0;
  let isPingOpen = false;
  let pollTimer = null;
  let polling = false;
  let initializedRoom = false;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getMyName() {
    const custom = localStorage.getItem('lumo_ping_nick');
    if (custom && custom.trim()) return custom.trim().slice(0, 24);
    if (typeof userName !== 'undefined' && userName) return String(userName).trim().slice(0, 24);
    const saved = localStorage.getItem('lumo_user_name') || localStorage.getItem('lumo_name') || 'Lumo';
    return saved.trim().slice(0, 24) || 'Lumo';
  }

  function getMyAccentHex() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#f6b974';
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }

  function saveRecent(room) {
    recents = [room, ...recents.filter((r) => r !== room)].slice(0, 3);
    localStorage.setItem('lumo_ping_recents', JSON.stringify(recents));
  }

  // 1. Injeta a barra compacta no Resumo e a view #view-ping
  const hubGrid = document.querySelector('#view-resumo .hub-grid');
  if (hubGrid && !document.getElementById('ping-summary-strip')) {
    hubGrid.insertAdjacentHTML(
      'afterend',
      `<button type="button" class="ping-strip" id="ping-summary-strip" onclick="openView('ping')">
        <div class="ping-strip-left">
          <div class="ping-strip-icon">💬</div>
          <div style="min-width:0;">
            <div class="ping-strip-title">Lumo Ping <span class="ping-live-dot"></span></div>
            <div class="ping-strip-sub" id="ping-strip-sub">Chat leve com amigos por código</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <span class="ping-unread-badge" id="ping-unread-badge">0</span>
          <span style="color:var(--muted); font-size:12px;">›</span>
        </div>
      </button>`
    );
  }

  const cfgView = document.getElementById('view-config');
  if (cfgView && !document.getElementById('view-ping')) {
    cfgView.insertAdjacentHTML(
      'afterend',
      `<div class="view" id="view-ping">
        <div class="ping-top-card" id="ping-top-card"></div>
        <div class="ping-nudge-row" id="ping-nudge-row" style="display:none;">
          <button type="button" class="ping-nudge-btn" onclick="sendPingNudge('wave')">👋 Oi</button>
          <button type="button" class="ping-nudge-btn" onclick="sendPingNudge('love')">❤️ Carinho</button>
          <button type="button" class="ping-nudge-btn" onclick="sendPingNudge('break')">☕ Pausa</button>
          <button type="button" class="ping-nudge-btn" onclick="sendPingNudge('alert')">⚡ Atenção</button>
        </div>
        <div class="ping-feed" id="ping-feed"></div>
        <form class="ping-composer" id="ping-form" onsubmit="submitPingForm(event)" style="display:none;">
          <input type="text" id="ping-input" placeholder="Mensagem rápida para a sala..." maxlength="380" autocomplete="off" />
          <button type="submit" class="btn-primary" style="padding:7px 12px; font-size:11.2px;">Enviar</button>
        </form>
      </div>`
    );
  }

  function updateSummaryStrip() {
    const strip = document.getElementById('ping-summary-strip');
    const sub = document.getElementById('ping-strip-sub');
    const badge = document.getElementById('ping-unread-badge');
    if (!strip || !sub || !badge) return;

    strip.classList.toggle('connected', Boolean(currentRoom));
    if (currentRoom) {
      const last = messages[messages.length - 1];
      sub.textContent = last
        ? `Sala ${currentRoom} · ${last.sender_name}: ${last.body}`
        : `Conectado na sala ${currentRoom}`;
    } else {
      sub.textContent = 'Chat leve com amigos por código';
    }
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.classList.toggle('show', unread > 0);
  }

  function renderTopCard() {
    const top = document.getElementById('ping-top-card');
    const nudges = document.getElementById('ping-nudge-row');
    const form = document.getElementById('ping-form');
    if (!top) return;

    if (!currentRoom) {
      if (nudges) nudges.style.display = 'none';
      if (form) form.style.display = 'none';
      const recHtml = recents.length
        ? `<div class="ping-recents"><span style="font-size:10px; color:var(--muted);">Recentes:</span>${recents
            .map((r) => `<button type="button" class="ping-recent-chip" onclick="joinPingRoom('${esc(r)}')">${esc(r)}</button>`)
            .join('')}</div>`
        : '';
      top.innerHTML = `
        <div style="font-size:11.6px; font-weight:700;">Converse pelo Lumo sem pesar a RAM</div>
        <div style="font-size:10.4px; color:var(--muted); line-height:1.4;">Crie uma sala, passe o código pro seu amigo e troquem mensagens ou cutucões direto na cápsula. Mensagens expiram em 24h.</div>
        <div class="ping-join-row">
          <input type="text" id="ping-room-input" placeholder="Código (ex: LUMO-4K2P)" maxlength="16" onkeydown="if(event.key==='Enter') joinPingFromInput()" />
          <button type="button" class="btn-primary" style="padding:7px 11px; font-size:11px;" onclick="joinPingFromInput()">Entrar</button>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
          <button type="button" class="ping-mini-btn" onclick="createPingRoom()">✨ Criar nova sala</button>
          <span style="font-size:10px; color:var(--muted);">Você: <strong style="color:var(--text);">${esc(getMyName())}</strong></span>
        </div>
        ${recHtml}
      `;
    } else {
      if (nudges) nudges.style.display = 'grid';
      if (form) form.style.display = 'flex';
      top.innerHTML = `
        <div class="ping-room-bar">
          <span class="ping-room-pill"><span class="ping-live-dot" style="display:inline-block;"></span>${esc(currentRoom)}</span>
          <div class="ping-room-actions">
            <button type="button" class="ping-mini-btn" onclick="copyPingCode()">Copiar</button>
            <button type="button" class="ping-mini-btn ${muted ? 'active' : ''}" onclick="togglePingMute()">${muted ? '🔇 Mudo' : '🔔 Som'}</button>
            <button type="button" class="ping-mini-btn" onclick="leavePingRoom()">Sair</button>
          </div>
        </div>
      `;
    }
  }

  function renderFeed() {
    const feed = document.getElementById('ping-feed');
    if (!feed) return;

    if (!currentRoom) {
      feed.innerHTML = `<div class="ping-empty">Nenhuma sala conectada.<br>Crie um código acima ou cole o código de um amigo para começar.</div>`;
      return;
    }

    if (!messages.length) {
      feed.innerHTML = `<div class="ping-empty">Sala <strong>${esc(currentRoom)}</strong> pronta!<br>Clique em <strong>Copiar</strong> e mande o código pro seu amigo.</div>`;
      return;
    }

    feed.innerHTML = messages
      .map((m) => {
        const isMe = m.sender_id === myId;
        if (m.kind === 'nudge') {
          return `<div class="ping-msg nudge"><span style="color:${esc(m.sender_color)}">${esc(m.sender_name)}</span> ${esc(m.body)} <span class="ping-time">${fmtTime(m.created_at)}</span></div>`;
        }
        return `
          <div class="ping-msg ${isMe ? 'me' : ''}">
            <div class="ping-msg-head">
              <span class="ping-sender" style="color:${isMe ? 'var(--accent)' : esc(m.sender_color)}">${isMe ? 'Você' : esc(m.sender_name)}</span>
              <span class="ping-time">${fmtTime(m.created_at)}</span>
            </div>
            <div>${esc(m.body)}</div>
          </div>`;
      })
      .join('');

    feed.scrollTop = feed.scrollHeight;
  }

  function triggerIncomingReaction(m) {
    const inGame = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
    if (inGame) return;

    if (m.kind === 'nudge') {
      const nudgeMatch = Object.values(NUDGES).find((n) => m.body.includes(n.icon)) || NUDGES.wave;
      if (!muted && typeof playChirp === 'function') playChirp(nudgeMatch.freq[0], nudgeMatch.freq[1], 0.18);
      if (typeof hopPill === 'function') hopPill();
      if (typeof setExpression === 'function') {
        setExpression(nudgeMatch.expr);
        if (nudgeMatch.expr === 'love' && typeof burstPillLove === 'function') burstPillLove(true);
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 2200);
      }
      if (!isPingOpen && typeof say === 'function') {
        say(`${m.sender_name} ${m.body}`, 3600, true);
      }
    } else {
      if (!muted && typeof playChirp === 'function') playChirp(540, 760, 0.12);
      if (!isPingOpen) {
        if (typeof hopPill === 'function') hopPill();
        if (typeof say === 'function') {
          const preview = m.body.length > 52 ? m.body.slice(0, 52) + '…' : m.body;
          say(`💬 ${m.sender_name}: ${preview}`, 3800, true);
        }
      }
    }
  }

  async function pollPing() {
    if (!currentRoom || polling) return;
    polling = true;
    try {
      const url = `${PING_API}?room=${encodeURIComponent(currentRoom)}&since=${lastId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const incoming = Array.isArray(data.messages) ? data.messages : [];
      let added = false;

      for (const m of incoming) {
        if (seenIds.has(m.id)) continue;
        seenIds.add(m.id);
        messages.push(m);
        if (m.id > lastId) lastId = m.id;
        added = true;

        if (initializedRoom && m.sender_id !== myId) {
          if (!isPingOpen) unread++;
          triggerIncomingReaction(m);
        }
      }

      if (messages.length > 60) messages = messages.slice(-60);
      initializedRoom = true;
      if (added) {
        renderFeed();
        updateSummaryStrip();
      }
    } catch (_) {
      // Silencioso em queda momentânea de rede
    } finally {
      polling = false;
    }
  }

  function restartPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
    if (!currentRoom) return;
    const ms = isPingOpen ? 3000 : 8000;
    pollTimer = setInterval(pollPing, ms);
  }

  async function sendPingPayload(kind, body) {
    if (!currentRoom || !body) return;
    const payload = {
      room: currentRoom,
      sender_id: myId,
      sender_name: getMyName(),
      sender_color: getMyAccentHex(),
      kind,
      body
    };
    try {
      const res = await fetch(PING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const msgObj = {
          id: data.id || Date.now(),
          sender_id: myId,
          sender_name: payload.sender_name,
          sender_color: payload.sender_color,
          kind,
          body,
          created_at: data.created_at || Date.now()
        };
        if (!seenIds.has(msgObj.id)) {
          seenIds.add(msgObj.id);
          messages.push(msgObj);
          if (msgObj.id > lastId) lastId = msgObj.id;
          renderFeed();
          updateSummaryStrip();
        }
      }
    } catch (_) {
      if (typeof say === 'function') say('Sem conexão para enviar no Lumo Ping.', 2400, true);
    }
  }

  // Ações públicas
  function joinPingRoom(code) {
    const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
    if (clean.length < 3) {
      if (typeof say === 'function') say('Use um código com pelo menos 3 caracteres.', 2400, true);
      return;
    }
    currentRoom = clean;
    localStorage.setItem('lumo_ping_room', currentRoom);
    saveRecent(currentRoom);
    messages = [];
    seenIds = new Set();
    lastId = 0;
    unread = 0;
    initializedRoom = false;
    renderTopCard();
    renderFeed();
    updateSummaryStrip();
    pollPing();
    restartPolling();
    if (typeof playChirp === 'function') playChirp(520, 820, 0.15);
  }

  function joinPingFromInput() {
    const inp = document.getElementById('ping-room-input');
    if (inp) joinPingRoom(inp.value);
  }

  function createPingRoom() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const code = 'LUMO-' + suffix;
    joinPingRoom(code);
    copyPingCode();
  }

  function copyPingCode() {
    if (!currentRoom) return;
    navigator.clipboard?.writeText(currentRoom).catch(() => {});
    if (typeof say === 'function') say(`Código ${currentRoom} copiado! Mande pro seu amigo.`, 2600, true);
  }

  function leavePingRoom() {
    currentRoom = '';
    localStorage.removeItem('lumo_ping_room');
    messages = [];
    seenIds = new Set();
    lastId = 0;
    unread = 0;
    initializedRoom = false;
    clearInterval(pollTimer);
    pollTimer = null;
    renderTopCard();
    renderFeed();
    updateSummaryStrip();
  }

  function togglePingMute() {
    muted = !muted;
    localStorage.setItem('lumo_ping_muted', String(muted));
    renderTopCard();
  }

  function sendPingNudge(type) {
    const n = NUDGES[type] || NUDGES.wave;
    if (typeof playChirp === 'function') playChirp(n.freq[0], n.freq[1], 0.14);
    if (typeof hopPill === 'function') hopPill();
    sendPingPayload('nudge', n.text);
  }

  function submitPingForm(e) {
    e.preventDefault();
    const inp = document.getElementById('ping-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    sendPingPayload('text', text);
  }

  // Hook em openView para título, leitura de não lidas e frequência do polling
  if (typeof window.openView === 'function') {
    const _origOpen = window.openView;
    window.openView = function (name, ...rest) {
      const r = _origOpen.call(this, name, ...rest);
      isPingOpen = name === 'ping';
      if (isPingOpen) {
        const lbl = document.getElementById('topbar-label');
        if (lbl) lbl.textContent = 'Lumo Ping';
        unread = 0;
        renderTopCard();
        renderFeed();
        updateSummaryStrip();
        pollPing();
        setTimeout(() => document.getElementById('ping-input')?.focus(), 120);
      }
      restartPolling();
      return r;
    };
  }

  // Comando rápido /ping na barra inferior
  if (typeof window.quickCommand === 'function') {
    const _origQuick = window.quickCommand;
    window.quickCommand = async function (e) {
      const input = document.getElementById('quick-ai-input');
      const raw = (input?.value || '').trim();
      if (/^\/ping(?:\s|$)/i.test(raw)) {
        e.preventDefault();
        if (typeof stopTypingLook === 'function') stopTypingLook();
        const msg = raw.replace(/^\/ping\s*/i, '').trim();
        input.value = '';
        if (!currentRoom) {
          openView('ping');
          if (typeof say === 'function') say('Entre ou crie uma sala no Lumo Ping primeiro!', 2600, true);
          return;
        }
        if (msg) {
          await sendPingPayload('text', msg);
          if (typeof say === 'function') say(`Enviado na sala ${currentRoom}!`, 1800, true);
        } else {
          openView('ping');
        }
        return;
      }
      return _origQuick.call(this, e);
    };
  }

  // Expõe funções globais
  window.joinPingRoom = joinPingRoom;
  window.joinPingFromInput = joinPingFromInput;
  window.createPingRoom = createPingRoom;
  window.copyPingCode = copyPingCode;
  window.leavePingRoom = leavePingRoom;
  window.togglePingMute = togglePingMute;
  window.sendPingNudge = sendPingNudge;
  window.submitPingForm = submitPingForm;

  // Inicialização
  renderTopCard();
  renderFeed();
  updateSummaryStrip();
  if (currentRoom) {
    pollPing();
    restartPolling();
  }
})();
