// === LUMO v2.6.2 — CURIOSIDADES MUSICAIS ESPONTÂNEAS COM IA ===
(function initMusicTrivia() {
  const COOLDOWN_MS = 25 * 60 * 1000; // Mínimo 25 min entre comentários automáticos
  const SETTLE_MS = 16000;            // Espera 16s na mesma faixa antes de comentar
  const TRIGGER_CHANCE = 0.35;        // 35% de chance (bem espontâneo)

  let enabled = localStorage.getItem('lumo_music_trivia') !== 'false';
  let lastTriggerAt = parseInt(localStorage.getItem('lumo_music_trivia_last') || '0', 10) || 0;
  let lastTrackedKey = '';
  let settleTimer = null;
  let inFlight = false;
  let activeTriviaMedia = null;
  let activeTriviaClearTimer = null;

  const IGNORED_TITLES = [
    'nenhuma mídia', 'nada tocando', 'sem mídia', 'aguardando mídia',
    'lumo', 'chuva', 'cafeteria', 'lo-fi', 'lofi', 'ambiente', 'ruído branco', 'floresta'
  ];

  const NON_MUSIC_PATTERNS = [
    /\b(podcast|epis[oó]dio|ep\.?\s*\d+|aula|curso|tutorial|gameplay|cortes|react|vlog|unboxing|review)\b/i,
    /\b(not[ií]cias|jornal|ao vivo|livestream|live\b|como fazer|explicado|resumo|document[aá]rio|trailer|#?shorts)\b/i
  ];

  const GENERIC_SUBS = new Set([
    'tocando', 'pausado', 'mídia', 'windows', 'spotify', 'chrome', 'edge',
    'firefox', 'opera', 'brave', 'vlc', 'deezer', 'tidal', 'apple music', 'media player'
  ]);

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function loadSeenToday() {
    try {
      const parsed = JSON.parse(localStorage.getItem('lumo_music_trivia_seen') || '{}');
      if (parsed.day === getTodayKey() && Array.isArray(parsed.keys)) {
        return new Set(parsed.keys);
      }
    } catch (_) {}
    return new Set();
  }

  function markSeenToday(key) {
    const set = loadSeenToday();
    set.add(key);
    localStorage.setItem(
      'lumo_music_trivia_seen',
      JSON.stringify({ day: getTodayKey(), keys: Array.from(set).slice(-80) })
    );
  }

  function readCurrentMedia() {
    const strip = document.getElementById('mini-media-strip');
    const titleEl = document.getElementById('mini-media-title');
    const subEl = document.getElementById('mini-media-sub');
    if (!strip || !titleEl) return null;

    const playing = strip.classList.contains('playing');
    const title = (titleEl.textContent || '').trim();
    const sub = (subEl?.textContent || '').trim();
    if (!playing || !title || title.length < 3) return null;

    const lower = title.toLowerCase();
    if (IGNORED_TITLES.some((bad) => lower === bad || lower.startsWith(bad + ' '))) return null;
    if (typeof activeAmbient !== 'undefined' && activeAmbient) return null;

    // Extrai artista se o subtítulo vier no formato "Artista · Spotify"
    const parts = sub.split('·').map((p) => p.trim()).filter(Boolean);
    let artist = '';
    if (parts.length && !GENERIC_SUBS.has(parts[0].toLowerCase())) {
      artist = parts[0];
    }

    const label = artist && !lower.includes(artist.toLowerCase()) ? `${title} - ${artist}` : title;
    const key = label.toLowerCase().replace(/\s+/g, ' ').trim();
    return { title, artist, sub, label, key };
  }

  function looksLikeMusic(media) {
    if (!media || media.title.length > 96) return false;
    if (NON_MUSIC_PATTERNS.some((rx) => rx.test(media.title))) return false;
    return true;
  }

  function isQuietState() {
    if (typeof isHiddenInGame !== 'undefined' && isHiddenInGame) return true;
    if (typeof isThinking !== 'undefined' && isThinking) return true;
    if (typeof isExpanded !== 'undefined' && isExpanded) return true;
    if (typeof timerInterval !== 'undefined' && timerInterval) return true;
    const stealth = document.getElementById('stealth-btn');
    if (stealth && (stealth.classList.contains('active') || stealth.classList.contains('active-btn'))) return true;
    return false;
  }

  function showTriviaBubble(text, media, manual) {
    if (typeof say !== 'function') return;
    say(`🎵 ${text}`, 7200, manual, null, false);

    const bubble = document.getElementById('speech-bubble');
    if (bubble) {
      activeTriviaMedia = media;
      bubble.classList.add('clickable');
      bubble.title = 'Clique para saber mais sobre esta música na IA';
      clearTimeout(activeTriviaClearTimer);
      activeTriviaClearTimer = setTimeout(() => {
        activeTriviaMedia = null;
        bubble.title = '';
      }, 7300);
    }

    if (typeof playChirp === 'function') playChirp(580, 880, 0.14);
    if (typeof hopPill === 'function') hopPill();
  }

  async function requestMusicTrivia(media, manual = false) {
    if (inFlight || typeof invoke !== 'function') return;
    inFlight = true;
    try {
      const prompt = [
        `O usuário está ouvindo: "${media.label}".`,
        'Escreva UMA curiosidade curta, verdadeira e interessante sobre essa música ou artista em português do Brasil (máximo 135 caracteres, texto corrido sem aspas, sem markdown e sem começar com "Curiosidade:", tom amigável de mascote).',
        'REGRA: Se não tiver certeza absoluta de um fato real sobre essa faixa, NÃO invente — faça apenas um comentário simpático e curto sobre o artista ou a vibe da música (máximo 110 caracteres).',
        manual ? '' : 'Se claramente NÃO for uma música (ex: vídeo comum, aula ou notícia), responda exatamente: SKIP'
      ].filter(Boolean).join(' ');

      const reply = await invoke('ask_gemini', {
        prompt,
        userName: (typeof userName !== 'undefined' && userName) ? userName : null
      });

      const clean = String(reply || '')
        .replace(/[*_`#]/g, '')
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean || /^skip\b/i.test(clean) || /^erro\b/i.test(clean)) {
        if (manual && typeof say === 'function') say('Não consegui puxar uma curiosidade dessa faixa agora.', 2800, true);
        return;
      }

      // Se não foi manual, confirma que o usuário ainda está ouvindo a mesma faixa e livre
      if (!manual) {
        const nowMedia = readCurrentMedia();
        if (!nowMedia || nowMedia.key !== media.key || isQuietState()) return;
      }

      const finalText = clean.length > 168 ? clean.slice(0, 165).trimEnd() + '…' : clean;
      markSeenToday(media.key);
      lastTriggerAt = Date.now();
      localStorage.setItem('lumo_music_trivia_last', String(lastTriggerAt));
      showTriviaBubble(finalText, media, manual);
    } catch (_) {
      if (manual && typeof say === 'function') say('Sem conexão para buscar curiosidade da música.', 2600, true);
    } finally {
      inFlight = false;
    }
  }

  function scheduleCheckIfChanged() {
    const media = readCurrentMedia();
    if (!media) {
      lastTrackedKey = '';
      clearTimeout(settleTimer);
      settleTimer = null;
      return;
    }
    if (media.key === lastTrackedKey) return;

    lastTrackedKey = media.key;
    clearTimeout(settleTimer);
    settleTimer = null;

    if (!enabled || !looksLikeMusic(media)) return;
    if (Date.now() - lastTriggerAt < COOLDOWN_MS) return;
    if (loadSeenToday().has(media.key)) return;

    const candidate = media;
    settleTimer = setTimeout(() => {
      if (!enabled || inFlight || isQuietState()) return;
      const current = readCurrentMedia();
      if (!current || current.key !== candidate.key) return;
      if (Date.now() - lastTriggerAt < COOLDOWN_MS) return;
      if (loadSeenToday().has(current.key)) return;
      if (Math.random() > TRIGGER_CHANCE) return;
      requestMusicTrivia(current, false);
    }, SETTLE_MS);
  }

  // Clique no balão da curiosidade abre a IA puxando papo sobre a faixa
  const bubbleEl = document.getElementById('speech-bubble');
  if (bubbleEl) {
    bubbleEl.addEventListener('click', (e) => {
      if (!activeTriviaMedia) return;
      e.stopImmediatePropagation();
      const chosen = activeTriviaMedia;
      activeTriviaMedia = null;
      clearTimeout(activeTriviaClearTimer);
      bubbleEl.classList.remove('show', 'clickable');
      bubbleEl.title = '';

      const panel = document.getElementById('panel');
      if (panel && !panel.classList.contains('open')) {
        document.getElementById('lumo-pill')?.click();
      }
      if (typeof openView === 'function') openView('ia');
      if (typeof window.executePrompt === 'function') {
        window.executePrompt(`Me conte mais curiosidades legais sobre a música "${chosen.label}"!`);
      }
    }, true);
  }

  // Ação manual (botão "Testar agora" nas Configurações ou comando /musica)
  async function triggerMusicTriviaNow() {
    const media = readCurrentMedia();
    if (!media) {
      if (typeof say === 'function') say('Dê play em alguma música primeiro!', 2600, true);
      return;
    }
    if (typeof say === 'function') say('Pesquisando curiosidade sobre essa faixa...', 2400, true);
    await requestMusicTrivia(media, true);
  }

  function toggleMusicTrivia(val) {
    enabled = Boolean(val);
    localStorage.setItem('lumo_music_trivia', String(enabled));
    if (typeof say === 'function') {
      say(enabled ? 'Curiosidades musicais ativadas! 🎵' : 'Curiosidades musicais pausadas.', 2200, true);
    }
  }

  // Injeta o controle nas Configurações (ao lado de "Atualizar automaticamente")
  const autoUpRow = document.getElementById('autoupdate-toggle')?.closest('.card-row');
  if (autoUpRow && !document.getElementById('music-trivia-toggle')) {
    autoUpRow.insertAdjacentHTML(
      'beforebegin',
      `<div class="card-row">
        <div style="min-width:0; padding-right:8px;">
          <div style="font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>Curiosidades musicais</span>
            <button type="button" onclick="triggerMusicTriviaNow()" style="font-size:9.8px; padding:2px 7px; border-radius:999px; border:1px solid var(--border); background:rgba(255,255,255,0.05); color:var(--accent); cursor:pointer; font-weight:600;">Testar agora</button>
          </div>
          <div style="font-size:10.5px; color:var(--muted);">IA comenta músicas tocando de vez em quando</div>
        </div>
        <label class="switch"><input type="checkbox" id="music-trivia-toggle" ${enabled ? 'checked' : ''} onchange="toggleMusicTrivia(this.checked)" /><span class="slider"></span></label>
      </div>`
    );
  }

  // Comando rápido /musica na barra inferior
  if (typeof window.quickCommand === 'function') {
    const _origQuick = window.quickCommand;
    window.quickCommand = async function (e) {
      const input = document.getElementById('quick-ai-input');
      const raw = (input?.value || '').trim().toLowerCase();
      if (raw === '/musica' || raw === '/música') {
        e.preventDefault();
        if (typeof stopTypingLook === 'function') stopTypingLook();
        input.value = '';
        await triggerMusicTriviaNow();
        return;
      }
      return _origQuick.call(this, e);
    };
  }

  window.toggleMusicTrivia = toggleMusicTrivia;
  window.triggerMusicTriviaNow = triggerMusicTriviaNow;

  // Observa mudanças de faixa com custo praticamente zero
  const titleNode = document.getElementById('mini-media-title');
  const stripNode = document.getElementById('mini-media-strip');
  const obs = new MutationObserver(scheduleCheckIfChanged);
  if (titleNode) obs.observe(titleNode, { childList: true, characterData: true, subtree: true });
  if (stripNode) obs.observe(stripNode, { attributes: true, attributeFilter: ['class'] });
  setInterval(scheduleCheckIfChanged, 6000);
})();
