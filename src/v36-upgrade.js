// === LUMO v3.6.0 — HALO RESPIRANDO NA CÁPSULA, ONDAS NO CARD/HERO, ORDEM DO RESUMO & HEADER LUMO MUSIC ===
(function initLumoV36Upgrade() {
  const pill = document.getElementById('lumo-pill');
  const face = document.getElementById('lumo-face');
  const viewMidia = document.getElementById('view-midia');
  let musicState = { playing: false, title: '' };

  // 1. Garante a ordem da grade 3x2: [IA Lumo, Lumo Ping, Lumo Music, Bolso, Foco & PC, Kit Rápido]
  function ensureHubGridLayout() {
    const grid = document.querySelector('#view-resumo .hub-grid');
    if (!grid) return;
    const tiles = Array.from(grid.querySelectorAll('.hub-tile'));
    const kitTile = tiles.find((t) => /kit rápido/i.test(t.textContent || ''));
    const musicTile =
      grid.querySelector('.hub-tile[data-lm-tile="1"]') ||
      tiles.find((t) => /lumo music|ambiente/i.test(t.textContent || ''));

    if (musicTile) {
      musicTile.setAttribute('data-lm-tile', '1');
      // Corrige qualquer texto residual "Lo-fi · Chuva" no card Lumo Music
      const subEl = musicTile.querySelector('#music-tile-sub') || musicTile.querySelector('.tile-sub');
      if (subEl) {
        subEl.id = 'music-tile-sub';
        if (/lo-?fi\s*[·-]\s*chuva/i.test(subEl.textContent || '')) {
          subEl.textContent = 'Músicas · Lo-fi · Rádio';
        }
      }
      // Injeta ondas animadas na caixinha do Lumo Music
      if (!musicTile.querySelector('.lm-tile-waves')) {
        const w = document.createElement('span');
        w.className = 'lm-tile-waves';
        w.innerHTML = '<i></i><i></i><i></i>';
        musicTile.appendChild(w);
      }
    }

    // Garante Lumo Music na 3ª posição (onde ficava Kit Rápido) e Kit Rápido por último
    if (kitTile && musicTile && kitTile !== musicTile) {
      const idxKit = Array.from(grid.children).indexOf(kitTile);
      const idxMus = Array.from(grid.children).indexOf(musicTile);
      if (idxKit >= 0 && idxMus > idxKit) {
        grid.insertBefore(musicTile, kitTile);
        grid.appendChild(kitTile);
      }
    }
  }

  // 2. Injeta ondas na base do card Now Playing (#lm-hero) e aplica estado .is-playing
  function syncHeroPlayingVisuals() {
    const hero = document.getElementById('lm-hero');
    if (!hero) return;
    if (!hero.querySelector('.lm-hero-waves')) {
      const w = document.createElement('div');
      w.className = 'lm-hero-waves';
      w.innerHTML = '<i></i>'.repeat(18);
      hero.appendChild(w);
    }
    const playingNow = Boolean(musicState.playing || (face && face.classList.contains('music')));
    hero.classList.toggle('is-playing', playingNow);
  }

  // 3. Sincroniza brilho pulsante da cápsula + ondas no card Lumo Music + subtítulo
  function syncAllMusicAura() {
    const externalPlaying = Boolean(face && face.classList.contains('music'));
    const playingNow = Boolean(musicState.playing || externalPlaying);

    if (pill) {
      const inGame = typeof isHiddenInGame !== 'undefined' && isHiddenInGame;
      pill.classList.toggle('music-aura', playingNow && !inGame && !window.lumoEcoMode);
    }

    const musicTile = document.querySelector('#view-resumo .hub-tile[data-lm-tile="1"]');
    if (musicTile) {
      musicTile.classList.toggle('lm-tile-playing', playingNow);
      const sub = musicTile.querySelector('#music-tile-sub') || musicTile.querySelector('.tile-sub');
      if (sub) {
        const mt = document.getElementById('mini-media-title')?.textContent?.trim() || '';
        const cleanTitle = musicState.title || (mt && !/pronto para|controle de m[ií]dia|tocando agora/i.test(mt) ? mt : '');
        if (playingNow) {
          sub.textContent = cleanTitle ? cleanTitle.slice(0, 24) : 'Tocando agora';
        } else if (cleanTitle) {
          sub.textContent = 'Pausado · ' + cleanTitle.slice(0, 18);
        } else {
          sub.textContent = 'Músicas · Lo-fi · Rádio';
        }
      }
    }
    syncHeroPlayingVisuals();
  }

  // 4. Garante cabeçalho "Lumo Music" no lugar de "Mídia" (independente do ID do elemento)
  function fixMidiaHeader() {
    if (!viewMidia || !viewMidia.classList.contains('active')) return;
    const header = document.querySelector('#panel-header, .panel-header, .panel-top, header');
    if (!header) return;
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim() === 'Mídia') {
        n.nodeValue = n.nodeValue.replace('Mídia', 'Lumo Music');
      }
    }
  }

  window.addEventListener('lumo-music-state', (ev) => {
    const d = ev.detail || {};
    musicState = { playing: Boolean(d.playing), title: d.title || '' };
    syncAllMusicAura();
  });

  if (face) {
    new MutationObserver(syncAllMusicAura).observe(face, { attributes: true, attributeFilter: ['class'] });
  }
  const heroEl = document.getElementById('lm-hero');
  if (heroEl) {
    new MutationObserver(syncHeroPlayingVisuals).observe(heroEl, { childList: true });
  }
  if (viewMidia) {
    new MutationObserver(fixMidiaHeader).observe(viewMidia, { attributes: true, attributeFilter: ['class'] });
  }
  // Header title já é gerenciado por viewTitles em app.js

  // Executa após ping.js montar a grade do Resumo
  ensureHubGridLayout();
  setTimeout(ensureHubGridLayout, 250);
  setTimeout(() => { ensureHubGridLayout(); syncAllMusicAura(); fixMidiaHeader(); }, 950);
})();
