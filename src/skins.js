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
        <path d="M9 21 L15 4 L27 17 Z" fill="#12141a" />
        <path d="M13 18 L16 8.5 L23 16 Z" fill="currentColor" opacity="0.48" stroke="none" />
        <path d="M63 21 L57 4 L45 17 Z" fill="#12141a" />
        <path d="M59 18 L56 8.5 L49 16 Z" fill="currentColor" opacity="0.48" stroke="none" />
      </svg>
      <svg id="acc-cyber" class="acc-extra" viewBox="0 0 76 32" fill="none">
        <path d="M4 8 L13 3 L63 3 L72 8 L69 25 L51 29 L38 24 L25 29 L7 25 Z" fill="#0c0e14" fill-opacity="0.46" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M9 10 L67 10" stroke="currentColor" stroke-opacity="0.28" stroke-width="1" />
        <line class="visor-shine" x1="17" y1="9" x2="59" y2="9" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
      </svg>
      <svg id="acc-crown" class="acc-extra" viewBox="0 0 42 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
        <path d="M5 19 L3 7 L13 13 L21 3 L29 13 L39 7 L37 19 Z" fill="#12141a" />
        <path d="M5 19 L3 7 L13 13 L21 3 L29 13 L39 7 L37 19 Z" fill="currentColor" fill-opacity="0.42" />
        <circle cx="21" cy="3" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="3" cy="7" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="39" cy="7" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      <svg id="acc-halo" class="acc-extra" viewBox="0 0 54 16" fill="none" stroke="currentColor" stroke-width="2.8">
        <ellipse cx="27" cy="8" rx="20" ry="4.5" stroke="#12141a" stroke-width="4.8" opacity="0.65" />
        <ellipse cx="27" cy="8" rx="20" ry="4.5" />
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
  const planBadge = document.getElementById('plan-status-badge');
  if (planBadge) {
    new MutationObserver(syncProBodyClass).observe(planBadge, { childList: true, characterData: true, subtree: true });
  }

  syncProBodyClass();
  applySkin(currentSkin, false);
  window.applySkin = applySkin;
})();
