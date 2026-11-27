// === LUMO v3.8.0 — SEPARAÇÃO DE APARÊNCIA (MASCOTE · CÁPSULA · INTERFACE) E CONFIGURAÇÕES ===
(function initLumoAppearanceView() {
  const viewApp = document.getElementById('view-aparencia');
  const viewCfg = document.getElementById('view-config');
  if (!viewApp || !viewCfg || window.LumoV38Appearance) return;

  const S = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const IC = {
    mascot:  S('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.4 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><line x1="9" y1="9.5" x2="9.01" y2="9.5"/><line x1="15" y1="9.5" x2="15.01" y2="9.5"/>'),
    capsule: S('<rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
    ui:      S('<circle cx="13.5" cy="6.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".8" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".8" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.6-10-8.6z"/>')
  };

  let activeTab = 'mascot';

  viewApp.innerHTML = `
    <div class="v37-subtabs cols-3" id="v38-app-tabs" style="grid-template-columns:repeat(3,1fr);">
      <button type="button" class="v37-subtab active" data-atab="mascot">${IC.mascot}<span>Mascote</span></button>
      <button type="button" class="v37-subtab" data-atab="capsule">${IC.capsule}<span>Cápsula</span></button>
      <button type="button" class="v37-subtab" data-atab="ui">${IC.ui}<span>Interface</span></button>
    </div>
    <div class="v38-pane" id="v38-pane-mascot"></div>
    <div class="v38-pane v37-hidden" id="v38-pane-capsule"></div>
    <div class="v38-pane v37-hidden" id="v38-pane-ui"></div>`;

  const paneMascot  = document.getElementById('v38-pane-mascot');
  const paneCapsule = document.getElementById('v38-pane-capsule');
  const paneUi      = document.getElementById('v38-pane-ui');

  function setAppTab(tab) {
    activeTab = tab === 'capsule' || tab === 'ui' ? tab : 'mascot';
    document.querySelectorAll('#v38-app-tabs [data-atab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.atab === activeTab);
    });
    paneMascot.classList.toggle('v37-hidden', activeTab !== 'mascot');
    paneCapsule.classList.toggle('v37-hidden', activeTab !== 'capsule');
    paneUi.classList.toggle('v37-hidden', activeTab !== 'ui');
  }

  document.getElementById('v38-app-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-atab]');
    if (b) setAppTab(b.dataset.atab);
  });

  // Organiza os blocos visuais de #view-config -> #view-aparencia sem perder eventos
  function organizeBlocks() {
    // 1. Expressões Rápidas (#lp-expr-card) -> Mascote
    const exprCard = document.getElementById('lp-expr-card');
    if (exprCard && exprCard.parentNode !== paneMascot) {
      paneMascot.appendChild(exprCard);
    }

    // 2. Skins da Cápsula + Karaokê + Cor Dinâmica (#lp-studio-card) -> Cápsula
    const studioCard = document.getElementById('lp-studio-card');
    if (studioCard && studioCard.parentNode !== paneCapsule) {
      paneCapsule.insertBefore(studioCard, paneCapsule.firstChild);
    }

    // 3. Bloco #capsule-skins-section (Skin da Cápsula + Estilo dos Olhos estendido) -> Card próprio em Cápsula
    const capSec = document.getElementById('capsule-skins-section');
    if (capSec && !document.getElementById('v38-capsule-extra-card')) {
      const wrap = document.createElement('div');
      wrap.className = 'card';
      wrap.id = 'v38-capsule-extra-card';
      wrap.appendChild(capSec);
      paneCapsule.appendChild(wrap);
    }

    // 4. Bloco #hud-mode-block ("Na cápsula fechada") -> Card próprio em Cápsula
    const hudBlk = document.getElementById('hud-mode-block');
    if (hudBlk && !document.getElementById('v38-hud-card')) {
      const wrap = document.createElement('div');
      wrap.className = 'card';
      wrap.id = 'v38-hud-card';
      wrap.appendChild(hudBlk);
      paneCapsule.appendChild(wrap);
    }

    // 5. Varre os cards restantes dentro de #view-config
    const cfgCards = Array.from(viewCfg.querySelectorAll(':scope > .card'));
    for (const card of cfgCards) {
      if (card.id === 'v38-pos-card') continue;
      const txt = (card.textContent || '').replace(/\s+/g, ' ').trim();

      // Card "Skins do Lumo" (Reativo, Fones, Óculos, Gato...) -> Mascote
      if (/Skins do Lumo/i.test(txt) && /Reativo/i.test(txt)) {
        paneMascot.insertBefore(card, paneMascot.firstChild);
        continue;
      }

      // Card "ESTILO DOS OLHOS" (Clássico / Fofo / Cyber) -> Mascote
      if (/Estilo dos Olhos/i.test(txt) && /Fofo/i.test(txt)) {
        paneMascot.appendChild(card);
        continue;
      }

      // Card "TEMA LUMINOSO" -> Interface
      if (/Tema Luminoso/i.test(txt)) {
        paneUi.insertBefore(card, paneUi.firstChild);
        continue;
      }

      // Card "FUNDO & FORMATO DA INTERFACE" (separa "Posição na tela" de volta para Configurações!)
      if (/Fundo\s*&\s*Formato/i.test(txt) || card.querySelector('#opacity-slider')) {
        // Extrai "Posição na tela" e sua grade para um card próprio em #view-config
        if (!document.getElementById('v38-pos-card')) {
          const posGrid =
            card.querySelector('#pos-grid, .pos-grid') ||
            Array.from(card.children).find((el) => /Topo Esq/i.test(el.textContent || ''));
          if (posGrid) {
            const posCard = document.createElement('div');
            posCard.className = 'card';
            posCard.id = 'v38-pos-card';
            posCard.innerHTML = '<div class="label-xs">Posição na Tela</div>';

            const prev = posGrid.previousElementSibling;
            if (prev && /Posição na tela/i.test(prev.textContent || '')) prev.remove();
            posCard.appendChild(posGrid);
            viewCfg.appendChild(posCard);
          }
        }
        paneUi.appendChild(card);
      }
    }

    // 6. Garante atalho limpo no rodapé de Configurações para abrir Aparência
    if (!document.getElementById('v38-goto-look')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'v38-goto-look';
      btn.className = 'v38-goto-look';
      btn.innerHTML = `
        <div class="v38-goto-left">
          <span class="v38-goto-ic">${IC.ui}</span>
          <div>
            <div class="v38-goto-title">Aparência, Skins & Temas</div>
            <div class="v38-goto-sub">Mascote, cápsula, expressões, cores e fundo</div>
          </div>
        </div>
        <span style="font-size:15px; color:var(--accent); font-weight:800;">›</span>`;
      btn.onclick = () => { if (typeof switchView === 'function') switchView('aparencia'); };
      viewCfg.appendChild(btn);
    }
  }

  // Garante título "Aparência" no cabeçalho quando a view estiver ativa
  function syncHeaderTitle() {
    if (!viewApp.classList.contains('active')) return;
    const h = document.getElementById('panel-title') || document.getElementById('view-title') || document.querySelector('.panel-title, .header-title');
    if (h) {
      h.textContent = 'Aparência';
      return;
    }
    const cfgBtn = document.querySelector('[onclick*="switchView(\'config\')"]');
    const header = cfgBtn?.closest('header, div');
    if (header) {
      const titleNode = header.querySelector('#view-name, .top-title, strong, span');
      if (titleNode && !titleNode.querySelector('svg')) titleNode.textContent = 'Aparência';
    }
  }

  new MutationObserver(syncHeaderTitle).observe(viewApp, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => organizeBlocks()).observe(viewCfg, { childList: true });

  organizeBlocks();
  setTimeout(organizeBlocks, 200);
  setTimeout(organizeBlocks, 750);
  setTimeout(organizeBlocks, 1500);

  window.LumoV38Appearance = { setTab: setAppTab, organize: organizeBlocks };
})();
