// === LUMO v2.9.8 — SKINS DA CÁPSULA & ESTILOS DE OLHOS ===
(function initCapsuleSkins() {
  const CAPSULE_SKINS = [
    { id: 'default', icon: '⚫', label: 'Padrão',  pro: false },
    { id: 'glass',   icon: '🧊', label: 'Vidro',   pro: false },
    { id: 'minimal', icon: '🫧', label: 'Minimal', pro: false },
    { id: 'cyber',   icon: '⚡', label: 'Cyber',   pro: true  },
    { id: 'retro',   icon: '👾', label: '8-bit',   pro: true  },
    { id: 'aurora',  icon: '🌌', label: 'Aurora',  pro: true  }
  ];

  const EYE_STYLES = [
    { id: 'classic', icon: '◉', label: 'Clássico', pro: false },
    { id: 'kawaii',  icon: '✦', label: 'Kawaii',   pro: false },
    { id: 'minimal', icon: '•', label: 'Minimal',  pro: false },
    { id: 'pixel',   icon: '▪', label: 'Pixel',    pro: true  },
    { id: 'visor',   icon: '▬', label: 'Visor',    pro: true  }
  ];

  function hasPro() {
    return (typeof isPro !== 'undefined' && isPro) || localStorage.getItem('lumo_pro') === 'true';
  }

  let currentCapsule = localStorage.getItem('lumo_capsule_skin') || 'default';
  if (!CAPSULE_SKINS.some((s) => s.id === currentCapsule)) currentCapsule = 'default';

  let currentEyes = localStorage.getItem('lumo_eyestyle') || 'classic';

  function applyCapsuleSkin(id, announce = false) {
    const spec = CAPSULE_SKINS.find((s) => s.id === id) || CAPSULE_SKINS[0];
    if (spec.pro && !hasPro()) {
      if (typeof say === 'function') say(`Skin "${spec.label}" é exclusiva do Lumo Pro ✨`, 2600, true);
      if (typeof playChirp === 'function') playChirp(420, 320, 0.12);
      return;
    }
    CAPSULE_SKINS.forEach((s) => document.body.classList.remove('capsule-' + s.id));
    if (spec.id !== 'default') document.body.classList.add('capsule-' + spec.id);
    currentCapsule = spec.id;
    localStorage.setItem('lumo_capsule_skin', spec.id);
    syncButtons();
    if (announce) {
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(520, 780, 0.12);
    }
  }

  function applyEyeStyle(id, announce = false) {
    const spec = EYE_STYLES.find((s) => s.id === id);
    if (!spec) return;
    if (spec.pro && !hasPro()) {
      if (typeof say === 'function') say(`Olhos "${spec.label}" são exclusivos do Lumo Pro ✨`, 2600, true);
      if (typeof playChirp === 'function') playChirp(420, 320, 0.12);
      return;
    }
    currentEyes = spec.id;
    localStorage.setItem('lumo_eyestyle', spec.id);
    if (typeof restoreIdleExpression === 'function') restoreIdleExpression();
    else {
      const face = document.getElementById('lumo-face');
      if (face) face.className = 'face style-' + spec.id;
    }
    syncButtons();
    if (announce) {
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(580, 860, 0.12);
    }
  }

  function syncButtons() {
    document.querySelectorAll('.cs-capsule-btn').forEach((b) => {
      b.classList.toggle('active-btn', b.dataset.id === currentCapsule);
    });
    document.querySelectorAll('.cs-eye-btn').forEach((b) => {
      b.classList.toggle('active-btn', b.dataset.id === currentEyes);
    });
  }

  function mountUI() {
    if (document.getElementById('capsule-skins-section')) return;
    const skinGrid = document.querySelector('.skin-grid');
    const hostCard = skinGrid ? skinGrid.closest('.card') : document.querySelector('#view-config .card');
    if (!hostCard) return;

    const capBtns = CAPSULE_SKINS.map((s) => `
      <button type="button" class="cs-btn cs-capsule-btn" data-id="${s.id}" onclick="LumoCapsuleSkins.setCapsule('${s.id}')">
        ${s.pro ? '<span class="skin-pro-tag">PRO</span>' : ''}
        <span class="cs-ic">${s.icon}</span>
        <span>${s.label}</span>
      </button>`).join('');

    const eyeBtns = EYE_STYLES.map((e) => `
      <button type="button" class="cs-btn cs-eye-btn" data-id="${e.id}" onclick="LumoCapsuleSkins.setEyes('${e.id}')">
        ${e.pro ? '<span class="skin-pro-tag">PRO</span>' : ''}
        <span class="cs-ic">${e.icon}</span>
        <span>${e.label}</span>
      </button>`).join('');

    hostCard.insertAdjacentHTML(
      'beforeend',
      `<div class="cs-section" id="capsule-skins-section">
        <div class="cs-label"><span>Skin da Cápsula</span></div>
        <div class="cs-grid">${capBtns}</div>
        <div class="cs-label" style="margin-top:4px;"><span>Estilo dos Olhos</span></div>
        <div class="cs-grid eyes-grid">${eyeBtns}</div>
      </div>`
    );
    syncButtons();
  }

  window.LumoCapsuleSkins = {
    setCapsule: (id) => applyCapsuleSkin(id, true),
    setEyes: (id) => applyEyeStyle(id, true)
  };

  // Aplica o estado salvo respeitando Pro
  if (CAPSULE_SKINS.find((s) => s.id === currentCapsule)?.pro && !hasPro()) {
    currentCapsule = 'default';
  }
  if (EYE_STYLES.find((e) => e.id === currentEyes)?.pro && !hasPro()) {
    currentEyes = 'classic';
    localStorage.setItem('lumo_eyestyle', 'classic');
  }
  applyCapsuleSkin(currentCapsule, false);
  mountUI();
  setTimeout(mountUI, 350);
})();
