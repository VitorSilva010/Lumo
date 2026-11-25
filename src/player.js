// === LUMO v2.2.0 — LEITOR DE MÍDIA GSMTC + RÁDIOS AO VIVO + PLAYLIST LOCAL ===
(function initLumoPlayer() {
  const RADIO_MIRRORS = [
    'https://de1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
    'https://de2.api.radio-browser.info'
  ];

  const audio = new Audio();
  audio.preload = 'none';

  let savedVol = parseInt(localStorage.getItem('lumo_player_vol') || '65', 10);
  if (Number.isNaN(savedVol) || savedVol < 0 || savedVol > 100) savedVol = 65;
  audio.volume = savedVol / 100;

  let playerTab = 'radio'; // 'radio' | 'local' | 'favs'
  let activeGenre = 'lofi';
  let radioResults = [];
  let favStations = [];
  try { favStations = JSON.parse(localStorage.getItem('lumo_radio_favs') || '[]'); } catch (_) {}

  let localTracks = []; // { name, url }
  let localIdx = -1;

  // Estado do player interno
  const internal = {
    active: false, // true quando rádio ou música local está no comando
    mode: null,    // 'radio' | 'local'
    title: '',
    sub: '',
    url: '',
    playing: false
  };

  // Estado real do Windows (GSMTC)
  let hasGsmtcData = false;
  let lastGsmtcKey = '';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function prettifyAppName(raw) {
    const l = String(raw || '').toLowerCase();
    if (!l) return 'Windows';
    if (l.includes('spotify')) return 'Spotify';
    if (l.includes('chrome')) return 'Chrome';
    if (l.includes('msedge') || l.includes('edge')) return 'Edge';
    if (l.includes('firefox')) return 'Firefox';
    if (l.includes('opera')) return 'Opera';
    if (l.includes('brave')) return 'Brave';
    if (l.includes('music') || l.includes('groove') || l.includes('zune')) return 'Media Player';
    if (l.includes('vlc')) return 'VLC';
    if (l.includes('apple') || l.includes('itunes')) return 'Apple Music';
    if (l.includes('deezer')) return 'Deezer';
    if (l.includes('tidal')) return 'TIDAL';
    const clean = raw.split(/[\\!]/).pop().replace(/\.exe$/i, '');
    return clean.slice(0, 18) || 'Windows';
  }

  function updateStripAndMascot(title, sub, playing) {
    const tEl = document.getElementById('mini-media-title');
    const sEl = document.getElementById('mini-media-sub');
    const vEl = document.getElementById('midia-view-track');
    if (tEl && title) tEl.textContent = title;
    if (sEl && sub !== undefined) sEl.textContent = sub;
    if (vEl && title) vEl.textContent = title;
    if (typeof isMediaPlaying !== 'undefined') isMediaPlaying = Boolean(playing);
    if (typeof syncPlayVisuals === 'function') syncPlayVisuals();
  }

  function syncInternalBarUI() {
    const bar = document.getElementById('player-now-bar');
    if (!bar) return;
    bar.classList.toggle('show', internal.active);
    if (!internal.active) return;

    const tEl = document.getElementById('pnow-title');
    const sEl = document.getElementById('pnow-sub');
    const seekRow = document.getElementById('pnow-seek-row');
    if (tEl) tEl.textContent = internal.title || 'Player Interno';
    if (sEl) {
      const stateTxt = internal.playing ? (internal.mode === 'radio' ? 'Ao vivo' : 'Tocando') : 'Pausado';
      sEl.textContent = `${stateTxt} · ${internal.sub}`;
    }
    if (seekRow) seekRow.classList.toggle('show', internal.mode === 'local');
  }

  // === EVENTOS DO <audio> ===
  audio.addEventListener('playing', () => {
    internal.playing = true;
    syncInternalBarUI();
    updateStripAndMascot(
      internal.title,
      `${internal.mode === 'radio' ? 'Rádio ao vivo' : 'Música local'} · Lumo`,
      true
    );
    renderPlayerList();
  });

  audio.addEventListener('pause', () => {
    if (!internal.active) return;
    internal.playing = false;
    syncInternalBarUI();
    updateStripAndMascot(internal.title, 'Pausado · Player Lumo', false);
    renderPlayerList();
  });

  audio.addEventListener('waiting', () => {
    if (!internal.active) return;
    const sEl = document.getElementById('pnow-sub');
    if (sEl) sEl.textContent = 'Carregando sinal...';
  });

  audio.addEventListener('timeupdate', () => {
    if (!internal.active || internal.mode !== 'local') return;
    const cur = document.getElementById('pnow-cur');
    const dur = document.getElementById('pnow-dur');
    const rng = document.getElementById('pnow-seek');
    if (cur) cur.textContent = fmtTime(audio.currentTime);
    if (dur) dur.textContent = fmtTime(audio.duration);
    if (rng && Number.isFinite(audio.duration) && audio.duration > 0) {
      rng.value = Math.round((audio.currentTime / audio.duration) * 1000);
    }
  });

  audio.addEventListener('ended', () => {
    if (internal.active && internal.mode === 'local' && localTracks.length > 0) {
      playLocalTrack((localIdx + 1) % localTracks.length);
    }
  });

  audio.addEventListener('error', () => {
    if (!internal.active) return;
    internal.playing = false;
    syncInternalBarUI();
    if (typeof say === 'function') say('Essa estação está fora do ar agora. Tente outra!', 2800, true);
    updateStripAndMascot(internal.title, 'Sinal indisponível', false);
  });

  // === CONTROLE DO PLAYER INTERNO ===
  function playRadioStation(st) {
    if (!st || !st.url) return;
    if (typeof stopAmbient === 'function' && typeof activeAmbient !== 'undefined' && activeAmbient) {
      stopAmbient();
    }
    internal.active = true;
    internal.mode = 'radio';
    internal.title = st.name;
    internal.sub = st.meta || 'Rádio Online';
    internal.url = st.url;
    internal.playing = false;

    audio.src = st.url;
    audio.play().catch(() => {
      if (typeof say === 'function') say('Não consegui abrir esta rádio. Tente outra!', 2600, true);
    });
    syncInternalBarUI();
    updateStripAndMascot(st.name, 'Conectando rádio...', true);
    renderPlayerList();
    if (typeof hopPill === 'function') hopPill();
  }

  function playLocalTrack(idx) {
    const tr = localTracks[idx];
    if (!tr) return;
    if (typeof stopAmbient === 'function' && typeof activeAmbient !== 'undefined' && activeAmbient) {
      stopAmbient();
    }
    localIdx = idx;
    internal.active = true;
    internal.mode = 'local';
    internal.title = tr.name;
    internal.sub = `Faixa ${idx + 1}/${localTracks.length}`;
    internal.url = tr.url;
    internal.playing = false;

    audio.src = tr.url;
    audio.play().catch(() => {});
    syncInternalBarUI();
    updateStripAndMascot(tr.name, 'Música local · Lumo', true);
    renderPlayerList();
    if (typeof hopPill === 'function') hopPill();
  }

  function stopInternalPlayer(silent = false) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    internal.active = false;
    internal.mode = null;
    internal.playing = false;
    internal.url = '';
    syncInternalBarUI();
    renderPlayerList();
    if (!silent) {
      lastGsmtcKey = '';
      updateStripAndMascot('Controle de Mídia', 'Mídia do Windows', false);
      pollWindowsMedia();
    }
  }

  function setInternalVolume(val) {
    const pct = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    audio.volume = pct / 100;
    localStorage.setItem('lumo_player_vol', String(pct));
    const lbl = document.getElementById('pvol-val');
    if (lbl) lbl.textContent = pct + '%';
  }

  function seekInternalTrack(val) {
    if (internal.mode !== 'local' || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(val) / 1000) * audio.duration;
  }

  // === BUSCA DE RÁDIOS (API PÚBLICA RADIO BROWSER — SOMENTE STREAMS HTTPS COMPATÍVEIS) ===
  async function fetchRadioBrowser(queryPath) {
    for (const mirror of RADIO_MIRRORS) {
      try {
        const res = await fetch(`${mirror}${queryPath}`, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) continue;
        const raw = await res.json();
        if (!Array.isArray(raw)) continue;
        const clean = [];
        const seen = new Set();
        for (const s of raw) {
          const u = String(s.url_resolved || s.url || '').trim();
          const codec = String(s.codec || '').toUpperCase();
          if (!u.startsWith('https://')) continue;
          if (/\.m3u8(\?|$)|\.pls(\?|$)/i.test(u)) continue;
          if (codec && !['MP3', 'AAC', 'AAC+', 'OGG', 'OPUS', 'UNKNOWN'].includes(codec)) continue;
          const name = String(s.name || '').trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          const parts = [s.countrycode || '', codec || '', s.bitrate ? `${s.bitrate}k` : ''].filter(Boolean);
          clean.push({
            id: s.stationuuid || u,
            name: name.slice(0, 48),
            url: u,
            meta: parts.join(' · ') || 'Rádio Online'
          });
          if (clean.length >= 12) break;
        }
        return clean;
      } catch (_) {}
    }
    return null;
  }

  async function loadRadioGenre(tag, btnEl) {
    activeGenre = tag;
    document.querySelectorAll('.genre-chip').forEach((b) => {
      b.classList.toggle('active', b === btnEl || b.dataset.genre === tag);
    });
    const list = document.getElementById('station-list');
    const cacheKey = 'lumo_rad_v1_' + tag;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.ts < 6 * 3600 * 1000 && cached.items?.length) {
        radioResults = cached.items;
        renderPlayerList();
        return;
      }
    } catch (_) {}

    if (list) list.innerHTML = '<div style="font-size:11px; color:var(--muted); text-align:center; padding:12px;">Buscando estações ao vivo...</div>';
    const items = await fetchRadioBrowser(
      `/json/stations/search?limit=28&hidebroken=true&order=clickcount&reverse=true&tag=${encodeURIComponent(tag)}`
    );
    if (items && items.length) {
      radioResults = items;
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items }));
    } else {
      radioResults = [];
    }
    renderPlayerList();
  }

  async function searchRadios(e) {
    e.preventDefault();
    const inp = document.getElementById('radio-search-input');
    const q = (inp?.value || '').trim();
    if (!q) return;
    document.querySelectorAll('.genre-chip').forEach((b) => b.classList.remove('active'));
    const list = document.getElementById('station-list');
    if (list) list.innerHTML = '<div style="font-size:11px; color:var(--muted); text-align:center; padding:12px;">Procurando rádios...</div>';
    const items = await fetchRadioBrowser(
      `/json/stations/search?limit=28&hidebroken=true&order=clickcount&reverse=true&name=${encodeURIComponent(q)}`
    );
    radioResults = items || [];
    renderPlayerList();
  }

  function toggleFavStation(id, ev) {
    if (ev) ev.stopPropagation();
    const existsIdx = favStations.findIndex((f) => f.id === id);
    if (existsIdx >= 0) {
      favStations.splice(existsIdx, 1);
    } else {
      const found = radioResults.find((r) => r.id === id);
      if (found) favStations.unshift(found);
    }
    favStations = favStations.slice(0, 20);
    localStorage.setItem('lumo_radio_favs', JSON.stringify(favStations));
    if (typeof playChirp === 'function') playChirp(600, 860, 0.12);
    renderPlayerList();
  }

  // === PLAYLIST LOCAL (MP3 / WAV / OGG / M4A) ===
  function openLocalMusicPicker() {
    if (typeof lockBlur === 'function') lockBlur();
    document.getElementById('local-music-picker')?.click();
    window.addEventListener('focus', () => { if (typeof unlockBlur === 'function') unlockBlur(); }, { once: true });
  }

  function onLocalMusicPicked(fileList) {
    if (typeof unlockBlur === 'function') unlockBlur();
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const startAt = localTracks.length;
    for (const f of files) {
      const cleanName = f.name.replace(/\.[^.]+$/, '');
      localTracks.push({ name: cleanName, url: URL.createObjectURL(f) });
    }
    switchPlayerTab('local');
    if (!internal.active || internal.mode !== 'local') {
      playLocalTrack(startAt);
    } else {
      renderPlayerList();
    }
  }

  function removeLocalTrack(idx, ev) {
    if (ev) ev.stopPropagation();
    const tr = localTracks[idx];
    if (tr?.url) URL.revokeObjectURL(tr.url);
    localTracks.splice(idx, 1);
    if (idx === localIdx) {
      stopInternalPlayer(false);
      localIdx = -1;
    } else if (idx < localIdx) {
      localIdx--;
    }
    renderPlayerList();
  }

  function switchPlayerTab(tab) {
    playerTab = tab;
    document.querySelectorAll('.ptab-btn').forEach((b) => b.classList.toggle('active', b.dataset.ptab === tab));
    const radioTools = document.getElementById('radio-tools-wrap');
    const localTools = document.getElementById('local-tools-wrap');
    if (radioTools) radioTools.style.display = tab === 'radio' ? 'flex' : 'none';
    if (localTools) localTools.style.display = tab === 'local' ? 'flex' : 'none';
    renderPlayerList();
    if (tab === 'radio' && !radioResults.length) loadRadioGenre(activeGenre);
  }

  function renderPlayerList() {
    const list = document.getElementById('station-list');
    if (!list) return;
    list.innerHTML = '';

    if (playerTab === 'local') {
      if (!localTracks.length) {
        list.innerHTML = '<div style="font-size:11px; color:var(--muted); text-align:center; padding:12px;">Clique em <strong>+ Adicionar Músicas</strong> para montar sua playlist offline (.mp3, .wav, .ogg).</div>';
        return;
      }
      localTracks.forEach((tr, idx) => {
        const isCur = internal.active && internal.mode === 'local' && localIdx === idx;
        const row = document.createElement('div');
        row.className = 'station-item' + (isCur ? ' playing' : '');
        row.onclick = () => playLocalTrack(idx);
        row.innerHTML = `
          <div class="st-main">
            <span class="st-name">${isCur && internal.playing ? '▶ ' : ''}${esc(tr.name)}</span>
            <span class="st-meta">Arquivo local</span>
          </div>
          <button type="button" class="del-btn" title="Remover" onclick="removeLocalTrack(${idx}, event)">×</button>`;
        list.appendChild(row);
      });
      return;
    }

    const source = playerTab === 'favs' ? favStations : radioResults;
    if (!source.length) {
      list.innerHTML = playerTab === 'favs'
        ? '<div style="font-size:11px; color:var(--muted); text-align:center; padding:12px;">Toque na ★ de qualquer rádio para salvar nos favoritos.</div>'
        : '<div style="font-size:11px; color:var(--muted); text-align:center; padding:12px;">Nenhuma estação encontrada. Tente outro gênero ou busca.</div>';
      return;
    }

    source.forEach((st) => {
      const isCur = internal.active && internal.mode === 'radio' && internal.url === st.url;
      const isFav = favStations.some((f) => f.id === st.id);
      const row = document.createElement('div');
      row.className = 'station-item' + (isCur ? ' playing' : '');
      row.onclick = () => playRadioStation(st);
      row.innerHTML = `
        <div class="st-main">
          <span class="st-name">${isCur && internal.playing ? '▶ ' : ''}${esc(st.name)}</span>
          <span class="st-meta">${esc(st.meta)}</span>
        </div>
        <button type="button" class="st-fav ${isFav ? 'on' : ''}" title="Favoritar" onclick="toggleFavStation('${esc(st.id).replace(/'/g, '&#39;')}', event)">${isFav ? '★' : '☆'}</button>`;
      list.appendChild(row);
    });
  }

  // === GSMTC DO WINDOWS (SPOTIFY, YOUTUBE, CHROME, EDGE — MESMO MINIMIZADOS) ===
  async function pollWindowsMedia() {
    if (typeof invoke !== 'function' || !invoke) return;
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    if ((internal.active && internal.playing) || (typeof activeAmbient !== 'undefined' && activeAmbient)) return;
    if (typeof trayOnlyMode !== 'undefined' && trayOnlyMode && typeof isExpanded !== 'undefined' && !isExpanded) return;

    try {
      const info = await invoke('get_media_info');
      if (info && info.title) {
        if (internal.active && !internal.playing) {
          if (!info.is_playing) return;
          stopInternalPlayer(true);
        }
        hasGsmtcData = true;
        const appName = prettifyAppName(info.app_name);
        const fullTitle = info.artist ? `${info.title} — ${info.artist}` : info.title;
        const sub = `${info.is_playing ? 'Tocando' : 'Pausado'} · ${appName}`;
        const key = `${fullTitle}|${info.is_playing}|${appName}`;
        if (key !== lastGsmtcKey) {
          lastGsmtcKey = key;
          updateStripAndMascot(fullTitle, sub, info.is_playing);
        }
      } else if (hasGsmtcData) {
        hasGsmtcData = false;
        lastGsmtcKey = '';
        updateStripAndMascot('Controle de Mídia', 'Spotify · YouTube · Chrome', false);
      }
    } catch (_) {}
  }

  // === INTEGRAÇÃO LIMPA COM APP.JS ===
  const _origToggleAmbient = window.toggleAmbient;
  if (typeof _origToggleAmbient === 'function') {
    window.toggleAmbient = function (type) {
      if (internal.active) stopInternalPlayer(true);
      return _origToggleAmbient(type);
    };
  }

  const _origSendMedia = window.sendMedia;
  window.sendMedia = async function (action) {
    if (internal.active) {
      if (action === 'play_pause') {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        if (typeof hopPill === 'function') hopPill();
        return;
      }
      if (internal.mode === 'local' && localTracks.length > 0 && (action === 'next' || action === 'prev')) {
        const step = action === 'next' ? 1 : -1;
        playLocalTrack((localIdx + step + localTracks.length) % localTracks.length);
        return;
      }
      if (internal.mode === 'radio' && (action === 'next' || action === 'prev')) {
        const pool = playerTab === 'favs' && favStations.length ? favStations : radioResults;
        if (pool.length > 1) {
          const curIdx = Math.max(0, pool.findIndex((s) => s.url === internal.url));
          const step = action === 'next' ? 1 : -1;
          playRadioStation(pool[(curIdx + step + pool.length) % pool.length]);
        }
        return;
      }
    }
    await _origSendMedia(action);
    setTimeout(pollWindowsMedia, 380);
  };

  // Evita que o título antigo de janela sobrescreva metadados reais do GSMTC ou do player interno
  const _origDetectTitle = window.detectMediaTitle;
  window.detectMediaTitle = function (rawTitle) {
    if (internal.active || hasGsmtcData) return;
    if (typeof _origDetectTitle === 'function') _origDetectTitle(rawTitle);
  };

  if (typeof window.gracefulShutdown === 'function') {
    const _origShutdown = window.gracefulShutdown;
    window.gracefulShutdown = async function () {
      stopInternalPlayer(true);
      return _origShutdown();
    };
  }

  // Carrega rádios na primeira vez que abrir a aba Mídia
  if (typeof window.openView === 'function') {
    const _origOpen = window.openView;
    window.openView = function (viewName) {
      _origOpen(viewName);
      if (viewName === 'midia' && playerTab === 'radio' && !radioResults.length) {
        loadRadioGenre(activeGenre);
      }
    };
  }

  // Inicialização do slider de volume e polling GSMTC leve (a cada 2s)
  const volInput = document.getElementById('pvol-slider');
  const volLbl = document.getElementById('pvol-val');
  if (volInput) volInput.value = savedVol;
  if (volLbl) volLbl.textContent = savedVol + '%';

  pollWindowsMedia();
  setInterval(pollWindowsMedia, 2000);

  window.switchPlayerTab = switchPlayerTab;
  window.loadRadioGenre = loadRadioGenre;
  window.searchRadios = searchRadios;
  window.toggleFavStation = toggleFavStation;
  window.openLocalMusicPicker = openLocalMusicPicker;
  window.onLocalMusicPicked = onLocalMusicPicked;
  window.removeLocalTrack = removeLocalTrack;
  window.stopInternalPlayer = stopInternalPlayer;
  window.setInternalVolume = setInternalVolume;
  window.seekInternalTrack = seekInternalTrack;
})();
