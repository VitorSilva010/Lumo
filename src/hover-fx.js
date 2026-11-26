// === LUMO v3.0.1 — MINI PLAYER NO HOVER & PARTÍCULAS ANIMADAS DO LUMO PING ===
(function initLumoHoverFx() {
  const pill = document.getElementById('lumo-pill');
  let hideTimer = null;
  let miniEl = null;

  function hasActiveMedia() {
    const titleEl = document.getElementById('mini-media-title');
    const subEl = document.getElementById('mini-media-sub');
    const title = (titleEl?.textContent || '').trim();
    const sub = (subEl?.textContent || '').trim();
    const playing =
      (typeof isMediaPlaying !== 'undefined' && Boolean(isMediaPlaying)) ||
      (document.getElementById('lumo-face')?.classList.contains('music') ?? false);
    const validTitle =
      Boolean(title) &&
      !/^(nada tocando|mídia|sem mídia|nenhuma música|nenhuma mídia|--)$/i.test(title);
    const validSub = /(tocando|pausado|ao vivo)/i.test(sub);
    return {
      ok: Boolean(playing || (validTitle && validSub)),
      playing,
      title: validTitle ? title : 'Mídia tocando'
    };
  }

  function updateMiniPlayerContent() {
    if (!miniEl) return;
    const info = hasActiveMedia();
    const tEl = miniEl.querySelector('.pmp-title');
    const playBtn = miniEl.querySelector('.pmp-btn.play');
    if (tEl) tEl.textContent = info.title;
    if (playBtn) playBtn.textContent = info.playing ? '⏸' : '▶';

    const pos = String(window.uiPosition || localStorage.getItem('lumo_pos') || 'top-center');
    miniEl.classList.toggle('pos-above', pos.startsWith('bottom-'));
    miniEl.classList.toggle('pos-left', pos.endsWith('-left'));
    miniEl.classList.toggle('pos-right', pos.endsWith('-right'));
  }

  function showMiniPlayer() {
    if (!miniEl || !pill) return;
    const expanded = typeof isExpanded !== 'undefined' && isExpanded;
    const hidden = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
    if (expanded || hidden || pill.classList.contains('dl-active')) return;
    const info = hasActiveMedia();
    if (!info.ok) return;
    clearTimeout(hideTimer);
    updateMiniPlayerContent();
    miniEl.classList.add('show');
  }

  function scheduleHideMiniPlayer(delay = 260) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      miniEl?.classList.remove('show');
    }, delay);
  }

  if (pill && !document.getElementById('pill-mini-player')) {
    miniEl = document.createElement('div');
    miniEl.id = 'pill-mini-player';
    miniEl.innerHTML = `
      <span class="pmp-dot"></span>
      <span class="pmp-title">Mídia</span>
      <div class="pmp-ctrls">
        <button type="button" class="pmp-btn" data-act="prev" title="Anterior">⏮</button>
        <button type="button" class="pmp-btn play" data-act="play_pause" title="Play / Pausar">⏯</button>
        <button type="button" class="pmp-btn" data-act="next" title="Próxima">⏭</button>
      </div>`;

    // Impede que o mousedown inicie arraste da janela ou acione clique na cápsula
    miniEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    miniEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    miniEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const btn = e.target.closest('.pmp-btn');
      if (!btn) return;
      const act = btn.dataset.act;
      if (!act) return;
      if (typeof window.sendMedia === 'function') {
        await window.sendMedia(act);
      } else if (typeof invoke === 'function') {
        await invoke('media_control', { action: act }).catch(() => {});
      }
      setTimeout(updateMiniPlayerContent, 300);
    });
    miniEl.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    miniEl.addEventListener('mouseleave', () => scheduleHideMiniPlayer(220));

    pill.appendChild(miniEl);
    pill.addEventListener('mouseenter', showMiniPlayer);
    pill.addEventListener('mouseleave', () => scheduleHideMiniPlayer(280));

    const panel = document.getElementById('panel');
    if (panel) {
      new MutationObserver(() => {
        if (panel.classList.contains('open')) miniEl.classList.remove('show');
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // === MOTOR DE PARTÍCULAS GPU PARA CUTUCÕES DO LUMO PING ===
  const EMOJI_MAP = {
    wave:  ['👋', '✨', '💬'],
    love:  ['❤️', '💖', '✨'],
    break: ['☕', '✨', '🍃'],
    alert: ['⚡', '✨', '🔔'],
    msg:   ['💬', '✨']
  };

  function pickEmojiSet(input) {
    const s = String(input || '');
    if (EMOJI_MAP[s]) return EMOJI_MAP[s];
    if (s.includes('❤') || s.includes('💖') || s.includes('carinho')) return EMOJI_MAP.love;
    if (s.includes('☕') || s.includes('pausa')) return EMOJI_MAP.break;
    if (s.includes('⚡') || s.includes('atenção')) return EMOJI_MAP.alert;
    if (s.includes('👋') || s.includes('oi')) return EMOJI_MAP.wave;
    return EMOJI_MAP.msg;
  }

  window.burstPingParticles = function (typeOrText = 'wave', color = '', count = 6) {
    if (!pill) return;
    if (window.lumoEcoMode || document.body.classList.contains('reduced-motion')) return;
    if (typeof isHiddenInGame !== 'undefined' && isHiddenInGame) return;

    const r = pill.getBoundingClientRect();
    if (r.width <= 0) return;

    const emojis = pickEmojiSet(typeOrText);
    const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '';
    const isBottom = String(window.uiPosition || localStorage.getItem('lumo_pos') || '').startsWith('bottom-');
    const total = Math.max(3, Math.min(8, Number(count) || 6));

    for (let i = 0; i < total; i++) {
      const el = document.createElement('span');
      el.className = 'ping-particle';
      el.textContent = emojis[i % emojis.length];
      const spread = (i / (total - 1) - 0.5) * 2;
      const dx = Math.round(spread * (46 + Math.random() * 28));
      const dy = Math.round(isBottom ? -(38 + Math.random() * 32) : (26 + Math.random() * 24));
      const rot = Math.round(spread * (22 + Math.random() * 18));
      const dur = (0.85 + Math.random() * 0.35).toFixed(2) + 's';

      el.style.left = (r.left + r.width / 2 + spread * 24) + 'px';
      el.style.top = (isBottom ? r.top + 6 : r.bottom - 10) + 'px';
      el.style.setProperty('--pt-x', dx + 'px');
      el.style.setProperty('--pt-y', dy + 'px');
      el.style.setProperty('--pt-r', rot + 'deg');
      el.style.setProperty('--pt-dur', dur);
      if (col) el.style.setProperty('--pt-color', col);

      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  };
})();
