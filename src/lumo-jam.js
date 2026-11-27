// === LUMO v3.5.0 — LUMO JAM (OUVIR JUNTO EM TEMPO REAL COM AMIGOS DO LUMO PING) ===
(function initLumoJam() {
  if (window.LumoJam) return;

  const S = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const IC = {
    jam:  S('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'),
    sync: S('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
    x:    S('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let drawerOpen = false;
  let role = 'idle'; // 'idle' | 'host' | 'guest'
  let hostInfo = null; // { uid, name, roomCode }
  let invitedRooms = new Map(); // roomCode -> { uid, name, color, joined }
  let pendingInvites = new Map(); // roomCode -> { hostUid, hostName, roomCode, title, artist, ts }
  let lastSyncSentAt = 0;
  let hostKeepAlive = 0;
  let lastAppliedKey = '';

  function getMe() {
    return window.LumoFriends?.getMe ? window.LumoFriends.getMe() : { uid: '', name: 'Você', color: '#4ade80' };
  }
  function getFriends() {
    return window.LumoFriends?.getFriends ? window.LumoFriends.getFriends() : [];
  }

  function updateWatchedRooms() {
    if (!window.LumoFriends?.watchJamRooms) return;
    const rooms = [];
    if (role === 'host') {
      for (const rc of invitedRooms.keys()) rooms.push(rc);
    } else if (role === 'guest' && hostInfo?.roomCode) {
      rooms.push(hostInfo.roomCode);
    }
    window.LumoFriends.watchJamRooms(rooms);
  }

  function compactTrack(track) {
    if (!track) return null;
    const s = track.source === 'spotify' ? 'sp' : (track.source === 'audius' ? 'au' : 'yt');
    const rawId = s === 'yt'
      ? (track.videoId || String(track.id || '').replace(/^yt_/, ''))
      : (s === 'sp' ? String(track.id || '').replace(/^sp_/, '') : String(track.id || ''));
    return {
      s,
      id: rawId,
      ti: String(track.title || 'Música').slice(0, 56),
      ar: String(track.artist || 'Artista').slice(0, 36),
      d: Math.round(Number(track.duration || 0))
    };
  }

  function sendPacket(roomCode, pkt) {
    if (!roomCode || !window.LumoFriends?.sendJamPacket) return Promise.resolve(false);
    return window.LumoFriends.sendJamPacket(roomCode, pkt);
  }

  function buildSyncPacket() {
    const me = getMe();
    const st = window.LumoMusic?.getState ? window.LumoMusic.getState() : null;
    if (!st || !st.track) return null;
    return {
      t: 'sync',
      h: me.uid,
      n: String(me.name || 'Amigo').slice(0, 20),
      tr: compactTrack(st.track),
      p: st.playing ? 1 : 0,
      pos: Number((st.currentTime || 0).toFixed(1)),
      ts: Date.now()
    };
  }

  function broadcastSync(force = false, onlyRoom = null) {
    if (role !== 'host') return;
    const now = Date.now();
    if (!force && (now - lastSyncSentAt) < 900) return;
    const pkt = buildSyncPacket();
    if (!pkt) return;
    lastSyncSentAt = now;

    if (onlyRoom) {
      sendPacket(onlyRoom, pkt);
      return;
    }
    for (const rc of invitedRooms.keys()) {
      sendPacket(rc, pkt);
    }
  }

  function startHostKeepAlive() {
    clearInterval(hostKeepAlive);
    // Pulso leve a cada 25s só se houver alguém ouvindo, mantendo o tempo alinhado
    hostKeepAlive = setInterval(() => {
      if (role !== 'host') { clearInterval(hostKeepAlive); return; }
      const hasListener = Array.from(invitedRooms.values()).some((x) => x.joined);
      if (hasListener) broadcastSync(true);
    }, 25000);
  }

  function notifyUI() {
    window.dispatchEvent(new CustomEvent('lumo-jam-changed', { detail: getStatus() }));
    renderJamDrawer();
  }

  function getStatus() {
    const listeners = Array.from(invitedRooms.values()).filter((x) => x.joined).length;
    return {
      role,
      active: role !== 'idle',
      drawerOpen,
      hostName: hostInfo?.name || '',
      listeners,
      invitedCount: invitedRooms.size,
      pendingCount: pendingInvites.size
    };
  }

  // === AÇÕES DO USUÁRIO ===
  async function inviteFriend(friendUid) {
    const f = getFriends().find((x) => x.uid === friendUid);
    if (!f || !f.room_code) return;
    if (role === 'guest') leaveJam(true);

    role = 'host';
    const prev = invitedRooms.get(f.room_code);
    invitedRooms.set(f.room_code, {
      uid: f.uid,
      name: f.display_name || 'Amigo',
      color: f.color || '#4ade80',
      joined: prev ? prev.joined : false
    });
    updateWatchedRooms();
    startHostKeepAlive();

    const me = getMe();
    const st = window.LumoMusic?.getState ? window.LumoMusic.getState() : null;
    await sendPacket(f.room_code, {
      t: 'inv',
      h: me.uid,
      n: String(me.name || 'Amigo').slice(0, 20),
      ti: String(st?.track?.title || 'Sessão Lumo Jam').slice(0, 56),
      ar: String(st?.track?.artist || 'Ouvindo ao vivo no Lumo').slice(0, 36),
      ts: Date.now()
    });
    if (st?.track) {
      setTimeout(() => broadcastSync(true, f.room_code), 450);
    }
    if (typeof hopPill === 'function') hopPill();
    if (typeof say === 'function') say(`Convite de Lumo Jam enviado para ${f.display_name}!`, 2600, true);
    notifyUI();
  }

  async function joinFromInvite(roomCode, hostUid, hostName) {
    if (!roomCode) return;
    if (role === 'host') endJam(true);

    role = 'guest';
    hostInfo = { uid: hostUid || '', name: hostName || 'Amigo', roomCode };
    pendingInvites.delete(roomCode);
    drawerOpen = true;
    updateWatchedRooms();

    const me = getMe();
    await sendPacket(roomCode, {
      t: 'join',
      u: me.uid,
      n: String(me.name || 'Amigo').slice(0, 20),
      ts: Date.now()
    });

    if (typeof switchView === 'function') switchView('midia');
    if (typeof hopPill === 'function') hopPill();
    if (typeof say === 'function') say(`Conectando à Lumo Jam de ${hostInfo.name}...`, 2600, true);
    notifyUI();
  }

  function requestResync() {
    if (role !== 'guest' || !hostInfo?.roomCode) return;
    const me = getMe();
    sendPacket(hostInfo.roomCode, { t: 'join', u: me.uid, n: String(me.name || 'Amigo').slice(0, 20), ts: Date.now() });
    if (typeof say === 'function') say('Ressincronizando tempo da Jam...', 1800, true);
  }

  function leaveJam(silent = false) {
    if (role === 'guest' && hostInfo?.roomCode) {
      const me = getMe();
      sendPacket(hostInfo.roomCode, { t: 'leave', u: me.uid, n: String(me.name || 'Amigo').slice(0, 20), ts: Date.now() });
    }
    role = 'idle';
    hostInfo = null;
    lastAppliedKey = '';
    updateWatchedRooms();
    if (!silent && typeof say === 'function') say('Você saiu da Lumo Jam.', 1800, true);
    notifyUI();
  }

  function endJam(silent = false) {
    clearInterval(hostKeepAlive);
    if (role === 'host') {
      const me = getMe();
      for (const rc of invitedRooms.keys()) {
        sendPacket(rc, { t: 'end', h: me.uid, n: String(me.name || 'Amigo').slice(0, 20), ts: Date.now() });
      }
    }
    role = 'idle';
    invitedRooms.clear();
    updateWatchedRooms();
    if (!silent && typeof say === 'function') say('Lumo Jam encerrada.', 1800, true);
    notifyUI();
  }

  function toggleDrawer(forceState) {
    drawerOpen = typeof forceState === 'boolean' ? forceState : !drawerOpen;
    notifyUI();
  }

  // === RECEBIMENTO DE PACOTES VIA LUMO PING ===
  window.addEventListener('lumo-jam-packet', (ev) => {
    const { roomCode, senderUid, senderName, packet } = ev.detail || {};
    if (!packet || !packet.t) return;
    // Ignora pacotes muito antigos (ex: ao abrir o app horas depois)
    if (packet.ts && (Date.now() - Number(packet.ts)) > 180000) return;

    if (packet.t === 'inv') {
      pendingInvites.set(roomCode, {
        hostUid: packet.h || senderUid,
        hostName: packet.n || senderName || 'Amigo',
        roomCode,
        title: packet.ti || 'Lumo Jam',
        artist: packet.ar || '',
        ts: packet.ts || Date.now()
      });
      if (typeof say === 'function' && role === 'idle') {
        say(`${packet.n || senderName || 'Um amigo'} te convidou para uma Lumo Jam!`, 4200, true);
      }
      notifyUI();
      return;
    }

    if (packet.t === 'join' && role === 'host') {
      const existing = invitedRooms.get(roomCode);
      const f = getFriends().find((x) => x.room_code === roomCode);
      invitedRooms.set(roomCode, {
        uid: packet.u || senderUid || existing?.uid || '',
        name: packet.n || senderName || f?.display_name || 'Amigo',
        color: f?.color || existing?.color || '#4ade80',
        joined: true
      });
      broadcastSync(true, roomCode);
      if (typeof say === 'function') say(`${packet.n || senderName || 'Amigo'} entrou na sua Lumo Jam!`, 2600, true);
      notifyUI();
      return;
    }

    if (packet.t === 'leave' && role === 'host') {
      const existing = invitedRooms.get(roomCode);
      if (existing) existing.joined = false;
      notifyUI();
      return;
    }

    if (packet.t === 'end' && role === 'guest' && hostInfo?.roomCode === roomCode) {
      role = 'idle';
      hostInfo = null;
      updateWatchedRooms();
      if (typeof say === 'function') say(`${packet.n || 'Host'} encerrou a Lumo Jam.`, 2600, true);
      notifyUI();
      return;
    }

    if (packet.t === 'sync' && role === 'guest' && hostInfo?.roomCode === roomCode && packet.tr) {
      const key = `${packet.tr.s}:${packet.tr.id}:${packet.p}:${Math.round((packet.pos || 0) / 2)}:${packet.ts}`;
      if (key === lastAppliedKey) return;
      lastAppliedKey = key;
      if (window.LumoMusic?.applyJamState) {
        window.LumoMusic.applyJamState(packet);
      }
      notifyUI();
    }
  });

  // Escuta controles manuais do Host no Lumo Music para propagar em tempo real
  window.addEventListener('lumo-music-action', (ev) => {
    if (role !== 'host') return;
    const act = ev.detail?.action;
    if (act === 'stop') {
      broadcastSync(true);
    } else if (act === 'track' || act === 'play' || act === 'pause' || act === 'seek') {
      broadcastSync(act === 'track' || act === 'play' || act === 'pause');
    }
  });

  // === RENDERIZAÇÃO DA GAVETA LUMO JAM ===
  function renderJamDrawer() {
    const box = document.getElementById('lm-jam-box');
    if (!box) return;
    box.classList.toggle('show', drawerOpen);
    if (!drawerOpen) return;

    const friends = getFriends().slice().sort((a, b) => Number(Boolean(b.online)) - Number(Boolean(a.online)));
    const invites = Array.from(pendingInvites.values()).filter((x) => (Date.now() - x.ts) < 180000);

    let body = '';
    if (role === 'guest' && hostInfo) {
      body = `
        <div class="lm-jam-head">
          <div class="lm-jam-title">${IC.jam}<span>Ouvindo com ${esc(hostInfo.name)}</span></div>
          <span class="lm-jam-pill"><i></i>AO VIVO</span>
        </div>
        <div class="lm-jam-sub">Seu player está sincronizado com a música, pausa e tempo de ${esc(hostInfo.name)}.</div>
        <div style="display:flex; gap:6px; margin-top:2px;">
          <button type="button" class="lm-jam-btn" style="flex:1;" data-jact="resync">Ressincronizar</button>
          <button type="button" class="lm-jam-btn danger" data-jact="leave">Sair da Jam</button>
        </div>`;
    } else {
      const listeningCount = Array.from(invitedRooms.values()).filter((x) => x.joined).length;
      const headRight = role === 'host'
        ? `<div style="display:flex; align-items:center; gap:5px;">
            <span class="lm-jam-pill"><i></i>${listeningCount + 1} na Jam</span>
            <button type="button" class="lm-jam-btn danger" data-jact="end">Encerrar</button>
          </div>`
        : `<button type="button" class="lm-jam-btn ghost" data-jact="close" title="Fechar">${IC.x}</button>`;

      const invHtml = invites.length
        ? invites.map((inv) => `
            <div class="lm-jam-row" style="border-color:var(--accent-glow); background:var(--accent-soft);">
              <div class="lm-jam-finfo">
                <div class="lm-jam-fname">Convite de ${esc(inv.hostName)}</div>
                <div class="lm-jam-fsub">${esc(inv.title)}${inv.artist ? ' · ' + esc(inv.artist) : ''}</div>
              </div>
              <button type="button" class="lm-jam-btn solid" data-jjoin="${esc(inv.roomCode)}" data-jhuid="${esc(inv.hostUid)}" data-jhname="${esc(inv.hostName)}">Entrar</button>
            </div>`).join('')
        : '';

      const fHtml = friends.length
        ? friends.map((f) => {
            const st = invitedRooms.get(f.room_code);
            const init = (f.display_name || '?').trim().charAt(0).toUpperCase();
            const sub = st?.joined
              ? 'Ouvindo junto com você'
              : (st ? 'Convite enviado' : (f.online ? 'Online no Lumo Ping' : 'Offline'));
            return `<div class="lm-jam-row">
              <div class="lm-jam-av" style="background:${esc(f.color || '#4ade80')};">
                ${esc(init)}
                <span class="dot ${f.online ? 'on' : ''}"></span>
              </div>
              <div class="lm-jam-finfo">
                <div class="lm-jam-fname">${esc(f.display_name)}</div>
                <div class="lm-jam-fsub">${esc(sub)}</div>
              </div>
              <button type="button" class="lm-jam-btn ${st?.joined ? 'solid' : ''}" data-jinv="${esc(f.uid)}">${st?.joined ? 'Sincronizar' : (st ? 'Reenviar' : 'Convidar')}</button>
            </div>`;
          }).join('')
        : '<div class="lm-jam-sub" style="text-align:center; padding:8px 0;">Adicione amigos no Lumo Ping para iniciar uma Jam juntos.</div>';

      body = `
        <div class="lm-jam-head">
          <div class="lm-jam-title">${IC.jam}<span>Lumo Jam</span></div>
          ${headRight}
        </div>
        <div class="lm-jam-sub">${role === 'host' ? 'Você está no comando. Tudo que você tocar sincroniza em tempo real.' : 'Convide amigos do Lumo Ping para escutarem a mesma música sincronizada.'}</div>
        ${invHtml}
        <div class="lm-jam-friends">${fHtml}</div>`;
    }

    box.innerHTML = body;
  }

  document.addEventListener('click', (e) => {
    const box = e.target.closest('#lm-jam-box');
    if (!box) return;
    const invBtn = e.target.closest('[data-jinv]');
    if (invBtn) {
      const f = getFriends().find((x) => x.uid === invBtn.dataset.jinv);
      if (f && invitedRooms.get(f.room_code)?.joined) broadcastSync(true, f.room_code);
      else inviteFriend(invBtn.dataset.jinv);
      return;
    }
    const joinBtn = e.target.closest('[data-jjoin]');
    if (joinBtn) {
      joinFromInvite(joinBtn.dataset.jjoin, joinBtn.dataset.jhuid, joinBtn.dataset.jhname);
      return;
    }
    const act = e.target.closest('[data-jact]')?.dataset.jact;
    if (act === 'close') toggleDrawer(false);
    else if (act === 'end') endJam(false);
    else if (act === 'leave') leaveJam(false);
    else if (act === 'resync') requestResync();
  });

  window.LumoJam = {
    toggleDrawer,
    inviteFriend,
    joinFromInvite,
    leaveJam,
    endJam,
    requestResync,
    getStatus,
    render: renderJamDrawer
  };
})();
