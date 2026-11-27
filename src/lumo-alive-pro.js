// === LUMO v3.4.0 — LUMO VIVO, SKINS, KARAOKÊ NA CÁPSULA, COR DINÂMICA, PERFIS IA & CLIPBOARD PRO ===
(function initLumoAlivePro() {
  const S = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const ALP_IC = {
    normal: S('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>'),
    cool:   S('<rect x="2" y="8" width="8" height="5" rx="2"/><rect x="14" y="8" width="8" height="5" rx="2"/><path d="M10 10h4"/><path d="M8 16s1.5 1.5 4 1.5 4-1.5 4-1.5"/>'),
    wink:   S('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><path d="M14 9.5c.8-.8 2-.8 2.8 0"/>'),
    focus:  S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    sleepy: S('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    dizzy:  S('<path d="M12 12c0-1.5 1.5-2.5 3-2s2 2 1 3.5-3.5 2-5.5.5-2.5-4.5-1-6.5 4.5-3 7-1.5"/>'),
    dev:    S('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    study:  S('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
    short:  S('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    en:     S('<circle cx="12" cy="12" r="9"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>'),
    spark:  S('<path d="M12 3l2.2 6.2L20 12l-5.8 2.8L12 21l-2.2-6.2L4 12l5.8-2.8z"/>'),
    pin:    S('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1h1V3H7v2h1a1 1 0 0 1 1 1z"/>')
  };
  const pill = document.getElementById('lumo-pill');
  const face = document.getElementById('lumo-face');
  if (!pill || !face || window.LumoAlivePro) return;

  // === DETECÇÃO DE PLANO PRO ===
  function isPro() {
    try {
      if (window.isPro === true || window.isProUser === true || window.lumoIsPro === true) return true;
      if (document.body.classList.contains('is-pro') || document.body.classList.contains('pro-active')) return true;
      const flags = ['lumo_pro', 'lumo_is_pro', 'lumo_plan', 'lumo_license_tier', 'lumo_license_key', 'lumo_pro_key'];
      for (const k of flags) {
        const v = (localStorage.getItem(k) || '').trim().toLowerCase();
        if (v === 'true' || v === 'pro' || v === '1' || (k.includes('key') && v.length >= 6)) return true;
      }
    } catch (_) {}
    return false;
  }

  function promptUpgrade(featureName) {
    if (typeof say === 'function') {
      say(`👑 ${featureName} é exclusivo do Lumo Pro!`, 3200, true);
    }
    if (typeof openProModal === 'function') {
      try { openProModal(); } catch (_) {}
    }
  }

  // === 1. ÓCULOS ESCUROS (SVG) + EXPRESSÕES & MICRO-COMPORTAMENTOS ===
  if (!document.getElementById('lumo-shades')) {
    const shades = document.createElement('div');
    shades.id = 'lumo-shades';
    shades.innerHTML = `<svg viewBox="0 0 64 24" fill="none">
      <rect x="4" y="4" width="23" height="14" rx="5" fill="#090d16" stroke="var(--accent)" stroke-width="2"/>
      <rect x="37" y="4" width="23" height="14" rx="5" fill="#090d16" stroke="var(--accent)" stroke-width="2"/>
      <path d="M27 9h10" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M9 8l6 6M42 8l6 6" stroke="rgba(255,255,255,0.35)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
    pill.appendChild(shades);
  }

  const EXPR_CLASSES = ['expr-sleepy', 'expr-cool', 'expr-dizzy', 'expr-wink', 'expr-focus', 'expr-jamming'];
  let activeExpr = 'normal';
  let exprResetTimer = 0;
  let lastActivityAt = Date.now();
  let sleepyTimer = 0;
  let fxInterval = 0;
  let musicJamming = false;

  function spawnFx(symbol) {
    if (document.hidden || window.lumoEcoMode) return;
    const r = pill.getBoundingClientRect();
    if (!r.width) return;
    const el = document.createElement('div');
    el.className = 'lumo-alive-fx';
    el.textContent = symbol;
    el.style.left = (r.left + r.width * (0.45 + Math.random() * 0.25)) + 'px';
    el.style.top = Math.max(10, r.top + 4) + 'px';
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 26).toFixed(0) + 'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  function setAliveExpression(name, durationMs = 0) {
    clearTimeout(exprResetTimer);
    clearInterval(fxInterval);
    EXPR_CLASSES.forEach((c) => pill.classList.remove(c));
    activeExpr = name || 'normal';

    if (activeExpr !== 'normal') {
      pill.classList.add('expr-' + activeExpr);
    } else if (musicJamming) {
      pill.classList.add('expr-jamming');
    }

    if (activeExpr === 'sleepy') {
      spawnFx('Z');
      fxInterval = setInterval(() => {
        if (activeExpr === 'sleepy') spawnFx(Math.random() > 0.5 ? 'Z' : 'z');
      }, 1700);
    } else if (activeExpr === 'dizzy') {
      spawnFx('✦');
      setTimeout(() => spawnFx('✧'), 380);
    } else if (activeExpr === 'wink') {
      spawnFx('✨');
    }

    if (durationMs > 0) {
      exprResetTimer = setTimeout(() => setAliveExpression('normal', 0), durationMs);
    }
    renderStudioUI();
  }

  function markUserActive() {
    lastActivityAt = Date.now();
    if (activeExpr === 'sleepy') {
      setAliveExpression('normal', 0);
      if (typeof hopPill === 'function') hopPill();
    }
  }

  // Modo Soneca automático após 3 min de inatividade
  sleepyTimer = setInterval(() => {
    if (window.lumoEcoMode || musicJamming) return;
    const expanded = typeof isExpanded !== 'undefined' && isExpanded;
    if (!expanded && activeExpr === 'normal' && (Date.now() - lastActivityAt) > 180000) {
      setAliveExpression('sleepy', 0);
    }
  }, 15000);

  // Detector leve de sacudida ("dizzy") restrito à cápsula (olhos já são rastreados nativamente no app.js)
  let shakeScore = 0, lastMx = 0, lastDxSign = 0, lastMoveTime = 0;
  pill.addEventListener('pointermove', (e) => {
    markUserActive();
    const now = performance.now();
    const diff = e.clientX - lastMx;
    const sign = diff > 6 ? 1 : (diff < -6 ? -1 : 0);
    if (sign && sign !== lastDxSign && (now - lastMoveTime) < 220) {
      shakeScore++;
      lastDxSign = sign;
      if (shakeScore >= 5 && activeExpr !== 'dizzy') {
        shakeScore = 0;
        setAliveExpression('dizzy', 2300);
        if (typeof say === 'function') say('Opa! Calma aí que fiquei tonto!', 2200, true);
      }
    } else if (now - lastMoveTime > 380) {
      shakeScore = 0;
    }
    lastMx = e.clientX;
    lastMoveTime = now;
  }, { passive: true });
  window.addEventListener('keydown', markUserActive, { passive: true });
  window.addEventListener('pointerdown', markUserActive, { passive: true });

  // === 2. SKINS DA CÁPSULA ===
  const SKINS = [
    { id: 'default',       name: 'Clássica',      pro: false, swatch: 'linear-gradient(135deg,#111827,#4ade80)' },
    { id: 'sakura',        name: 'Sakura',        pro: false, swatch: 'linear-gradient(135deg,#58243e,#f9a8d4)' },
    { id: 'obsidian-gold', name: 'Obsidian Gold', pro: true,  swatch: 'linear-gradient(135deg,#09090b,#fbbf24)' },
    { id: 'prisma',        name: 'Prisma Holo',   pro: true,  swatch: 'linear-gradient(135deg,#3b0764,#6366f1,#22d3ee)' },
    { id: 'matrix',        name: 'Matrix CRT',    pro: true,  swatch: 'linear-gradient(135deg,#031107,#22c55e)' },
    { id: 'vaporwave',     name: 'Vaporwave',     pro: true,  swatch: 'linear-gradient(135deg,#4c1d95,#ec4899,#22d3ee)' }
  ];

  let activeSkin = localStorage.getItem('lumo_capsule_skin') || 'default';
  function applySkin(skinId, silent = false) {
    const def = SKINS.find((s) => s.id === skinId) || SKINS[0];
    if (def.pro && !isPro()) {
      if (!silent) promptUpgrade(`Skin ${def.name}`);
      return false;
    }
    SKINS.forEach((s) => pill.classList.remove('skin-' + s.id));
    activeSkin = def.id;
    if (def.id !== 'default') pill.classList.add('skin-' + def.id);
    localStorage.setItem('lumo_capsule_skin', def.id);
    if (!silent && typeof say === 'function') say(`Skin ${def.name} aplicada ✓`, 1800, true);
    renderStudioUI();
    return true;
  }
  applySkin(activeSkin, true);

  // === 3. MODO KARAOKÊ NA CÁPSULA (PRO) ===
  let karaokeEnabled = localStorage.getItem('lumo_pro_karaoke') === 'true';
  let dynamicColorEnabled = localStorage.getItem('lumo_pro_dyncolor') === 'true';
  let karaokeEl = document.getElementById('lumo-karaoke-pill');
  if (!karaokeEl) {
    karaokeEl = document.createElement('div');
    karaokeEl.id = 'lumo-karaoke-pill';
    document.body.appendChild(karaokeEl);
  }
  let karaokeHideTimer = 0;

  function positionKaraoke() {
    const r = pill.getBoundingClientRect();
    if (!r.width) return;
    karaokeEl.style.left = Math.round(r.left + r.width / 2) + 'px';
    const topPos = r.top > 48 ? (r.top - 34) : (r.bottom + 8);
    karaokeEl.style.top = Math.round(topPos) + 'px';
  }

  window.addEventListener('lumo-lyric-line', (ev) => {
    const d = ev.detail || {};
    const expanded = typeof isExpanded !== 'undefined' && isExpanded;
    if (!karaokeEnabled || !isPro() || !d.playing || !d.text || expanded || window.lumoEcoMode) {
      karaokeEl.classList.remove('show');
      return;
    }
    positionKaraoke();
    karaokeEl.textContent = '♪ ' + d.text;
    karaokeEl.classList.add('show');
    clearTimeout(karaokeHideTimer);
    karaokeHideTimer = setTimeout(() => karaokeEl.classList.remove('show'), 7500);
  });

  // === 4. COR DINÂMICA PELA CAPA DA MÚSICA (PRO) ===
  let savedThemeVars = null;
  let lastArtUrl = '';

  // V383_THEME_SYNC: se o usuário trocar a cor manualmente, atualiza a base e não reverte para a antiga
  document.addEventListener('click', (e) => {
    if (e.target.closest('.theme-dot, [data-theme]')) {
      savedThemeVars = null;
      lastArtUrl = '';
    }
  }, { passive: true });

  function restoreThemeColor() {
    if (!savedThemeVars) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', savedThemeVars.accent);
    root.style.setProperty('--accent-soft', savedThemeVars.soft);
    root.style.setProperty('--accent-glow', savedThemeVars.glow);
    savedThemeVars = null;
    lastArtUrl = '';
  }

  function applyDynamicColorFromArt(url) {
    if (!dynamicColorEnabled || !isPro() || !url) { restoreThemeColor(); return; }
    if (url === lastArtUrl) return;
    lastArtUrl = url;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 16; cv.height = 16;
        const c = cv.getContext('2d');
        c.drawImage(img, 0, 0, 16, 16);
        const data = c.getImageData(0, 0, 16, 16).data;
        let rSum = 0, gSum = 0, bSum = 0, weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max > 0 ? (max - min) / max : 0;
          const lum = (r + g + b) / 3;
          if (lum < 35 || lum > 235) continue;
          const w = 0.25 + sat * 2.2;
          rSum += r * w; gSum += g * w; bSum += b * w; weight += w;
        }
        if (!weight) return;
        let r = Math.min(245, Math.round((rSum / weight) * 1.15));
        let g = Math.min(245, Math.round((gSum / weight) * 1.15));
        let b = Math.min(245, Math.round((bSum / weight) * 1.15));
        if (r + g + b < 240) { r = Math.min(255, r + 55); g = Math.min(255, g + 55); b = Math.min(255, b + 55); }

        const root = document.documentElement;
        if (!savedThemeVars) {
          const cs = getComputedStyle(root);
          savedThemeVars = {
            accent: cs.getPropertyValue('--accent').trim(),
            soft: cs.getPropertyValue('--accent-soft').trim(),
            glow: cs.getPropertyValue('--accent-glow').trim()
          };
        }
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        root.style.setProperty('--accent', hex);
        root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.16)`);
        root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
      } catch (_) {}
    };
    img.src = url;
  }

  window.addEventListener('lumo-music-state', (ev) => {
    const d = ev.detail || {};
    musicJamming = Boolean(d.playing);
    if (activeExpr === 'normal') pill.classList.toggle('expr-jamming', musicJamming);
    if (!musicJamming) {
      karaokeEl.classList.remove('show');
      if (dynamicColorEnabled) restoreThemeColor();
    } else if (dynamicColorEnabled && d.artwork) {
      applyDynamicColorFromArt(d.artwork);
    }
  });

  // === 5. PERFIS DE PERSONALIDADE DA IA (PRO) ===
  const PERSONAS = [
    { id: 'default', icon: ALP_IC.spark, label: 'Padrão',  pro: false, instr: '' },
    { id: 'dev',     icon: ALP_IC.dev,   label: 'Dev',     pro: true,  instr: '[Perfil Dev: responda de forma direta e técnica, priorizando código limpo e objetivo.]\n\n' },
    { id: 'study',   icon: ALP_IC.study, label: 'Estudos', pro: true,  instr: '[Perfil Estudos: explique didaticamente passo a passo com exemplos simples e claros.]\n\n' },
    { id: 'short',   icon: ALP_IC.short, label: 'Curto',   pro: true,  instr: '[Perfil Resumo Curto: responda no máximo em 3 tópicos ultra diretos, sem enrolação.]\n\n' },
    { id: 'en',      icon: ALP_IC.en,    label: 'Inglês',  pro: true,  instr: '[Perfil Professor de Inglês: corrija erros, mostre a forma natural e traduza brevemente.]\n\n' }
  ];
  let activePersona = localStorage.getItem('lumo_ai_persona') || 'default';
  if (!isPro()) activePersona = 'default';

  const viewIa = document.getElementById('view-ia');
  if (viewIa && !document.getElementById('lp-ai-personas')) {
    const bar = document.createElement('div');
    bar.id = 'lp-ai-personas';
    bar.className = 'lp-ai-personas';
    const chatBox = document.getElementById('chat-box');
    if (chatBox) viewIa.insertBefore(bar, chatBox);

    function renderPersonas() {
      bar.innerHTML = PERSONAS.map((p) => {
        const locked = p.pro && !isPro();
        return `<button type="button" class="lp-persona-chip ${activePersona === p.id ? 'active' : ''}" data-pid="${p.id}">
          ${p.icon || ''}<span>${p.label}</span>${locked ? ' <span class="lp-pro-tag">PRO</span>' : ''}
        </button>`;
      }).join('');
    }
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pid]');
      if (!b) return;
      const p = PERSONAS.find((x) => x.id === b.dataset.pid);
      if (!p) return;
      if (p.pro && !isPro()) { promptUpgrade(`Perfil de IA ${p.label}`); return; }
      activePersona = p.id;
      localStorage.setItem('lumo_ai_persona', activePersona);
      renderPersonas();
      if (typeof say === 'function') say(`IA no modo ${p.label} ✓`, 1600, true);
    });
    renderPersonas();

    // Injeta a instrução de perfil diretamente no payload de envio sem alterar o balão do usuário
    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input?.url || '');
        const p = PERSONAS.find((x) => x.id === activePersona);
        if (p && p.instr && isPro() && url.includes('workers.dev') && init && typeof init.body === 'string') {
          const parsed = JSON.parse(init.body);
          if (typeof parsed.prompt === 'string') {
            parsed.prompt = p.instr + parsed.prompt;
            init = { ...init, body: JSON.stringify(parsed) };
          } else if (Array.isArray(parsed.messages) && parsed.messages.length) {
            const last = parsed.messages[parsed.messages.length - 1];
            if (last && last.role === 'user' && typeof last.content === 'string') {
              parsed.messages = parsed.messages.slice(0, -1).concat([{ ...last, content: p.instr + last.content }]);
              init = { ...init, body: JSON.stringify(parsed) };
            }
          }
        }
      } catch (_) {}
      return origFetch.call(this, input, init);
    };
  }

  // === 6. HISTÓRICO INTELIGENTE DE CLIPBOARD (PRO — ATÉ 40 ITENS) ===
  let clipHistory = [];
  let clipSearch = '';
  try { clipHistory = JSON.parse(localStorage.getItem('lumo_pro_clip_hist') || '[]'); } catch (_) {}
  if (!Array.isArray(clipHistory)) clipHistory = [];

  function saveClipHistory() {
    const pinned = clipHistory.filter((x) => x.pinned);
    const rest = clipHistory.filter((x) => !x.pinned).slice(0, Math.max(0, 40 - pinned.length));
    clipHistory = [...pinned, ...rest];
    try { localStorage.setItem('lumo_pro_clip_hist', JSON.stringify(clipHistory)); } catch (_) {}
  }

  function pushClipText(raw) {
    const text = String(raw || '').trim();
    if (!text || text.length < 2 || text.length > 4000) return;
    if (clipHistory[0] && clipHistory[0].text === text) return;
    const existing = clipHistory.find((x) => x.text === text);
    if (existing) {
      existing.ts = Date.now();
    } else {
      clipHistory.unshift({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text, pinned: false, ts: Date.now() });
    }
    saveClipHistory();
    renderClipCard();
  }

  async function pollClipboardOnce() {
    if (!isPro() || document.hidden || window.lumoEcoMode) return;
    let txt = '';
    if (typeof invoke === 'function') {
      try { txt = await invoke('get_clipboard_text'); } catch (_) {}
    }
    if (!txt && navigator.clipboard && document.hasFocus()) {
      try { txt = await navigator.clipboard.readText(); } catch (_) {}
    }
    if (txt) pushClipText(txt);
  }
  setInterval(pollClipboardOnce, 2200);
  document.addEventListener('copy', () => setTimeout(pollClipboardOnce, 180));

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderClipCard() {
    const host = document.getElementById('lp-clip-card');
    if (!host) return;
    if (!isPro()) {
      host.innerHTML = `
        <div class="label-xs"><span>Histórico de Clipboard</span><span class="lp-pro-tag">PRO</span></div>
        <div style="font-size:11px; color:var(--muted); line-height:1.45; margin-top:4px;">
          Guarde os últimos 40 textos, links e códigos copiados com busca rápida e favoritos fixados.
        </div>
        <button type="button" class="btn-primary" style="margin-top:8px; width:100%; font-size:11px;" onclick="LumoAlivePro.upgrade('Histórico de Clipboard')">Desbloquear no Lumo Pro</button>`;
      return;
    }
    const q = clipSearch.trim().toLowerCase();
    const list = clipHistory.filter((x) => !q || x.text.toLowerCase().includes(q));
    host.innerHTML = `
      <div class="label-xs">
        <span>Histórico de Clipboard (${clipHistory.length}/40)</span>
        <span class="lp-pro-tag">PRO</span>
      </div>
      <div style="display:flex; gap:5px; margin-top:6px;">
        <input type="text" id="lp-clip-q" value="${esc(clipSearch)}" placeholder="Filtrar cópias..." style="flex:1; min-width:0; padding:6px 9px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.04); color:var(--text); font-size:11px; outline:none;" />
        <button type="button" class="btn-ghost" data-cact="grab" style="font-size:10px; padding:4px 8px;">+ Ler</button>
      </div>
      <div class="lp-clip-list">
        ${list.length ? list.map((it) => `
          <div class="lp-clip-item ${it.pinned ? 'pinned' : ''}" data-cid="${esc(it.id)}">
            <span class="lp-clip-text" title="${esc(it.text)}">${esc(it.text)}</span>
            <button type="button" class="lp-clip-act" data-cact="pin" title="Fixar"><span style="display:inline-flex;color:${it.pinned ? 'var(--accent)' : 'var(--muted)'};">${ALP_IC.pin}</span></button>
            <button type="button" class="lp-clip-act" data-cact="del" title="Remover">×</button>
          </div>`).join('') : '<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:12px;">Copie qualquer texto (Ctrl+C) ou clique em "+ Ler".</div>'}
      </div>`;
  }

  const kitHost = document.getElementById('view-kit') || document.getElementById('view-util');
  if (kitHost && !document.getElementById('lp-clip-card')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'lp-clip-card';
    kitHost.appendChild(card);

    card.addEventListener('input', (e) => {
      if (e.target.id === 'lp-clip-q') {
        clipSearch = e.target.value;
        const pos = e.target.selectionStart;
        renderClipCard();
        const re = document.getElementById('lp-clip-q');
        if (re) { re.focus(); re.setSelectionRange(pos, pos); }
      }
    });
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-cact]');
      const row = e.target.closest('[data-cid]');
      if (act && act.dataset.cact === 'grab') { pollClipboardOnce(); return; }
      if (!row) return;
      const it = clipHistory.find((x) => x.id === row.dataset.cid);
      if (!it) return;
      if (act && act.dataset.cact === 'pin') {
        e.stopPropagation();
        it.pinned = !it.pinned;
        saveClipHistory(); renderClipCard(); return;
      }
      if (act && act.dataset.cact === 'del') {
        e.stopPropagation();
        clipHistory = clipHistory.filter((x) => x.id !== it.id);
        saveClipHistory(); renderClipCard(); return;
      }
      if (typeof invoke === 'function') invoke('set_clipboard_text', { text: it.text }).catch(() => {});
      navigator.clipboard?.writeText(it.text).catch(() => {});
      if (typeof say === 'function') say('Copiado do histórico ✓', 1500, true);
    });
    renderClipCard();
  }

  // === 7. ESTÚDIO DE SKINS (CÁPSULA) & EXPRESSÕES (MASCOTE) ===
  const capsuleHost = () =>
    document.getElementById('v38-pane-capsule') ||
    document.getElementById('view-config');
  const mascotHost = () =>
    document.getElementById('v38-pane-mascot') ||
    document.getElementById('view-config');

  function renderStudioUI() {
    const proNow = isPro();

    // 7a. Card Skins da Cápsula + Switches Pro
    const box = document.getElementById('lp-studio-card');
    if (box) {
      box.innerHTML = `
        <div class="label-xs">
          <span>Skins da Cápsula</span>
          <span class="lp-pro-tag">${proNow ? 'PRO ATIVO' : 'SKINS + PRO'}</span>
        </div>
        <div class="lp-grid">
          ${SKINS.map((s) => `
            <button type="button" class="lp-skin-btn ${activeSkin === s.id ? 'active' : ''} ${s.pro && !proNow ? 'locked' : ''}" data-skin="${s.id}">
              <span class="lp-swatch" style="background:${s.swatch};"></span>
              <span>${s.name}</span>
              ${s.pro ? '<span class="lp-pro-tag">PRO</span>' : '<span style="font-size:8.5px; color:var(--muted);">Grátis</span>'}
            </button>`).join('')}
        </div>
        <div style="margin-top:10px;">
          <div class="lp-toggle-row">
            <div>
              <strong>Karaokê na Cápsula</strong> <span class="lp-pro-tag">PRO</span>
              <span class="lp-toggle-sub">Mostra a letra da música flutuando na cápsula</span>
            </div>
            <label class="lp-switch"><input type="checkbox" ${karaokeEnabled && proNow ? 'checked' : ''} data-protog="karaoke" /><span class="lp-switch-track"></span></label>
          </div>
          <div class="lp-toggle-row">
            <div>
              <strong>Cor Dinâmica pela Capa</strong> <span class="lp-pro-tag">PRO</span>
              <span class="lp-toggle-sub">Tema acompanha a cor do álbum tocando</span>
            </div>
            <label class="lp-switch"><input type="checkbox" ${dynamicColorEnabled && proNow ? 'checked' : ''} data-protog="dyncolor" /><span class="lp-switch-track"></span></label>
          </div>
        </div>`;
    }

    // 7b. Card Expressões Rápidas (na sub-aba Mascote)
    const exprBox = document.getElementById('lp-expr-card');
    if (exprBox) {
      const exprs = [
        ['normal', ALP_IC.normal, 'Normal'],
        ['cool',   ALP_IC.cool,   'Óculos'],
        ['wink',   ALP_IC.wink,   'Piscar'],
        ['focus',  ALP_IC.focus,  'Foco'],
        ['sleepy', ALP_IC.sleepy, 'Soneca'],
        ['dizzy',  ALP_IC.dizzy,  'Tonto']
      ];
      exprBox.innerHTML = `
        <div class="label-xs"><span>Expressões Rápidas</span></div>
        <div class="lp-grid">
          ${exprs.map(([id, ic, lbl]) => `
            <button type="button" class="lp-expr-btn ${activeExpr === id ? 'active' : ''}" data-expr="${id}">${ic}<span>${lbl}</span></button>`).join('')}
        </div>`;
    }
  }

  const cParent = capsuleHost();
  if (cParent && !document.getElementById('lp-studio-card')) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'lp-studio-card';
    cParent.insertBefore(card, cParent.firstChild);

    card.addEventListener('click', (e) => {
      const sk = e.target.closest('[data-skin]');
      if (sk) applySkin(sk.dataset.skin);
    });
    card.addEventListener('change', (e) => {
      const t = e.target.dataset?.protog;
      if (!t) return;
      if (!isPro()) {
        e.target.checked = false;
        promptUpgrade(t === 'karaoke' ? 'Modo Karaokê na Cápsula' : 'Cor Dinâmica pela Capa');
        return;
      }
      if (t === 'karaoke') {
        karaokeEnabled = e.target.checked;
        localStorage.setItem('lumo_pro_karaoke', String(karaokeEnabled));
        if (!karaokeEnabled) karaokeEl.classList.remove('show');
      } else if (t === 'dyncolor') {
        dynamicColorEnabled = e.target.checked;
        localStorage.setItem('lumo_pro_dyncolor', String(dynamicColorEnabled));
        if (!dynamicColorEnabled) restoreThemeColor();
      }
    });
  }

  const mParent = mascotHost();
  if (mParent && !document.getElementById('lp-expr-card')) {
    const ecard = document.createElement('div');
    ecard.className = 'card';
    ecard.id = 'lp-expr-card';
    mParent.appendChild(ecard);

    ecard.addEventListener('click', (e) => {
      const ex = e.target.closest('[data-expr]');
      if (!ex) return;
      const id = ex.dataset.expr;
      setAliveExpression(id, id === 'dizzy' || id === 'wink' ? 2400 : 0);
    });
  }
  renderStudioUI();

  // === 8. SCROLL GUARD REAL NA .home-scroll DO RESUMO ===
  const homeScroll = document.querySelector('#view-resumo > .home-scroll') || document.querySelector('#view-resumo .home-scroll');
  if (homeScroll) {
    let scTimer = 0;
    const freeze = () => {
      /* V391_RESUMO_FREEZE */
      homeScroll.classList.add('is-scrolling');
      document.getElementById('view-resumo')?.classList.add('is-scrolling');
      clearTimeout(scTimer);
      scTimer = setTimeout(() => { homeScroll.classList.remove('is-scrolling'); document.getElementById('view-resumo')?.classList.remove('is-scrolling'); }, 130);
    };
    homeScroll.addEventListener('scroll', freeze, { passive: true });
    homeScroll.addEventListener('wheel', freeze, { passive: true });
  }

  // GLOBAL_VIEW_SCROLL_GUARD: congela hover/spotlight em qualquer .view durante a rolagem
  document.querySelectorAll('.view').forEach((v) => {
    if (v.id === 'view-resumo') return;
    let t = 0;
    const freezeView = () => {
      v.classList.add('is-scrolling');
      clearTimeout(t);
      t = setTimeout(() => v.classList.remove('is-scrolling'), 120);
    };
    v.addEventListener('scroll', freezeView, { passive: true });
    v.addEventListener('wheel', freezeView, { passive: true });
  });

  window.LumoAlivePro = {
    isPro,
    applySkin,
    setExpression: setAliveExpression,
    upgrade: promptUpgrade,
    refreshUI: () => { renderStudioUI(); renderClipCard(); }
  };
})();
