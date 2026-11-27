// === LUMO v3.7.0 — UPGRADE DO BOLSO, KIT RÁPIDO & FOCO & PC ===
(function initLumoV37Tools() {
  if (window.LumoV37Tools) return;

  const S = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const IC = {
    dropper: S('<path d="M2 22l1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="M15 6l3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z"/>'),
    qr:      S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v7h-6"/>'),
    key:     S('<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>'),
    clip:    S('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'),
    timer:   S('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>'),
    cpu:     S('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>')
  };

  function copyText(txt, msg) {
    if (!txt) return;
    if (typeof invoke === 'function') invoke('set_clipboard_text', { text: txt }).catch(() => {});
    navigator.clipboard?.writeText(txt).catch(() => {});
    if (typeof say === 'function') say(msg || `${txt} copiado ✓`, 1700, true);
  }

  // =========================================================================
  // 1. BANDEJA MÁGICA / BOLSO (#view-bolso)
  // =========================================================================
  function upgradeBolso() {
    const view = document.getElementById('view-bolso');
    const dz = document.getElementById('drop-zone');
    const list = document.getElementById('pocket-list');
    if (!view || !dz || !list || document.getElementById('v37-bolso-bar')) return;

    // Envolve ícone do dropzone em badge + adiciona chips de formatos
    const dzSvg = dz.querySelector('svg');
    if (dzSvg && !dz.querySelector('.v37-drop-icon')) {
      const wrap = document.createElement('div');
      wrap.className = 'v37-drop-icon';
      dzSvg.parentNode.insertBefore(wrap, dzSvg);
      wrap.appendChild(dzSvg);
    }
    if (!dz.querySelector('.v37-fmt-chips')) {
      const chips = document.createElement('div');
      chips.className = 'v37-fmt-chips';
      chips.innerHTML = ['PNG · JPG · WEBP', 'PDF · TXT', 'MP3 · OGG'].map((t) => `<span class="v37-fmt-chip">${t}</span>`).join('');
      dz.appendChild(chips);
    }

    // Feedback visual de arrastar arquivo
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.add('drag-active')));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('drag-active')));

    // Barra de busca e filtro por tipo acima da lista
    let activeFilter = 'all';
    let filterQuery = '';

    const bar = document.createElement('div');
    bar.id = 'v37-bolso-bar';
    bar.className = 'v37-bolso-toolbar';
    bar.innerHTML = `
      <div class="v37-bolso-search">
        <input type="text" id="v37-bolso-q" placeholder="Filtrar arquivos na bandeja..." />
      </div>
      <div class="v37-filter-row">
        <button type="button" class="v37-filter-btn active" data-bf="all">Tudo</button>
        <button type="button" class="v37-filter-btn" data-bf="img">Imagens</button>
        <button type="button" class="v37-filter-btn" data-bf="doc">Docs</button>
        <button type="button" class="v37-filter-btn" data-bf="aud">Áudio</button>
      </div>`;
    list.parentNode.insertBefore(bar, list);

    function detectKind(text) {
      const l = String(text || '').toLowerCase();
      if (/\.(png|jpe?g|webp|gif|bmp|svg)\b|imagem|converter/.test(l)) return 'img';
      if (/\.(mp3|ogg|wav|m4a|flac|opus)\b|áudio|audio|transcrev/.test(l)) return 'aud';
      if (/\.(pdf|txt|md|docx?|csv|json|js|ts|py|html|css)\b|resumir|doc/.test(l)) return 'doc';
      return 'other';
    }

    function applyBolsoFilters() {
      const q = filterQuery.trim().toLowerCase();
      const children = Array.from(list.children);
      for (const el of children) {
        const txt = (el.textContent || '').trim();
        // Mantém a mensagem de pasta vazia visível quando não há itens
        if (/Lumo_Arquivos/i.test(txt) && children.length === 1) {
          el.classList.remove('v37-hidden');
          continue;
        }
        const matchQ = !q || txt.toLowerCase().includes(q);
        const matchF = activeFilter === 'all' || detectKind(txt) === activeFilter;
        el.classList.toggle('v37-hidden', !(matchQ && matchF));
      }
    }

    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bf]');
      if (!b) return;
      activeFilter = b.dataset.bf;
      bar.querySelectorAll('[data-bf]').forEach((x) => x.classList.toggle('active', x.dataset.bf === activeFilter));
      applyBolsoFilters();
    });
    document.getElementById('v37-bolso-q')?.addEventListener('input', (e) => {
      filterQuery = e.target.value;
      applyBolsoFilters();
    });
    new MutationObserver(applyBolsoFilters).observe(list, { childList: true });
  }

  // =========================================================================
  // 2. KIT RÁPIDO EM 4 SUB-ABAS (#view-kit)
  // =========================================================================
  function hexToRgb(hex) {
    const clean = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const n = parseInt(clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
  }
  function shiftHex(hex, delta) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(rgb.r + delta, rgb.g + delta, rgb.b + delta);
  }

  function upgradeKitRapido() {
    const view = document.getElementById('view-kit');
    if (!view || document.getElementById('v37-kit-tabs')) return;

    const colorCard = document.getElementById('color-history')?.closest('.card');
    const qrCard = document.getElementById('qr-input')?.closest('.card');
    const pwdCard = document.getElementById('pwd-output')?.closest('.card');

    let activeKitTab = 'color';

    const tabs = document.createElement('div');
    tabs.id = 'v37-kit-tabs';
    tabs.className = 'v37-subtabs cols-4';
    tabs.innerHTML = `
      <button type="button" class="v37-subtab active" data-ktab="color">${IC.dropper}<span>Cor</span></button>
      <button type="button" class="v37-subtab" data-ktab="qr">${IC.qr}<span>QR</span></button>
      <button type="button" class="v37-subtab" data-ktab="pwd">${IC.key}<span>Senhas</span></button>
      <button type="button" class="v37-subtab" data-ktab="clip">${IC.clip}<span>Clip</span></button>`;
    view.insertBefore(tabs, view.firstChild);

    function syncKitVisibility() {
      const clipCard = document.getElementById('lp-clip-card');
      if (colorCard) colorCard.classList.toggle('v37-hidden', activeKitTab !== 'color');
      if (qrCard) qrCard.classList.toggle('v37-hidden', activeKitTab !== 'qr');
      if (pwdCard) pwdCard.classList.toggle('v37-hidden', activeKitTab !== 'pwd');
      if (clipCard) clipCard.classList.toggle('v37-hidden', activeKitTab !== 'clip');
    }

    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ktab]');
      if (!b) return;
      activeKitTab = b.dataset.ktab;
      tabs.querySelectorAll('[data-ktab]').forEach((x) => x.classList.toggle('active', x.dataset.ktab === activeKitTab));
      syncKitVisibility();
    });

    // 2a. Paleta e conversor HEX/RGB no card de Cor
    if (colorCard && !document.getElementById('v37-color-stage')) {
      const stage = document.createElement('div');
      stage.id = 'v37-color-stage';
      colorCard.appendChild(stage);

      let selectedHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ADE80';
      if (!/^#[0-9a-fA-F]{6}$/.test(selectedHex)) selectedHex = '#4ADE80';

      function renderColorStage(hex) {
        if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) return;
        selectedHex = hex.toUpperCase();
        const rgb = hexToRgb(selectedHex);
        const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
        const shades = [
          shiftHex(selectedHex, -58),
          shiftHex(selectedHex, -28),
          selectedHex,
          shiftHex(selectedHex, 30),
          shiftHex(selectedHex, 62)
        ];
        stage.innerHTML = `
          <div class="v37-color-stage">
            <div class="v37-color-big" style="background:${selectedHex};"></div>
            <div class="v37-color-vals">
              <div style="font-size:10px; color:var(--muted); font-weight:700;">Cor selecionada (clique para copiar)</div>
              <div class="v37-color-codes">
                <button type="button" class="v37-code-pill" data-cp="${selectedHex}">${selectedHex}</button>
                ${rgbStr ? `<button type="button" class="v37-code-pill" data-cp="${rgbStr}">${rgbStr}</button>` : ''}
              </div>
            </div>
          </div>
          <div class="v37-shades-row">
            ${shades.map((sh) => `<button type="button" class="v37-shade" style="background:${sh};" title="Copiar ${sh}" data-cp="${sh}"></button>`).join('')}
          </div>`;
      }

      stage.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cp]');
        if (b) copyText(b.dataset.cp, `${b.dataset.cp} copiado ✓`);
      });

      const hist = document.getElementById('color-history');
      if (hist) {
        const readLatestColor = () => {
          const first = hist.querySelector('[data-hex], [title*="#"], button, div');
          if (!first) return;
          const m = (first.dataset?.hex || first.title || first.textContent || '').match(/#[0-9a-fA-F]{6}/);
          if (m) renderColorStage(m[0]);
        };
        new MutationObserver(readLatestColor).observe(hist, { childList: true, subtree: true });
        hist.addEventListener('click', (e) => {
          const el = e.target.closest('button, div');
          const m = (el?.dataset?.hex || el?.title || el?.textContent || '').match(/#[0-9a-fA-F]{6}/);
          if (m) renderColorStage(m[0]);
        });
        setTimeout(readLatestColor, 300);
      }
      renderColorStage(selectedHex);
    }

    // 2b. Botão de Baixar PNG no card de QR Code
    const qrPrev = document.getElementById('qr-preview');
    if (qrPrev && !document.getElementById('v37-qr-acts')) {
      const acts = document.createElement('div');
      acts.id = 'v37-qr-acts';
      acts.className = 'v37-qr-actions';
      acts.innerHTML = `<button type="button" class="btn-ghost" id="v37-qr-dl" style="font-size:10.5px; padding:4px 10px;">Baixar PNG</button>`;
      qrPrev.appendChild(acts);

      document.getElementById('v37-qr-dl')?.addEventListener('click', async () => {
        const img = document.getElementById('qr-img');
        if (!img || !img.src) return;
        try {
          const res = await fetch(img.src);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'lumo-qrcode.png';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          if (typeof say === 'function') say('QR Code baixado ✓', 1800, true);
        } catch (_) {
          copyText(img.src, 'Link do QR copiado ✓');
        }
      });
    }

    // 2c. Medidor de força da senha em tempo real + botão copiar
    const pwdOut = document.getElementById('pwd-output');
    if (pwdCard && pwdOut && !document.getElementById('v37-pwd-meter')) {
      const wrap = document.createElement('div');
      wrap.id = 'v37-pwd-meter';
      wrap.className = 'v37-pwd-meter-wrap';
      wrap.innerHTML = `
        <div class="v37-pwd-bar"><div class="v37-pwd-fill" id="v37-pwd-fill"></div></div>
        <div class="v37-pwd-meta">
          <span id="v37-pwd-label">Gere uma senha para avaliar a força</span>
          <button type="button" class="btn-ghost" id="v37-pwd-copy" style="padding:2px 8px; font-size:10px;">Copiar</button>
        </div>`;
      pwdCard.appendChild(wrap);

      function evalPwd() {
        const val = (pwdOut.textContent || '').trim();
        const fill = document.getElementById('v37-pwd-fill');
        const lbl = document.getElementById('v37-pwd-label');
        if (!fill || !lbl) return;
        if (!val || /clique em gerar/i.test(val)) {
          fill.style.width = '0%';
          lbl.textContent = 'Gere uma senha para avaliar a força';
          return;
        }
        let score = 0;
        if (val.length >= 12) score += 25;
        if (val.length >= 16) score += 20;
        if (val.length >= 22) score += 15;
        if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score += 15;
        if (/\d/.test(val)) score += 12;
        if (/[^a-zA-Z0-9]/.test(val)) score += 13;
        score = Math.min(100, score);

        fill.style.width = score + '%';
        if (score >= 85) { fill.style.background = '#4ade80'; lbl.textContent = `Blindada (${val.length} caracteres)`; }
        else if (score >= 65) { fill.style.background = '#22d3ee'; lbl.textContent = `Forte (${val.length} caracteres)`; }
        else if (score >= 45) { fill.style.background = '#fbbf24'; lbl.textContent = `Média (${val.length} caracteres)`; }
        else { fill.style.background = '#fb7185'; lbl.textContent = `Fraca (${val.length} caracteres)`; }
      }

      document.getElementById('v37-pwd-copy')?.addEventListener('click', () => {
        const val = (pwdOut.textContent || '').trim();
        if (val && !/clique em gerar/i.test(val)) copyText(val, 'Senha copiada ✓');
      });
      new MutationObserver(evalPwd).observe(pwdOut, { childList: true, characterData: true, subtree: true });
      evalPwd();
    }

    syncKitVisibility();
    // Garante sincronia caso #lp-clip-card seja montado depois
    new MutationObserver(syncKitVisibility).observe(view, { childList: true });
  }

  // =========================================================================
  // 3. FOCO & PC (#view-util) — SUB-ABAS, ANEL SVG POMODORO & MONITOR DE PC
  // =========================================================================
  function upgradeFocoPc() {
    const view = document.getElementById('view-util');
    const timerDisp = document.getElementById('timer-display');
    if (!view || !timerDisp || document.getElementById('v37-util-tabs')) return;

    const pomoCard = timerDisp.closest('.card');
    const remCard = document.getElementById('rem-label-input')?.closest('.card');
    const cafeCard = document.getElementById('cafe-toggle')?.closest('.card');
    const breathCard = document.getElementById('breath-btn')?.closest('.card');
    const sleepCard = document.getElementById('sleep-status')?.closest('.card');

    let activeUtilTab = 'focus';

    const tabs = document.createElement('div');
    tabs.id = 'v37-util-tabs';
    tabs.className = 'v37-subtabs cols-2';
    tabs.innerHTML = `
      <button type="button" class="v37-subtab active" data-utab="focus">${IC.timer}<span>Foco & Pausa</span></button>
      <button type="button" class="v37-subtab" data-utab="pc">${IC.cpu}<span>PC & Energia</span></button>`;
    view.insertBefore(tabs, view.firstChild);

    // 3a. Anel SVG circular no Pomodoro + preset 50m + contador diário + atalho Som Ambiente
    const R = 64;
    const CIRC = 2 * Math.PI * R;
    let totalSec = 25 * 60;
    let lastParsedSec = totalSec;

    const todayKey = 'lumo_pomo_cycles_' + new Date().toISOString().slice(0, 10);
    let cyclesToday = parseInt(localStorage.getItem(todayKey) || '0', 10) || 0;

    if (pomoCard && !pomoCard.querySelector('.v37-pomo-ring-wrap')) {
      const ringWrap = document.createElement('div');
      ringWrap.className = 'v37-pomo-ring-wrap';
      ringWrap.innerHTML = `
        <svg class="v37-pomo-svg" viewBox="0 0 146 146">
          <circle class="v37-pomo-bg" cx="73" cy="73" r="${R}"/>
          <circle class="v37-pomo-fg" id="v37-pomo-fg" cx="73" cy="73" r="${R}" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="0"/>
        </svg>
        <div class="v37-pomo-center" id="v37-pomo-center">
          <span class="v37-pomo-tag" id="v37-pomo-tag">Foco</span>
        </div>`;

      timerDisp.parentNode.insertBefore(ringWrap, timerDisp);
      const center = ringWrap.querySelector('#v37-pomo-center');
      center.insertBefore(timerDisp, center.firstChild);

      // Adiciona preset 50m na linha de presets
      const presetRow = pomoCard.querySelector('.preset-row');
      if (presetRow && !presetRow.querySelector('[data-p50]')) {
        const b50 = document.createElement('button');
        b50.type = 'button';
        b50.className = 'btn-ghost';
        b50.dataset.p50 = '1';
        b50.textContent = '50m';
        b50.onclick = () => { if (typeof setTimer === 'function') setTimer(50); totalSec = 50 * 60; updatePomoRing(); };
        presetRow.insertBefore(b50, presetRow.firstChild);
      }

      // Captura cliques nos presets existentes para calibrar totalSec
      pomoCard.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const m = (b.textContent || '').trim().match(/^(\d+)m$/);
        if (m) {
          totalSec = parseInt(m[1], 10) * 60;
          setTimeout(updatePomoRing, 40);
        }
      });

      const foot = document.createElement('div');
      foot.className = 'v37-pomo-foot';
      foot.innerHTML = `
        <span>Ciclos hoje: <strong id="v37-pomo-cycles" style="color:var(--accent);">${cyclesToday}</strong></span>
        <button type="button" class="btn-ghost" id="v37-open-amb" style="font-size:10px; padding:3px 9px;">Som Ambiente</button>`;
      pomoCard.appendChild(foot);

      document.getElementById('v37-open-amb')?.addEventListener('click', () => {
        if (typeof openView === 'function') openView('midia');
        setTimeout(() => document.querySelector('.lm-subtab[data-mtab="ambient"]')?.click(), 60);
      });
    }

    function parseTimerText(str) {
      const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    }

    function updatePomoRing() {
      const cur = parseTimerText(timerDisp.textContent);
      const fg = document.getElementById('v37-pomo-fg');
      const tag = document.getElementById('v37-pomo-tag');
      if (cur === null || !fg) return;

      if (cur > totalSec) totalSec = cur;
      if (lastParsedSec > 0 && cur === 0) {
        cyclesToday++;
        localStorage.setItem(todayKey, String(cyclesToday));
        const ce = document.getElementById('v37-pomo-cycles');
        if (ce) ce.textContent = String(cyclesToday);
        if (window.LumoAlivePro?.setExpression) window.LumoAlivePro.setExpression('cool', 4500);
      }
      lastParsedSec = cur;

      const ratio = totalSec > 0 ? Math.max(0, Math.min(1, cur / totalSec)) : 0;
      fg.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(1);
      if (tag) {
        const toggleTxt = (document.getElementById('timer-toggle-btn')?.textContent || '').toLowerCase();
        tag.textContent = /paus/.test(toggleTxt) ? 'Em foco' : (cur === 0 ? 'Concluído' : 'Pronto');
      }
    }

    new MutationObserver(updatePomoRing).observe(timerDisp, { childList: true, characterData: true, subtree: true });
    const tBtn = document.getElementById('timer-toggle-btn');
    if (tBtn) new MutationObserver(updatePomoRing).observe(tBtn, { childList: true, characterData: true, subtree: true });
    updatePomoRing();

    // 3b. Card de Saúde do PC (espelha CPU/RAM em tempo real na aba PC & Energia)
    const pcCard = document.createElement('div');
    pcCard.id = 'v37-pc-monitor';
    pcCard.className = 'card';
    pcCard.innerHTML = `
      <div class="label-xs"><span>Monitor do Sistema</span><span style="color:var(--ok);">Tempo real</span></div>
      <div class="v37-pc-meters">
        <div class="v37-pc-box">
          <div class="v37-pc-top"><span class="v37-pc-lbl">CPU</span><span class="v37-pc-val" id="v37-cpu-val">--%</span></div>
          <div class="v37-pc-bar"><div class="v37-pc-fill" id="v37-cpu-fill"></div></div>
        </div>
        <div class="v37-pc-box">
          <div class="v37-pc-top"><span class="v37-pc-lbl">RAM</span><span class="v37-pc-val" id="v37-ram-val">--%</span></div>
          <div class="v37-pc-bar"><div class="v37-pc-fill" id="v37-ram-fill"></div></div>
        </div>
      </div>`;
    if (cafeCard) view.insertBefore(pcCard, cafeCard);
    else view.appendChild(pcCard);

    function syncPcMeters() {
      if (activeUtilTab !== 'pc' || !view.classList.contains('active')) return;
      const hero = document.getElementById('view-resumo');
      if (!hero) return;
      const cpuEl = document.getElementById('cpu-val') || document.getElementById('stat-cpu') || hero.querySelector('[id*="cpu"]');
      const ramEl = document.getElementById('ram-val') || document.getElementById('stat-ram') || hero.querySelector('[id*="ram"]');
      const parsePct = (el) => {
        const m = String(el?.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
        return m ? Math.min(100, Math.round(parseFloat(m[1].replace(',', '.')))) : null;
      };
      const applyMeter = (valId, fillId, pct) => {
        const ve = document.getElementById(valId);
        const fe = document.getElementById(fillId);
        if (!ve || !fe || pct === null) return;
        ve.textContent = pct + '%';
        fe.style.width = pct + '%';
        fe.classList.toggle('warn', pct >= 65 && pct < 85);
        fe.classList.toggle('crit', pct >= 85);
      };
      applyMeter('v37-cpu-val', 'v37-cpu-fill', parsePct(cpuEl));
      applyMeter('v37-ram-val', 'v37-ram-fill', parsePct(ramEl));
    }
    setInterval(syncPcMeters, 1800);

    function syncUtilVisibility() {
      const isFocus = activeUtilTab === 'focus';
      [pomoCard, remCard, breathCard].forEach((c) => c && c.classList.toggle('v37-hidden', !isFocus));
      [pcCard, cafeCard, sleepCard].forEach((c) => c && c.classList.toggle('v37-hidden', isFocus));
      // Mantém quaisquer cards extras (ex: de plugins) visíveis na aba PC
      Array.from(view.children).forEach((el) => {
        if (el === tabs || [pomoCard, remCard, breathCard, pcCard, cafeCard, sleepCard].includes(el)) return;
        el.classList.toggle('v37-hidden', isFocus);
      });
      if (!isFocus) syncPcMeters();
    }

    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-utab]');
      if (!b) return;
      activeUtilTab = b.dataset.utab;
      tabs.querySelectorAll('[data-utab]').forEach((x) => x.classList.toggle('active', x.dataset.utab === activeUtilTab));
      syncUtilVisibility();
    });

    syncUtilVisibility();
  }

  upgradeBolso();
  upgradeKitRapido();
  upgradeFocoPc();
  setTimeout(() => { upgradeBolso(); upgradeKitRapido(); upgradeFocoPc(); }, 450);

  window.LumoV37Tools = { ready: true };
})();
