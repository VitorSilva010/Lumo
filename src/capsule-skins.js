// === LUMO v2.9.10 — SKINS DA CÁPSULA, OLHOS & ÍCONES SVG ADAPTATIVOS ===
(function initCapsuleSkins() {
  const S = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  // SVGs adaptativos para os 7 acessórios existentes ("Skins do Lumo")
  const ACCESSORY_SVGS = {
    reactive:   S('<path d="M12 3l1.9 5.5L19.5 10.5l-5.6 2L12 18l-1.9-5.5-5.6-2 5.6-2L12 3z"/><path d="M19 4v2M18 5h2"/>'),
    headphones: S('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="2"/><rect x="17" y="13" width="4" height="7" rx="2"/>'),
    glasses:    S('<rect x="2.5" y="9" width="7.5" height="6" rx="2.5"/><rect x="14" y="9" width="7.5" height="6" rx="2.5"/><path d="M10 11.5h4"/>'),
    cat:        S('<path d="M5 10L6.5 4l4 3.5h3L17.5 4 19 10a7 7 0 0 1-14 0z"/><circle cx="9.5" cy="12" r="0.8" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12" r="0.8" fill="currentColor" stroke="none"/>'),
    cyber:      S('<path d="M3 10l3-3h12l3 3-1.5 6-5.5 1.5L12 16l-2 1.5L4.5 16 3 10z"/><path d="M8 11.5h8"/>'),
    crown:      S('<path d="M4 18L3 8l5 4 4-6 4 6 5-4-1 10H4z"/><path d="M5 20.5h14"/>'),
    halo:       S('<ellipse cx="12" cy="7.5" rx="7.5" ry="2.6"/><path d="M6.5 17a5.5 5.5 0 0 1 11 0"/>')
  };

  const CAPSULE_SKINS = [
    { id: 'default', label: 'Padrão',  pro: false, svg: S('<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="9.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>') },
    { id: 'glass',   label: 'Vidro',   pro: false, svg: S('<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M8 15l6-6M12 15l4-4"/>') },
    { id: 'minimal', label: 'Minimal', pro: false, svg: S('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>') },
    { id: 'cyber',   label: 'Cyber',   pro: true,  svg: S('<polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/>') },
    { id: 'retro',   label: '8-bit',   pro: true,  svg: S('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h4M9 10v4"/><circle cx="15.5" cy="11" r="0.9" fill="currentColor" stroke="none"/><circle cx="17.5" cy="13" r="0.9" fill="currentColor" stroke="none"/>') },
    { id: 'aurora',  label: 'Aurora',  pro: true,  svg: S('<path d="M3 16c2.5-6 5.5-8 9-4s6.5 2 9-4"/><path d="M4 19c3-3.5 6-4.5 9-2s5 1.5 7-2"/>') }
  ];

  const EYE_STYLES = [
    { id: 'classic', label: 'Clássico', pro: false, svg: S('<rect x="6" y="7" width="4.2" height="10" rx="2.1" fill="currentColor" stroke="none"/><rect x="13.8" y="7" width="4.2" height="10" rx="2.1" fill="currentColor" stroke="none"/>') },
    { id: 'kawaii',  label: 'Kawaii',   pro: false, svg: S('<circle cx="8" cy="12" r="3.4" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="3.4" fill="currentColor" stroke="none"/><circle cx="7" cy="10.8" r="1.1" fill="#0b0d14" stroke="none"/><circle cx="15" cy="10.8" r="1.1" fill="#0b0d14" stroke="none"/>') },
    { id: 'minimal', label: 'Minimal',  pro: false, svg: S('<circle cx="8.2" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="15.8" cy="12" r="2.2" fill="currentColor" stroke="none"/>') },
    { id: 'pixel',   label: 'Pixel',    pro: true,  svg: S('<rect x="6" y="8" width="4.5" height="8" rx="0.6" fill="currentColor" stroke="none"/><rect x="13.5" y="8" width="4.5" height="8" rx="0.6" fill="currentColor" stroke="none"/>') },
    { id: 'visor',   label: 'Visor',    pro: true,  svg: S('<rect x="4" y="10" width="6.5" height="4" rx="1.8" fill="currentColor" stroke="none"/><rect x="13.5" y="10" width="6.5" height="4" rx="1.8" fill="currentColor" stroke="none"/>') }
  ];

  function hasPro() {
    return (typeof isPro !== 'undefined' && isPro) || localStorage.getItem('lumo_pro') === 'true';
  }

  let currentCapsule = localStorage.getItem('lumo_capsule_skin') || 'default';
  if (!CAPSULE_SKINS.some((s) => s.id === currentCapsule)) currentCapsule = 'default';
  let currentEyes = localStorage.getItem('lumo_eyestyle') || 'classic';

  function upgradeAccessoryIcons() {
    document.querySelectorAll('.skin-grid .skin-btn').forEach((btn) => {
      const ic = btn.querySelector('.sk-ic');
      if (!ic || ic.querySelector('svg')) return;
      const key =
        btn.dataset.skin ||
        (btn.getAttribute('onclick') || '').match(/'([a-z]+)'/i)?.[1] ||
        '';
      if (ACCESSORY_SVGS[key]) {
        ic.innerHTML = ACCESSORY_SVGS[key];
      }
    });
  }

  function applyCapsuleSkin(id, announce = false) {
    const spec = CAPSULE_SKINS.find((s) => s.id === id) || CAPSULE_SKINS[0];
    if (spec.pro && !hasPro()) {
      if (typeof say === 'function') say(`Skin "${spec.label}" é exclusiva do Lumo Pro`, 2600, true);
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
      if (typeof say === 'function') say(`Olhos "${spec.label}" são exclusivos do Lumo Pro`, 2600, true);
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
    upgradeAccessoryIcons();
    if (document.getElementById('capsule-skins-section')) return;
    const skinGrid = document.querySelector('.skin-grid');
    const hostCard = skinGrid ? skinGrid.closest('.card') : document.querySelector('#view-config .card');
    if (!hostCard) return;

    const capBtns = CAPSULE_SKINS.map((s) => `
      <button type="button" class="cs-btn cs-capsule-btn" data-id="${s.id}" onclick="LumoCapsuleSkins.setCapsule('${s.id}')">
        ${s.pro ? '<span class="skin-pro-tag">PRO</span>' : ''}
        <span class="cs-ic">${s.svg}</span>
        <span>${s.label}</span>
      </button>`).join('');

    const eyeBtns = EYE_STYLES.map((e) => `
      <button type="button" class="cs-btn cs-eye-btn" data-id="${e.id}" onclick="LumoCapsuleSkins.setEyes('${e.id}')">
        ${e.pro ? '<span class="skin-pro-tag">PRO</span>' : ''}
        <span class="cs-ic">${e.svg}</span>
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

  if (CAPSULE_SKINS.find((s) => s.id === currentCapsule)?.pro && !hasPro()) currentCapsule = 'default';
  if (EYE_STYLES.find((e) => e.id === currentEyes)?.pro && !hasPro()) {
    currentEyes = 'classic';
    localStorage.setItem('lumo_eyestyle', 'classic');
  }
  applyCapsuleSkin(currentCapsule, false);
  mountUI();
  setTimeout(mountUI, 400);
})();
