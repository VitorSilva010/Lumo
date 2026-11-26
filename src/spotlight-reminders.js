// === LUMO v3.0.0 — BARRA RÁPIDA SPOTLIGHT & LEMBRETES COM HORÁRIO FIXO ===
(function initSpotlightAndReminders() {
  const S = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  const ICONS = {
    calc:  S('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h8"/>'),
    coin:  S('<circle cx="12" cy="12" r="8"/><path d="M12 7v10M14.5 9.5c0-1-1.1-1.7-2.5-1.7s-2.5.7-2.5 1.7 1 1.5 2.5 1.9 2.5.9 2.5 2-1.1 1.8-2.5 1.8-2.5-.8-2.5-1.8"/>'),
    unit:  S('<path d="M4 16L16 4l4 4L8 20H4v-4z"/><path d="M12 8l2 2M9 11l2 2"/>'),
    alarm: S('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M5 4l-2 2M19 4l2 2"/>'),
    trans: S('<path d="M4 6h9M8.5 4v2M6 6c.5 3.2 2.4 5.5 5 6.8M11 6c-.5 3.2-2.4 5.5-5 6.8"/><path d="M13 19l3.5-8 3.5 8M14.2 16.5h4.6"/>'),
    repeat:S('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>')
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function callRust(cmd, args) {
    if (typeof invoke === 'function') return invoke(cmd, args);
    const fn = window.__TAURI__?.core?.invoke;
    return fn ? fn(cmd, args) : Promise.resolve(null);
  }

  async function copyText(txt) {
    try { await callRust('set_clipboard_text', { text: String(txt) }); }
    catch (_) { try { await navigator.clipboard.writeText(String(txt)); } catch (_) {} }
  }

  // =========================================================
  // 1. COTAÇÕES DE MOEDAS (cache 1h + fallback offline)
  // =========================================================
  let rates = { BRL: 1, USD: 5.75, EUR: 6.20, GBP: 7.30, ARS: 0.0055, BTC: 520000 };
  try {
    const saved = JSON.parse(localStorage.getItem('lumo_fx_rates') || 'null');
    if (saved?.rates) rates = { ...rates, ...saved.rates };
  } catch (_) {}

  let ratesLive = false;
  async function refreshRates(force = false) {
    try {
      const saved = JSON.parse(localStorage.getItem('lumo_fx_rates') || 'null');
      if (!force && saved?.ts && Date.now() - saved.ts < 3600000) {
        ratesLive = true;
        return;
      }
      const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL', {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return;
      const d = await res.json();
      if (d.USDBRL?.bid) rates.USD = parseFloat(d.USDBRL.bid);
      if (d.EURBRL?.bid) rates.EUR = parseFloat(d.EURBRL.bid);
      if (d.GBPBRL?.bid) rates.GBP = parseFloat(d.GBPBRL.bid);
      if (d.BTCBRL?.bid) rates.BTC = parseFloat(d.BTCBRL.bid);
      ratesLive = true;
      localStorage.setItem('lumo_fx_rates', JSON.stringify({ ts: Date.now(), rates }));
    } catch (_) {}
  }

  const CURR_ALIAS = {
    brl: 'BRL', real: 'BRL', reais: 'BRL', 'r$': 'BRL',
    usd: 'USD', dolar: 'USD', dolares: 'USD', 'dólar': 'USD', 'dólares': 'USD', '$': 'USD', 'us$': 'USD',
    eur: 'EUR', euro: 'EUR', euros: 'EUR', '€': 'EUR',
    gbp: 'GBP', libra: 'GBP', libras: 'GBP', '£': 'GBP',
    btc: 'BTC', bitcoin: 'BTC',
    ars: 'ARS', peso: 'ARS', pesos: 'ARS'
  };
  const CURR_SYM = { BRL: 'R$ ', USD: 'US$ ', EUR: '€ ', GBP: '£ ', BTC: 'BTC ', ARS: 'ARS ' };

  function fmtNum(n, dec = 2) {
    if (!Number.isFinite(n)) return '';
    if (Math.abs(n) >= 1000) {
      return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    if (Number.isInteger(n) && dec <= 2) return String(n);
    return n.toFixed(dec).replace('.', ',');
  }

  // =========================================================
  // 2. PARSER DO SPOTLIGHT (Calc, Moedas, Unidades, Lembrete, Tradução)
  // =========================================================
  function parseNumber(s) {
    const clean = String(s || '').trim().replace(/\s+/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : NaN;
  }

  function parseReminderCmd(raw) {
    const t = raw.trim();
    const m = t.match(/^(?:\/lembr(?:ar|ete)|lembr(?:ar|ete)|me\s+lembr(?:a|e))\s+(?:(?:às|as)\s+)?(\d{1,2})[:h](\d{2})?\s*(?:(?:de|para|pra)\s+)?(.+)$/i);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2] || '0', 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const rawBody = m[3].trim();
    const daily = /\b(todo\s+dia|diariamente|todos\s+os\s+dias)\b/i.test(rawBody);
    const text = rawBody.replace(/\b(todo\s+dia|diariamente|todos\s+os\s+dias)\b/gi, '').trim();
    if (!text) return null;
    return {
      kind: 'reminder',
      icon: ICONS.alarm,
      value: `${time} · ${text}`,
      sub: daily ? 'Criar lembrete diário (todo dia)' : 'Criar lembrete com horário fixo',
      hint: 'Enter · Criar',
      data: { time, text, daily }
    };
  }

  function parseCurrency(raw) {
    const t = raw.trim().toLowerCase();
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(r\$|us\$|\$|€|£|brl|reais|real|usd|d[oó]lar(?:es)?|eur|euros?|gbp|libras?|btc|bitcoin|ars|pesos?)(?:\s+(?:em|para|pra|to|->)\s+(r\$|us\$|\$|€|£|brl|reais|real|usd|d[oó]lar(?:es)?|eur|euros?|gbp|libras?|btc|bitcoin|ars|pesos?))?$/i);
    if (!m) return null;
    const amount = parseNumber(m[1]);
    const from = CURR_ALIAS[m[2].toLowerCase()];
    let to = m[3] ? CURR_ALIAS[m[3].toLowerCase()] : (from === 'BRL' ? 'USD' : 'BRL');
    if (!from || !to || from === to || !rates[from] || !rates[to]) return null;
    const inBrl = amount * rates[from];
    const out = inBrl / rates[to];
    const dec = to === 'BTC' ? 6 : 2;
    const formatted = `${CURR_SYM[to]}${fmtNum(out, dec)}`;
    return {
      kind: 'copy',
      icon: ICONS.coin,
      value: formatted,
      copyValue: fmtNum(out, dec),
      sub: `${fmtNum(amount, from === 'BTC' ? 4 : 2)} ${from} → ${to} ${ratesLive ? '· cotação atual' : '· estimado'}`,
      hint: 'Enter · Copiar'
    };
  }

  function parseUnit(raw) {
    const t = raw.trim().toLowerCase();
    const m = t.match(/^(-?\d+(?:[.,]\d+)?)\s*(c|°c|f|°f|km|mi|m|ft|cm|in|kg|lb|gb|mb|tb|kb|h|min)\s*(?:(?:em|para|pra|to|->)\s*(c|°c|f|°f|km|mi|m|ft|cm|in|kg|lb|gb|mb|tb|kb|h|min))?$/i);
    if (!m) return null;
    const val = parseNumber(m[1]);
    const norm = (u) => u.replace('°', '').toLowerCase();
    const from = norm(m[2]);
    const defaults = { c: 'f', f: 'c', km: 'mi', mi: 'km', m: 'ft', ft: 'm', cm: 'in', in: 'cm', kg: 'lb', lb: 'kg', gb: 'mb', mb: 'gb', tb: 'gb', kb: 'mb', h: 'min', min: 'h' };
    const to = m[3] ? norm(m[3]) : defaults[from];
    if (!to || from === to) return null;

    let res = null;
    const pair = `${from}->${to}`;
    if (pair === 'c->f') res = (val * 9) / 5 + 32;
    else if (pair === 'f->c') res = ((val - 32) * 5) / 9;
    else if (pair === 'km->mi') res = val * 0.621371;
    else if (pair === 'mi->km') res = val * 1.60934;
    else if (pair === 'm->ft') res = val * 3.28084;
    else if (pair === 'ft->m') res = val * 0.3048;
    else if (pair === 'cm->in') res = val / 2.54;
    else if (pair === 'in->cm') res = val * 2.54;
    else if (pair === 'kg->lb') res = val * 2.20462;
    else if (pair === 'lb->kg') res = val * 0.453592;
    else if (pair === 'gb->mb') res = val * 1024;
    else if (pair === 'mb->gb') res = val / 1024;
    else if (pair === 'tb->gb') res = val * 1024;
    else if (pair === 'gb->tb') res = val / 1024;
    else if (pair === 'kb->mb') res = val / 1024;
    else if (pair === 'mb->kb') res = val * 1024;
    else if (pair === 'h->min') res = val * 60;
    else if (pair === 'min->h') res = val / 60;
    if (res === null) return null;

    const unitOut = to === 'c' ? '°C' : to === 'f' ? '°F' : to.toUpperCase();
    const outStr = `${fmtNum(res, 2)} ${unitOut}`;
    return {
      kind: 'copy',
      icon: ICONS.unit,
      value: outStr,
      copyValue: fmtNum(res, 2),
      sub: `Conversão instantânea (${val} ${from.toUpperCase()} → ${unitOut})`,
      hint: 'Enter · Copiar'
    };
  }

  function parseMath(raw) {
    const t = raw.trim();
    // Suporte natural para "25% de 400"
    const pct = t.match(/^(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)$/i);
    if (pct) {
      const p = parseNumber(pct[1]);
      const base = parseNumber(pct[2]);
      const r = (p / 100) * base;
      const out = fmtNum(r, Number.isInteger(r) ? 0 : 2);
      return {
        kind: 'copy',
        icon: ICONS.calc,
        value: `= ${out}`,
        copyValue: out,
        sub: `${pct[1]}% de ${pct[2]}`,
        hint: 'Enter · Copiar'
      };
    }

    const exprRaw = t.startsWith('=') ? t.slice(1).trim() : t;
    // Só dispara sem "=" se contiver ao menos um operador matemático e começar com número ou "("
    if (!t.startsWith('=') && !(/^[(\d]/.test(exprRaw) && /[+\-*/×÷^]/.test(exprRaw))) return null;
    const norm = exprRaw.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    if (!norm || !/^[\d\s+\-*/().]+$/.test(norm)) return null;
    try {
      const val = Function('"use strict"; return (' + norm + ')')();
      if (typeof val !== 'number' || !Number.isFinite(val)) return null;
      const out = Number.isInteger(val) ? String(val) : fmtNum(val, 2);
      return {
        kind: 'copy',
        icon: ICONS.calc,
        value: `= ${out}`,
        copyValue: out,
        sub: 'Cálculo instantâneo',
        hint: 'Enter · Copiar'
      };
    } catch (_) { return null; }
  }

  function parseTranslate(raw) {
    const m = raw.trim().match(/^\/tr(?:aduzir)?\s+([\s\S]+)$/i);
    if (!m) return null;
    const text = m[1].trim();
    if (!text) return null;
    return {
      kind: 'translate',
      icon: ICONS.trans,
      value: `Traduzir: "${text.slice(0, 34)}${text.length > 34 ? '…' : ''}"`,
      sub: 'Detecção automática PT ↔ EN via IA Lumo',
      hint: 'Enter · Traduzir',
      text
    };
  }

  function evaluateSpotlight(raw) {
    if (!raw || raw.trim().length < 2) return null;
    return (
      parseReminderCmd(raw) ||
      parseTranslate(raw) ||
      parseCurrency(raw) ||
      parseUnit(raw) ||
      parseMath(raw)
    );
  }

  // =========================================================
  // 3. MOTOR DE LEMBRETES COM HORÁRIO FIXO
  // =========================================================
  let reminders = [];
  try { reminders = JSON.parse(localStorage.getItem('lumo_fixed_reminders') || '[]'); } catch (_) { reminders = []; }
  if (!Array.isArray(reminders)) reminders = [];
  let createDailyMode = false;
  let activeAlertRem = null;

  function saveReminders() {
    localStorage.setItem('lumo_fixed_reminders', JSON.stringify(reminders));
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function minutesUntil(hhmm) {
    const [h, m] = String(hhmm || '00:00').split(':').map((x) => parseInt(x, 10) || 0);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    let diffMin = Math.ceil((target.getTime() - now.getTime()) / 60000);
    if (diffMin < 0) diffMin += 24 * 60;
    return diffMin;
  }

  function fmtUntil(min) {
    if (min <= 1) return 'agora';
    if (min < 60) return `em ${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `em ${h}h ${m}min` : `em ${h}h`;
  }

  function addFixedReminder(time, text, daily = false) {
    const cleanTime = String(time || '').trim();
    const cleanText = String(text || '').trim().slice(0, 80);
    if (!/^\d{2}:\d{2}$/.test(cleanTime) || !cleanText) return false;
    reminders.push({
      id: 'rem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      time: cleanTime,
      text: cleanText,
      daily: Boolean(daily),
      lastFired: ''
    });
    reminders.sort((a, b) => a.time.localeCompare(b.time));
    saveReminders();
    renderRemindersCard();
    return true;
  }

  function deleteFixedReminder(id) {
    reminders = reminders.filter((r) => r.id !== id);
    saveReminders();
    renderRemindersCard();
  }

  function toggleReminderDaily(id) {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    r.daily = !r.daily;
    saveReminders();
    renderRemindersCard();
  }

  function fireReminder(r) {
    activeAlertRem = { ...r };
    renderResumoAlert();

    const inGame = typeof isGameSessionActive === 'function'
      ? isGameSessionActive()
      : (typeof isHiddenInGame !== 'undefined' && isHiddenInGame);
    const stealth = typeof isStealth === 'function' && isStealth();

    if (!inGame) {
      if (typeof hopPill === 'function') hopPill();
      if (typeof window.burstPingParticles === 'function') window.burstPingParticles('alert', '', 6);
      if (!stealth && typeof playChirp === 'function') {
        playChirp(580, 880, 0.14);
        setTimeout(() => playChirp(680, 1020, 0.16), 140);
      }
      if (typeof setExpression === 'function' && !(typeof isThinking !== 'undefined' && isThinking)) {
        setExpression('happy');
        setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 3000);
      }
      if (typeof say === 'function') {
        say(`⏰ ${r.time} · ${r.text}`, 6500, true);
      }
    }
  }

  function checkRemindersClock() {
    if (!reminders.length) return;
    const now = new Date();
    const curHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = todayKey();
    let changed = false;
    const toRemove = [];

    for (const r of reminders) {
      if (r.time === curHM && r.lastFired !== today) {
        r.lastFired = today;
        changed = true;
        fireReminder(r);
        if (!r.daily) toRemove.push(r.id);
      }
    }
    if (toRemove.length) {
      reminders = reminders.filter((r) => !toRemove.includes(r.id));
    }
    if (changed) {
      saveReminders();
      renderRemindersCard();
    }
  }

  function renderResumoAlert() {
    const resumo = document.querySelector('#view-resumo .home-scroll') || document.getElementById('view-resumo');
    if (!resumo) return;
    let box = document.getElementById('resumo-rem-alert');
    if (!box) {
      box = document.createElement('div');
      box.id = 'resumo-rem-alert';
      resumo.insertAdjacentElement('afterbegin', box);
    }
    if (!activeAlertRem) {
      box.classList.remove('show');
      return;
    }
    box.classList.add('show');
    box.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="display:flex; align-items:center; gap:7px; color:var(--accent); font-size:10.5px; font-weight:800;">
          <span class="sp-icon" style="width:22px; height:22px;">${ICONS.alarm}</span>
          <span>LEMBRETE · ${esc(activeAlertRem.time)}</span>
        </div>
        <button type="button" class="rem-del" onclick="LumoReminders.dismissAlert()">×</button>
      </div>
      <div style="font-size:12px; font-weight:700; color:var(--text);">${esc(activeAlertRem.text)}</div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="cp-mini" style="flex:1;" onclick="LumoReminders.snoozeAlert(10)">Adiar +10 min</button>
        <button type="button" class="cp-mini" style="flex:1; background:var(--accent); color:#0b0e14; border-color:var(--accent); font-weight:800;" onclick="LumoReminders.dismissAlert()">Concluir</button>
      </div>`;
  }

  function renderRemindersCard() {
    const viewUtil = document.getElementById('view-util');
    if (!viewUtil) return;
    let card = document.getElementById('fixed-reminders-card');
    if (!card) {
      card = document.createElement('div');
      card.className = 'card';
      card.id = 'fixed-reminders-card';
      viewUtil.appendChild(card);
    }

    const nextHour = new Date(Date.now() + 30 * 60000);
    const defaultTime = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
    const prevTime = document.getElementById('rem-time-inp')?.value || defaultTime;
    const prevText = document.getElementById('rem-text-inp')?.value || '';

    const itemsHtml = reminders.length
      ? reminders.map((r) => `
          <div class="rem-item">
            <span class="rem-time-badge">${esc(r.time)}</span>
            <div class="rem-info">
              <div class="rem-title" title="${esc(r.text)}">${esc(r.text)}</div>
              <div class="rem-meta">${r.daily ? 'Todo dia · ' : ''}${fmtUntil(minutesUntil(r.time))}</div>
            </div>
            <button type="button" class="rem-repeat-btn ${r.daily ? 'active' : ''}" style="width:24px; height:24px;" title="${r.daily ? 'Diário ativo' : 'Tornar diário'}" onclick="LumoReminders.toggleDaily('${esc(r.id)}')">${ICONS.repeat}</button>
            <button type="button" class="rem-del" title="Remover" onclick="LumoReminders.remove('${esc(r.id)}')">×</button>
          </div>`).join('')
      : `<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:6px 2px;">Nenhum lembrete agendado. Crie abaixo ou digite <strong>/lembrar 18:30 ...</strong> na barra rápida.</div>`;

    card.innerHTML = `
      <div class="label-xs" style="display:flex; align-items:center; justify-content:space-between;">
        <span style="display:inline-flex; align-items:center; gap:6px;">
          <span style="width:14px; height:14px; color:var(--accent); display:inline-flex;">${ICONS.alarm}</span>
          Lembretes por Horário
        </span>
        <span style="color:var(--muted); font-size:10px; font-weight:600;">${reminders.length} ativo${reminders.length === 1 ? '' : 's'}</span>
      </div>
      <form class="rem-form" onsubmit="LumoReminders.submitForm(event)">
        <input type="time" id="rem-time-inp" class="rem-time-inp" value="${esc(prevTime)}" required />
        <input type="text" id="rem-text-inp" class="rem-text-inp" value="${esc(prevText)}" placeholder="Ex: Tomar água, Reunião..." maxlength="80" autocomplete="off" />
        <button type="button" id="rem-daily-btn" class="rem-repeat-btn ${createDailyMode ? 'active' : ''}" title="Repetir todo dia" onclick="LumoReminders.toggleCreateDaily()">${ICONS.repeat}</button>
        <button type="submit" class="rem-add-btn">+</button>
      </form>
      <div class="rem-list">${itemsHtml}</div>`;
  }

  window.LumoReminders = {
    submitForm(e) {
      e.preventDefault();
      const t = document.getElementById('rem-time-inp')?.value;
      const txt = document.getElementById('rem-text-inp')?.value;
      if (addFixedReminder(t, txt, createDailyMode)) {
        const inp = document.getElementById('rem-text-inp');
        if (inp) inp.value = '';
        if (typeof playChirp === 'function') playChirp(580, 860, 0.12);
        if (typeof say === 'function') say(`Lembrete marcado para ${t} ✓`, 2400, true);
      }
    },
    toggleCreateDaily() {
      createDailyMode = !createDailyMode;
      const b = document.getElementById('rem-daily-btn');
      if (b) b.classList.toggle('active', createDailyMode);
    },
    toggleDaily: toggleReminderDaily,
    remove: deleteFixedReminder,
    dismissAlert() {
      activeAlertRem = null;
      renderResumoAlert();
    },
    snoozeAlert(mins = 10) {
      if (!activeAlertRem) return;
      const d = new Date(Date.now() + mins * 60000);
      const nextHM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      addFixedReminder(nextHM, activeAlertRem.text, false);
      activeAlertRem = null;
      renderResumoAlert();
      if (typeof say === 'function') say(`Adiado para ${nextHM} ✓`, 2400, true);
    }
  };

  // =========================================================
  // 4. INTEGRAÇÃO COM A BARRA RÁPIDA (quick-ai-dock)
  // =========================================================
  const dock = document.querySelector('.quick-ai-dock');
  const form = dock?.querySelector('.quick-ai-form');
  const input = document.getElementById('quick-ai-input');
  let previewEl = document.getElementById('spotlight-preview');
  let currentMatch = null;

  if (dock && form && !previewEl) {
    previewEl = document.createElement('div');
    previewEl.id = 'spotlight-preview';
    dock.insertBefore(previewEl, form);
    previewEl.addEventListener('mousedown', (e) => e.preventDefault());
    previewEl.addEventListener('click', () => executeMatch());
  }

  // Adiciona chips /lembrar e /tr discretamente nos comandos rápidos
  const chipsWrap = dock?.querySelector('.cmd-chips');
  if (chipsWrap && !chipsWrap.querySelector('[data-sp="lembrar"]')) {
    chipsWrap.insertAdjacentHTML(
      'beforeend',
      `<button class="cmd-chip" type="button" data-sp="lembrar" onclick="fillCmd('/lembrar ')">/lembrar</button>
       <button class="cmd-chip" type="button" data-sp="tr" onclick="fillCmd('/tr ')">/tr</button>`
    );
  }

  function updateSpotlightPreview() {
    if (!previewEl || !input) return;
    const raw = input.value || '';
    const m = evaluateSpotlight(raw);
    currentMatch = m;
    if (!m) {
      previewEl.classList.remove('show');
      return;
    }
    if (m.kind === 'copy' && m.icon === ICONS.coin && !ratesLive) refreshRates();
    previewEl.classList.add('show');
    previewEl.innerHTML = `
      <div class="sp-left">
        <span class="sp-icon">${m.icon}</span>
        <div style="min-width:0; flex:1;">
          <div class="sp-val">${esc(m.value)}</div>
          <div class="sp-sub">${esc(m.sub)}</div>
        </div>
      </div>
      <span class="sp-hint">${esc(m.hint)}</span>`;
  }

  async function executeMatch() {
    const m = currentMatch || (input ? evaluateSpotlight(input.value) : null);
    if (!m) return false;

    if (m.kind === 'copy') {
      await copyText(m.copyValue || m.value);
      if (input) input.value = '';
      currentMatch = null;
      previewEl?.classList.remove('show');
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(620, 900, 0.14);
      if (typeof say === 'function') say(`${m.value} (copiado!)`, 3000, true);
      return true;
    }

    if (m.kind === 'reminder') {
      addFixedReminder(m.data.time, m.data.text, m.data.daily);
      if (input) input.value = '';
      currentMatch = null;
      previewEl?.classList.remove('show');
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(580, 880, 0.14);
      if (typeof say === 'function') say(`⏰ Lembrete marcado às ${m.data.time}${m.data.daily ? ' (todo dia)' : ''}!`, 3200, true);
      return true;
    }

    if (m.kind === 'translate') {
      if (input) input.value = `Traduza de forma natural (se estiver em inglês, traduza para português; se estiver em português, traduza para inglês). Responda apenas com a tradução:\n\n${m.text}`;
      currentMatch = null;
      previewEl?.classList.remove('show');
      return false; // deixa o quickCommand original enviar para a IA
    }
    return false;
  }

  if (input) {
    input.addEventListener('input', updateSpotlightPreview);
    input.addEventListener('blur', () => {
      setTimeout(() => previewEl?.classList.remove('show'), 180);
    });
    input.addEventListener('focus', updateSpotlightPreview);
  }

  // Envolve window.quickCommand sem quebrar nenhum comando existente
  const _origQuickCommand = window.quickCommand;
  window.quickCommand = async function (e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const m = input ? evaluateSpotlight(input.value) : null;
    if (m) {
      currentMatch = m;
      const handled = await executeMatch();
      if (handled) {
        if (typeof stopTypingLook === 'function') stopTypingLook();
        return;
      }
    }
    if (typeof _origQuickCommand === 'function') {
      return _origQuickCommand(e);
    }
  };

  renderRemindersCard();
  refreshRates(false);
  checkRemindersClock();
  setInterval(checkRemindersClock, 15000);
})();
