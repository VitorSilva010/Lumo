// === LUMO v2.3.0 — MOTOR DE SKINS & ACESSÓRIOS ===
(function initLumoSkins() {
  const PRO_SKINS = new Set(['cyber', 'crown', 'halo']);
  const VALID_SKINS = ['reactive', 'headphones', 'glasses', 'cat', 'cyber', 'crown', 'halo'];
  const SKIN_LABELS = {
    reactive: 'Modo Reativo',
    headphones: 'Fones Fixos',
    glasses: 'Óculos Retrô',
    cat: 'Orelhinhas de Gato',
    cyber: 'Visor Cyber',
    crown: 'Coroa Real',
    halo: 'Auréola'
  };

  function userHasPro() {
    return (typeof isPro !== 'undefined' && isPro) || localStorage.getItem('lumo_pro') === 'true';
  }

  function syncProBodyClass() {
    document.body.classList.toggle('is-pro-user', userHasPro());
  }

  // Injeta os 4 SVGs extras dentro do #lumo-face
  const face = document.getElementById('lumo-face');
  if (face && !document.getElementById('acc-cat')) {
    const svgWrap = `
      <svg id="acc-cat" class="acc-extra" viewBox="0 0 72 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">
        <path d="M9 21 L15 4 L27 17 Z" fill="var(--bg-pill)" />
        <path d="M13 18 L16 8.5 L23 16 Z" fill="currentColor" opacity="0.32" stroke="none" />
        <path d="M63 21 L57 4 L45 17 Z" fill="var(--bg-pill)" />
        <path d="M59 18 L56 8.5 L49 16 Z" fill="currentColor" opacity="0.32" stroke="none" />
      </svg>
      <svg id="acc-cyber" class="acc-extra" viewBox="0 0 72 26" fill="none">
        <path d="M5 7 L14 4 L58 4 L67 7 L64 20 L48 22 L36 18 L24 22 L8 20 Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" />
        <line class="visor-shine" x1="16" y1="11" x2="56" y2="11" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
      </svg>
      <svg id="acc-crown" class="acc-extra" viewBox="0 0 40 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M5 19 L3 7 L12 13 L20 3 L28 13 L37 7 L35 19 Z" fill="currentColor" fill-opacity="0.28" />
        <circle cx="20" cy="3" r="1.6" fill="currentColor" stroke="none" />
      </svg>
      <svg id="acc-halo" class="acc-extra" viewBox="0 0 52 16" fill="none" stroke="currentColor" stroke-width="2.6">
        <ellipse cx="26" cy="8" rx="20" ry="4.6" />
      </svg>`;
    face.insertAdjacentHTML('afterbegin', svgWrap);
  }

  let currentSkin = localStorage.getItem('lumo_skin') || 'reactive';
  if (!VALID_SKINS.includes(currentSkin)) currentSkin = 'reactive';
  if (PRO_SKINS.has(currentSkin) && !userHasPro()) currentSkin = 'reactive';

  function applySkin(skinId, feedback = false) {
    const next = VALID_SKINS.includes(skinId) ? skinId : 'reactive';
    if (PRO_SKINS.has(next) && !userHasPro()) {
      if (typeof playChirp === 'function') playChirp(320, 240, 0.18);
      if (typeof say === 'function') say(`${SKIN_LABELS[next]} é uma skin do Lumo Pro!`, 2600, true);
      const licCard = document.getElementById('plan-status-badge')?.closest('.card');
      if (licCard) licCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    currentSkin = next;
    localStorage.setItem('lumo_skin', currentSkin);

    document.body.classList.remove(
      'skin-fixed', 'skin-headphones', 'skin-glasses',
      'skin-cat', 'skin-cyber', 'skin-crown', 'skin-halo'
    );
    if (currentSkin !== 'reactive') {
      document.body.classList.add('skin-fixed', 'skin-' + currentSkin);
    }

    document.querySelectorAll('.skin-btn').forEach((b) => {
      b.classList.toggle('active-btn', b.dataset.skin === currentSkin);
    });

    if (feedback) {
      if (typeof playChirp === 'function') playChirp(580, 860, 0.15);
      if (typeof hopPill === 'function') hopPill();
      if (typeof say === 'function') {
        const msg = currentSkin === 'reactive'
          ? 'Skin no modo reativo!'
          : `Skin ${SKIN_LABELS[currentSkin]} equipada!`;
        say(msg, 2200, true);
      }
    }
  }

  // Hook no reset de aparência e atualização do plano Pro
  if (typeof window.resetInterfaceStyle === 'function') {
    const _origReset = window.resetInterfaceStyle;
    window.resetInterfaceStyle = function () {
      applySkin('reactive', false);
      return _origReset();
    };
  }
  if (typeof window.applyProUI === 'function') {
    const _origProUI = window.applyProUI;
    window.applyProUI = function () {
      const r = _origProUI();
      syncProBodyClass();
      return r;
    };
  }

  syncProBodyClass();
  applySkin(currentSkin, false);
  window.applySkin = applySkin;
})();
