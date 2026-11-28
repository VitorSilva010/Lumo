// === LUMO PENTE-FINO (v3.10.5) — APELIDO DO LUMO, ESTILOS DE RELÓGIO, FIGURINHAS & IMAGENS ===
(function initLumoPolish() {
  const API = typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev';
  const BOT_NAME_KEY = 'lumo_bot_nickname';
  const CLOCK_STYLE_KEY = 'lumo_clock_style';

  // === 1. APELIDAR O LUMO ===
  function getBotName() {
    const v = String(localStorage.getItem(BOT_NAME_KEY) || '').trim().slice(0, 18);
    return v || 'Lumo';
  }

  function applyBotName() {
    const name = getBotName();
    window.lumoBotName = name;
    document.title = name;

    if (typeof viewTitles !== 'undefined') {
      viewTitles.resumo = name;
      viewTitles.ia = name === 'Lumo' ? 'IA Lumo' : `IA ${name}`;
    }

    const iaTileTitle = document.querySelector('#tile-ia .tile-title');
    if (iaTileTitle) iaTileTitle.textContent = name === 'Lumo' ? 'IA Lumo' : `IA ${name}`;

    // Atualiza o topo se o usuário estiver no Resumo ou na IA
    const lbl = document.getElementById('topbar-label');
    const activeView = document.querySelector('.view.active')?.id || '';
    if (lbl) {
      if (activeView === 'view-resumo') lbl.textContent = name;
      else if (activeView === 'view-ia') lbl.textContent = name === 'Lumo' ? 'IA Lumo' : `IA ${name}`;
    }

    const quickInp = document.getElementById('quick-ai-input');
    if (quickInp) quickInp.placeholder = `Pergunte algo para ${name}...`;

    const cfgInp = document.getElementById('cfg-bot-name-input');
    if (cfgInp && document.activeElement !== cfgInp) {
      cfgInp.value = name === 'Lumo' ? '' : name;
    }
  }

  function mountBotNameCard() {
    const viewCfg = document.getElementById('view-config');
    if (!viewCfg || document.getElementById('cfg-bot-name-card')) return;
    const firstCard = viewCfg.querySelector('.card');
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'cfg-bot-name-card';
    card.innerHTML = `
      <div class="label-xs"><span>Apelido do Lumo</span><span style="opacity:0.65;">Opcional</span></div>
      <form class="inline-form" style="margin-top:4px;" id="cfg-bot-name-form">
        <input type="text" id="cfg-bot-name-input" placeholder="Ex: Mochi, Luna, Jarvis..." maxlength="18" />
        <button type="submit" class="btn-primary">Salvar</button>
      </form>
    `;
    if (firstCard && firstCard.nextSibling) viewCfg.insertBefore(card, firstCard.nextSibling);
    else viewCfg.prepend(card);

    card.querySelector('#cfg-bot-name-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = card.querySelector('#cfg-bot-name-input').value.trim().slice(0, 18);
      if (raw) localStorage.setItem(BOT_NAME_KEY, raw);
      else localStorage.removeItem(BOT_NAME_KEY);
      applyBotName();
      if (typeof hopPill === 'function') hopPill();
      if (typeof setExpression === 'function') {
        setExpression('happy');
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 1800);
      }
      if (typeof playChirp === 'function') playChirp(560, 880, 0.2);
      if (typeof say === 'function') {
        say(raw ? `Amei! Agora pode me chamar de ${raw}.` : 'Voltei a me chamar Lumo!', 3000, true, null, true);
      }
    });
  }

  // === 2. RELÓGIO MULTICOLOR (4 ESTILOS EM APARÊNCIA -> INTERFACE) ===
  const CLOCK_STYLES = ['bicolor', 'gradient', 'neon', 'classic'];

  function getClockStyle() {
    const saved = localStorage.getItem(CLOCK_STYLE_KEY);
    return CLOCK_STYLES.includes(saved) ? saved : 'bicolor';
  }

  function applyClockStyle(style) {
    const st = CLOCK_STYLES.includes(style) ? style : 'bicolor';
    localStorage.setItem(CLOCK_STYLE_KEY, st);
    CLOCK_STYLES.forEach((s) => document.body.classList.remove('clock-' + s));
    document.body.classList.add('clock-' + st);

    document.querySelectorAll('.clk-style-btn[data-clk]').forEach((b) => {
      b.classList.toggle('active', b.dataset.clk === st);
    });
  }

  function mountClockStyleCard() {
    const paneUi = document.getElementById('v38-pane-ui');
    if (!paneUi || document.getElementById('v310-clock-card')) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'v310-clock-card';
    card.innerHTML = `
      <div class="label-xs">Estilo do Relógio</div>
      <div class="clk-style-grid">
        <button type="button" class="clk-style-btn" data-clk="bicolor">
          <span class="clk-prev"><span style="color:var(--text)">21</span><span style="color:var(--accent);opacity:.8">:</span><span style="color:var(--accent)">45</span></span>
          <span class="clk-lbl">Bicolor</span>
        </button>
        <button type="button" class="clk-style-btn" data-clk="gradient">
          <span class="clk-prev clk-prev-grad">21:45</span>
          <span class="clk-lbl">Degradê</span>
        </button>
        <button type="button" class="clk-style-btn" data-clk="neon">
          <span class="clk-prev"><span style="color:var(--accent)">21</span><span style="opacity:.45">:</span><span style="color:var(--text);font-weight:400">45</span></span>
          <span class="clk-lbl">Contraste</span>
        </button>
        <button type="button" class="clk-style-btn" data-clk="classic">
          <span class="clk-prev" style="color:var(--text)">21:45</span>
          <span class="clk-lbl">Clássico</span>
        </button>
      </div>
    `;
    paneUi.appendChild(card);

    card.querySelectorAll('.clk-style-btn[data-clk]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyClockStyle(btn.dataset.clk);
        if (typeof playChirp === 'function') playChirp(520, 680, 0.1);
      });
    });
    applyClockStyle(getClockStyle());
  }

  // === 3. PACOTE DE FIGURINHAS SVG REAPROVEITÁVEL (LUMO PING + WATCH PARTY v4.0) ===
  function pillBase(color, innerSvg) {
    const c = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : 'var(--accent, #f6b974)';
    return `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="64" height="40" rx="20" fill="#10131e" stroke="${c}" stroke-width="3.2"/>
      ${innerSvg.replace(/__C__/g, c)}
    </svg>`;
  }

  const STICKERS = [
    {
      id: 'love',
      label: 'Amei',
      svg: (c) => pillBase(c, `
        <path d="M29 37c0-2.8-2.2-5-5-5s-5 2.2-5 5c0 4.8 5 7.8 5 7.8s5-3 5-7.8Z" fill="#fb7185"/>
        <path d="M61 37c0-2.8-2.2-5-5-5s-5 2.2-5 5c0 4.8 5 7.8 5 7.8s5-3 5-7.8Z" fill="#fb7185"/>
        <path d="M35 46c2.5 3 7.5 3 10 0" stroke="__C__" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M63 14c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 3.8 4 6.2 4 6.2s4-2.4 4-6.2Z" fill="#f43f5e"/>
      `)
    },
    {
      id: 'laugh',
      label: 'Kkkk',
      svg: (c) => pillBase(c, `
        <path d="M23 36l6 4-6 4" stroke="__C__" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M57 36l-6 4 6 4" stroke="__C__" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M34 45c2.2 4.5 9.8 4.5 12 0Z" fill="__C__"/>
      `)
    },
    {
      id: 'gg',
      label: 'GG!',
      svg: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="14" width="68" height="52" rx="18" fill="#10131e" stroke="${c || '#f6b974'}" stroke-width="3.2"/>
        <text x="40" y="48" text-anchor="middle" fill="${c || '#f6b974'}" font-family="system-ui,sans-serif" font-weight="900" font-size="27" letter-spacing="-1">GG!</text>
        <circle cx="17" cy="24" r="3" fill="${c || '#f6b974'}" opacity="0.7"/>
        <circle cx="63" cy="56" r="3" fill="${c || '#f6b974'}" opacity="0.7"/>
      </svg>`
    },
    {
      id: 'popcorn',
      label: 'Pipoca',
      svg: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="25" r="9" fill="#fef08a"/>
        <circle cx="42" cy="21" r="10" fill="#fde047"/>
        <circle cx="52" cy="26" r="8" fill="#fef08a"/>
        <path d="M22 30h36l-5 38H27l-5-38Z" fill="#ef4444" stroke="${c || '#f6b974'}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M33 30l2 38M47 30l-2 38" stroke="#fff" stroke-width="4" opacity="0.85"/>
      </svg>`
    },
    {
      id: 'fire',
      label: 'Hype',
      svg: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M41 10c2 12-10 18-10 30 0 9 7 16 14 16 8 0 15-7 15-17 0-9-5-16-10-21 0 6-3 9-6 10 2-6 1-13-3-18Z" fill="#f97316"/>
        <path d="M40 31c1 6-6 9-6 16 0 5 4 9 9 9 5 0 9-4 9-10 0-5-3-9-6-12 0 4-2 6-4 6 1-3 0-6-2-9Z" fill="#fde047"/>
        <circle cx="24" cy="24" r="3" fill="${c || '#f6b974'}"/>
        <circle cx="62" cy="20" r="2.5" fill="#fb923c"/>
      </svg>`
    },
    {
      id: 'shock',
      label: 'Choquei',
      svg: (c) => pillBase(c, `
        <circle cx="28" cy="39" r="6.5" fill="__C__"/>
        <circle cx="28" cy="39" r="2.4" fill="#10131e"/>
        <circle cx="52" cy="39" r="6.5" fill="__C__"/>
        <circle cx="52" cy="39" r="2.4" fill="#10131e"/>
        <ellipse cx="40" cy="49" rx="3.5" ry="4.5" fill="__C__"/>
        <path d="M40 7v7M53 10l-3 5M27 10l3 5" stroke="__C__" stroke-width="2.6" stroke-linecap="round"/>
      `)
    },
    {
      id: 'sleep',
      label: 'Sono',
      svg: (c) => pillBase(c, `
        <path d="M22 41c2.5 3 7.5 3 10 0" stroke="__C__" stroke-width="3" stroke-linecap="round"/>
        <path d="M48 41c2.5 3 7.5 3 10 0" stroke="__C__" stroke-width="3" stroke-linecap="round"/>
        <text x="53" y="17" fill="__C__" font-family="system-ui,sans-serif" font-weight="800" font-size="13">Z</text>
        <text x="62" y="12" fill="__C__" font-family="system-ui,sans-serif" font-weight="800" font-size="10" opacity="0.75">z</text>
      `)
    },
    {
      id: 'coffee',
      label: 'Café',
      svg: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 22c0-4 3-5 3-9M41 22c0-4 3-5 3-9M52 22c0-4 3-5 3-9" stroke="${c || '#f6b974'}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M20 28h34v22a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14V28Z" fill="#10131e" stroke="${c || '#f6b974'}" stroke-width="3"/>
        <path d="M54 33h6a6 6 0 0 1 0 12h-6" stroke="${c || '#f6b974'}" stroke-width="3" stroke-linecap="round"/>
        <path d="M24 34h26" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      </svg>`
    },
    {
      id: 'angry',
      label: 'Brabo',
      svg: (c) => pillBase(c, `
        <path d="M22 33l10 4M58 33l-10 4" stroke="#f87171" stroke-width="3" stroke-linecap="round"/>
        <circle cx="28" cy="42" r="4" fill="#f87171"/>
        <circle cx="52" cy="42" r="4" fill="#f87171"/>
        <path d="M34 50c2-2.5 10-2.5 12 0" stroke="#f87171" stroke-width="2.6" stroke-linecap="round"/>
      `)
    },
    {
      id: 'crown',
      label: 'Lenda',
      svg: (c) => pillBase(c, `
        <path d="M26 20l4-10 10 6 10-6 4 10H26Z" fill="#fbbf24" stroke="#fef08a" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="29" cy="40" r="4.5" fill="__C__"/>
        <circle cx="51" cy="40" r="4.5" fill="__C__"/>
        <path d="M34 48c2.2 2.4 9.8 2.4 12 0" stroke="__C__" stroke-width="2.5" stroke-linecap="round"/>
      `)
    },
    {
      id: 'star',
      label: 'Brilhou',
      svg: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 10l7.5 18.5L67 31l-15 13 4.5 19.5L40 53 23.5 63.5 28 44 13 31l19.5-2.5L40 10Z" fill="${c || '#f6b974'}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="34" cy="39" r="2.6" fill="#10131e"/>
        <circle cx="46" cy="39" r="2.6" fill="#10131e"/>
        <path d="M36 45c1.5 1.8 6.5 1.8 8 0" stroke="#10131e" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`
    },
    {
      id: 'wave',
      label: 'Salve!',
      svg: (c) => pillBase(c, `
        <circle cx="29" cy="39" r="4.5" fill="__C__"/>
        <circle cx="51" cy="39" r="4.5" fill="__C__"/>
        <path d="M35 47c2 2.6 8 2.6 10 0" stroke="__C__" stroke-width="2.6" stroke-linecap="round"/>
        <text x="60" y="21" fill="__C__" font-family="system-ui,sans-serif" font-weight="800" font-size="13">OI!</text>
      `)
    }
  ];

  function renderStickerSvg(id, color) {
    const found = STICKERS.find((s) => s.id === id) || STICKERS[0];
    return found.svg(color);
  }

  // === 4. COMPRESSÃO WEBP NO CLIENTE + UPLOAD PRO WORKER ===
  function compressImageToDataUrl(file, maxSide = 760, quality = 0.76) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxSide || h > maxSide) {
            if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
            else { w = Math.round((w * maxSide) / h); h = maxSide; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          let out = canvas.toDataURL('image/webp', quality);
          if (!out.startsWith('data:image/webp')) {
            out = canvas.toDataURL('image/jpeg', quality);
          }
          if (out.length > 480000) {
            out = canvas.toDataURL('image/jpeg', 0.58);
          }
          resolve(out);
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadChatImage(file) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      throw new Error('Selecione um arquivo de imagem.');
    }
    const dataUrl = await compressImageToDataUrl(file);
    const res = await fetch(`${API}/chat/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.url) {
      throw new Error(data.error || 'Erro ao enviar imagem (confira o deploy do Worker).');
    }
    return data.url;
  }

  // === 5. LIGHTBOX DE IMAGEM ===
  function ensureLightbox() {
    let lb = document.getElementById('lm-lightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'lm-lightbox';
    lb.className = 'lm-lightbox';
    lb.innerHTML = `
      <img id="lm-lightbox-img" alt="Imagem do chat" />
      <div class="lm-lightbox-bar">
        <button type="button" class="btn-ghost" id="lm-lb-open" style="padding:6px 12px; font-size:11px;">Abrir no navegador</button>
        <button type="button" class="btn-primary" id="lm-lb-close" style="padding:6px 14px; font-size:11px;">Fechar</button>
      </div>
    `;
    document.body.appendChild(lb);
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.classList.remove('open'); });
    lb.querySelector('#lm-lb-close').addEventListener('click', () => lb.classList.remove('open'));
    lb.querySelector('#lm-lb-open').addEventListener('click', () => {
      const src = lb.querySelector('#lm-lightbox-img').src;
      if (!src) return;
      if (typeof invoke === 'function') invoke('open_external_url', { url: src }).catch(() => window.open(src, '_blank'));
      else window.open(src, '_blank');
    });
    return lb;
  }

  function openLightbox(url) {
    const lb = ensureLightbox();
    lb.querySelector('#lm-lightbox-img').src = url;
    lb.classList.add('open');
  }

  // === 6. PICKER & ENVIO DE FIGURINHA/IMAGEM NO LUMO PING ===
  function toggleStickerPicker(btnEl) {
    const form = btnEl?.closest('.pf-dm-form') || document.querySelector('.pf-dm-form');
    if (!form) return;
    let picker = form.querySelector('.lm-stk-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.className = 'lm-stk-picker';
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f6b974';
      picker.innerHTML = `
        <div class="lm-stk-head">
          <span>Figurinhas do Lumo</span>
          <button type="button" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;" data-close-stk="1">×</button>
        </div>
        <div class="lm-stk-grid">
          ${STICKERS.map((s) => `
            <button type="button" class="lm-stk-btn" data-stk-id="${s.id}" title="${s.label}">
              ${s.svg(accent)}
              <span>${s.label}</span>
            </button>
          `).join('')}
        </div>
      `;
      form.appendChild(picker);

      picker.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-stk]')) {
          picker.classList.remove('open');
          btnEl?.classList.remove('active');
          return;
        }
        const sBtn = e.target.closest('[data-stk-id]');
        if (!sBtn) return;
        const id = sBtn.dataset.stkId;
        picker.classList.remove('open');
        btnEl?.classList.remove('active');
        window.dispatchEvent(new CustomEvent('lumo-pf-send', { detail: { kind: 'sticker', body: '::stk:' + id } }));
      });
    }
    const willOpen = !picker.classList.contains('open');
    picker.classList.toggle('open', willOpen);
    btnEl?.classList.toggle('active', willOpen);
  }

  async function handleImageFile(file) {
    if (!file) return;
    if (typeof say === 'function') say('Enviando imagem...', 2200, true);
    try {
      const url = await uploadChatImage(file);
      window.dispatchEvent(new CustomEvent('lumo-pf-send', { detail: { kind: 'image', body: '::img:' + url } }));
    } catch (err) {
      if (typeof say === 'function') say(String(err?.message || err), 3400, true);
    }
  }

  function pickChatImage() {
    let inp = document.getElementById('lm-chat-img-file');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'lm-chat-img-file';
      inp.accept = 'image/png,image/jpeg,image/webp,image/gif';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', () => {
        const f = inp.files?.[0];
        inp.value = '';
        if (f) handleImageFile(f);
      });
    }
    inp.click();
  }

  // Suporte a colar imagem (Ctrl+V) direto no input de DM do Lumo Ping
  document.addEventListener('paste', (e) => {
    const active = document.activeElement;
    if (!active || active.id !== 'pf-dm-input') return;
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type && it.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const f = imgItem.getAsFile();
      if (f) handleImageFile(f);
    }
  });

  // Inicialização
  applyBotName();
  applyClockStyle(getClockStyle());
  mountBotNameCard();
  mountClockStyleCard();
  setTimeout(() => { applyBotName(); mountBotNameCard(); mountClockStyleCard(); }, 350);
  setTimeout(() => { applyBotName(); mountClockStyleCard(); }, 1000);

  window.LumoMedia = {
    getBotName,
    applyBotName,
    applyClockStyle,
    STICKERS,
    renderStickerSvg,
    uploadChatImage,
    openLightbox,
    toggleStickerPicker,
    pickChatImage,
    handleImageFile
  };
})();
