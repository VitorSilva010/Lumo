// === LUMO v3.1.0 — LUMO MUSIC (PLAYER HÍBRIDO BAIXA RAM + LETRAS SINCRONIZADAS) ===
(function initLumoMusic() {
  const viewMidia = document.getElementById('view-midia');
  if (!viewMidia || document.getElementById('lm-subtabs')) return;

  const AUDIUS_API = 'https://api.audius.co/v1';
  const YT_BRIDGE_URL = 'https://vitorsilva010.github.io/Lumo/yt-player.html';
  const WORKER_BASE = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev');

  const S = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const IC = {
    music:   S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
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
    radio:   S('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>')
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
  audio.volume = volume / 100;

  let mainTab = 'music';     // 'music' | 'legacy'
  let libTab = 'explore';    // 'explore' | 'queue' | 'likes' | 'playlists'
  let searchSrc = 'audius';  // 'audius' | 'youtube'
  let activeChip = 'trending';
  let searchQuery = '';
  let loadingList = false;
  let listMsg = '';
  let results = [];

  let queue = [];
  let queueIdx = -1;
  let currentTrack = null;
  let isPlaying = false;
  let isShuffle = false;
  let repeatMode = 'off'; // 'off' | 'all' | 'one'
  let curTime = 0;
  let duration = 0;
  let seeking = false;

  let likes = [];
  let playlists = [];
  let openedPlaylistId = null;
  try { likes = JSON.parse(localStorage.getItem('lumo_music_likes') || '[]'); } catch (_) {}
  try { playlists = JSON.parse(localStorage.getItem('lumo_music_playlists') || '[]'); } catch (_) {}
  if (!Array.isArray(likes)) likes = [];
  if (!Array.isArray(playlists)) playlists = [];

  // Letras (LRCLIB)
  let lyricsOpen = false;
  let lyricsLines = []; // [{ t, text }] ou plain
  let lyricsSynced = false;
  let lyricsStatus = '';
  let activeLyricIdx = -1;
  const lyricsCache = new Map();

  // Ponte YouTube sob demanda (destruída quando parada = 0 MB RAM)
  let ytHost = null;
  let ytFrame = null;
  let ytReady = false;
  let ytPendingId = null;

  function saveLikes() { localStorage.setItem('lumo_music_likes', JSON.stringify(likes.slice(0, 200))); }
  function savePlaylists() { localStorage.setItem('lumo_music_playlists', JSON.stringify(playlists.slice(0, 30))); }

  // === PONTE YOUTUBE SOB DEMANDA ===
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
    if (ytFrame && ytFrame.contentWindow) {
      ytFrame.contentWindow.postMessage(msg, '*');
    }
  }

  function loadYtVideo(videoId) {
    if (!ytHost) {
      ytHost = document.createElement('div');
      ytHost.id = 'lm-yt-host';
      document.body.appendChild(ytHost);
    }
    if (!ytFrame) {
      ytReady = false;
      ytPendingId = videoId;
      ytFrame = document.createElement('iframe');
      ytFrame.src = YT_BRIDGE_URL;
      ytFrame.allow = 'autoplay; encrypted-media';
      ytFrame.setAttribute('title', 'Lumo YouTube Audio');
      ytHost.appendChild(ytFrame);
    } else if (ytReady) {
      sendYt({ type: 'load', videoId, volume });
    } else {
      ytPendingId = videoId;
    }
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (!d || typeof d.type !== 'string' || !d.type.startsWith('lumo-yt-')) return;
    if (!currentTrack || currentTrack.source !== 'youtube') return;

    if (d.type === 'lumo-yt-ready') {
      ytReady = true;
      if (ytPendingId) {
        const id = ytPendingId;
        ytPendingId = null;
        sendYt({ type: 'load', videoId: id, volume });
      }
    } else if (d.type === 'lumo-yt-state') {
      if (d.state === 'playing') {
        isPlaying = true;
        if (d.duration > 0) duration = d.duration;
        syncGlobalVisuals();
        renderHero();
      } else if (d.state === 'paused') {
        isPlaying = false;
        syncGlobalVisuals();
        renderHero();
      } else if (d.state === 'ended') {
        handleTrackEnded();
      }
    } else if (d.type === 'lumo-yt-time') {
      if (!seeking) {
        curTime = d.current || 0;
        if (d.duration > 0) duration = d.duration;
        updateProgressDOM();
        syncActiveLyric();
      }
    } else if (d.type === 'lumo-yt-error') {
      if (typeof say === 'function') say('Esse vídeo bloqueou reprodução incorporada. Pulando...', 2800, true);
      if (queue.length > 1) playNext(true);
      else stopMusic();
    }
  });

  // === AUDIO NATIVO (AUDIUS / LOCAL) ===
  audio.addEventListener('playing', () => {
    if (!currentTrack || currentTrack.source === 'youtube') return;
    isPlaying = true;
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    syncGlobalVisuals();
    renderHero();
  });
  audio.addEventListener('pause', () => {
    if (!currentTrack || currentTrack.source === 'youtube') return;
    isPlaying = false;
    syncGlobalVisuals();
    renderHero();
  });
  audio.addEventListener('timeupdate', () => {
    if (!currentTrack || currentTrack.source === 'youtube' || seeking) return;
    curTime = audio.currentTime || 0;
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    updateProgressDOM();
    syncActiveLyric();
  });
  audio.addEventListener('ended', () => {
    if (!currentTrack || currentTrack.source === 'youtube') return;
    handleTrackEnded();
  });
  audio.addEventListener('error', () => {
    if (!currentTrack || currentTrack.source === 'youtube') return;
    if (typeof say === 'function') say('Não consegui carregar essa faixa. Tentando a próxima...', 2400, true);
    if (queue.length > 1) playNext(true);
    else stopMusic();
  });

  // === SINCRONIA COM CÁPSULA, HOVER MINI-PLAYER E RESUMO ===
  function syncGlobalVisuals() {
    try { isMediaPlaying = isPlaying; } catch (_) {}
    const title = currentTrack ? currentTrack.title : 'Pronto para controlar sua mídia';
    const sub = currentTrack
      ? `${currentTrack.artist} · ${isPlaying ? 'Tocando agora' : 'Pausado'}`
      : 'Pronto para controlar';

    const t1 = document.getElementById('mini-media-title');
    const s1 = document.getElementById('mini-media-sub');
    const mv = document.getElementById('midia-view-track');
    if (currentTrack) {
      if (t1) t1.textContent = title;
      if (s1) s1.textContent = sub;
      if (mv) mv.textContent = `${currentTrack.title} — ${currentTrack.artist}`;
    }

    const face = document.getElementById('lumo-face');
    if (face && !(typeof isThinking !== 'undefined' && isThinking)) {
      face.classList.toggle('music', Boolean(currentTrack && isPlaying));
    }
    if (typeof syncPlayVisuals === 'function') syncPlayVisuals();

    // Atualiza miniatura da capa no mini-player de hover
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

  // === CONTROLE DE REPRODUÇÃO ===
  function playTrack(track, newQueue = null, idxInQueue = -1) {
    if (!track) return;
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
    curTime = 0;
    duration = Number(track.duration || 0);
    activeLyricIdx = -1;

    if (typeof stopAmbient === 'function') { try { stopAmbient(); } catch (_) {} }

    if (track.source === 'youtube') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      loadYtVideo(track.videoId || track.id);
      isPlaying = true;
    } else {
      // Destrói iframe YouTube imediatamente para manter RAM em ~10 MB!
      destroyYtPlayer();
      audio.src = track.streamUrl || `${AUDIUS_API}/tracks/${encodeURIComponent(track.id)}/stream?app_name=LumoMusic`;
      audio.volume = volume / 100;
      audio.play().catch(() => {});
      isPlaying = true;
    }

    if (typeof hopPill === 'function') hopPill();
    syncGlobalVisuals();
    renderHero();
    renderLibrary();
    if (lyricsOpen) fetchLyricsFor(currentTrack);
  }

  function togglePlayPause() {
    if (!currentTrack) {
      if (queue.length) playTrack(queue[0], queue, 0);
      else if (results.length) playTrack(results[0], results, 0);
      return;
    }
    if (currentTrack.source === 'youtube') {
      if (isPlaying) { sendYt({ type: 'pause' }); isPlaying = false; }
      else { sendYt({ type: 'play' }); isPlaying = true; }
      syncGlobalVisuals();
      renderHero();
    } else {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    }
  }

  function stopMusic() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    destroyYtPlayer();
    currentTrack = null;
    isPlaying = false;
    curTime = 0;
    duration = 0;
    lyricsLines = [];
    syncGlobalVisuals();
    renderHero();
    renderLibrary();
    if (typeof say === 'function') say('Player parado · RAM liberada ✓', 1800, true);
  }

  function playNext(auto = false) {
    if (!queue.length) return;
    if (auto && repeatMode === 'one' && currentTrack) {
      seekTo(0);
      if (currentTrack.source === 'youtube') sendYt({ type: 'play' });
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

  function handleTrackEnded() {
    playNext(true);
  }

  function seekTo(sec) {
    const target = Math.max(0, Math.min(duration || 99999, Number(sec || 0)));
    curTime = target;
    if (currentTrack?.source === 'youtube') sendYt({ type: 'seek', sec: target });
    else if (Number.isFinite(audio.duration)) audio.currentTime = target;
    updateProgressDOM();
    syncActiveLyric();
  }

  function setVol(v) {
    volume = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
    localStorage.setItem('lumo_music_vol', String(volume));
    audio.volume = volume / 100;
    if (currentTrack?.source === 'youtube') sendYt({ type: 'volume', volume });
  }

  // === LETRAS SINCRONIZADAS (LRCLIB) ===
  function cleanTitleForLyrics(raw) {
    return String(raw || '')
      .replace(/\s*[\(\[](?:official|audio|video|lyrics?|hd|4k|visualizer|remix|ft\.?|feat\.?)[^\)\]]*[\)\]]/gi, '')
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

  async function fetchLyricsFor(track) {
    if (!track) return;
    const key = `${track.title}::${track.artist}`;
    if (lyricsCache.has(key)) {
      const cached = lyricsCache.get(key);
      lyricsLines = cached.lines;
      lyricsSynced = cached.synced;
      lyricsStatus = cached.status;
      renderLyricsBox();
      syncActiveLyric();
      return;
    }

    lyricsLines = [];
    lyricsSynced = false;
    lyricsStatus = 'Buscando letra sincronizada...';
    renderLyricsBox();

    const cleanTitle = cleanTitleForLyrics(track.title);
    const cleanArtist = cleanTitleForLyrics(track.artist);
    try {
      let data = null;
      const r1 = await fetch(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`,
        { signal: AbortSignal.timeout(5500) }
      );
      if (r1.ok) data = await r1.json();
      if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
        const r2 = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`,
          { signal: AbortSignal.timeout(5500) }
        );
        if (r2.ok) {
          const arr = await r2.json();
          if (Array.isArray(arr) && arr.length) {
            data = arr.find((x) => x.syncedLyrics) || arr[0];
          }
        }
      }

      if (data?.syncedLyrics) {
        lyricsLines = parseLrc(data.syncedLyrics);
        lyricsSynced = true;
        lyricsStatus = '';
      } else if (data?.plainLyrics) {
        lyricsLines = data.plainLyrics.split('\n').filter((x) => x.trim()).map((text) => ({ t: -1, text }));
        lyricsSynced = false;
        lyricsStatus = '';
      } else {
        lyricsLines = [];
        lyricsSynced = false;
        lyricsStatus = 'Letra não encontrada para esta faixa.';
      }
    } catch (_) {
      lyricsStatus = 'Sem conexão para buscar a letra.';
    }

    if (lyricsCache.size > 30) lyricsCache.clear();
    lyricsCache.set(key, { lines: lyricsLines, synced: lyricsSynced, status: lyricsStatus });
    renderLyricsBox();
    syncActiveLyric();
  }

  function renderLyricsBox() {
    const box = document.getElementById('lm-lyrics-box');
    if (!box) return;
    box.classList.toggle('show', lyricsOpen);
    if (!lyricsOpen) return;
    if (!currentTrack) {
      box.innerHTML = '<div class="lm-lyric-line">Toque uma música para acompanhar a letra.</div>';
      return;
    }
    if (lyricsStatus) {
      box.innerHTML = `<div class="lm-lyric-line">${esc(lyricsStatus)}</div>`;
      return;
    }
    box.innerHTML = lyricsLines
      .map((l, i) => `<div class="lm-lyric-line" data-lidx="${i}" data-lt="${l.t}">${esc(l.text)}</div>`)
      .join('');
  }

  function syncActiveLyric() {
    if (!lyricsOpen || !lyricsSynced || !lyricsLines.length) return;
    let idx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (curTime + 0.25 >= lyricsLines[i].t) idx = i;
      else break;
    }
    if (idx === activeLyricIdx) return;
    activeLyricIdx = idx;
    const box = document.getElementById('lm-lyrics-box');
    if (!box) return;
    box.querySelectorAll('.lm-lyric-line.active').forEach((el) => el.classList.remove('active'));
    if (idx >= 0) {
      const el = box.querySelector(`.lm-lyric-line[data-lidx="${idx}"]`);
      if (el) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  // === BUSCA & CATÁLOGO (AUDIUS + YOUTUBE) ===
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
    loadingList = true;
    listMsg = 'Carregando faixas leves...';
    renderLibrary();
    try {
      let url;
      if (query.trim()) {
        url = `${AUDIUS_API}/tracks/search?query=${encodeURIComponent(query.trim())}&app_name=LumoMusic&limit=18`;
      } else if (chip === 'trending') {
        url = `${AUDIUS_API}/tracks/trending?app_name=LumoMusic&limit=18`;
      } else {
        url = `${AUDIUS_API}/tracks/search?query=${encodeURIComponent(chip)}&app_name=LumoMusic&limit=18`;
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      const json = await res.json();
      results = (Array.isArray(json.data) ? json.data : []).map(mapAudiusTrack);
      listMsg = results.length ? '' : 'Nenhuma faixa encontrada no Audius.';
    } catch (_) {
      results = [];
      listMsg = 'Erro ao conectar no Audius. Tente novamente.';
    }
    loadingList = false;
    renderLibrary();
  }

  function extractYtId(input) {
    const s = String(input || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async function searchYouTube(query) {
    const q = String(query || '').trim();
    if (!q) {
      results = [];
      listMsg = 'Digite o nome da música ou cole um link do YouTube.';
      renderLibrary();
      return;
    }

    // 1. Link ou ID direto do YouTube (funciona 100% instantâneo sem precisar de busca)
    const directId = extractYtId(q);
    if (directId) {
      loadingList = true;
      listMsg = 'Carregando vídeo do YouTube...';
      renderLibrary();
      let title = 'Vídeo do YouTube';
      let artist = 'YouTube';
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + directId)}&format=json`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json();
          if (d.title) title = d.title;
          if (d.author_name) artist = d.author_name;
        }
      } catch (_) {}
      const track = {
        id: 'yt_' + directId,
        videoId: directId,
        source: 'youtube',
        title,
        artist,
        artwork: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        duration: 0
      };
      results = [track];
      loadingList = false;
      listMsg = '';
      playTrack(track, [track], 0);
      return;
    }

    // 2. Busca por nome via Worker (/yt-search) com fallback público Piped
    loadingList = true;
    listMsg = 'Buscando no YouTube...';
    renderLibrary();
    try {
      let items = null;
      try {
        const wr = await fetch(`${WORKER_BASE}/yt-search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(5500) });
        if (wr.ok) {
          const wd = await wr.json();
          if (Array.isArray(wd.items) && wd.items.length) items = wd.items;
        }
      } catch (_) {}

      if (!items) {
        const mirrors = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de'];
        for (const base of mirrors) {
          try {
            const pr = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=music_songs`, { signal: AbortSignal.timeout(5000) });
            if (!pr.ok) continue;
            const pd = await pr.json();
            if (Array.isArray(pd.items) && pd.items.length) {
              items = pd.items.slice(0, 15).map((it) => {
                const vid = extractYtId(it.url || '');
                return vid ? {
                  id: 'yt_' + vid,
                  videoId: vid,
                  source: 'youtube',
                  title: it.title || 'Música',
                  artist: it.uploaderName || 'YouTube',
                  artwork: it.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                  duration: Number(it.duration || 0)
                } : null;
              }).filter(Boolean);
              if (items.length) break;
            }
          } catch (_) {}
        }
      }

      results = items || [];
      listMsg = results.length ? '' : 'Cole um link do YouTube acima ou ative /yt-search no Worker para busca direta.';
    } catch (_) {
      results = [];
      listMsg = 'Não consegui buscar agora. Você pode colar qualquer link do YouTube direto na barra!';
    }
    loadingList = false;
    renderLibrary();
  }

  // === ESTRUTURA DOM DENTRO DE #view-midia ===
  const legacyPane = document.createElement('div');
  legacyPane.id = 'lm-legacy-pane';
  legacyPane.className = 'hidden';
  while (viewMidia.firstChild) legacyPane.appendChild(viewMidia.firstChild);

  viewMidia.innerHTML = `
    <div class="lm-subtabs" id="lm-subtabs">
      <button type="button" class="lm-subtab active" data-mtab="music">${IC.music}<span>Lumo Music</span></button>
      <button type="button" class="lm-subtab" data-mtab="legacy">${IC.radio}<span>Rádios & PC</span></button>
    </div>
    <div id="lm-music-pane">
      <div class="card lm-hero" id="lm-hero"></div>
      <div class="lm-lyrics-box" id="lm-lyrics-box"></div>
      <div class="card" id="lm-library"></div>
    </div>`;
  viewMidia.appendChild(legacyPane);

  // Listeners da sub-aba principal
  document.getElementById('lm-subtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.lm-subtab');
    if (!btn) return;
    mainTab = btn.dataset.mtab === 'legacy' ? 'legacy' : 'music';
    document.querySelectorAll('.lm-subtab').forEach((b) => b.classList.toggle('active', b.dataset.mtab === mainTab));
    document.getElementById('lm-music-pane').classList.toggle('hidden', mainTab !== 'music');
    document.getElementById('lm-legacy-pane').classList.toggle('hidden', mainTab !== 'legacy');
  });

  // Clique em linha de letra sincronizada pula para o momento exato
  document.getElementById('lm-lyrics-box').addEventListener('click', (e) => {
    const line = e.target.closest('.lm-lyric-line');
    if (!line) return;
    const t = parseFloat(line.dataset.lt);
    if (Number.isFinite(t) && t >= 0) seekTo(t);
  });

  function isLiked(id) {
    return likes.some((x) => x.id === id);
  }
  function toggleLike(track) {
    if (!track) return;
    const idx = likes.findIndex((x) => x.id === track.id);
    if (idx >= 0) likes.splice(idx, 1);
    else likes.unshift({ ...track });
    saveLikes();
    renderHero();
    renderLibrary();
  }

  function addToPlaylistPrompt(track) {
    if (!track) return;
    if (!playlists.length) {
      playlists.push({ id: 'pl_' + Date.now().toString(36), name: 'Favoritas', tracks: [track] });
      savePlaylists();
      if (typeof say === 'function') say(`Adicionada à playlist "Favoritas" ✓`, 2000, true);
      renderLibrary();
      return;
    }
    const target = playlists[0];
    if (!target.tracks.some((x) => x.id === track.id)) {
      target.tracks.push({ ...track });
      savePlaylists();
    }
    if (typeof say === 'function') say(`Adicionada em "${target.name}" ✓`, 2000, true);
    renderLibrary();
  }

  function updateProgressDOM() {
    const seek = document.getElementById('lm-seek');
    const tCur = document.getElementById('lm-t-cur');
    const tDur = document.getElementById('lm-t-dur');
    if (tCur) tCur.textContent = fmtSec(curTime);
    if (tDur) tDur.textContent = fmtSec(duration);
    if (seek && !seeking) {
      seek.max = String(Math.max(1, Math.floor(duration || 1)));
      seek.value = String(Math.min(Math.floor(curTime), Math.floor(duration || 1)));
    }
  }

  function renderHero() {
    const hero = document.getElementById('lm-hero');
    if (!hero) return;
    const liked = currentTrack ? isLiked(currentTrack.id) : false;
    const srcLabel = !currentTrack
      ? 'Audius + YouTube · Baixa RAM'
      : currentTrack.source === 'youtube'
        ? 'YouTube · Sob demanda'
        : 'Audius · Ultra-leve (~10MB)';

    hero.classList.toggle('has-art', Boolean(currentTrack?.artwork));
    hero.innerHTML = `
      <div class="lm-hero-glow" style="${currentTrack?.artwork ? `background-image:url('${esc(currentTrack.artwork)}')` : ''}"></div>
      <div class="lm-hero-inner">
        <div class="lm-top-row">
          <div class="lm-cover">
            ${currentTrack?.artwork ? `<img src="${esc(currentTrack.artwork)}" alt="" />` : IC.music}
          </div>
          <div class="lm-meta">
            <div class="lm-title">${esc(currentTrack ? currentTrack.title : 'Escolha uma música')}</div>
            <div class="lm-artist">${esc(currentTrack ? currentTrack.artist : 'Toque direto sem abrir navegador')}</div>
            <div class="lm-badge-row"><span class="lm-src-badge">${esc(srcLabel)}</span></div>
          </div>
          <div class="lm-hero-actions">
            <button type="button" class="lm-icon-btn ${liked ? 'liked' : ''}" data-hact="like" title="Curtir">${IC.heart}</button>
            <button type="button" class="lm-icon-btn ${lyricsOpen ? 'active' : ''}" data-hact="lyrics" title="Letra sincronizada">${IC.lyrics}</button>
            ${currentTrack ? `<button type="button" class="lm-icon-btn" data-hact="stop" title="Parar e liberar RAM">${IC.stop}</button>` : ''}
          </div>
        </div>
        <div class="lm-progress-wrap">
          <span class="lm-time" id="lm-t-cur">${fmtSec(curTime)}</span>
          <input type="range" id="lm-seek" class="lm-seek" min="0" max="${Math.max(1, Math.floor(duration || 1))}" value="${Math.min(Math.floor(curTime), Math.floor(duration || 1))}" />
          <span class="lm-time end" id="lm-t-dur">${fmtSec(duration)}</span>
        </div>
        <div class="lm-controls">
          <div class="lm-ctrl-group">
            <button type="button" class="lm-icon-btn ${isShuffle ? 'active' : ''}" data-hact="shuffle" title="Aleatório">${IC.shuffle}</button>
            <button type="button" class="lm-icon-btn" data-hact="prev" title="Anterior">${IC.prev}</button>
            <button type="button" class="lm-play-btn" data-hact="play" title="Play / Pausar">${isPlaying ? IC.pause : IC.play}</button>
            <button type="button" class="lm-icon-btn" data-hact="next" title="Próxima">${IC.next}</button>
            <button type="button" class="lm-icon-btn ${repeatMode !== 'off' ? 'active' : ''}" data-hact="repeat" title="Repetir: ${repeatMode}">${IC.repeat}</button>
          </div>
          <div class="lm-vol-wrap">
            <span style="width:14px; height:14px; color:var(--muted); display:inline-flex;">${IC.vol}</span>
            <input type="range" id="lm-vol" class="lm-vol" min="0" max="100" value="${volume}" />
          </div>
        </div>
      </div>`;

    const seek = document.getElementById('lm-seek');
    if (seek) {
      seek.addEventListener('mousedown', () => { seeking = true; });
      seek.addEventListener('touchstart', () => { seeking = true; }, { passive: true });
      seek.addEventListener('input', () => {
        const tCur = document.getElementById('lm-t-cur');
        if (tCur) tCur.textContent = fmtSec(parseFloat(seek.value));
      });
      seek.addEventListener('change', () => {
        seeking = false;
        seekTo(parseFloat(seek.value));
      });
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
    else if (act === 'like' && currentTrack) toggleLike(currentTrack);
    else if (act === 'shuffle') { isShuffle = !isShuffle; renderHero(); }
    else if (act === 'repeat') {
      repeatMode = repeatMode === 'off' ? 'all' : (repeatMode === 'all' ? 'one' : 'off');
      renderHero();
      if (typeof say === 'function') say(`Repetir: ${repeatMode === 'off' ? 'Desligado' : repeatMode === 'all' ? 'Fila' : 'Faixa atual'}`, 1600, true);
    } else if (act === 'lyrics') {
      lyricsOpen = !lyricsOpen;
      renderHero();
      renderLyricsBox();
      if (lyricsOpen && currentTrack) fetchLyricsFor(currentTrack);
    }
  });

  function renderTrackRows(list, ctx) {
    if (!list.length) {
      return `<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:16px 6px;">${esc(listMsg || 'Nenhuma faixa aqui ainda.')}</div>`;
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
          ${ctx !== 'queue' ? `<button type="button" class="lm-t-btn" data-tact="queue" title="Adicionar à fila">+</button>` : `<button type="button" class="lm-t-btn" data-tact="qrem" title="Remover da fila">×</button>`}
          ${ctx !== 'pl-open' ? `<button type="button" class="lm-t-btn" data-tact="pladd" title="Salvar na playlist">▤</button>` : `<button type="button" class="lm-t-btn" data-tact="plrem" title="Remover da playlist">×</button>`}
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
        <button type="button" class="lm-lib-tab ${libTab === 'explore' ? 'active' : ''}" data-ltab="explore">Explorar</button>
        <button type="button" class="lm-lib-tab ${libTab === 'queue' ? 'active' : ''}" data-ltab="queue">Fila (${queue.length})</button>
        <button type="button" class="lm-lib-tab ${libTab === 'likes' ? 'active' : ''}" data-ltab="likes">Curtidas (${likes.length})</button>
        <button type="button" class="lm-lib-tab ${libTab === 'playlists' ? 'active' : ''}" data-ltab="playlists">Playlists</button>
      </div>`;

    let body = '';
    if (libTab === 'explore') {
      const chips = [
        ['trending', 'Em Alta'],
        ['lofi', 'Lo-Fi'],
        ['electronic', 'Eletrônica'],
        ['hip hop', 'Hip-Hop'],
        ['pop', 'Pop'],
        ['rock', 'Rock'],
        ['phonk', 'Phonk']
      ];
      body = `
        <div class="lm-src-switch">
          <button type="button" class="lm-src-pill ${searchSrc === 'audius' ? 'active' : ''}" data-src="audius">Audius · Ultra-leve</button>
          <button type="button" class="lm-src-pill ${searchSrc === 'youtube' ? 'active' : ''}" data-src="youtube">YouTube · Link ou Busca</button>
        </div>
        <form class="lm-search-row" id="lm-search-form">
          <input type="text" id="lm-search-inp" class="lm-search-inp" value="${esc(searchQuery)}" placeholder="${searchSrc === 'youtube' ? 'Nome da música ou cole link do YouTube...' : 'Buscar música ou artista no Audius...'}" />
          <button type="submit" class="btn-primary" style="padding:6px 11px; font-size:11px;">Ir</button>
        </form>
        ${searchSrc === 'audius' ? `<div class="lm-chips">${chips.map(([k, l]) => `<button type="button" class="lm-chip ${activeChip === k ? 'active' : ''}" data-chip="${k}">${l}</button>`).join('')}</div>` : ''}
        <div class="lm-list">${loadingList ? `<div style="font-size:11px; color:var(--muted); text-align:center; padding:18px;">${esc(listMsg)}</div>` : renderTrackRows(results, 'explore')}</div>`;
    } else if (libTab === 'queue') {
      body = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:10.5px; color:var(--muted);">A seguir na reprodução</span>
          ${queue.length ? `<button type="button" class="btn-ghost" data-qact="clear" style="font-size:10px; padding:3px 8px;">Limpar fila</button>` : ''}
        </div>
        <div class="lm-list">${renderTrackRows(queue, 'queue')}</div>`;
    } else if (libTab === 'likes') {
      body = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:10.5px; color:var(--muted);">${likes.length} música${likes.length === 1 ? '' : 's'} curtida${likes.length === 1 ? '' : 's'}</span>
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
                <button type="button" class="lm-t-btn" data-pldel="${esc(p.id)}" title="Apagar playlist">×</button>
              </div>`).join('') : '<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:16px 6px;">Crie sua primeira playlist acima e clique em ▤ em qualquer música para salvar!</div>'}
          </div>`;
      }
    }

    lib.innerHTML = tabsHtml + body;
  }

  // Delegação de eventos da biblioteca
  const libEl = document.getElementById('lm-library');
  libEl.addEventListener('submit', (e) => {
    if (e.target.id === 'lm-search-form') {
      e.preventDefault();
      searchQuery = document.getElementById('lm-search-inp')?.value || '';
      if (searchSrc === 'youtube') searchYouTube(searchQuery);
      else loadAudiusFeed(activeChip, searchQuery);
    } else if (e.target.id === 'lm-newpl-form') {
      e.preventDefault();
      const inp = document.getElementById('lm-newpl-inp');
      const name = (inp?.value || '').trim();
      if (!name) return;
      playlists.unshift({ id: 'pl_' + Date.now().toString(36), name, tracks: [] });
      savePlaylists();
      renderLibrary();
    }
  });

  libEl.addEventListener('click', (e) => {
    const ltab = e.target.closest('[data-ltab]');
    if (ltab) { libTab = ltab.dataset.ltab; openedPlaylistId = null; renderLibrary(); return; }

    const srcBtn = e.target.closest('[data-src]');
    if (srcBtn) {
      searchSrc = srcBtn.dataset.src;
      if (searchSrc === 'audius' && (!results.length || results[0]?.source !== 'audius')) loadAudiusFeed(activeChip, searchQuery);
      else { results = []; listMsg = 'Digite o nome da música ou cole um link do YouTube.'; renderLibrary(); }
      return;
    }

    const chip = e.target.closest('[data-chip]');
    if (chip) { activeChip = chip.dataset.chip; searchQuery = ''; loadAudiusFeed(activeChip, ''); return; }

    if (e.target.closest('[data-qact="clear"]')) { queue = currentTrack ? [currentTrack] : []; queueIdx = currentTrack ? 0 : -1; renderLibrary(); return; }
    if (e.target.closest('[data-lact="playall"]') && likes.length) { playTrack(likes[0], likes, 0); return; }

    const plDel = e.target.closest('[data-pldel]');
    if (plDel) {
      e.stopPropagation();
      playlists = playlists.filter((p) => p.id !== plDel.dataset.pldel);
      savePlaylists();
      renderLibrary();
      return;
    }
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
    const pool = ctx === 'explore' ? results : ctx === 'queue' ? queue : ctx === 'likes' ? likes : (pl?.tracks || []);
    const track = pool[idx];
    if (!track) return;

    const actBtn = e.target.closest('[data-tact]');
    if (actBtn) {
      e.stopPropagation();
      const act = actBtn.dataset.tact;
      if (act === 'like') toggleLike(track);
      else if (act === 'queue') {
        queue.push({ ...track });
        if (typeof say === 'function') say(`"${track.title}" adicionada à fila ✓`, 1800, true);
        renderLibrary();
      } else if (act === 'qrem') {
        queue.splice(idx, 1);
        if (queueIdx >= queue.length) queueIdx = queue.length - 1;
        renderLibrary();
      } else if (act === 'pladd') {
        addToPlaylistPrompt(track);
      } else if (act === 'plrem' && pl) {
        pl.tracks.splice(idx, 1);
        savePlaylists();
        renderLibrary();
      }
      return;
    }

    playTrack(track, pool, idx);
  });

  // Integra com window.sendMedia (hover mini-player + controles universais)
  const _prevSendMedia = window.sendMedia;
  window.sendMedia = async function (action) {
    if (currentTrack) {
      if (action === 'play_pause') { togglePlayPause(); return; }
      if (action === 'next') { playNext(false); return; }
      if (action === 'prev') { playPrev(); return; }
      if (action === 'vol_up') { setVol(volume + 10); renderHero(); return; }
      if (action === 'vol_down') { setVol(volume - 10); renderHero(); return; }
      if (action === 'mute') { setVol(volume > 0 ? 0 : 70); renderHero(); return; }
    }
    if (typeof _prevSendMedia === 'function') return _prevSendMedia(action);
  };

  window.LumoMusic = { playTrack, togglePlayPause, stopMusic, playNext, playPrev };

  renderHero();
  renderLibrary();
  // Carrega o Em Alta do Audius discretamente ao iniciar
  setTimeout(() => loadAudiusFeed('trending', ''), 1200);
})();
