// === LUMO v4.0 — WATCH PARTY ENGINE (WEBRTC P2P + VOICE CHAT + YOUTUBE SYNC + CHAT) ===
(function initWatchPartyWindow() {
  const invoke = window.__TAURI__?.core?.invoke;
  const listen = window.__TAURI__?.event?.listen;

  let boot = null;
  try { boot = JSON.parse(localStorage.getItem('lumo_wp_boot') || 'null'); } catch (_) {}
  if (!boot || !boot.code) {
    boot = {
      code: '',
      title: 'Lumo Video',
      uid: localStorage.getItem('lumo_ping_uid') || ('u_' + Date.now().toString(36)),
      name: localStorage.getItem('lumo_username') || 'Lumo',
      color: '#f6b974',
      surface: 'dark',
      api: 'https://lumo-ai.sivavieiravitor.workers.dev'
    };
  }

  const API = boot.api || 'https://lumo-ai.sivavieiravitor.workers.dev';
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  // Aplica tema herdado do Lumo
  function applyTheme(color, surface) {
    if (/^#[0-9a-fA-F]{6}$/.test(color || '')) {
      document.documentElement.style.setProperty('--accent', color);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      document.documentElement.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.42)`);
    }
    document.body.classList.remove('surface-light', 'surface-oled');
    if (surface === 'light') document.body.classList.add('surface-light');
    if (surface === 'oled') document.body.classList.add('surface-oled');
  }
  applyTheme(boot.color, boot.surface);

  // Estado da sala
  let roomCode = boot.code;
  let roomTitle = boot.title || `Sala ${roomCode}`;
  const myUid = boot.uid;
  const myName = boot.name;
  const myColor = boot.color;

  let currentMode = 'screen';
  let syncTimer = 0;
  let syncInFlight = false;
  let lastSigId = 0;
  let lastMsgId = 0;
  let peers = [];
  let chatMsgs = [];

  // Mídia local & WebRTC
  let localMicStream = null;
  let micEnabled = false;
  let deafened = false;
  let localScreenStream = null;
  let sharingScreen = false;
  let remotePresenterUid = '';
  let voiceVolume = 1.0;

  // Map<peerUid, { pc, polite, makingOffer, ignoreOffer, voiceEl, analyser, speaking }>
  const peerConns = new Map();
  let audioCtx = null;
  let localSpeaking = false;
  let localAnalyser = null;

  // YouTube Sync
  let ytApiReady = false;
  let ytPlayer = null;
  let currentYtId = '';
  let suppressYtUntil = 0;

  // Helpers
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtTime(ts) {
    try { return new Date(ts || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return ''; }
  }
  let toastTimer = 0;
  function showToast(txt, ms = 2800) {
    const el = document.getElementById('wp-toast');
    if (!el) return;
    el.textContent = txt;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
  function copyText(txt, okMsg) {
    if (invoke) {
      invoke('set_clipboard_text', { text: txt }).then(() => showToast(okMsg)).catch(() => {
        navigator.clipboard?.writeText(txt).then(() => showToast(okMsg)).catch(() => {});
      });
    } else {
      navigator.clipboard?.writeText(txt).then(() => showToast(okMsg)).catch(() => {});
    }
  }

  // === FIGURINHAS SVG DO LUMO ===
  function pillBase(color, inner) {
    const c = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#f6b974';
    return `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="20" width="64" height="40" rx="20" fill="#10131e" stroke="${c}" stroke-width="3.2"/>${inner.replace(/__C__/g, c)}</svg>`;
  }
  const STICKERS = [
    { id: 'popcorn', label: 'Pipoca', svg: (c) => `<svg viewBox="0 0 80 80" fill="none"><circle cx="30" cy="25" r="9" fill="#fef08a"/><circle cx="42" cy="21" r="10" fill="#fde047"/><circle cx="52" cy="26" r="8" fill="#fef08a"/><path d="M22 30h36l-5 38H27l-5-38Z" fill="#ef4444" stroke="${c||'#f6b974'}" stroke-width="2.5"/><path d="M33 30l2 38M47 30l-2 38" stroke="#fff" stroke-width="4" opacity="0.85"/></svg>` },
    { id: 'love', label: 'Amei', svg: (c) => pillBase(c, '<path d="M29 37c0-2.8-2.2-5-5-5s-5 2.2-5 5c0 4.8 5 7.8 5 7.8s5-3 5-7.8Z" fill="#fb7185"/><path d="M61 37c0-2.8-2.2-5-5-5s-5 2.2-5 5c0 4.8 5 7.8 5 7.8s5-3 5-7.8Z" fill="#fb7185"/><path d="M35 46c2.5 3 7.5 3 10 0" stroke="__C__" stroke-width="2.6" stroke-linecap="round"/>') },
    { id: 'laugh', label: 'Kkkk', svg: (c) => pillBase(c, '<path d="M23 36l6 4-6 4M57 36l-6 4 6 4" stroke="__C__" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 45c2.2 4.5 9.8 4.5 12 0Z" fill="__C__"/>') },
    { id: 'shock', label: 'Choquei', svg: (c) => pillBase(c, '<circle cx="28" cy="39" r="6.5" fill="__C__"/><circle cx="28" cy="39" r="2.4" fill="#10131e"/><circle cx="52" cy="39" r="6.5" fill="__C__"/><circle cx="52" cy="39" r="2.4" fill="#10131e"/><ellipse cx="40" cy="49" rx="3.5" ry="4.5" fill="__C__"/>') },
    { id: 'fire', label: 'Hype', svg: (c) => `<svg viewBox="0 0 80 80" fill="none"><path d="M41 10c2 12-10 18-10 30 0 9 7 16 14 16 8 0 15-7 15-17 0-9-5-16-10-21 0 6-3 9-6 10 2-6 1-13-3-18Z" fill="#f97316"/><path d="M40 31c1 6-6 9-6 16 0 5 4 9 9 9 5 0 9-4 9-10 0-5-3-9-6-12 0 4-2 6-4 6 1-3 0-6-2-9Z" fill="#fde047"/></svg>` },
    { id: 'gg', label: 'GG!', svg: (c) => `<svg viewBox="0 0 80 80" fill="none"><rect x="6" y="14" width="68" height="52" rx="18" fill="#10131e" stroke="${c||'#f6b974'}" stroke-width="3.2"/><text x="40" y="48" text-anchor="middle" fill="${c||'#f6b974'}" font-family="system-ui,sans-serif" font-weight="900" font-size="27">GG!</text></svg>` },
    { id: 'sleep', label: 'Sono', svg: (c) => pillBase(c, '<path d="M22 41c2.5 3 7.5 3 10 0M48 41c2.5 3 7.5 3 10 0" stroke="__C__" stroke-width="3" stroke-linecap="round"/><text x="54" y="17" fill="__C__" font-family="system-ui" font-weight="800" font-size="13">Zz</text>') },
    { id: 'coffee', label: 'Café', svg: (c) => `<svg viewBox="0 0 80 80" fill="none"><path d="M20 28h34v22a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14V28Z" fill="#10131e" stroke="${c||'#f6b974'}" stroke-width="3"/><path d="M54 33h6a6 6 0 0 1 0 12h-6" stroke="${c||'#f6b974'}" stroke-width="3" stroke-linecap="round"/></svg>` },
    { id: 'angry', label: 'Brabo', svg: (c) => pillBase(c, '<path d="M22 33l10 4M58 33l-10 4" stroke="#f87171" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="42" r="4" fill="#f87171"/><circle cx="52" cy="42" r="4" fill="#f87171"/>') },
    { id: 'crown', label: 'Lenda', svg: (c) => pillBase(c, '<path d="M26 20l4-10 10 6 10-6 4 10H26Z" fill="#fbbf24"/><circle cx="29" cy="40" r="4.5" fill="__C__"/><circle cx="51" cy="40" r="4.5" fill="__C__"/>') },
    { id: 'star', label: 'Brilhou', svg: (c) => `<svg viewBox="0 0 80 80" fill="none"><path d="M40 10l7.5 18.5L67 31l-15 13 4.5 19.5L40 53 23.5 63.5 28 44 13 31l19.5-2.5L40 10Z" fill="${c||'#f6b974'}" stroke="#fff" stroke-width="2"/></svg>` },
    { id: 'wave', label: 'Salve!', svg: (c) => pillBase(c, '<circle cx="29" cy="39" r="4.5" fill="__C__"/><circle cx="51" cy="39" r="4.5" fill="__C__"/><path d="M35 47c2 2.6 8 2.6 10 0" stroke="__C__" stroke-width="2.6" stroke-linecap="round"/>') }
  ];
  const renderSticker = (id, col) => (STICKERS.find((s) => s.id === id) || STICKERS[0]).svg(col);

  // === AUDIO ANALYSER (DETECTA QUEM ESTÁ FALANDO) ===
  function createAnalyser(stream) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const src = audioCtx.createMediaStreamSource(stream);
      const an = audioCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      return an;
    } catch (_) {
      return null;
    }
  }
  function isAnalyserActive(an) {
    if (!an) return false;
    const arr = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(arr);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return (sum / arr.length) > 14;
  }
  setInterval(() => {
    let changed = false;
    const myNow = micEnabled && isAnalyserActive(localAnalyser);
    if (myNow !== localSpeaking) { localSpeaking = myNow; changed = true; }
    for (const st of peerConns.values()) {
      const sp = !deafened && isAnalyserActive(st.analyser);
      if (sp !== st.speaking) { st.speaking = sp; changed = true; }
    }
    if (changed) renderPeers();
  }, 220);

  // === SINALIZAÇÃO & WEBRTC P2P (PERFECT NEGOTIATION) ===
  async function sendSignal(toUid, kind, payload) {
    try {
      await fetch(`${API}/party/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, from_uid: myUid, to_uid: toUid, kind, payload: JSON.stringify(payload) })
      });
    } catch (_) {}
  }

  function ensurePeerConn(peerUid) {
    if (peerUid === myUid) return null;
    if (peerConns.has(peerUid)) return peerConns.get(peerUid);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const st = {
      pc,
      polite: myUid < peerUid,
      makingOffer: false,
      ignoreOffer: false,
      voiceEl: null,
      analyser: null,
      speaking: false
    };
    peerConns.set(peerUid, st);

    // Anexa mic e tela locais se já estiverem ativos
    if (localMicStream) {
      for (const t of localMicStream.getTracks()) pc.addTrack(t, localMicStream);
    }
    if (localScreenStream) {
      for (const t of localScreenStream.getTracks()) pc.addTrack(t, localScreenStream);
    }

    // Lado "polite" cria um canal de controle para iniciar o handshake WebRTC imediatamente
    if (st.polite) {
      try { pc.createDataChannel('lumo-ctrl'); } catch (_) {}
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(peerUid, 'ice', candidate);
    };

    pc.onnegotiationneeded = async () => {
      try {
        st.makingOffer = true;
        await pc.setLocalDescription();
        await sendSignal(peerUid, 'offer', pc.localDescription);
      } catch (_) {
      } finally {
        st.makingOffer = false;
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams && ev.streams[0];
      if (!stream) return;
      const isVideoStream = ev.track.kind === 'video' || stream.getVideoTracks().length > 0;
      if (isVideoStream) {
        attachRemoteScreen(peerUid, stream);
        ev.track.onended = () => { if (remotePresenterUid === peerUid) clearScreenVideo(); };
      } else if (ev.track.kind === 'audio') {
        attachRemoteVoice(peerUid, st, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        try { pc.restartIce(); } catch (_) {}
      }
    };

    return st;
  }

  async function handleIncomingSignal(sig) {
    const st = ensurePeerConn(sig.from_uid);
    if (!st) return;
    const { pc } = st;
    let payload = null;
    try { payload = JSON.parse(sig.payload); } catch (_) { return; }

    try {
      if (sig.kind === 'offer' || sig.kind === 'answer') {
        const desc = new RTCSessionDescription(payload);
        const collision = desc.type === 'offer' && (st.makingOffer || pc.signalingState !== 'stable');
        st.ignoreOffer = !st.polite && collision;
        if (st.ignoreOffer) return;
        if (collision) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(desc)
          ]);
        } else {
          await pc.setRemoteDescription(desc);
        }
        if (desc.type === 'offer') {
          await pc.setLocalDescription();
          await sendSignal(sig.from_uid, 'answer', pc.localDescription);
        }
      } else if (sig.kind === 'ice') {
        try { await pc.addIceCandidate(payload); } catch (_) {}
      }
    } catch (_) {}
  }

  function closePeer(peerUid) {
    const st = peerConns.get(peerUid);
    if (!st) return;
    try { st.pc.close(); } catch (_) {}
    if (st.voiceEl) st.voiceEl.remove();
    peerConns.delete(peerUid);
    if (remotePresenterUid === peerUid) clearScreenVideo();
  }

  function attachRemoteVoice(peerUid, st, stream) {
    let el = st.voiceEl;
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      el.playsInline = true;
      document.getElementById('wp-remote-audios').appendChild(el);
      st.voiceEl = el;
    }
    el.srcObject = stream;
    el.muted = deafened;
    el.volume = voiceVolume;
    el.play().catch(() => {});
    st.analyser = createAnalyser(stream);
  }

  function attachRemoteScreen(peerUid, stream) {
    remotePresenterUid = peerUid;
    const vid = document.getElementById('wp-screen-video');
    const empty = document.getElementById('wp-empty-stage');
    const pill = document.getElementById('wp-presenter-pill');
    const peerInfo = peers.find((p) => p.uid === peerUid);

    vid.srcObject = stream;
    vid.muted = false;
    vid.volume = Number(document.getElementById('wp-video-vol')?.value || 90) / 100;
    vid.classList.add('active');
    vid.play().catch(() => {});
    empty.classList.add('hidden');
    pill.textContent = `Transmitindo: ${peerInfo?.name || 'Amigo'}`;
    pill.style.display = 'block';
    document.getElementById('wp-share-status').textContent = `Assistindo tela de ${peerInfo?.name || 'Amigo'}`;
  }

  function clearScreenVideo() {
    if (sharingScreen) return;
    remotePresenterUid = '';
    const vid = document.getElementById('wp-screen-video');
    const empty = document.getElementById('wp-empty-stage');
    const pill = document.getElementById('wp-presenter-pill');
    vid.srcObject = null;
    vid.classList.remove('active');
    empty.classList.remove('hidden');
    pill.style.display = 'none';
    document.getElementById('wp-share-status').textContent = 'Pronto para transmitir em P2P';
  }

  // === CONTROLES DE MICROFONE & ESPELHAMENTO DE TELA ===
  async function toggleMic() {
    const btn = document.getElementById('wp-mic-btn');
    if (!localMicStream) {
      try {
        localMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
        micEnabled = true;
        localAnalyser = createAnalyser(localMicStream);
        for (const st of peerConns.values()) {
          for (const t of localMicStream.getTracks()) st.pc.addTrack(t, localMicStream);
        }
        showToast('Microfone ligado na sala!');
      } catch (err) {
        showToast('Não consegui acessar o microfone: ' + String(err?.message || err), 3600);
        return;
      }
    } else {
      micEnabled = !micEnabled;
      for (const t of localMicStream.getAudioTracks()) t.enabled = micEnabled;
    }

    btn.textContent = micEnabled ? 'Mic ON' : 'Mic Mudo';
    btn.classList.toggle('on', micEnabled);
    btn.classList.toggle('muted', !micEnabled);
    renderPeers();
  }

  function toggleDeafen() {
    deafened = !deafened;
    const btn = document.getElementById('wp-deafen-btn');
    btn.textContent = deafened ? 'Surdo' : 'Ouvir ON';
    btn.classList.toggle('muted', deafened);
    for (const st of peerConns.values()) {
      if (st.voiceEl) st.voiceEl.muted = deafened;
    }
  }

  async function startScreenShare() {
    if (sharingScreen) {
      stopScreenShare();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true
      });
      localScreenStream = stream;
      sharingScreen = true;
      setModeUI('screen', true);

      const vid = document.getElementById('wp-screen-video');
      const empty = document.getElementById('wp-empty-stage');
      const pill = document.getElementById('wp-presenter-pill');
      vid.srcObject = stream;
      vid.muted = true; // Preview local sempre mudo para não dar eco
      vid.classList.add('active');
      vid.play().catch(() => {});
      empty.classList.add('hidden');
      pill.textContent = 'Você está transmitindo sua tela';
      pill.style.display = 'block';

      const btn = document.getElementById('wp-share-toggle-btn');
      btn.textContent = 'Parar transmissão';
      btn.classList.remove('primary');
      btn.classList.add('danger');
      document.getElementById('wp-share-status').textContent = stream.getAudioTracks().length
        ? 'Transmitindo vídeo + áudio da aba/tela'
        : 'Transmitindo vídeo (marque "Compartilhar áudio" na janela do sistema para enviar som)';

      for (const st of peerConns.values()) {
        for (const t of stream.getTracks()) st.pc.addTrack(t, stream);
      }

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) vTrack.onended = () => stopScreenShare();

      showToast('Espelhamento iniciado para a sala!');
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        showToast('Erro ao espelhar tela: ' + String(err?.message || err), 3400);
      }
    }
  }

  function stopScreenShare() {
    if (!sharingScreen && !localScreenStream) return;
    sharingScreen = false;
    if (localScreenStream) {
      const trackIds = new Set(localScreenStream.getTracks().map((t) => t.id));
      for (const st of peerConns.values()) {
        for (const sender of st.pc.getSenders()) {
          if (sender.track && trackIds.has(sender.track.id)) {
            try { st.pc.removeTrack(sender); } catch (_) {}
          }
        }
      }
      for (const t of localScreenStream.getTracks()) t.stop();
      localScreenStream = null;
    }
    const btn = document.getElementById('wp-share-toggle-btn');
    btn.textContent = 'Espelhar Tela';
    btn.classList.remove('danger');
    btn.classList.add('primary');
    clearScreenVideo();
    showToast('Transmissão encerrada.');
  }

  // === MODO YOUTUBE SINCRONIZADO ===
  function extractYtId(raw) {
    const s = String(raw || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  function loadYtApi() {
    if (window.YT?.Player) { ytApiReady = true; return; }
    if (document.getElementById('wp-yt-api-script')) return;
    const sc = document.createElement('script');
    sc.id = 'wp-yt-api-script';
    sc.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(sc);
  }
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    if (currentYtId) ensureYtPlayer(currentYtId, false, 0);
  };

  function ensureYtPlayer(videoId, playing, startSec) {
    currentYtId = videoId;
    document.getElementById('wp-yt-empty').classList.add('hidden');
    loadYtApi();
    if (!ytApiReady || !window.YT?.Player) return;

    suppressYtUntil = Date.now() + 1800;
    if (!ytPlayer) {
      ytPlayer = new YT.Player('wp-yt-player', {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: { autoplay: playing ? 1 : 0, rel: 0, modestbranding: 1, start: Math.floor(startSec || 0) },
        events: {
          onStateChange: (ev) => {
            if (Date.now() < suppressYtUntil) return;
            if (ev.data === YT.PlayerState.PLAYING || ev.data === YT.PlayerState.PAUSED) {
              const t = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
              broadcastRoomState('youtube', currentYtId, ev.data === YT.PlayerState.PLAYING, t);
            }
          }
        }
      });
    } else {
      const curUrl = ytPlayer.getVideoData?.()?.video_id || '';
      if (curUrl !== videoId) {
        ytPlayer.loadVideoById({ videoId, startSeconds: startSec || 0 });
        if (!playing) setTimeout(() => ytPlayer.pauseVideo?.(), 600);
      } else {
        const curT = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
        if (Math.abs(curT - startSec) > 2.4) ytPlayer.seekTo(startSec, true);
        const st = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
        if (playing && st !== YT.PlayerState.PLAYING) ytPlayer.playVideo();
        if (!playing && st === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
      }
    }
  }

  async function broadcastRoomState(mode, ytId, ytPlaying, ytTime) {
    try {
      await fetch(`${API}/party/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, mode, yt_id: ytId || '', yt_playing: Boolean(ytPlaying), yt_time: Number(ytTime) || 0 })
      });
    } catch (_) {}
  }

  function setModeUI(mode, notifyServer = false) {
    currentMode = mode === 'youtube' ? 'youtube' : 'screen';
    document.querySelectorAll('[data-wp-mode]').forEach((b) => b.classList.toggle('active', b.dataset.wpMode === currentMode));
    document.getElementById('wp-pane-screen').classList.toggle('hidden', currentMode !== 'screen');
    document.getElementById('wp-pane-youtube').classList.toggle('hidden', currentMode !== 'youtube');
    if (notifyServer) broadcastRoomState(currentMode, currentYtId, false, 0);
  }

  // === CHAT, FIGURINHAS & IMAGENS DA SALA ===
  async function sendChat(kind, body) {
    if (!body || !roomCode) return;
    try {
      const res = await fetch(`${API}/party/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, uid: myUid, name: myName, color: myColor, kind, body })
      });
      if (res.ok) pollSync();
    } catch (_) {
      showToast('Falha ao enviar mensagem.');
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('Falha ao ler imagem.'));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          const maxSide = 760;
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > maxSide || h > maxSide) {
            if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
            else { w = Math.round((w * maxSide) / h); h = maxSide; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          let out = c.toDataURL('image/webp', 0.76);
          if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.76);
          resolve(out);
        };
        img.src = String(r.result || '');
      };
      r.readAsDataURL(file);
    });
  }

  async function uploadAndSendImage(file) {
    if (!file || !String(file.type || '').startsWith('image/')) return;
    showToast('Enviando imagem...');
    try {
      const dataUrl = await compressImage(file);
      const res = await fetch(`${API}/chat/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.url) throw new Error(data.error || 'Falha no upload');
      await sendChat('image', '::img:' + data.url);
    } catch (err) {
      showToast(String(err?.message || err), 3200);
    }
  }

  function renderPeers() {
    const row = document.getElementById('wp-peers-row');
    const cnt = document.getElementById('wp-peer-count');
    const list = peers.length ? peers : [{ uid: myUid, name: myName, color: myColor, mic_on: micEnabled ? 1 : 0, sharing: sharingScreen ? 1 : 0 }];
    cnt.textContent = String(list.length);
    row.innerHTML = list.map((p) => {
      const isMe = p.uid === myUid;
      const st = peerConns.get(p.uid);
      const speaking = isMe ? localSpeaking : Boolean(st?.speaking);
      const micOn = isMe ? micEnabled : Boolean(p.mic_on);
      const isSharing = isMe ? sharingScreen : Boolean(p.sharing);
      const init = (p.name || '?').trim().charAt(0).toUpperCase();
      return `
        <div class="wp-peer-chip ${speaking ? 'speaking' : ''}">
          <span class="wp-peer-av" style="background:${esc(p.color || '#f6b974')}">${esc(init)}</span>
          <span>${esc(p.name)}${isMe ? ' (você)' : ''}</span>
          ${isSharing ? '<span class="wp-peer-tag">TELA</span>' : ''}
          ${micOn ? '<span class="wp-peer-tag" style="color:#4ade80;background:rgba(34,197,94,.16);">MIC</span>' : ''}
        </div>
      `;
    }).join('');
  }

  function renderChat() {
    const feed = document.getElementById('wp-chat-feed');
    const nearBottom = (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 80;
    if (!chatMsgs.length) {
      feed.innerHTML = '<div class="wp-sys-msg">Chat da sala pronto! Mande um oi ou uma figurinha de pipoca.</div>';
      return;
    }
    feed.innerHTML = chatMsgs.map((m) => {
      if (m.kind === 'system') return `<div class="wp-sys-msg">${esc(m.body)}</div>`;
      const isMe = m.sender_uid === myUid;
      const bodyStr = String(m.body || '');
      let content = '';
      if (m.kind === 'sticker' || bodyStr.startsWith('::stk:')) {
        const sid = bodyStr.replace(/^::stk:/, '').trim();
        content = `<div class="wp-stk-msg">${renderSticker(sid, m.sender_color)}</div>`;
      } else if (m.kind === 'image' || bodyStr.startsWith('::img:')) {
        const url = bodyStr.replace(/^::img:/, '').trim();
        content = `<div class="wp-img-msg" data-wp-zoom="${esc(url)}"><img src="${esc(url)}" alt="Imagem" loading="lazy" /></div>`;
      } else {
        content = `<div class="wp-msg-bubble">${esc(bodyStr)}</div>`;
      }
      return `
        <div class="wp-msg ${isMe ? 'me' : 'them'}">
          <div class="wp-msg-meta">
            <span style="color:${esc(m.sender_color || '#f6b974')}">${esc(m.sender_name)}</span>
            <small>${fmtTime(m.created_at)}</small>
          </div>
          ${content}
        </div>
      `;
    }).join('');
    if (nearBottom) feed.scrollTop = feed.scrollHeight;
  }

  // === LOOP DE SINCRONIZAÇÃO (/party/sync) ===
  async function pollSync() {
    if (!roomCode || syncInFlight) return;
    syncInFlight = true;
    try {
      const qs = new URLSearchParams({
        code: roomCode,
        uid: myUid,
        name: myName,
        color: myColor,
        mic: micEnabled ? '1' : '0',
        sharing: sharingScreen ? '1' : '0',
        since_sig: String(lastSigId),
        since_msg: String(lastMsgId)
      });
      const res = await fetch(`${API}/party/sync?${qs.toString()}`, { signal: AbortSignal.timeout(7000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        document.getElementById('wp-conn-status').textContent = data.error || 'Reconectando...';
        syncInFlight = false;
        return;
      }

      document.getElementById('wp-conn-status').textContent = `Conectado · P2P ativo`;
      if (data.room?.title) {
        roomTitle = data.room.title;
        document.getElementById('wp-room-title').textContent = roomTitle;
      }

      // Sincroniza lista de participantes e conexões WebRTC
      peers = Array.isArray(data.peers) ? data.peers : [];
      const activeUids = new Set(peers.map((p) => p.uid));
      for (const p of peers) {
        if (p.uid !== myUid) ensurePeerConn(p.uid);
      }
      for (const existingUid of Array.from(peerConns.keys())) {
        if (!activeUids.has(existingUid)) closePeer(existingUid);
      }
      if (remotePresenterUid) {
        const pres = peers.find((p) => p.uid === remotePresenterUid);
        if (!pres || !pres.sharing) clearScreenVideo();
      }
      renderPeers();

      // Processa sinais WebRTC
      const sigs = Array.isArray(data.signals) ? data.signals : [];
      for (const s of sigs) {
        if (s.id > lastSigId) lastSigId = s.id;
        await handleIncomingSignal(s);
      }

      // Processa mensagens novas do chat
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      if (msgs.length) {
        for (const m of msgs) {
          if (m.id > lastMsgId) lastMsgId = m.id;
          if (!chatMsgs.some((x) => x.id === m.id)) chatMsgs.push(m);
        }
        if (chatMsgs.length > 90) chatMsgs = chatMsgs.slice(-90);
        renderChat();
      }

      // Sincroniza modo YouTube caso alguém tenha carregado um vídeo
      if (data.room && data.room.mode === 'youtube' && data.room.yt_id) {
        if (currentMode !== 'youtube') setModeUI('youtube', false);
        const elapsed = data.room.yt_playing ? Math.max(0, ((data.now || Date.now()) - (data.room.yt_updated_at || Date.now())) / 1000) : 0;
        const targetTime = (Number(data.room.yt_time) || 0) + elapsed;
        ensureYtPlayer(data.room.yt_id, Boolean(data.room.yt_playing), targetTime);
      }
    } catch (_) {
      document.getElementById('wp-conn-status').textContent = 'Sem sinal · tentando reconectar...';
    }
    syncInFlight = false;
  }

  function leaveRoom(closeWin = true) {
    clearInterval(syncTimer);
    stopScreenShare();
    if (localMicStream) {
      for (const t of localMicStream.getTracks()) t.stop();
      localMicStream = null;
    }
    for (const uid of Array.from(peerConns.keys())) closePeer(uid);
    if (roomCode) {
      fetch(`${API}/party/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, uid: myUid, name: myName, color: myColor }),
        keepalive: true
      }).catch(() => {});
    }
    if (closeWin) window.close();
  }

  // === EVENTOS DA UI ===
  document.getElementById('wp-room-code').textContent = roomCode || '------';
  document.getElementById('wp-room-title').textContent = roomTitle;

  document.getElementById('wp-copy-code-btn').addEventListener('click', () => {
    copyText(roomCode, `Código ${roomCode} copiado!`);
  });
  document.getElementById('wp-invite-btn').addEventListener('click', () => {
    copyText(`Bora assistir juntos no Lumo Video! Abra Lumo Video -> Entrar com código: ${roomCode}`, 'Convite copiado! Cole no Lumo Ping ou Discord.');
  });
  document.getElementById('wp-fullscreen-btn').addEventListener('click', () => {
    const el = document.getElementById('wp-stage');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  });
  document.getElementById('wp-leave-btn').addEventListener('click', () => leaveRoom(true));

  document.querySelectorAll('[data-wp-mode]').forEach((b) => {
    b.addEventListener('click', () => setModeUI(b.dataset.wpMode, true));
  });

  document.getElementById('wp-start-share-big').addEventListener('click', startScreenShare);
  document.getElementById('wp-share-toggle-btn').addEventListener('click', startScreenShare);
  document.getElementById('wp-mic-btn').addEventListener('click', toggleMic);
  document.getElementById('wp-deafen-btn').addEventListener('click', toggleDeafen);

  document.getElementById('wp-video-vol').addEventListener('input', (e) => {
    const vid = document.getElementById('wp-screen-video');
    if (vid && !sharingScreen) vid.volume = Number(e.target.value) / 100;
  });
  document.getElementById('wp-video-mute-btn').addEventListener('click', (e) => {
    const vid = document.getElementById('wp-screen-video');
    if (!vid || sharingScreen) return;
    vid.muted = !vid.muted;
    e.target.textContent = vid.muted ? 'Som OFF' : 'Som ON';
  });
  document.getElementById('wp-voice-vol').addEventListener('input', (e) => {
    voiceVolume = Number(e.target.value) / 100;
    for (const st of peerConns.values()) {
      if (st.voiceEl) st.voiceEl.volume = voiceVolume;
    }
  });

  document.getElementById('wp-yt-load-btn').addEventListener('click', () => {
    const raw = document.getElementById('wp-yt-input').value;
    const id = extractYtId(raw);
    if (!id) { showToast('Link do YouTube inválido.'); return; }
    setModeUI('youtube', false);
    ensureYtPlayer(id, true, 0);
    broadcastRoomState('youtube', id, true, 0);
    showToast('Vídeo carregado para a sala!');
  });

  // Picker de figurinhas
  const stkPicker = document.getElementById('wp-stk-picker');
  stkPicker.innerHTML = STICKERS.map((s) => `
    <button type="button" class="wp-stk-opt" data-stk="${s.id}">${s.svg(myColor)}<span>${s.label}</span></button>
  `).join('');
  document.getElementById('wp-stk-btn').addEventListener('click', (e) => {
    const open = !stkPicker.classList.contains('open');
    stkPicker.classList.toggle('open', open);
    e.currentTarget.classList.toggle('active', open);
  });
  stkPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-stk]');
    if (!btn) return;
    stkPicker.classList.remove('open');
    document.getElementById('wp-stk-btn').classList.remove('active');
    sendChat('sticker', '::stk:' + btn.dataset.stk);
  });

  // Upload & Paste de imagem
  const imgInput = document.getElementById('wp-img-file');
  document.getElementById('wp-img-btn').addEventListener('click', () => imgInput.click());
  imgInput.addEventListener('change', () => {
    const f = imgInput.files?.[0];
    imgInput.value = '';
    if (f) uploadAndSendImage(f);
  });
  document.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type && it.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const f = imgItem.getAsFile();
      if (f) uploadAndSendImage(f);
    }
  });

  // Envio de texto
  document.getElementById('wp-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('wp-chat-input');
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    sendChat('text', txt);
  });

  // Lightbox de imagens no chat
  const lb = document.getElementById('wp-lightbox');
  document.getElementById('wp-chat-feed').addEventListener('click', (e) => {
    const imgBox = e.target.closest('[data-wp-zoom]');
    if (!imgBox) return;
    document.getElementById('wp-lightbox-img').src = imgBox.dataset.wpZoom;
    lb.classList.add('open');
  });
  document.getElementById('wp-lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.classList.remove('open'); });

  // Troca de sala se o usuário abrir outra sala pela cápsula
  if (listen) {
    listen('wp-switch-room', () => {
      try {
        const next = JSON.parse(localStorage.getItem('lumo_wp_boot') || 'null');
        if (next && next.code && next.code !== roomCode) {
          leaveRoom(false);
          roomCode = next.code;
          roomTitle = next.title || `Sala ${roomCode}`;
          lastSigId = 0; lastMsgId = 0; chatMsgs = []; peers = [];
          document.getElementById('wp-room-code').textContent = roomCode;
          document.getElementById('wp-room-title').textContent = roomTitle;
          renderChat(); renderPeers();
          pollSync();
          syncTimer = setInterval(pollSync, 1800);
        }
      } catch (_) {}
    });
  }

  window.addEventListener('beforeunload', () => leaveRoom(false));

  // Inicia a sala!
  renderPeers();
  renderChat();
  if (roomCode) {
    pollSync();
    syncTimer = setInterval(pollSync, 1800);
  }
})();
