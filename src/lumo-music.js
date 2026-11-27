// === LUMO v3.3.0 — LUMO MUSIC (SPOTIFY PREMIUM SDK + YOUTUBE PREMIUM + AUDIUS + PLAY INSTANTÂNEO) ===
(function initLumoMusic() {
  const viewMidia = document.getElementById('view-midia');
  if (!viewMidia || document.getElementById('lm-subtabs')) return;

  const AUDIUS_API = 'https://api.audius.co/v1';
  const PAGES_BASE = 'https://vitorsilva010.github.io/Lumo';
  const YT_BRIDGE_URL = PAGES_BASE + '/yt-player.html';
  const SP_BRIDGE_URL = PAGES_BASE + '/spotify-player.html';
  const SP_REDIRECT_URI = PAGES_BASE + '/spotify-cb.html';
  const DEFAULT_SP_CLIENT_ID = 'f8799bf94c3a4d4b970a0fdd03b0a593';
  const WORKER_BASE = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev');

  const S = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const IC = {
    music:   S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    ambient: S('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M8 19v2"/><path d="M12 19v2"/><path d="M16 19v2"/>'),
    radio:   S('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>'),
    play:    S('<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>'),
    pause:   S('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>'),
    prev:    S('<polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/><line x1="5" y1="5" x2="5" y2="19"/>'),
    next:    S('<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19"/>'),
    shuffle: S('<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>'),
    repeat:  S('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
    heart:   S('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
    lyrics:  S('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>'),
    stop:    S('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
    vol:     S('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'),
    muted:   S('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'),
    wave:    S('<path d="M3 12h2"/><path d="M7 8v8"/><path d="M11 5v14"/><path d="M15 9v6"/><path d="M19 7v10"/><path d="M22 12h-1"/>'),
    jam:     S('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'),
    gear:    S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>')
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtSec(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // === ESTADO & PERSISTÊNCIA ===
  const audio = new Audio();
  audio.preload = 'none';

  let volume = parseInt(localStorage.getItem('lumo_music_vol') || '70', 10);
  if (Number.isNaN(volume) || volume < 0 || volume > 100) volume = 70;
  let lastNonZeroVol = volume > 0 ? volume : 70;
  audio.volume = volume / 100;

  // Credenciais Spotify PKCE (somente Client ID + tokens do usuário local)
  let spClientId = localStorage.getItem('lumo_sp_client_id') || DEFAULT_SP_CLIENT_ID;
  let spTokens = null; // { access_token, refresh_token, expires_at, user_name, product }
  try { spTokens = JSON.parse(localStorage.getItem('lumo_sp_tokens') || 'null'); } catch (_) {}
  let ytSignedIn = localStorage.getItem('lumo_yt_signed_in') === 'true';

  let mainTab = 'music';     // 'music' | 'ambient' | 'legacy'
  let libTab = 'explore';    // 'explore' | 'queue' | 'likes' | 'playlists'
  let searchSrc = spTokens?.access_token ? 'spotify' : 'youtube'; // 'spotify' | 'youtube' | 'audius'
  let activeChip = 'trending';
  let spChip = 'likes';
  let searchQuery = '';
  let loadingList = false;
  let listMsg = spTokens?.access_token ? 'Carregando sua biblioteca do Spotify...' : 'Busque qualquer música ou conecte Spotify / YouTube Premium!';
  let results = [];
  let spPlaylists = [];
  let showSpManualBox = false;
  let showSpSettings = false;

  let queue = [];
  let queueIdx = -1;
  let currentTrack = null;
  let isPlaying = false;
  let isShuffle = false;
  let repeatMode = 'off';
  let curTime = 0;
  let duration = 0;
  let seeking = false;
  let playReqSeq = 0;

  let likes = [];
  let playlists = [];
  let recentTracks = [];
  let pendingJamSeek = null;
  let jamSuppressEmit = false;
  try { recentTracks = JSON.parse(localStorage.getItem('lumo_music_recent') || '[]'); } catch (_) {}
  if (!Array.isArray(recentTracks)) recentTracks = [];
  function recordRecent(track) {
    if (!track || !track.id) return;
    recentTracks = [track, ...recentTracks.filter((x) => x.id !== track.id)].slice(0, 12);
    try { localStorage.setItem('lumo_music_recent', JSON.stringify(recentTracks)); } catch (_) {}
  }
  function emitJamAction(action) {
    if (jamSuppressEmit) return;
    window.dispatchEvent(new CustomEvent('lumo-music-action', { detail: { action } }));
  }
  function checkPendingJamSeek() {
    if (!pendingJamSeek || !currentTrack) return;
    const p = pendingJamSeek;
    pendingJamSeek = null;
    if (!p.playing) {
      if (isPlaying) { jamSuppressEmit = true; togglePlayPause(); jamSuppressEmit = false; }
      return;
    }
    const target = Math.max(0, p.pos + (Date.now() - p.setAt) / 1000);
    if (Math.abs(curTime - target) > 2.2) {
      jamSuppressEmit = true;
      seekTo(target);
      jamSuppressEmit = false;
    }
  }
  let openedPlaylistId = null;
  try { likes = JSON.parse(localStorage.getItem('lumo_music_likes') || '[]'); } catch (_) {}
  try { playlists = JSON.parse(localStorage.getItem('lumo_music_playlists') || '[]'); } catch (_) {}
  if (!Array.isArray(likes)) likes = [];
  if (!Array.isArray(playlists)) playlists = [];

  // Letras (Cache persistente de até 60 músicas + Auto-Lyrics + Pré-carregamento)
  let autoLyrics = localStorage.getItem('lumo_music_autolyrics') !== 'false';
  let lyricsOpen = false;
  let lyricsLines = [];
  let lyricsSynced = false;
  let lyricsStatus = '';
  let activeLyricIdx = -1;
  let lyricsUserScrollUntil = 0;
  let prefetchedNextKey = '';
  let lyricsStore = {};
  try { lyricsStore = JSON.parse(localStorage.getItem('lumo_lyrics_cache_v1') || '{}') || {}; } catch (_) {}

  function saveLikes() { localStorage.setItem('lumo_music_likes', JSON.stringify(likes.slice(0, 200))); }
  function savePlaylists() { localStorage.setItem('lumo_music_playlists', JSON.stringify(playlists.slice(0, 30))); }
  function saveSpTokens() {
    if (spTokens) localStorage.setItem('lumo_sp_tokens', JSON.stringify(spTokens));
    else localStorage.removeItem('lumo_sp_tokens');
  }
  function saveLyricsStore() {
    try {
      const entries = Object.entries(lyricsStore);
      if (entries.length > 60) {
        entries.sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
        lyricsStore = Object.fromEntries(entries.slice(0, 60));
      }
      localStorage.setItem('lumo_lyrics_cache_v1', JSON.stringify(lyricsStore));
    } catch (_) {}
  }

  // === PONTE YOUTUBE OFICIAL (PRÉ-AQUECIDA & DESTRUÍVEL PARA 0 MB RAM) ===
  let ytHost = null;
  let ytFrame = null;
  let ytReady = false;
  let ytPendingId = null;

  function ensureYtBridge() {
    if (!ytHost) {
      ytHost = document.createElement('div');
      ytHost.id = 'lm-yt-host';
      document.body.appendChild(ytHost);
    }
    if (!ytFrame) {
      ytReady = false;
      ytFrame = document.createElement('iframe');
      ytFrame.src = YT_BRIDGE_URL;
      ytFrame.allow = 'autoplay; encrypted-media';
      ytFrame.setAttribute('title', 'Lumo YouTube Audio');
      ytHost.appendChild(ytFrame);
    }
  }
  function destroyYtPlayer() {
    ytReady = false;
    ytPendingId = null;
    if (ytFrame) {
      try { ytFrame.contentWindow?.postMessage({ type: 'stop' }, '*'); } catch (_) {}
      ytFrame.remove();
      ytFrame = null;
    }
  }
  function sendYt(msg) {
    if (ytFrame && ytFrame.contentWindow) ytFrame.contentWindow.postMessage(msg, '*');
  }
  function loadYtVideo(videoId) {
    ensureYtBridge();
    if (ytReady) sendYt({ type: 'load', videoId, volume });
    else ytPendingId = videoId;
  }

  // === PONTE SPOTIFY WEB PLAYBACK SDK (HTTPS + PKCE) ===
  let spHost = null;
  let spFrame = null;
  let spBridgeUp = false;
  let spDeviceId = '';
  let spDeviceWaiters = [];

  function ensureSpBridge() {
    if (!spHost) {
      spHost = document.createElement('div');
      spHost.id = 'lm-sp-host';
      document.body.appendChild(spHost);
    }
    if (!spFrame) {
      spBridgeUp = false;
      spDeviceId = '';
      spFrame = document.createElement('iframe');
      spFrame.src = SP_BRIDGE_URL;
      spFrame.allow = 'autoplay; encrypted-media';
      spFrame.setAttribute('title', 'Lumo Spotify SDK');
      spHost.appendChild(spFrame);
    }
  }
  function destroySpPlayer() {
    spBridgeUp = false;
    spDeviceId = '';
    spDeviceWaiters.forEach((r) => r(''));
    spDeviceWaiters = [];
    if (spFrame) {
      try { spFrame.contentWindow?.postMessage({ type: 'sp-disconnect' }, '*'); } catch (_) {}
      spFrame.remove();
      spFrame = null;
    }
  }
  function sendSp(msg) {
    if (spFrame && spFrame.contentWindow) spFrame.contentWindow.postMessage(msg, '*');
  }

  async function initSpDeviceIfNeeded() {
    const token = await spGetValidToken();
    if (!token) return '';
    ensureSpBridge();
    if (spDeviceId) {
      sendSp({ type: 'sp-token', token });
      return spDeviceId;
    }
    if (spBridgeUp) {
      sendSp({ type: 'sp-init', token, volume: volume / 100 });
    }
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(spDeviceId), 7000);
      spDeviceWaiters.push((id) => { clearTimeout(t); resolve(id); });
    });
  }

  // === SPOTIFY PKCE OAUTH ===
  function randomStr(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => chars[b % chars.length]).join('');
  }
  async function pkceChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function startSpotifyLogin() {
    ensureSpBridge(); // Garante listener de localStorage ativo na origem do GitHub Pages
    const verifier = randomStr(64);
    const state = randomStr(16);
    const challenge = await pkceChallenge(verifier);
    localStorage.setItem('lumo_sp_pkce_v', verifier);
    localStorage.setItem('lumo_sp_pkce_s', state);

    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state',
      'user-read-playback-state',
      'user-library-read',
      'playlist-read-private'
    ].join(' ');

    const u = new URL('https://accounts.spotify.com/authorize');
    u.searchParams.set('client_id', spClientId);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri', SP_REDIRECT_URI);
    u.searchParams.set('code_challenge_method', 'S256');
    u.searchParams.set('code_challenge', challenge);
    u.searchParams.set('state', state);
    u.searchParams.set('scope', scopes);

    const pop = window.open(u.toString(), 'lumo_spotify_auth', 'width=470,height=680');
    if (!pop && typeof invoke === 'function') {
      invoke('open_external_url', { url: u.toString() }).catch(() => {});
    }
    showSpManualBox = true;
    renderLibrary();
    if (typeof say === 'function') say('Faça login no Spotify na janela aberta!', 3200, true);
  }

  async function finishSpotifyAuth(code, state) {
    const savedState = localStorage.getItem('lumo_sp_pkce_s') || '';
    const verifier = localStorage.getItem('lumo_sp_pkce_v') || '';
    if (!code || !verifier) return;
    if (state && savedState && state !== savedState) return;

    localStorage.removeItem('lumo_sp_pkce_s');
    localStorage.removeItem('lumo_sp_pkce_v');

    try {
      const body = new URLSearchParams({
        client_id: spClientId,
        grant_type: 'authorization_code',
        code: String(code).trim(),
        redirect_uri: SP_REDIRECT_URI,
        code_verifier: verifier
      });
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const d = await res.json();
      if (!res.ok || !d.access_token) {
        if (typeof say === 'function') say('Erro ao concluir login Spotify: ' + (d.error_description || d.error || 'tente novamente'), 3800, true);
        return;
      }

      spTokens = {
        access_token: d.access_token,
        refresh_token: d.refresh_token || '',
        expires_at: Date.now() + (Number(d.expires_in || 3600) * 1000),
        user_name: 'Spotify',
        product: 'premium'
      };
      try {
        const me = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: 'Bearer ' + spTokens.access_token }
        });
        if (me.ok) {
          const md = await me.json();
          spTokens.user_name = md.display_name || md.email || 'Spotify';
          spTokens.product = md.product || 'free';
        }
      } catch (_) {}

      saveSpTokens();
      showSpManualBox = false;
      searchSrc = 'spotify';
      initSpDeviceIfNeeded();
      loadSpotifyFeed('likes', '');
      renderHero();
      if (typeof hopPill === 'function') hopPill();
      if (typeof say === 'function') say(`Spotify conectado como ${spTokens.user_name} ✓`, 3000, true);
    } catch (_) {
      if (typeof say === 'function') say('Sem conexão para autenticar no Spotify.', 2800, true);
    }
  }

  async function spGetValidToken() {
    if (!spTokens || !spTokens.access_token) return '';
    if (Date.now() < (spTokens.expires_at || 0) - 60000) return spTokens.access_token;
    if (!spTokens.refresh_token) return '';

    try {
      const body = new URLSearchParams({
        client_id: spClientId,
        grant_type: 'refresh_token',
        refresh_token: spTokens.refresh_token
      });
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const d = await res.json();
      if (res.ok && d.access_token) {
        spTokens.access_token = d.access_token;
        if (d.refresh_token) spTokens.refresh_token = d.refresh_token;
        spTokens.expires_at = Date.now() + (Number(d.expires_in || 3600) * 1000);
        saveSpTokens();
        sendSp({ type: 'sp-token', token: spTokens.access_token });
        return spTokens.access_token;
      }
    } catch (_) {}
    return '';
  }

  function disconnectSpotify() {
    if (currentTrack?.source === 'spotify') stopMusic();
    destroySpPlayer();
    spTokens = null;
    spPlaylists = [];
    saveSpTokens();
    results = [];
    listMsg = 'Spotify desconectado.';
    renderHero();
    renderLibrary();
  }

  function openYouTubeLogin() {
    const url = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://www.youtube.com/';
    window.open(url, 'lumo_yt_login', 'width=480,height=680');
    ytSignedIn = true;
    localStorage.setItem('lumo_yt_signed_in', 'true');
    destroyYtPlayer(); // Força recriar iframe já com o novo cookie na próxima reprodução
    renderLibrary();
    if (typeof say === 'function') say('Entre na sua conta Google/YouTube na janela aberta para ativar o YouTube Premium!', 4200, true);
  }

  // === LISTENER GLOBAL DE POSTMESSAGE (YOUTUBE + SPOTIFY SDK + CALLBACK) ===
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (!d || typeof d.type !== 'string') return;

    // 1. Callback OAuth Spotify
    if (d.type === 'lumo-sp-auth') {
      if (d.code) finishSpotifyAuth(d.code, d.state);
      return;
    }

    // 2. Eventos Spotify SDK
    if (d.type === 'lumo-sp-bridge-up') {
      spBridgeUp = true;
      if (spTokens?.access_token) {
        spGetValidToken().then((tk) => { if (tk) sendSp({ type: 'sp-init', token: tk, volume: volume / 100 }); });
      }
      return;
    }
    if (d.type === 'lumo-sp-ready') {
      spDeviceId = d.device_id || '';
      const waiters = spDeviceWaiters.splice(0);
      waiters.forEach((fn) => fn(spDeviceId));
      return;
    }
    if (d.type === 'lumo-sp-error') {
      if (d.kind === 'account' && typeof say === 'function') {
        say('O Spotify SDK exige conta Spotify Premium ativa.', 3600, true);
      } else if (d.kind === 'auth') {
        spGetValidToken().then((tk) => { if (tk) sendSp({ type: 'sp-init', token: tk, volume: volume / 100 }); });
      }
      return;
    }
    if (d.type === 'lumo-sp-state' && currentTrack?.source === 'spotify') {
      isPlaying = !d.paused;
      if (d.duration > 0) duration = d.duration;
      if (isPlaying && pendingJamSeek) setTimeout(checkPendingJamSeek, 250);
      if (!seeking && typeof d.current === 'number') curTime = d.current;
      syncGlobalVisuals();
      renderHero();
      updateProgressDOM();
      return;
    }
    if (d.type === 'lumo-sp-time' && currentTrack?.source === 'spotify') {
      if (!seeking) {
        curTime = d.current || 0;
        if (d.duration > 0) duration = d.duration;
        updateProgressDOM();
        syncActiveLyric();
        maybePrefetchNext();
      }
      return;
    }
    if (d.type === 'lumo-sp-ended' && currentTrack?.source === 'spotify') {
      playNext(true);
      return;
    }

    // 3. Eventos YouTube Bridge
    if (!d.type.startsWith('lumo-yt-')) return;
    if (d.type === 'lumo-yt-ready') {
      ytReady = true;
      if (ytPendingId) {
        const id = ytPendingId;
        ytPendingId = null;
        sendYt({ type: 'load', videoId: id, volume });
      }
      return;
    }
    if (currentTrack?.source !== 'youtube') return;

    if (d.type === 'lumo-yt-state') {
      if (d.state === 'playing') {
        isPlaying = true;
        if (pendingJamSeek) setTimeout(checkPendingJamSeek, 200);
        if (d.duration > 0) duration = d.duration;
        syncGlobalVisuals();
        renderHero();
      } else if (d.state === 'paused') {
        isPlaying = false;
        syncGlobalVisuals();
        renderHero();
      } else if (d.state === 'ended') {
        playNext(true);
      }
    } else if (d.type === 'lumo-yt-time') {
      if (!seeking) {
        curTime = d.current || 0;
        if (d.duration > 0) duration = d.duration;
        updateProgressDOM();
        syncActiveLyric();
        maybePrefetchNext();
      }
    } else if (d.type === 'lumo-yt-error') {
      if (typeof say === 'function') say('Esse vídeo bloqueou reprodução incorporada. Pulando...', 2600, true);
      if (queue.length > 1) playNext(true);
      else stopMusic();
    }
  });

  // === AUDIO NATIVO (<audio> — AUDIUS / LOCAL) ===
  audio.addEventListener('playing', () => {
    if (!currentTrack || currentTrack.source !== 'audius') return;
    isPlaying = true;
    if (pendingJamSeek) checkPendingJamSeek();
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    syncGlobalVisuals();
    renderHero();
  });
  audio.addEventListener('pause', () => {
    if (!currentTrack || currentTrack.source !== 'audius') return;
    isPlaying = false;
    syncGlobalVisuals();
    renderHero();
  });
  audio.addEventListener('timeupdate', () => {
    if (!currentTrack || currentTrack.source !== 'audius' || seeking) return;
    curTime = audio.currentTime || 0;
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    updateProgressDOM();
    syncActiveLyric();
    emitJamAction('seek');
    maybePrefetchNext();
  });
  audio.addEventListener('ended', () => {
    if (!currentTrack || currentTrack.source !== 'audius') return;
    playNext(true);
  });
  audio.addEventListener('error', () => {
    if (!currentTrack || currentTrack.source !== 'audius') return;
    if (typeof say === 'function') say('Não consegui carregar essa faixa. Tentando a próxima...', 2200, true);
    if (queue.length > 1) playNext(true);
    else stopMusic();
  });

  // === SINCRONIA COM CÁPSULA, VISUALIZADOR E CARD DO RESUMO ===
  function syncResumoMusicTile() {
    const sub = document.getElementById('music-tile-sub');
    const tile = sub?.closest('.hub-tile') || document.querySelector('.hub-tile[data-lm-tile="1"]');
    if (tile) tile.classList.toggle('lm-tile-playing', Boolean(currentTrack && isPlaying));
    if (sub) {
      sub.textContent = currentTrack
        ? `${isPlaying ? '▶ ' : '⏸ '}${currentTrack.title.slice(0, 22)}`
        : 'Músicas · Lo-fi · Rádio';
    }
  }

  function syncGlobalVisuals() {
    try { isMediaPlaying = isPlaying; } catch (_) {}
    if (currentTrack) {
      const t1 = document.getElementById('mini-media-title');
      const s1 = document.getElementById('mini-media-sub');
      const mv = document.getElementById('midia-view-track');
      if (t1) t1.textContent = currentTrack.title;
      if (s1) s1.textContent = `${currentTrack.artist} · ${isPlaying ? 'Lumo Music' : 'Pausado'}`;
      if (mv) mv.textContent = `${currentTrack.title} — ${currentTrack.artist}`;
    }

    const face = document.getElementById('lumo-face');
    if (face && !(typeof isThinking !== 'undefined' && isThinking)) {
      face.classList.toggle('music', Boolean(currentTrack && isPlaying));
    }
    if (typeof syncPlayVisuals === 'function') syncPlayVisuals();
    syncResumoMusicTile();
    window.dispatchEvent(new CustomEvent('lumo-music-state', {
      detail: { playing: Boolean(currentTrack && isPlaying), volume, title: currentTrack?.title || '', artwork: currentTrack?.artwork || '' }
    }));

    const mini = document.getElementById('pill-mini-player');
    if (mini) {
      let img = mini.querySelector('.pmp-cover');
      const dot = mini.querySelector('.pmp-dot');
      if (!img) {
        img = document.createElement('img');
        img.className = 'pmp-cover';
        mini.insertBefore(img, dot || mini.firstChild);
      }
      if (currentTrack && currentTrack.artwork) {
        img.src = currentTrack.artwork;
        img.classList.add('show');
        if (dot) dot.style.display = 'none';
      } else {
        img.classList.remove('show');
        if (dot) dot.style.display = '';
      }
    }
  }

  // === PRÉ-CARREGAMENTO DA PRÓXIMA FAIXA (PLAY INSTANTÂNEO) ===
  function getNextTrackCandidate() {
    if (queue.length <= 1 || isShuffle) return null;
    const nIdx = queueIdx + 1 < queue.length ? queueIdx + 1 : (repeatMode === 'all' ? 0 : -1);
    return nIdx >= 0 ? queue[nIdx] : null;
  }
  function maybePrefetchNext() {
    if (!duration || duration < 20 || (duration - curTime) > 15 || (duration - curTime) < 2) return;
    const next = getNextTrackCandidate();
    if (!next) return;
    const key = `${next.title}::${next.artist}`;
    if (key === prefetchedNextKey) return;
    prefetchedNextKey = key;
    if (next.artwork) { const img = new Image(); img.src = next.artwork; }
    fetchLyricsData(next).catch(() => {});
  }

  // === CONTROLE DE REPRODUÇÃO ===
  async function playTrack(track, newQueue = null, idxInQueue = -1) {
    if (!track) return;
    const reqId = ++playReqSeq;

    if (Array.isArray(newQueue) && newQueue.length) {
      queue = newQueue.map((x) => ({ ...x }));
      queueIdx = idxInQueue >= 0 ? idxInQueue : queue.findIndex((x) => x.id === track.id);
      if (queueIdx < 0) { queue.unshift({ ...track }); queueIdx = 0; }
    } else if (queueIdx < 0 || !queue[queueIdx] || queue[queueIdx].id !== track.id) {
      const existing = queue.findIndex((x) => x.id === track.id);
      if (existing >= 0) queueIdx = existing;
      else { queue.push({ ...track }); queueIdx = queue.length - 1; }
    }

    currentTrack = { ...track };
    recordRecent(currentTrack);
    curTime = 0;
    duration = Number(track.duration || 0);
    activeLyricIdx = -1;
    prefetchedNextKey = '';

    if (autoLyrics) lyricsOpen = true;
    if (typeof stopAmbient === 'function') { try { stopAmbient(); } catch (_) {} }
    if (typeof hopPill === 'function') hopPill();

    // Dispara busca de letra EM PARALELO no milissegundo do clique!
    if (lyricsOpen) fetchLyricsFor(currentTrack);
    emitJamAction('track');

    if (track.source === 'spotify') {
      audio.pause();
      audio.removeAttribute('src');
      destroyYtPlayer();
      isPlaying = true;
      syncGlobalVisuals();
      renderHero();
      renderLibrary();

      const devId = await initSpDeviceIfNeeded();
      const token = await spGetValidToken();
      if (reqId !== playReqSeq || !currentTrack) return;
      if (!devId || !token) {
        isPlaying = false;
        syncGlobalVisuals();
        renderHero();
        if (typeof say === 'function') say('Conecte sua conta Spotify Premium para tocar essa faixa.', 3000, true);
        return;
      }

      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(devId)}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [track.uri || `spotify:track:${track.id.replace(/^sp_/, '')}`] })
      }).catch(() => null);

      if (!res || !res.ok) {
        isPlaying = false;
        syncGlobalVisuals();
        renderHero();
        if (typeof say === 'function') say('Spotify não iniciou o player agora. Verifique sua conta Premium.', 3200, true);
      }
    } else if (track.source === 'youtube') {
      audio.pause();
      audio.removeAttribute('src');
      if (spFrame) sendSp({ type: 'sp-pause' });
      isPlaying = true;
      loadYtVideo(track.videoId || track.id.replace(/^yt_/, ''));
      syncGlobalVisuals();
      renderHero();
      renderLibrary();
    } else {
      // Audius — áudio nativo ultra-leve (~10MB)
      destroyYtPlayer();
      if (spFrame) sendSp({ type: 'sp-pause' });
      audio.src = track.streamUrl || `${AUDIUS_API}/tracks/${encodeURIComponent(track.id)}/stream?app_name=LumoMusic`;
      audio.volume = volume / 100;
      audio.play().catch(() => {});
      isPlaying = true;
      syncGlobalVisuals();
      renderHero();
      renderLibrary();
    }
  }

  function togglePlayPause() {
    if (!currentTrack) {
      if (queue.length) playTrack(queue[0], queue, 0);
      else if (results.length) playTrack(results[0], results, 0);
      return;
    }
    if (currentTrack.source === 'spotify') {
      sendSp({ type: 'sp-toggle' });
      setTimeout(() => emitJamAction(isPlaying ? 'play' : 'pause'), 80);
      isPlaying = !isPlaying;
      syncGlobalVisuals();
      renderHero();
    } else if (currentTrack.source === 'youtube') {
      if (isPlaying) { sendYt({ type: 'pause' }); isPlaying = false; emitJamAction('pause'); }
      else { sendYt({ type: 'play' }); isPlaying = true; emitJamAction('play'); }
      syncGlobalVisuals();
      renderHero();
    } else {
      if (audio.paused) { audio.play().catch(() => {}); emitJamAction('play'); }
      else { audio.pause(); emitJamAction('pause'); }
    }
  }

  function stopMusic() {
    playReqSeq++;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    destroyYtPlayer();
    destroySpPlayer();
    currentTrack = null;
    isPlaying = false;
    curTime = 0;
    duration = 0;
    lyricsLines = [];
    syncGlobalVisuals();
    renderHero();
    renderLyricsBox();
    renderLibrary();
    if (typeof say === 'function') say('Player parado · RAM liberada ✓', 1800, true);
  }

  function playNext(auto = false) {
    if (!queue.length) return;
    if (auto && repeatMode === 'one' && currentTrack) {
      seekTo(0);
      if (currentTrack.source === 'spotify') playTrack(currentTrack, queue, queueIdx);
      else if (currentTrack.source === 'youtube') sendYt({ type: 'play' });
      else audio.play().catch(() => {});
      return;
    }
    let nextIdx;
    if (isShuffle && queue.length > 1) {
      do { nextIdx = Math.floor(Math.random() * queue.length); } while (nextIdx === queueIdx);
    } else {
      nextIdx = queueIdx + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all' || !auto) nextIdx = 0;
        else { isPlaying = false; syncGlobalVisuals(); renderHero(); return; }
      }
    }
    queueIdx = nextIdx;
    playTrack(queue[queueIdx], queue, queueIdx);
  }

  function playPrev() {
    if (!queue.length) return;
    if (curTime > 4) { seekTo(0); return; }
    queueIdx = (queueIdx - 1 + queue.length) % queue.length;
    playTrack(queue[queueIdx], queue, queueIdx);
  }

  function seekTo(sec) {
    const target = Math.max(0, Math.min(duration || 99999, Number(sec || 0)));
    curTime = target;
    if (currentTrack?.source === 'spotify') sendSp({ type: 'sp-seek', sec: target });
    else if (currentTrack?.source === 'youtube') sendYt({ type: 'seek', sec: target });
    else if (Number.isFinite(audio.duration)) audio.currentTime = target;
    updateProgressDOM();
    syncActiveLyric();
  }

  function setVol(v) {
    volume = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
    if (volume > 0) lastNonZeroVol = volume;
    localStorage.setItem('lumo_music_vol', String(volume));
    audio.volume = volume / 100;
    if (currentTrack?.source === 'youtube') sendYt({ type: 'volume', volume });
    if (spFrame) sendSp({ type: 'sp-volume', volume: volume / 100 });
    const vi = document.getElementById('lm-vol');
    if (vi) { vi.value = String(volume); vi.style.setProperty('--vpct', volume + '%'); }
    window.dispatchEvent(new CustomEvent('lumo-music-state', {
      detail: { playing: Boolean(currentTrack && isPlaying), volume, title: currentTrack?.title || '' }
    }));
  }

  // === LETRAS SINCRONIZADAS COM CACHE PERSISTENTE (0ms EM REPETIÇÕES) ===
  function cleanTitleForLyrics(raw) {
    return String(raw || '')
      .replace(/\s*[\(\[](?:official|audio|video|lyrics?|hd|4k|visualizer|remix|remaster(?:ed)?|ft\.?|feat\.?)[^\)\]]*[\)\]]/gi, '')
      .replace(/\s*-\s*remaster.*$/i, '')
      .replace(/\s+(?:ft\.?|feat\.?)\s+.*$/i, '')
      .trim();
  }
  function parseLrc(lrc) {
    const out = [];
    for (const line of String(lrc || '').split('\n')) {
      const m = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
      if (!m) continue;
      const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt((m[3] || '0').padEnd(3, '0').slice(0, 3), 10) / 1000;
      const text = m[4].trim();
      if (text) out.push({ t: sec, text });
    }
    return out;
  }

  async function fetchLyricsData(track) {
    const ct = cleanTitleForLyrics(track.title);
    const ca = cleanTitleForLyrics(track.artist.split(',')[0]);
    const key = `${ct.toLowerCase()}::${ca.toLowerCase()}`;

    if (lyricsStore[key]) {
      lyricsStore[key].ts = Date.now();
      return lyricsStore[key];
    }

    let data = null;
    try {
      const r1 = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(ct)}&artist_name=${encodeURIComponent(ca)}`, { signal: AbortSignal.timeout(4500) });
      if (r1.ok) data = await r1.json();
      if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
        const r2 = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${ct} ${ca}`.trim())}`, { signal: AbortSignal.timeout(4500) });
        if (r2.ok) {
          const arr = await r2.json();
          if (Array.isArray(arr) && arr.length) data = arr.find((x) => x.syncedLyrics) || arr[0];
        }
      }
    } catch (_) {
      return { lines: [], synced: false, status: 'Sem conexão para buscar a letra.', ts: Date.now() };
    }

    let entry;
    if (data?.syncedLyrics) {
      entry = { lines: parseLrc(data.syncedLyrics), synced: true, status: '', ts: Date.now() };
    } else if (data?.plainLyrics) {
      entry = { lines: data.plainLyrics.split('\n').filter((x) => x.trim()).map((text) => ({ t: -1, text })), synced: false, status: '', ts: Date.now() };
    } else {
      entry = { lines: [], synced: false, status: 'Letra não encontrada para esta faixa.', ts: Date.now() };
    }

    if (entry.lines.length) {
      lyricsStore[key] = entry;
      saveLyricsStore();
    }
    return entry;
  }

  async function fetchLyricsFor(track) {
    if (!track) return;
    const ct = cleanTitleForLyrics(track.title);
    const ca = cleanTitleForLyrics(track.artist.split(',')[0]);
    const key = `${ct.toLowerCase()}::${ca.toLowerCase()}`;
    const targetId = track.id;

    if (lyricsStore[key]) {
      const c = lyricsStore[key];
      lyricsLines = c.lines; lyricsSynced = c.synced; lyricsStatus = c.status;
      renderLyricsBox(); syncActiveLyric(); return;
    }

    lyricsLines = []; lyricsSynced = false; lyricsStatus = 'Sincronizando letra...';
    renderLyricsBox();

    const entry = await fetchLyricsData(track);
    if (!currentTrack || currentTrack.id !== targetId) return;
    lyricsLines = entry.lines;
    lyricsSynced = entry.synced;
    lyricsStatus = entry.status;
    renderLyricsBox();
    syncActiveLyric();
  }

  function renderLyricsBox() {
    const box = document.getElementById('lm-lyrics-box');
    if (!box) return;
    box.classList.toggle('show', lyricsOpen);
    if (!lyricsOpen) return;

    const header = `<div class="lm-lyrics-head">
      <span>${lyricsSynced ? '● Letra sincronizada' : 'Letra'}</span>
      <button type="button" class="lm-auto-pill ${autoLyrics ? 'on' : ''}" data-autolyrics="1">Auto-Lyrics: ${autoLyrics ? 'ON' : 'OFF'}</button>
    </div>`;

    if (!currentTrack) {
      box.innerHTML = header + '<div class="lm-lyric-line">Toque uma música para acompanhar a letra.</div>';
      return;
    }
    if (lyricsStatus) {
      box.innerHTML = header + `<div class="lm-lyric-line">${esc(lyricsStatus)}</div>`;
      return;
    }
    box.innerHTML = header + lyricsLines.map((l, i) => `<div class="lm-lyric-line" data-lidx="${i}" data-lt="${l.t}">${esc(l.text)}</div>`).join('');
  }

  function syncActiveLyric() {
    if (!lyricsOpen || !lyricsSynced || !lyricsLines.length) return;
    let idx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (curTime + 0.28 >= lyricsLines[i].t) idx = i;
      else break;
    }
    if (idx === activeLyricIdx) return;
    activeLyricIdx = idx;
    window.dispatchEvent(new CustomEvent('lumo-lyric-line', { detail: { text: idx >= 0 ? lyricsLines[idx].text : '', playing: isPlaying, artwork: currentTrack?.artwork || '' } }));
    const box = document.getElementById('lm-lyrics-box');
    if (!box) return;
    box.querySelectorAll('.lm-lyric-line.active').forEach((el) => el.classList.remove('active'));
    if (idx >= 0) {
      const el = box.querySelector(`.lm-lyric-line[data-lidx="${idx}"]`);
      if (el) {
        el.classList.add('active');
        if (Date.now() > lyricsUserScrollUntil) {
          const targetTop = Math.max(0, el.offsetTop - (box.clientHeight / 2) + (el.clientHeight / 2));
          box.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }
    }
  }

  // === CATÁLOGOS: SPOTIFY WEB API, YOUTUBE & AUDIUS ===
  function mapSpotifyTrack(t) {
    if (!t || !t.id) return null;
    return {
      id: 'sp_' + t.id,
      uri: t.uri || ('spotify:track:' + t.id),
      source: 'spotify',
      title: t.name || 'Sem título',
      artist: (t.artists || []).map((a) => a.name).join(', ') || 'Artista',
      artwork: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
      duration: Math.round((t.duration_ms || 0) / 1000)
    };
  }

  async function loadSpotifyFeed(chip = 'likes', query = '') {
    const token = await spGetValidToken();
    if (!token) {
      results = [];
      listMsg = 'Conecte sua conta Spotify Premium acima para buscar e ouvir suas músicas sem anúncios.';
      renderLibrary();
      return;
    }

    initSpDeviceIfNeeded(); // Pré-aquece o SDK em paralelo
    loadingList = true;
    listMsg = query.trim() ? 'Buscando no Spotify...' : 'Carregando do Spotify...';
    renderLibrary();

    try {
      let url;
      if (query.trim()) {
        url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.trim())}&type=track&limit=10`;
      } else if (chip === 'likes') {
        url = 'https://api.spotify.com/v1/me/tracks?limit=25';
      } else if (chip === 'playlists') {
        const pr = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const pd = await pr.json();
        spPlaylists = Array.isArray(pd.items) ? pd.items : [];
        results = [];
        listMsg = spPlaylists.length ? '' : 'Nenhuma playlist encontrada na sua conta.';
        loadingList = false;
        renderLibrary();
        return;
      } else {
        url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(chip)}&type=track&limit=10`;
      }

      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      const rawItems = query.trim() || (chip !== 'likes')
        ? (data.tracks?.items || [])
        : (data.items || []).map((x) => x.track);
      results = rawItems.map(mapSpotifyTrack).filter(Boolean);
      listMsg = results.length ? '' : 'Nenhuma música encontrada no Spotify.';
    } catch (_) {
      results = [];
      listMsg = 'Erro ao carregar do Spotify.';
    }
    loadingList = false;
    renderLibrary();
  }

  async function openSpotifyPlaylist(plId, plName) {
    const token = await spGetValidToken();
    if (!token) return;
    loadingList = true;
    listMsg = `Abrindo "${plName}"...`;
    spChip = 'pl-view';
    renderLibrary();
    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(plId)}/tracks?limit=30`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      results = (data.items || []).map((x) => mapSpotifyTrack(x.track)).filter(Boolean);
      listMsg = results.length ? '' : 'Essa playlist está vazia.';
    } catch (_) {
      results = [];
      listMsg = 'Não consegui abrir essa playlist.';
    }
    loadingList = false;
    renderLibrary();
  }

  function mapAudiusTrack(t) {
    return {
      id: String(t.id),
      source: 'audius',
      title: t.title || 'Sem título',
      artist: t.user?.name || t.user?.handle || 'Artista',
      artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
      duration: Number(t.duration || 0),
      streamUrl: `${AUDIUS_API}/tracks/${encodeURIComponent(t.id)}/stream?app_name=LumoMusic`
    };
  }
  async function loadAudiusFeed(chip = 'trending', query = '') {
    loadingList = true; listMsg = 'Carregando faixas gratuitas sem anúncio...'; renderLibrary();
    try {
      const url = query.trim()
        ? `${AUDIUS_API}/tracks/search?query=${encodeURIComponent(query.trim())}&app_name=LumoMusic&limit=18`
        : (chip === 'trending'
            ? `${AUDIUS_API}/tracks/trending?app_name=LumoMusic&limit=18`
            : `${AUDIUS_API}/tracks/search?query=${encodeURIComponent(chip)}&app_name=LumoMusic&limit=18`);
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      const json = await res.json();
      results = (Array.isArray(json.data) ? json.data : []).map(mapAudiusTrack);
      listMsg = results.length ? '' : 'Nenhuma faixa encontrada no Audius.';
    } catch (_) {
      results = []; listMsg = 'Erro ao conectar no Audius.';
    }
    loadingList = false; renderLibrary();
  }

  function extractYtId(input) {
    const s = String(input || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  async function searchYouTube(query) {
    const q = String(query || '').trim();
    if (!q) { results = []; listMsg = 'Busque qualquer música ou cole um link do YouTube!'; renderLibrary(); return; }
    ensureYtBridge(); // Pré-aquece o player enquanto busca!

    const directId = extractYtId(q);
    if (directId) {
      loadingList = true; listMsg = 'Abrindo faixa do YouTube...'; renderLibrary();
      let title = 'Música do YouTube', artist = 'YouTube';
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + directId)}&format=json`, { signal: AbortSignal.timeout(4500) });
        if (r.ok) { const d = await r.json(); if (d.title) title = d.title; if (d.author_name) artist = d.author_name; }
      } catch (_) {}
      const track = { id: 'yt_' + directId, videoId: directId, source: 'youtube', title, artist, artwork: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`, duration: 0 };
      results = [track]; loadingList = false; listMsg = '';
      playTrack(track, [track], 0);
      return;
    }

    loadingList = true; listMsg = 'Buscando no YouTube...'; renderLibrary();
    try {
      const wr = await fetch(`${WORKER_BASE}/yt-search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) });
      const wd = wr.ok ? await wr.json() : { items: [] };
      results = Array.isArray(wd.items) ? wd.items : [];
      listMsg = results.length ? '' : 'Nenhum resultado agora. Tente outro termo ou cole o link do YouTube!';
    } catch (_) {
      results = []; listMsg = 'Erro na busca. Tente colar o link do YouTube!';
    }
    loadingList = false; renderLibrary();
  }

  // === ESTRUTURA DOM: 3 ABAS EM #view-midia (MÚSICA | AMBIENTE | RÁDIOS & PC) ===
  const legacyPane = document.createElement('div');
  legacyPane.id = 'lm-legacy-pane';
  legacyPane.className = 'hidden';
  while (viewMidia.firstChild) legacyPane.appendChild(viewMidia.firstChild);

  const ambientPane = document.createElement('div');
  ambientPane.id = 'lm-ambient-pane';
  ambientPane.className = 'hidden';
  const oldAmbientView = document.getElementById('view-ambiente');
  if (oldAmbientView) {
    while (oldAmbientView.firstChild) ambientPane.appendChild(oldAmbientView.firstChild);
  }

  viewMidia.innerHTML = `
    <div class="lm-subtabs" id="lm-subtabs">
      <button type="button" class="lm-subtab active" data-mtab="music">${IC.music}<span>Música</span></button>
      <button type="button" class="lm-subtab" data-mtab="ambient">${IC.ambient}<span>Ambiente</span></button>
      <button type="button" class="lm-subtab" data-mtab="legacy">${IC.radio}<span>Rádios & PC</span></button>
    </div>
    <div id="lm-music-pane">
      <div class="card lm-hero" id="lm-hero"></div>
      <div id="lm-jam-box"></div>
      <div class="lm-lyrics-box" id="lm-lyrics-box"></div>
      <div class="card" id="lm-library"></div>
    </div>`;
  viewMidia.appendChild(ambientPane);
  viewMidia.appendChild(legacyPane);

  document.getElementById('lm-subtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.lm-subtab');
    if (!btn) return;
    mainTab = btn.dataset.mtab || 'music';
    document.querySelectorAll('.lm-subtab').forEach((b) => b.classList.toggle('active', b.dataset.mtab === mainTab));
    document.getElementById('lm-music-pane').classList.toggle('hidden', mainTab !== 'music');
    document.getElementById('lm-ambient-pane').classList.toggle('hidden', mainTab !== 'ambient');
    document.getElementById('lm-legacy-pane').classList.toggle('hidden', mainTab !== 'legacy');
  });

  const _lBox = document.getElementById('lm-lyrics-box');
  if (_lBox) {
    const pauseAutoScroll = () => { lyricsUserScrollUntil = Date.now() + 6000; };
    _lBox.addEventListener('wheel', pauseAutoScroll, { passive: true });
    _lBox.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    _lBox.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
  }
  document.getElementById('lm-lyrics-box').addEventListener('click', (e) => {
    if (e.target.closest('[data-autolyrics]')) {
      autoLyrics = !autoLyrics;
      localStorage.setItem('lumo_music_autolyrics', String(autoLyrics));
      renderLyricsBox();
      return;
    }
    const line = e.target.closest('.lm-lyric-line');
    if (!line) return;
    const t = parseFloat(line.dataset.lt);
    if (Number.isFinite(t) && t >= 0) seekTo(t);
  });

  // Mantém ícone musical no card do Resumo + scroll guard anti-tremida
  function ensureResumoTilePolish() {
    const tile = document.querySelector('.hub-tile[data-lm-tile="1"]') || document.getElementById('music-tile-sub')?.closest('.hub-tile');
    if (!tile) return;
    const svg = tile.querySelector('svg');
    if (svg) svg.outerHTML = IC.music.replace('<svg ', '<svg class="ic" ');
    syncResumoMusicTile();
  }
  setTimeout(ensureResumoTilePolish, 120);
  setTimeout(ensureResumoTilePolish, 900);
  const vr = document.querySelector('#view-resumo .home-scroll') || document.getElementById('view-resumo');
  if (vr) {
    let scTimer = 0;
    vr.addEventListener('scroll', () => {
      vr.classList.add('is-scrolling');
      clearTimeout(scTimer);
      scTimer = setTimeout(() => vr.classList.remove('is-scrolling'), 150);
    }, { passive: true });
  }

  function isLiked(id) { return likes.some((x) => x.id === id); }
  function toggleLike(track) {
    if (!track) return;
    const idx = likes.findIndex((x) => x.id === track.id);
    if (idx >= 0) likes.splice(idx, 1);
    else likes.unshift({ ...track });
    saveLikes(); renderHero(); renderLibrary();
  }
  function addToPlaylistPrompt(track) {
    if (!track) return;
    if (!playlists.length) playlists.push({ id: 'pl_' + Date.now().toString(36), name: 'Favoritas', tracks: [] });
    const target = playlists[0];
    if (!target.tracks.some((x) => x.id === track.id)) { target.tracks.push({ ...track }); savePlaylists(); }
    if (typeof say === 'function') say(`Salva em "${target.name}" ✓`, 1800, true);
    renderLibrary();
  }

  function updateProgressDOM() {
    const seek = document.getElementById('lm-seek');
    const tCur = document.getElementById('lm-t-cur');
    const tDur = document.getElementById('lm-t-dur');
    if (tCur) tCur.textContent = fmtSec(curTime);
    if (tDur) tDur.textContent = fmtSec(duration);
    if (seek && !seeking) {
      const maxVal = Math.max(1, Math.floor(duration || 1));
      const val = Math.min(Math.floor(curTime), maxVal);
      seek.max = String(maxVal);
      seek.value = String(val);
      seek.style.setProperty('--pct', Math.round((val / maxVal) * 100) + '%');
    }
  }

  function renderHero() {
    const hero = document.getElementById('lm-hero');
    if (!hero) return;
    const liked = currentTrack ? isLiked(currentTrack.id) : false;
    let srcLabel = 'Spotify · YouTube · Audius';
    let isAdFree = true;
    if (currentTrack) {
      if (currentTrack.source === 'spotify') { srcLabel = 'Spotify Premium · Oficial'; isAdFree = true; }
      else if (currentTrack.source === 'audius') { srcLabel = 'Audius · Grátis & Sem Anúncio'; isAdFree = true; }
      else { srcLabel = ytSignedIn ? 'YouTube Premium · Oficial' : 'YouTube · Oficial'; isAdFree = ytSignedIn; }
    }
    const maxVal = Math.max(1, Math.floor(duration || 1));
    const curVal = Math.min(Math.floor(curTime), maxVal);
    const pct = Math.round((curVal / maxVal) * 100);

    hero.classList.toggle('has-art', Boolean(currentTrack?.artwork));
    hero.innerHTML = `
      <div class="lm-hero-glow" style="${currentTrack?.artwork ? `background-image:url('${esc(currentTrack.artwork)}')` : ''}"></div>
      <div class="lm-hero-inner">
        <div class="lm-top-row">
          <div class="lm-cover">
            ${currentTrack?.artwork ? `<img src="${esc(currentTrack.artwork)}" alt="" />` : IC.music}
            ${currentTrack && isPlaying ? '<span class="lm-eq-badge"><i></i><i></i><i></i></span>' : ''}
          </div>
          <div class="lm-meta">
            <div class="lm-title">${esc(currentTrack ? currentTrack.title : 'Lumo Music')}</div>
            <div class="lm-artist">${esc(currentTrack ? currentTrack.artist : 'Escolha uma faixa abaixo para ouvir leve')}</div>
            <div class="lm-badge-row">
              <span class="lm-src-badge ${isAdFree ? 'adfree' : ''}">${esc(srcLabel)}</span>
              ${window.LumoJam && window.LumoJam.getStatus().active ? `<span class="lm-jam-pill"><i></i>${window.LumoJam.getStatus().role === 'host' ? 'JAM HOST' : 'JAM AO VIVO'}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="lm-progress-wrap">
          <span class="lm-time" id="lm-t-cur">${fmtSec(curTime)}</span>
          <input type="range" id="lm-seek" class="lm-seek" style="--pct:${pct}%" min="0" max="${maxVal}" value="${curVal}" />
          <span class="lm-time end" id="lm-t-dur">${fmtSec(duration)}</span>
        </div>

        <div class="lm-transport">
          <button type="button" class="lm-icon-btn ghost ${isShuffle ? 'active' : ''}" data-hact="shuffle" title="Aleatório">${IC.shuffle}</button>
          <button type="button" class="lm-icon-btn ghost" data-hact="prev" title="Anterior">${IC.prev}</button>
          <button type="button" class="lm-play-btn" data-hact="play" title="Play / Pausar">${isPlaying ? IC.pause : IC.play}</button>
          <button type="button" class="lm-icon-btn ghost" data-hact="next" title="Próxima">${IC.next}</button>
          <button type="button" class="lm-icon-btn ghost ${repeatMode !== 'off' ? 'active' : ''}" data-hact="repeat" title="Repetir: ${repeatMode}">${IC.repeat}</button>
        </div>

        <div class="lm-foot-bar">
          <div class="lm-vol-wrap">
            <button type="button" class="lm-icon-btn ghost" style="width:24px; height:24px;" data-hact="mute" title="Mudo">${volume === 0 ? IC.muted : IC.vol}</button>
            <input type="range" id="lm-vol" class="lm-vol" style="--vpct:${volume}%" min="0" max="100" value="${volume}" />
          </div>
          <div class="lm-hero-actions">
            <button type="button" class="lm-icon-btn ${window.LumoJam && (window.LumoJam.getStatus().active || window.LumoJam.getStatus().drawerOpen) ? 'jam-live' : ''}" data-hact="jam" title="Lumo Jam (ouvir com amigos)">${IC.jam}</button>
            <button type="button" class="lm-icon-btn ${liked ? 'liked' : ''}" data-hact="like" title="Curtir">${IC.heart}</button>
            <button type="button" class="lm-icon-btn ${window.LumoWave && window.LumoWave.getMode() !== 'off' ? 'active' : ''}" data-hact="wave" title="Ondas na cápsula: ${window.LumoWave ? window.LumoWave.getLabel() : 'Barras'}">${IC.wave}</button>
            <button type="button" class="lm-icon-btn ${lyricsOpen ? 'active' : ''}" data-hact="lyrics" title="Letra sincronizada">${IC.lyrics}</button>
            ${currentTrack ? `<button type="button" class="lm-icon-btn" data-hact="stop" title="Parar e liberar RAM">${IC.stop}</button>` : ''}
          </div>
        </div>
      </div>`;

    const seek = document.getElementById('lm-seek');
    if (seek) {
      seek.addEventListener('mousedown', () => { seeking = true; });
      seek.addEventListener('touchstart', () => { seeking = true; }, { passive: true });
      seek.addEventListener('input', () => {
        const v = parseFloat(seek.value);
        const m = parseFloat(seek.max) || 1;
        seek.style.setProperty('--pct', Math.round((v / m) * 100) + '%');
        const tCur = document.getElementById('lm-t-cur');
        if (tCur) tCur.textContent = fmtSec(v);
      });
      seek.addEventListener('change', () => { seeking = false; seekTo(parseFloat(seek.value)); });
    }
    const volInp = document.getElementById('lm-vol');
    if (volInp) volInp.addEventListener('input', () => setVol(volInp.value));
  }

  document.getElementById('lm-hero').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hact]');
    if (!btn) return;
    const act = btn.dataset.hact;
    if (act === 'play') togglePlayPause();
    else if (act === 'next') playNext(false);
    else if (act === 'prev') playPrev();
    else if (act === 'stop') stopMusic();
    else if (act === 'mute') { setVol(volume > 0 ? 0 : lastNonZeroVol); renderHero(); }
    else if (act === 'like' && currentTrack) toggleLike(currentTrack);
    else if (act === 'shuffle') { isShuffle = !isShuffle; renderHero(); }
    else if (act === 'repeat') {
      repeatMode = repeatMode === 'off' ? 'all' : (repeatMode === 'all' ? 'one' : 'off');
      renderHero();
    } else if (act === 'jam' && window.LumoJam) { window.LumoJam.toggleDrawer(); renderHero(); } else if (act === 'wave' && window.LumoWave) {
      window.LumoWave.cycleMode();
      renderHero();
    } else if (act === 'lyrics') {
      lyricsOpen = !lyricsOpen; renderHero(); renderLyricsBox();
      if (lyricsOpen && currentTrack) fetchLyricsFor(currentTrack);
    }
  });

  function renderTrackRows(list, ctx) {
    if (!list.length) {
      return `<div style="font-size:10.8px; color:var(--muted); text-align:center; padding:18px 8px;">${esc(listMsg || 'Nenhuma faixa aqui ainda.')}</div>`;
    }
    return list.map((t, i) => {
      const playingThis = currentTrack && currentTrack.id === t.id;
      const liked = isLiked(t.id);
      return `<div class="lm-track ${playingThis ? 'playing' : ''}" data-ctx="${ctx}" data-idx="${i}">
        <div class="lm-t-art">${t.artwork ? `<img src="${esc(t.artwork)}" alt="" loading="lazy" />` : IC.music}</div>
        <div class="lm-t-info">
          <div class="lm-t-title">${esc(t.title)}</div>
          <div class="lm-t-sub">${esc(t.artist)}${t.duration ? ' · ' + fmtSec(t.duration) : ''}</div>
        </div>
        <div class="lm-t-acts">
          ${ctx !== 'queue' ? `<button type="button" class="lm-t-btn" data-tact="queue" title="Adicionar à fila">+</button>` : `<button type="button" class="lm-t-btn" data-tact="qrem" title="Remover">×</button>`}
          ${ctx !== 'pl-open' ? `<button type="button" class="lm-t-btn" data-tact="pladd" title="Salvar na playlist">▤</button>` : `<button type="button" class="lm-t-btn" data-tact="plrem" title="Remover">×</button>`}
          <button type="button" class="lm-t-btn ${liked ? 'liked' : ''}" data-tact="like" title="Curtir">♥</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderLibrary() {
    const lib = document.getElementById('lm-library');
    if (!lib) return;
    const tabsHtml = `
      <div class="lm-lib-tabs">
        <button type="button" class="lm-lib-tab ${libTab === 'explore' ? 'active' : ''}" data-ltab="explore">Buscar</button>
        <button type="button" class="lm-lib-tab ${libTab === 'queue' ? 'active' : ''}" data-ltab="queue">Fila (${queue.length})</button>
        <button type="button" class="lm-lib-tab ${libTab === 'likes' ? 'active' : ''}" data-ltab="likes">Curtidas (${likes.length})</button>
        <button type="button" class="lm-lib-tab ${libTab === 'playlists' ? 'active' : ''}" data-ltab="playlists">Playlists</button>
      </div>`;

    let body = '';
    if (libTab === 'explore') {
      let acctBanner = '';
      if (searchSrc === 'spotify') {
        if (spTokens?.access_token) {
          acctBanner = `<div class="lm-acct-strip sp-ok">
            <span class="lm-acct-label"><i class="lm-acct-dot"></i>Spotify · ${esc(spTokens.user_name || 'Conectado')}</span>
            <button type="button" class="lm-acct-link" data-acct="sp-logout">Sair</button>
          </div>`;
        } else {
          acctBanner = `<div class="lm-acct-banner">
            <div class="lm-acct-info"><strong>Spotify Premium (Opcional)</strong><span>Login único · toca sem abrir o app do Spotify</span></div>
            <div style="display:flex; gap:4px;">
              <button type="button" class="lm-acct-btn ghost" data-acct="sp-cfg" title="Client ID" style="display:inline-flex;align-items:center;">${IC.gear}</button>
              <button type="button" class="lm-acct-btn sp" data-acct="sp-login">Conectar</button>
            </div>
          </div>`;
          if (showSpSettings) {
            acctBanner += `<form class="lm-manual-auth" id="lm-spcfg-form">
              <input type="text" id="lm-spcfg-inp" class="lm-search-inp" value="${esc(spClientId)}" placeholder="Spotify Client ID..." />
              <button type="submit" class="lm-acct-btn">Salvar</button>
            </form>`;
          }
          if (showSpManualBox) {
            acctBanner += `<form class="lm-manual-auth" id="lm-spcode-form">
              <input type="text" id="lm-spcode-inp" class="lm-search-inp" placeholder="Se abriu fora, cole o código aqui..." />
              <button type="submit" class="lm-acct-btn sp">OK</button>
            </form>`;
          }
        }
      } else if (searchSrc === 'youtube') {
        acctBanner = ytSignedIn
          ? `<div class="lm-acct-strip yt-ok">
              <span class="lm-acct-label"><i class="lm-acct-dot"></i>YouTube Premium ativo</span>
              <button type="button" class="lm-acct-link" data-acct="yt-login">Reconectar</button>
            </div>`
          : `<div class="lm-acct-strip">
              <span class="lm-acct-label"><i class="lm-acct-dot" style="background:var(--muted);box-shadow:none;"></i>Conectar YouTube Premium (sem anúncios)</span>
              <button type="button" class="lm-acct-btn" data-acct="yt-login">Conectar</button>
            </div>`;
      }

      const spChips = [['likes','Curtidas'],['playlists','Minhas Playlists'],['lofi','Lo-Fi'],['pop','Pop'],['rock','Rock'],['phonk','Phonk']];
      const audChips = [['trending','Em Alta'],['lofi','Lo-Fi'],['electronic','Eletrônica'],['hip hop','Hip-Hop'],['pop','Pop'],['rock','Rock'],['phonk','Phonk']];

      let listHtml = '';
      if (loadingList) {
        listHtml = `<div style="font-size:11px; color:var(--muted); text-align:center; padding:18px;">${esc(listMsg)}</div>`;
      } else if (searchSrc === 'spotify' && spChip === 'playlists' && spTokens?.access_token) {
        listHtml = spPlaylists.length
          ? spPlaylists.map((p) => `<div class="lm-track" data-sppl="${esc(p.id)}" data-spplname="${esc(p.name || 'Playlist')}">
              <div class="lm-t-art">${p.images?.[0]?.url ? `<img src="${esc(p.images[0].url)}" alt="" loading="lazy" />` : IC.music}</div>
              <div class="lm-t-info">
                <div class="lm-t-title">${esc(p.name || 'Playlist')}</div>
                <div class="lm-t-sub">${p.tracks?.total || 0} faixas · Spotify</div>
              </div>
              <span style="font-size:13px; color:var(--muted);">›</span>
            </div>`).join('')
          : `<div style="font-size:10.8px; color:var(--muted); text-align:center; padding:18px 8px;">${esc(listMsg || 'Nenhuma playlist.')}</div>`;
      } else {
        if (!results.length && !searchQuery.trim() && recentTracks.length && (searchSrc === 'youtube' || (searchSrc === 'spotify' && spTokens?.access_token))) {
          listHtml = '<div class="lm-sec-label">Tocadas recentemente</div>' + renderTrackRows(recentTracks, 'recent');
        } else {
          listHtml = renderTrackRows(results, 'explore');
        }
      }

      body = `
        <div class="lm-src-switch three">
          <button type="button" class="lm-src-pill ${searchSrc === 'spotify' ? 'active' : ''}" data-src="spotify">Spotify</button>
          <button type="button" class="lm-src-pill ${searchSrc === 'youtube' ? 'active' : ''}" data-src="youtube">YouTube</button>
          <button type="button" class="lm-src-pill ${searchSrc === 'audius' ? 'active' : ''}" data-src="audius">Audius</button>
        </div>
        ${acctBanner}
        <form class="lm-search-row" id="lm-search-form">
          <input type="text" id="lm-search-inp" class="lm-search-inp" value="${esc(searchQuery)}" placeholder="${searchSrc === 'spotify' ? 'Buscar música ou artista no Spotify...' : searchSrc === 'youtube' ? 'Buscar música ou colar link do YouTube...' : 'Buscar no Audius (grátis, zero anúncio)...'}" />
          <button type="submit" class="btn-primary" style="padding:6px 12px; font-size:11px;">Ir</button>
        </form>
        ${searchSrc === 'spotify' && spTokens?.access_token ? `<div class="lm-chips">${spChips.map(([k, l]) => `<button type="button" class="lm-chip ${spChip === k ? 'active' : ''}" data-spchip="${k}">${l}</button>`).join('')}</div>` : ''}
        ${searchSrc === 'youtube' ? `<div class="lm-chips">${[['lofi beats','Lo-Fi'],['pop hits','Pop'],['phonk','Phonk'],['rock classics','Rock'],['eletronica','Eletrônica'],['chill study','Foco']].map(([k, l]) => `<button type="button" class="lm-chip" data-ytchip="${k}">${l}</button>`).join('')}</div>` : ''}
        ${searchSrc === 'audius' ? `<div class="lm-chips">${audChips.map(([k, l]) => `<button type="button" class="lm-chip ${activeChip === k ? 'active' : ''}" data-chip="${k}">${l}</button>`).join('')}</div>` : ''}
        <div class="lm-list">${listHtml}</div>`;
    } else if (libTab === 'queue') {
      body = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:10.5px; color:var(--muted);">A seguir na reprodução</span>
          ${queue.length ? `<button type="button" class="btn-ghost" data-qact="clear" style="font-size:10px; padding:3px 8px;">Limpar</button>` : ''}
        </div>
        <div class="lm-list">${renderTrackRows(queue, 'queue')}</div>`;
    } else if (libTab === 'likes') {
      body = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:10.5px; color:var(--muted);">${likes.length} curtida${likes.length === 1 ? '' : 's'} no Lumo</span>
          ${likes.length ? `<button type="button" class="btn-primary" data-lact="playall" style="font-size:10px; padding:4px 9px;">▶ Tocar todas</button>` : ''}
        </div>
        <div class="lm-list">${renderTrackRows(likes, 'likes')}</div>`;
    } else if (libTab === 'playlists') {
      const opened = playlists.find((p) => p.id === openedPlaylistId);
      if (opened) {
        body = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px;">
            <button type="button" class="btn-ghost" data-plact="back" style="font-size:10px; padding:3px 8px;">← Voltar</button>
            <strong style="font-size:11.5px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(opened.name)}</strong>
            ${opened.tracks.length ? `<button type="button" class="btn-primary" data-plact="play" style="font-size:10px; padding:4px 9px;">▶ Tocar</button>` : ''}
          </div>
          <div class="lm-list">${renderTrackRows(opened.tracks, 'pl-open')}</div>`;
      } else {
        body = `
          <form class="lm-search-row" id="lm-newpl-form">
            <input type="text" id="lm-newpl-inp" class="lm-search-inp" placeholder="Nome da nova playlist..." maxlength="36" />
            <button type="submit" class="btn-primary" style="padding:6px 10px; font-size:11px;">Criar</button>
          </form>
          <div class="lm-list">
            ${playlists.length ? playlists.map((p) => `
              <div class="lm-track" data-plopen="${esc(p.id)}">
                <div class="lm-t-art">${IC.music}</div>
                <div class="lm-t-info">
                  <div class="lm-t-title">${esc(p.name)}</div>
                  <div class="lm-t-sub">${p.tracks.length} faixa${p.tracks.length === 1 ? '' : 's'}</div>
                </div>
                <button type="button" class="lm-t-btn" data-pldel="${esc(p.id)}" title="Apagar">×</button>
              </div>`).join('') : '<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:16px 6px;">Crie uma playlist acima e salve músicas com o botão ▤!</div>'}
          </div>`;
      }
    }
    lib.innerHTML = tabsHtml + body;
  }

  const libEl = document.getElementById('lm-library');
  libEl.addEventListener('submit', (e) => {
    if (e.target.id === 'lm-search-form') {
      e.preventDefault();
      searchQuery = document.getElementById('lm-search-inp')?.value || '';
      if (searchSrc === 'spotify') loadSpotifyFeed(spChip, searchQuery);
      else if (searchSrc === 'youtube') searchYouTube(searchQuery);
      else loadAudiusFeed(activeChip, searchQuery);
    } else if (e.target.id === 'lm-spcode-form') {
      e.preventDefault();
      const raw = (document.getElementById('lm-spcode-inp')?.value || '').trim();
      const codeMatch = raw.match(/[?&]code=([^&]+)/);
      finishSpotifyAuth(codeMatch ? decodeURIComponent(codeMatch[1]) : raw, '');
    } else if (e.target.id === 'lm-spcfg-form') {
      e.preventDefault();
      const cid = (document.getElementById('lm-spcfg-inp')?.value || '').trim();
      if (cid) {
        spClientId = cid;
        localStorage.setItem('lumo_sp_client_id', cid);
        showSpSettings = false;
        renderLibrary();
        if (typeof say === 'function') say('Client ID do Spotify salvo ✓', 2000, true);
      }
    } else if (e.target.id === 'lm-newpl-form') {
      e.preventDefault();
      const inp = document.getElementById('lm-newpl-inp');
      const name = (inp?.value || '').trim();
      if (!name) return;
      playlists.unshift({ id: 'pl_' + Date.now().toString(36), name, tracks: [] });
      savePlaylists(); renderLibrary();
    }
  });

  libEl.addEventListener('click', (e) => {
    const acct = e.target.closest('[data-acct]');
    if (acct) {
      const a = acct.dataset.acct;
      if (a === 'sp-login') startSpotifyLogin();
      else if (a === 'sp-logout') disconnectSpotify();
      else if (a === 'sp-cfg') { showSpSettings = !showSpSettings; renderLibrary(); }
      else if (a === 'yt-login') openYouTubeLogin();
      return;
    }

    const ltab = e.target.closest('[data-ltab]');
    if (ltab) { libTab = ltab.dataset.ltab; openedPlaylistId = null; renderLibrary(); return; }

    const srcBtn = e.target.closest('[data-src]');
    if (srcBtn) {
      searchSrc = srcBtn.dataset.src;
      if (searchSrc === 'spotify') loadSpotifyFeed(spChip, searchQuery);
      else if (searchSrc === 'audius') loadAudiusFeed(activeChip, searchQuery);
      else { ensureYtBridge(); results = []; listMsg = 'Busque qualquer música ou cole um link do YouTube!'; renderLibrary(); }
      return;
    }

    const spChipBtn = e.target.closest('[data-spchip]');
    if (spChipBtn) { spChip = spChipBtn.dataset.spchip; searchQuery = ''; loadSpotifyFeed(spChip, ''); return; }

    const spPl = e.target.closest('[data-sppl]');
    if (spPl) { openSpotifyPlaylist(spPl.dataset.sppl, spPl.dataset.spplname); return; }

    const ytChip = e.target.closest('[data-ytchip]');
    if (ytChip) { searchQuery = ytChip.dataset.ytchip; searchYouTube(searchQuery); return; }
    const chip = e.target.closest('[data-chip]');
    if (chip) { activeChip = chip.dataset.chip; searchQuery = ''; loadAudiusFeed(activeChip, ''); return; }

    if (e.target.closest('[data-qact="clear"]')) { queue = currentTrack ? [currentTrack] : []; queueIdx = currentTrack ? 0 : -1; renderLibrary(); return; }
    if (e.target.closest('[data-lact="playall"]') && likes.length) { playTrack(likes[0], likes, 0); return; }

    const plDel = e.target.closest('[data-pldel]');
    if (plDel) { e.stopPropagation(); playlists = playlists.filter((p) => p.id !== plDel.dataset.pldel); savePlaylists(); renderLibrary(); return; }
    const plOpen = e.target.closest('[data-plopen]');
    if (plOpen) { openedPlaylistId = plOpen.dataset.plopen; renderLibrary(); return; }

    const plAct = e.target.closest('[data-plact]');
    if (plAct) {
      if (plAct.dataset.plact === 'back') { openedPlaylistId = null; renderLibrary(); }
      else if (plAct.dataset.plact === 'play') {
        const pl = playlists.find((p) => p.id === openedPlaylistId);
        if (pl?.tracks.length) playTrack(pl.tracks[0], pl.tracks, 0);
      }
      return;
    }

    const row = e.target.closest('.lm-track[data-ctx]');
    if (!row) return;
    const ctx = row.dataset.ctx;
    const idx = parseInt(row.dataset.idx, 10);
    const pl = ctx === 'pl-open' ? playlists.find((p) => p.id === openedPlaylistId) : null;
    const pool = ctx === 'explore' ? results : ctx === 'recent' ? recentTracks : ctx === 'queue' ? queue : ctx === 'likes' ? likes : (pl?.tracks || []);
    const track = pool[idx];
    if (!track) return;

    const actBtn = e.target.closest('[data-tact]');
    if (actBtn) {
      e.stopPropagation();
      const act = actBtn.dataset.tact;
      if (act === 'like') toggleLike(track);
      else if (act === 'queue') { queue.push({ ...track }); if (typeof say === 'function') say(`"${track.title}" na fila ✓`, 1600, true); renderLibrary(); }
      else if (act === 'qrem') { queue.splice(idx, 1); if (queueIdx >= queue.length) queueIdx = queue.length - 1; renderLibrary(); }
      else if (act === 'pladd') addToPlaylistPrompt(track);
      else if (act === 'plrem' && pl) { pl.tracks.splice(idx, 1); savePlaylists(); renderLibrary(); }
      return;
    }

    playTrack(track, pool, idx);
  });

  const _prevSendMedia = window.sendMedia;
  window.sendMedia = async function (action) {
    if (currentTrack) {
      if (action === 'play_pause') { togglePlayPause(); return; }
      if (action === 'next') { playNext(false); return; }
      if (action === 'prev') { playPrev(); return; }
      if (action === 'vol_up') { setVol(volume + 10); renderHero(); return; }
      if (action === 'vol_down') { setVol(volume - 10); renderHero(); return; }
      if (action === 'mute') { setVol(volume > 0 ? 0 : lastNonZeroVol); renderHero(); return; }
    }
    if (typeof _prevSendMedia === 'function') return _prevSendMedia(action);
  };

  async function applyJamState(pkt) {
    if (!pkt || !pkt.tr) return;
    const tr = pkt.tr;
    const drift = pkt.ts ? Math.max(0, Math.min(12, (Date.now() - Number(pkt.ts)) / 1000)) : 0;
    const targetPos = pkt.p ? Number(pkt.pos || 0) + drift : Number(pkt.pos || 0);

    let track = null;
    if (tr.s === 'sp' && spTokens?.access_token) {
      track = {
        id: 'sp_' + tr.id,
        uri: 'spotify:track:' + tr.id,
        source: 'spotify',
        title: tr.ti,
        artist: tr.ar,
        artwork: '',
        duration: Number(tr.d || 0)
      };
    } else if (tr.s === 'yt') {
      track = {
        id: 'yt_' + tr.id,
        videoId: tr.id,
        source: 'youtube',
        title: tr.ti,
        artist: tr.ar,
        artwork: `https://i.ytimg.com/vi/${tr.id}/hqdefault.jpg`,
        duration: Number(tr.d || 0)
      };
    } else if (tr.s === 'au') {
      track = {
        id: tr.id,
        source: 'audius',
        title: tr.ti,
        artist: tr.ar,
        artwork: '',
        duration: Number(tr.d || 0),
        streamUrl: `${AUDIUS_API}/tracks/${encodeURIComponent(tr.id)}/stream?app_name=LumoMusic`
      };
    } else if (tr.s === 'sp') {
      // Cross-platform: Host está no Spotify e Guest sem Spotify -> resolve automaticamente no YouTube!
      try {
        const wr = await fetch(`${WORKER_BASE}/yt-search?q=${encodeURIComponent((tr.ti + ' ' + tr.ar).trim())}`, { signal: AbortSignal.timeout(5500) });
        const wd = wr.ok ? await wr.json() : { items: [] };
        if (Array.isArray(wd.items) && wd.items.length) {
          track = { ...wd.items[0], title: tr.ti, artist: tr.ar };
        }
      } catch (_) {}
    }

    if (!track) return;

    const sameTrack = currentTrack && (currentTrack.id === track.id || (currentTrack.title === track.title && currentTrack.artist === track.artist));
    jamSuppressEmit = true;
    try {
      if (sameTrack) {
        if (Boolean(pkt.p) !== isPlaying) togglePlayPause();
        if (Math.abs(curTime - targetPos) > 2.5) seekTo(targetPos);
      } else {
        pendingJamSeek = { pos: targetPos, setAt: Date.now(), playing: Boolean(pkt.p) };
        await playTrack(track, [track], 0);
      }
    } finally {
      jamSuppressEmit = false;
    }
  }

  window.addEventListener('lumo-jam-changed', () => renderHero());

  // Garante que o título do cabeçalho na aba de música sempre mostre "Lumo Music"
  function fixHeaderTitle() {
    if (!viewMidia.classList.contains('active')) return;
    const h = document.getElementById('panel-title') || document.querySelector('#panel-header .panel-title, .header-title, #view-title');
    if (h && h.textContent.trim() === 'Mídia') h.textContent = 'Lumo Music';
  }
  new MutationObserver(fixHeaderTitle).observe(viewMidia, { attributes: true, attributeFilter: ['class'] });
  setTimeout(fixHeaderTitle, 300);

  window.LumoMusic = {
    playTrack,
    togglePlayPause,
    stopMusic,
    playNext,
    playPrev,
    seekTo,
    applyJamState,
    getState: () => ({
      track: currentTrack,
      playing: isPlaying,
      currentTime: curTime,
      duration,
      hasSpotify: Boolean(spTokens?.access_token)
    })
  };

  renderHero();
  renderLibrary();
  if (spTokens?.access_token) {
    setTimeout(() => loadSpotifyFeed('likes', ''), 900);
  }
})();
