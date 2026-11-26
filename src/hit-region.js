// === LUMO v3.0.2 — ÁREA DE CLIQUE MILIMÉTRICA (CLICK-THROUGH NAS BORDAS TRANSPARENTES) ===
(function initLumoHitRegion() {
  function callRust(cmd, args) {
    if (typeof invoke === 'function') return invoke(cmd, args);
    const fn = window.__TAURI__?.core?.invoke;
    return fn ? fn(cmd, args) : Promise.resolve(null);
  }

  let rafId = 0;
  let lastPayload = '';

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function pushRect(list, r, pad = 2) {
    list.push({
      x: Math.round(r.left - pad),
      y: Math.round(r.top - pad),
      w: Math.round(r.width + pad * 2),
      h: Math.round(r.height + pad * 2)
    });
  }

  function collectHitState() {
    // Em modo cinema ou menu de contexto global, desativa click-through temporariamente
    const cinema = document.getElementById('cinema-stage');
    if (cinema && (cinema.classList.contains('active') || cinema.classList.contains('show'))) {
      return { enabled: false, rects: [] };
    }

    const rects = [];
    const pill = document.getElementById('lumo-pill');
    const pillRect = isVisible(pill) ? pill.getBoundingClientRect() : null;
    if (pillRect) pushRect(rects, pillRect, 2);

    const panel = document.getElementById('panel');
    if (panel && panel.classList.contains('open') && isVisible(panel)) {
      pushRect(rects, panel.getBoundingClientRect(), 2);
    }

    const mini = document.getElementById('pill-mini-player');
    if (mini && mini.classList.contains('show') && isVisible(mini)) {
      const mr = mini.getBoundingClientRect();
      pushRect(rects, mr, 3);
      // Ponte invisível entre cápsula e mini-player para o mouse deslizar sem perder o hover
      if (pillRect) {
        const left = Math.min(pillRect.left, mr.left);
        const right = Math.max(pillRect.right, mr.right);
        const top = Math.min(pillRect.bottom, mr.bottom);
        const bottom = Math.max(pillRect.top, mr.top);
        if (bottom > top && bottom - top < 24) {
          rects.push({ x: Math.round(left), y: Math.round(top - 2), w: Math.round(right - left), h: Math.round(bottom - top + 4) });
        }
      }
    }

    const bubble = document.getElementById('speech-bubble');
    if (bubble && bubble.classList.contains('show') && isVisible(bubble)) {
      pushRect(rects, bubble.getBoundingClientRect(), 2);
    }

    // Eventuais modais ou menus flutuantes abertos fora do #panel
    document.querySelectorAll('.lumo-modal.open, .ctx-menu.show, #context-menu.show').forEach((el) => {
      if (isVisible(el)) pushRect(rects, el.getBoundingClientRect(), 2);
    });

    if (!rects.length) return { enabled: false, rects: [] };
    return { enabled: true, rects };
  }

  function syncHitRects() {
    rafId = 0;
    const state = collectHitState();
    const sig = JSON.stringify(state);
    if (sig === lastPayload) return;
    lastPayload = sig;
    callRust('set_hit_rects', state).catch(() => {});
  }

  function scheduleSync() {
    if (rafId) return;
    rafId = requestAnimationFrame(syncHitRects);
  }

  // Observa mudanças de classe/estilo nos elementos interativos da cápsula
  const watchIds = ['lumo-pill', 'panel', 'pill-mini-player', 'speech-bubble', 'cinema-stage'];
  const mo = new MutationObserver(scheduleSync);
  watchIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
  });

  // Observa mudanças de largura da cápsula (HUD de relógio, download chip, etc.)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(scheduleSync);
    const pill = document.getElementById('lumo-pill');
    const panel = document.getElementById('panel');
    if (pill) ro.observe(pill);
    if (panel) ro.observe(panel);
  }

  window.addEventListener('resize', scheduleSync);
  window.syncLumoHitRects = scheduleSync;

  // Quando o Rust detecta que o mouse saiu da cápsula, fecha o mini-player suavemente
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen === 'function') {
    listen('lumo-cursor-outside', () => {
      const mini = document.getElementById('pill-mini-player');
      if (mini && mini.classList.contains('show')) {
        mini.classList.remove('show');
        scheduleSync();
      }
    }).catch(() => {});
  }

  // Sincronização inicial + após animação de boot
  setTimeout(scheduleSync, 150);
  setTimeout(scheduleSync, 850);
  setInterval(syncHitRects, 2500);
})();
