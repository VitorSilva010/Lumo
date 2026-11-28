// === LUMO STREAM — MODO STREAMER, OBS INVISÍVEL, CHAT TWITCH NA CÁPSULA & MONITOR DE REGRAS ===
(function initLumoStream() {
  const MAX_MSGS = 70;
  const STORAGE_KEY = 'lumo_stream_cfg_v1';

  const defaultCfg = {
    channel: '',
    noGameMode: false,
    obsInvisible: false,
    blockLinks: true,
    blockCaps: false,
    ignoreVips: true,
    capsuleAlerts: true,
    capsuleChat: true,
    testOwnMessages: false,
    bannedWords: 'gore, golpe, hack gratis, clique aqui',
    aiRules: 'Sem preconceito, sem spoilers do jogo, sem divulgação de outros canais e sem brigas no chat.'
  };

  let cfg = { ...defaultCfg };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') cfg = { ...defaultCfg, ...saved };
  } catch (_) {}

  let activeTab = 'chat'; // 'chat' | 'livepix' | 'rules'
  let chatFilter = 'all'; // 'all' | 'alerts'
  let ws = null;
  let wsState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
  let manualDisconnect = false;
  let reconnectAttempts = 0;
  let reconnectTimer = 0;
  let messages = [];
  let pixFeed = [];
  let alertCount = 0;
  let autoScroll = true;
  let lastChatToastAt = 0;
  let pillFlashTimer = 0;

  function saveCfg() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) {}
    localStorage.setItem('lumo_stream_no_gamemode', cfg.noGameMode ? '1' : '0');
    window.lumoDisableGameMode = Boolean(cfg.noGameMode);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normText(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function fmtNow() {
    try { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return ''; }
  }

  function flashPill(withHop = false) {
    const pill = document.getElementById('lumo-pill');
    if (pill) {
      pill.classList.add('ls-ping-flash');
      clearTimeout(pillFlashTimer);
      pillFlashTimer = setTimeout(() => pill.classList.remove('ls-ping-flash'), 900);
    }
    if (withHop && typeof hopPill === 'function') hopPill();
  }

  function notifyCapsule(text, duration = 3600, priority = false) {
    if (typeof say !== 'function') return;
    say(text, duration, true);
    flashPill(priority);
  }

  // === 1. OBS INVISÍVEL & TRAVA DO MODO JOGO ===
  async function applyObsInvisible(enabled, silent = false) {
    cfg.obsInvisible = Boolean(enabled);
    saveCfg();
    if (typeof invoke === 'function') {
      try {
        await invoke('set_obs_invisible', { enabled: cfg.obsInvisible });
        if (!silent) {
          notifyCapsule(cfg.obsInvisible ? 'Lumo invisível no OBS e capturas de tela!' : 'Lumo visível novamente no OBS.', 2600);
        }
      } catch (err) {
        if (!silent) notifyCapsule('Não foi possível alterar visibilidade no OBS: ' + String(err), 3200);
      }
    }
    syncToggleCards();
  }

  function applyNoGameMode(enabled, silent = false) {
    cfg.noGameMode = Boolean(enabled);
    saveCfg();
    const autoHideCb = document.getElementById('autohide-toggle');
    if (autoHideCb && cfg.noGameMode) {
      autoHideCb.checked = false;
      try { localStorage.setItem('lumo_autohide', 'false'); } catch (_) {}
    }
    if (cfg.noGameMode && typeof isHiddenInGame !== 'undefined' && isHiddenInGame && typeof wakeFromGame === 'function') {
      wakeFromGame();
    }
    if (!silent) {
      notifyCapsule(
        cfg.noGameMode
          ? 'Modo Jogo desativado! Deixe o jogo em Janela Sem Bordas para ver o Lumo por cima.'
          : 'Modo Jogo reativado.',
        3200
      );
    }
    syncToggleCards();
  }

  // === 2. CARD LUMO STREAM DEBAIXO DO LUMO PING NA GRADE DO RESUMO ===
  function ensureStreamTile() {
    const grid = document.querySelector('#view-resumo .hub-grid');
    if (!grid) return;

    let tile = document.getElementById('tile-stream');
    if (!tile) {
      tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'hub-tile';
      tile.id = 'tile-stream';
      tile.onclick = () => { if (typeof openView === 'function') openView('stream'); };
      tile.innerHTML = `
        <span class="ls-live-pill"><i></i>LIVE</span>
        <div class="tile-icon">
          <svg class="ic" viewBox="0 0 24 24">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
        </div>
        <div>
          <div class="tile-title">Lumo Stream</div>
          <div class="tile-sub" id="stream-tile-sub">Twitch · LivePix</div>
        </div>
      `;
      grid.appendChild(tile);
    }

    const byId = (id) => grid.querySelector('#' + id);
    const allTiles = Array.from(grid.querySelectorAll(':scope > .hub-tile'));
    const tileIa = byId('tile-ia') || allTiles.find((t) => /ia lumo/i.test(t.textContent || ''));
    const tilePing = byId('tile-ping') || allTiles.find((t) => /lumo ping/i.test(t.textContent || ''));
    const tileMusic = grid.querySelector('[data-lm-tile="1"]') || byId('tile-midia');
    const tileBolso = byId('tile-bolso') || allTiles.find((t) => /bolso/i.test(t.textContent || ''));
    const tileUtil = byId('tile-util') || allTiles.find((t) => /foco/i.test(t.textContent || ''));
    const tileKit = byId('tile-kit') || allTiles.find((t) => /kit rápido/i.test(t.textContent || ''));

    const ordered = [tileIa, tilePing, tileMusic, tileBolso, tile, tileUtil, tileKit].filter(Boolean);
    for (const el of ordered) grid.appendChild(el);

    const finalTiles = Array.from(grid.querySelectorAll(':scope > .hub-tile'));
    finalTiles.forEach((t) => {
      t.classList.remove('ls-wide-tile');
      const oldArrow = t.querySelector('.ls-wide-arrow');
      if (oldArrow) oldArrow.remove();
    });
    if (finalTiles.length % 3 === 1) {
      const last = finalTiles[finalTiles.length - 1];
      last.classList.add('ls-wide-tile');
      const arr = document.createElement('span');
      arr.className = 'ls-wide-arrow';
      arr.textContent = '›';
      last.appendChild(arr);
    }

    syncStreamTileBadge();
  }

  function syncStreamTileBadge() {
    const tile = document.getElementById('tile-stream');
    const sub = document.getElementById('stream-tile-sub');
    if (!tile || !sub) return;
    const isLive = wsState === 'connected' && Boolean(cfg.channel);
    tile.classList.toggle('is-live', isLive);
    if (isLive) {
      sub.textContent = alertCount > 0 ? `#${cfg.channel} · ${alertCount} alerta${alertCount > 1 ? 's' : ''}` : `#${cfg.channel}`;
    } else if (cfg.obsInvisible || cfg.noGameMode) {
      sub.textContent = cfg.obsInvisible ? 'Invisível no OBS' : 'Sobre jogos ativo';
    } else {
      sub.textContent = 'Twitch · LivePix';
    }
  }

  // === 3. MOTOR DE REGRAS LOCAL (0ms) ===
  function getBannedList() {
    return String(cfg.bannedWords || '')
      .split(/[\n,;]+/)
      .map((w) => normText(w).trim())
      .filter((w) => w.length >= 2);
  }

  function evaluateMessageRules(msg) {
    const isBroadcaster = msg.badges.includes('live');
    const isMod = msg.badges.includes('mod');

    // Poupa dono do canal e mods, exceto quando o modo de teste para a própria conta está ativado
    if (isMod) return null;
    if (isBroadcaster && !cfg.testOwnMessages) return null;

    if (!isBroadcaster && cfg.ignoreVips && (msg.badges.includes('vip') || msg.badges.includes('sub'))) {
      const nText = normText(msg.text);
      for (const word of getBannedList()) {
        if (nText.includes(word)) return `Palavra proibida`;
      }
      return null;
    }

    const nText = normText(msg.text);
    for (const word of getBannedList()) {
      if (nText.includes(word)) return `Palavra proibida`;
    }
    if (cfg.blockLinks && /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|gg|tv|me|ly|br|xyz)\b)/i.test(msg.text)) {
      return 'Link não permitido';
    }
    if (cfg.blockCaps) {
      const letters = msg.text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
      if (letters.length >= 10) {
        const uppers = letters.replace(/[^A-ZÀ-Ý]/g, '').length;
        if (uppers / letters.length >= 0.78) return 'Excesso de CAPS';
      }
    }
    return null;
  }

  // === 4. CONEXÃO WEBSOCKET TWITCH IRCv3 ===
  function parseIrcTags(rawTagStr) {
    const out = {};
    if (!rawTagStr) return out;
    for (const part of rawTagStr.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const k = part.slice(0, eq);
      const v = part.slice(eq + 1).replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\');
      out[k] = v;
    }
    return out;
  }

  function parseIrcLine(line) {
    if (!line) return;
    if (line.startsWith('PING')) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(line.replace('PING', 'PONG') + '\r\n');
      }
      return;
    }

    let rest = line;
    let tags = {};
    if (rest.startsWith('@')) {
      const sp = rest.indexOf(' ');
      tags = parseIrcTags(rest.slice(1, sp));
      rest = rest.slice(sp + 1);
    }

    const m = rest.match(/^:([^!\s]+)![^\s]+\s+PRIVMSG\s+#([^\s]+)\s+:(.*)$/);
    if (!m) return;

    const login = m[1];
    let text = m[3] || '';
    if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) {
      text = text.slice(8, -1);
    }
    const displayName = (tags['display-name'] || login || 'viewer').trim();
    const rawBadges = String(tags.badges || '');
    const badges = [];
    if (rawBadges.includes('broadcaster/')) badges.push('live');
    if (rawBadges.includes('moderator/')) badges.push('mod');
    if (rawBadges.includes('vip/')) badges.push('vip');
    if (rawBadges.includes('subscriber/') || rawBadges.includes('founder/')) badges.push('sub');

    const color = /^#[0-9a-fA-F]{6}$/.test(tags.color || '') ? tags.color : '#f6b974';

    const msgObj = {
      id: tags.id || ('m_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      login: login.toLowerCase(),
      user: displayName,
      color,
      badges,
      text: text.trim(),
      time: fmtNow(),
      flagReason: null,
      hidden: false
    };

    msgObj.flagReason = evaluateMessageRules(msgObj);

    const viewEl = document.getElementById('view-stream');
    const lookingAtStream = Boolean(viewEl && viewEl.classList.contains('active') && typeof isExpanded !== 'undefined' && isExpanded);

    if (msgObj.flagReason) {
      alertCount++;
      if (cfg.capsuleAlerts) {
        if (typeof playChirp === 'function') playChirp(340, 240, 0.16);
        notifyCapsule(`Alerta (${msgObj.flagReason}) — ${msgObj.user}: ${msgObj.text.slice(0, 68)}`, 4200, true);
      }
    } else if (cfg.capsuleChat && !lookingAtStream) {
      const now = Date.now();
      if (now - lastChatToastAt >= 1600) {
        lastChatToastAt = now;
        const preview = msgObj.text.length > 78 ? msgObj.text.slice(0, 77) + '…' : msgObj.text;
        notifyCapsule(`${msgObj.user}: ${preview}`, 3600, false);
      }
    }

    messages.push(msgObj);
    if (messages.length > MAX_MSGS) messages.shift();

    renderChatFeed();
    syncStreamTileBadge();
    syncTabsCounts();
  }

  function connectTwitch(channelInput) {
    const clean = String(channelInput || cfg.channel || '')
      .trim()
      .replace(/^https?:\/\/(?:www\.)?twitch\.tv\//i, '')
      .replace(/^[@#]/, '')
      .split(/[/?\s]/)[0]
      .toLowerCase();

    if (!clean || !/^[a-z0-9_]{2,25}$/.test(clean)) {
      notifyCapsule('Digite um nome de canal válido da Twitch (ex: alanzoka).', 2600);
      return;
    }

    disconnectTwitch(true);
    cfg.channel = clean;
    saveCfg();
    manualDisconnect = false;
    wsState = 'connecting';
    syncConnectUI();

    try {
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    } catch (_) {
      wsState = 'disconnected';
      syncConnectUI();
      notifyCapsule('Não consegui abrir conexão com a Twitch.', 2600);
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      const anonNick = 'justinfan' + (10000 + Math.floor(Math.random() * 89000));
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n');
      ws.send('PASS SCHMOOPIIE\r\n');
      ws.send(`NICK ${anonNick}\r\n`);
      ws.send(`JOIN #${cfg.channel}\r\n`);
      wsState = 'connected';
      syncConnectUI();
      syncStreamTileBadge();
      notifyCapsule(`Chat da Twitch conectado em #${cfg.channel}!`, 2600);
    };

    ws.onmessage = (ev) => {
      const lines = String(ev.data || '').split('\r\n');
      for (const l of lines) {
        if (l) parseIrcLine(l);
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      ws = null;
      if (manualDisconnect) {
        wsState = 'disconnected';
        syncConnectUI();
        syncStreamTileBadge();
        return;
      }
      wsState = 'connecting';
      syncConnectUI();
      syncStreamTileBadge();
      const delay = Math.min(15000, 2000 * Math.pow(2, reconnectAttempts));
      reconnectAttempts++;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (!manualDisconnect && cfg.channel) connectTwitch(cfg.channel);
      }, delay);
    };
  }

  function disconnectTwitch(silent = false) {
    manualDisconnect = true;
    clearTimeout(reconnectTimer);
    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
    }
    wsState = 'disconnected';
    if (!silent) {
      syncConnectUI();
      syncStreamTileBadge();
    }
  }

  // === 5. AÇÕES DE MODERAÇÃO, TESTE DE REGRA & PRÉVIA LIVEPIX ===
  function copyText(txt, toastMsg) {
    const done = () => notifyCapsule(toastMsg, 2800);
    if (typeof invoke === 'function') {
      invoke('set_clipboard_text', { text: txt }).then(done).catch(() => {
        navigator.clipboard?.writeText(txt).then(done).catch(() => {});
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(done).catch(() => {});
    }
  }

  function modAction(msgId, action) {
    const m = messages.find((x) => x.id === msgId);
    if (!m) return;
    if (action === 'hide') {
      m.hidden = true;
      renderChatFeed();
      return;
    }
    if (action === 'timeout') {
      copyText(`/timeout ${m.login} 600 Quebrou regra do canal`, `Copiado: /timeout ${m.login} 600 (ban 1-clique chega na Etapa 2!)`);
      m.hidden = true;
      renderChatFeed();
      return;
    }
    if (action === 'ban') {
      copyText(`/ban ${m.login} Quebrou regra do canal`, `Copiado: /ban ${m.login} (ban 1-clique chega na Etapa 2!)`);
      m.hidden = true;
      renderChatFeed();
    }
  }

  function triggerTestRuleAlert() {
    const fake = {
      id: 'test_' + Date.now().toString(36),
      login: 'troll_teste',
      user: 'troll_teste',
      color: '#f87171',
      badges: [],
      text: 'ei entra nesse site gratis agora www.golpe-teste.com',
      time: fmtNow(),
      flagReason: 'Link não permitido',
      hidden: false
    };
    alertCount++;
    messages.push(fake);
    if (messages.length > MAX_MSGS) messages.shift();
    renderChatFeed();
    syncStreamTileBadge();
    syncTabsCounts();
    if (typeof playChirp === 'function') playChirp(340, 240, 0.16);
    notifyCapsule(`Alerta (${fake.flagReason}) — ${fake.user}: ${fake.text}`, 4400, true);
  }

  function triggerTestPix() {
    const samples = [
      { author: 'Kiq', amount: 'R$ 10,00', msg: 'Bora amassar nessa partida! Lumo Stream tá insano!' },
      { author: 'harubiss', amount: 'R$ 25,00', msg: 'Salve chat! Passando pra apoiar a live!' },
      { author: 'Sr. Ricardo', amount: 'R$ 5,00', msg: 'Testando alerta do LivePix direto na cápsula!' }
    ];
    const pick = samples[pixFeed.length % samples.length];
    pixFeed.unshift({ ...pick, time: fmtNow() });
    if (pixFeed.length > 20) pixFeed.pop();
    renderPixFeed();

    if (typeof setExpression === 'function') {
      setExpression('happy');
      setTimeout(() => { if (typeof restoreIdleExpression === 'function') restoreIdleExpression(); }, 2800);
    }
    if (typeof playChirp === 'function') playChirp(520, 760, 0.22);
    notifyCapsule(`LivePix ${pick.amount} de ${pick.author}: "${pick.msg}"`, 4800, true);
  }

  // === 6. RENDERIZAÇÃO DA VIEW #view-stream ===
  function mountStreamView() {
    let view = document.getElementById('view-stream');
    if (!view) {
      const panelBody = document.getElementById('panel-body') || document.querySelector('#view-aparencia')?.parentElement;
      if (!panelBody) return;
      view = document.createElement('div');
      view.className = 'view';
      view.id = 'view-stream';
      panelBody.appendChild(view);
    }
    if (view.dataset.lsMounted === '1') return;
    view.dataset.lsMounted = '1';

    view.innerHTML = `
      <div class="ls-shell">
        <div class="ls-quick-grid">
          <button type="button" class="ls-toggle-card" id="ls-btn-nogame">
            <div class="ls-tc-text">
              <div class="ls-tc-title">Desativar Modo Jogo</div>
              <div class="ls-tc-sub">Manter sobre jogos</div>
            </div>
            <span class="ls-switch"></span>
          </button>
          <button type="button" class="ls-toggle-card" id="ls-btn-obs">
            <div class="ls-tc-text">
              <div class="ls-tc-title">Invisível no OBS</div>
              <div class="ls-tc-sub">Ocultar da live</div>
            </div>
            <span class="ls-switch"></span>
          </button>
        </div>

        <div class="ls-tabs">
          <button type="button" class="ls-tab active" data-ls-tab="chat">
            Chat Twitch <span class="ls-badge-cnt" id="ls-tab-alert-cnt" style="display:none;">0</span>
          </button>
          <button type="button" class="ls-tab" data-ls-tab="livepix">LivePix</button>
          <button type="button" class="ls-tab" data-ls-tab="rules">Regras</button>
        </div>

        <!-- ABA 1: CHAT AO VIVO -->
        <div id="ls-pane-chat" class="card" style="display:flex; flex-direction:column; gap:8px;">
          <form class="ls-connect-row" id="ls-connect-form">
            <input type="text" id="ls-channel-input" placeholder="Canal da Twitch (ex: alanzoka)" value="${esc(cfg.channel)}" />
            <button type="submit" class="btn-primary" id="ls-connect-btn" style="padding:0 12px; height:34px; font-size:11px;">Conectar</button>
          </form>

          <div class="ls-status-bar">
            <span class="ls-status-dot" id="ls-status-text">Desconectado</span>
            <div class="ls-filter-row">
              <button type="button" class="ls-mini-chip active" data-ls-filter="all">Todas</button>
              <button type="button" class="ls-mini-chip" data-ls-filter="alerts" id="ls-filter-alerts">Alertas (0)</button>
            </div>
          </div>

          <div class="ls-chat-feed" id="ls-chat-feed"></div>
        </div>

        <!-- ABA 2: LIVEPIX -->
        <div id="ls-pane-livepix" class="card ls-pane-hidden" style="display:flex; flex-direction:column; gap:9px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div>
              <div style="font-size:12px; font-weight:700;">Alertas do LivePix</div>
              <div style="font-size:10px; color:var(--muted);">Receba mensagens e valores em R$ direto na cápsula.</div>
            </div>
            <button type="button" class="btn-primary" id="ls-test-pix-btn" style="padding:6px 10px; font-size:10.5px;">Testar alerta</button>
          </div>
          <div style="padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border); font-size:10.3px; color:var(--muted); line-height:1.4;">
            A integração automática com o Webhook oficial do LivePix chega na próxima etapa. Use <strong>Testar alerta</strong> para ver o aviso aparecer direto na cápsula.
          </div>
          <div class="ls-pix-list" id="ls-pix-list"></div>
        </div>

        <!-- ABA 3: REGRAS DE MODERAÇÃO -->
        <div id="ls-pane-rules" class="card ls-pane-hidden" style="display:flex; flex-direction:column; gap:10px;">
          <div class="ls-rule-group">
            <label class="ls-rule-label" for="ls-banned-words">Palavras bloqueadas (alerta imediato)</label>
            <textarea id="ls-banned-words" rows="2" placeholder="Separe por vírgula ou linha...">${esc(cfg.bannedWords)}</textarea>
            <div class="ls-rule-hint">Mensagens com esses termos sobem destacadas no chat com botão rápido de Timeout e Banir.</div>
          </div>

          <div class="ls-rule-checks">
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-chat" ${cfg.capsuleChat ? 'checked' : ''} /> Chat na cápsula</label>
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-toast" ${cfg.capsuleAlerts ? 'checked' : ''} /> Alertas na cápsula</label>
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-links" ${cfg.blockLinks ? 'checked' : ''} /> Sinalizar links</label>
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-caps" ${cfg.blockCaps ? 'checked' : ''} /> Excesso de CAPS</label>
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-vips" ${cfg.ignoreVips ? 'checked' : ''} /> Poupar VIP/Sub</label>
            <label class="ls-check-pill"><input type="checkbox" id="ls-chk-own" ${cfg.testOwnMessages ? 'checked' : ''} /> Testar minha conta</label>
          </div>

          <div class="ls-rule-group">
            <label class="ls-rule-label" for="ls-ai-rules">Regras do canal (para Moderação IA)</label>
            <textarea id="ls-ai-rules" rows="2" placeholder="Descreva o que não é permitido na sua live...">${esc(cfg.aiRules)}</textarea>
          </div>

          <div class="ls-mini-actions">
            <button type="button" class="btn-primary" id="ls-save-rules-btn" style="flex:1; padding:8px 12px; font-size:11.2px;">Salvar regras</button>
            <button type="button" class="btn-ghost" id="ls-test-rule-btn" style="padding:8px 10px; font-size:11px;">Testar alerta</button>
          </div>
        </div>
      </div>
    `;

    view.querySelector('#ls-btn-nogame').addEventListener('click', () => applyNoGameMode(!cfg.noGameMode));
    view.querySelector('#ls-btn-obs').addEventListener('click', () => applyObsInvisible(!cfg.obsInvisible));

    view.querySelectorAll('[data-ls-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.lsTab;
        view.querySelectorAll('[data-ls-tab]').forEach((b) => b.classList.toggle('active', b.dataset.lsTab === activeTab));
        view.querySelector('#ls-pane-chat').classList.toggle('ls-pane-hidden', activeTab !== 'chat');
        view.querySelector('#ls-pane-livepix').classList.toggle('ls-pane-hidden', activeTab !== 'livepix');
        view.querySelector('#ls-pane-rules').classList.toggle('ls-pane-hidden', activeTab !== 'rules');
      });
    });

    view.querySelectorAll('[data-ls-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chatFilter = btn.dataset.lsFilter;
        view.querySelectorAll('[data-ls-filter]').forEach((b) => b.classList.toggle('active', b.dataset.lsFilter === chatFilter));
        renderChatFeed();
      });
    });

    view.querySelector('#ls-connect-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (wsState === 'connected' || wsState === 'connecting') disconnectTwitch();
      else connectTwitch(view.querySelector('#ls-channel-input').value);
    });

    const feed = view.querySelector('#ls-chat-feed');
    feed.addEventListener('scroll', () => {
      autoScroll = (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 36;
    });

    feed.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ls-mod]');
      if (!btn) return;
      modAction(btn.dataset.msgId, btn.dataset.lsMod);
    });

    view.querySelector('#ls-test-pix-btn').addEventListener('click', triggerTestPix);
    view.querySelector('#ls-test-rule-btn').addEventListener('click', triggerTestRuleAlert);

    view.querySelector('#ls-save-rules-btn').addEventListener('click', () => {
      cfg.bannedWords = view.querySelector('#ls-banned-words').value.trim();
      cfg.aiRules = view.querySelector('#ls-ai-rules').value.trim();
      cfg.capsuleChat = view.querySelector('#ls-chk-chat').checked;
      cfg.capsuleAlerts = view.querySelector('#ls-chk-toast').checked;
      cfg.blockLinks = view.querySelector('#ls-chk-links').checked;
      cfg.blockCaps = view.querySelector('#ls-chk-caps').checked;
      cfg.ignoreVips = view.querySelector('#ls-chk-vips').checked;
      cfg.testOwnMessages = view.querySelector('#ls-chk-own').checked;
      saveCfg();
      notifyCapsule('Regras do Lumo Stream salvas!', 2200);
    });

    syncToggleCards();
    syncConnectUI();
    renderChatFeed();
    renderPixFeed();
  }

  function syncToggleCards() {
    const ng = document.getElementById('ls-btn-nogame');
    const ob = document.getElementById('ls-btn-obs');
    if (ng) ng.classList.toggle('on', Boolean(cfg.noGameMode));
    if (ob) ob.classList.toggle('on', Boolean(cfg.obsInvisible));
    syncStreamTileBadge();
  }

  function syncConnectUI() {
    const btn = document.getElementById('ls-connect-btn');
    const st = document.getElementById('ls-status-text');
    const inp = document.getElementById('ls-channel-input');
    if (!btn || !st) return;
    st.classList.remove('live', 'warn');
    if (wsState === 'connected') {
      btn.textContent = 'Desconectar';
      st.textContent = `Ao vivo em #${cfg.channel}`;
      st.classList.add('live');
      if (inp) inp.disabled = true;
    } else if (wsState === 'connecting') {
      btn.textContent = 'Cancelar';
      st.textContent = `Conectando em #${cfg.channel}...`;
      st.classList.add('warn');
      if (inp) inp.disabled = true;
    } else {
      btn.textContent = 'Conectar';
      st.textContent = 'Desconectado';
      if (inp) inp.disabled = false;
    }
  }

  function syncTabsCounts() {
    const badge = document.getElementById('ls-tab-alert-cnt');
    const filt = document.getElementById('ls-filter-alerts');
    if (badge) {
      badge.textContent = String(alertCount);
      badge.style.display = alertCount > 0 ? 'inline-block' : 'none';
    }
    if (filt) filt.textContent = `Alertas (${alertCount})`;
  }

  function renderChatFeed() {
    const feed = document.getElementById('ls-chat-feed');
    if (!feed) return;
    const list = messages.filter((m) => !m.hidden && (chatFilter === 'all' || Boolean(m.flagReason)));
    if (!list.length) {
      feed.innerHTML = `<div class="ls-empty">${
        wsState === 'connected'
          ? (chatFilter === 'alerts' ? 'Nenhuma mensagem fora das regras até agora.' : `Conectado em <strong>#${esc(cfg.channel)}</strong>. Aguardando novas mensagens...`)
          : 'Digite o nome de um canal da Twitch acima e clique em <strong>Conectar</strong> para acompanhar o chat ao vivo.'
      }</div>`;
      return;
    }
    feed.innerHTML = list.map((m) => `
      <div class="ls-msg ${m.flagReason ? 'flagged' : ''}">
        <div class="ls-msg-head">
          ${m.badges.map((b) => `<span class="ls-badge ${b}">${b}</span>`).join('')}
          <span class="ls-user" style="color:${esc(m.color)}">${esc(m.user)}</span>
          <span class="ls-time">${esc(m.time)}</span>
        </div>
        <div class="ls-msg-body">${esc(m.text)}</div>
        ${m.flagReason ? `
          <div class="ls-flag-bar">
            <span class="ls-flag-reason">${esc(m.flagReason)}</span>
            <div class="ls-mod-actions">
              <button type="button" class="ls-mod-btn" data-ls-mod="hide" data-msg-id="${esc(m.id)}">Ocultar</button>
              <button type="button" class="ls-mod-btn" data-ls-mod="timeout" data-msg-id="${esc(m.id)}">10m</button>
              <button type="button" class="ls-mod-btn danger" data-ls-mod="ban" data-msg-id="${esc(m.id)}">Banir</button>
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
    if (autoScroll) feed.scrollTop = feed.scrollHeight;
  }

  function renderPixFeed() {
    const box = document.getElementById('ls-pix-list');
    if (!box) return;
    if (!pixFeed.length) {
      box.innerHTML = '<div class="ls-empty">Nenhum alerta recebido ainda. Clique em <strong>Testar alerta</strong> acima para visualizar.</div>';
      return;
    }
    box.innerHTML = pixFeed.map((p) => `
      <div class="ls-pix-item">
        <div class="ls-pix-top">
          <span class="ls-pix-author">${esc(p.author)}</span>
          <span class="ls-pix-amount">${esc(p.amount)}</span>
        </div>
        <div class="ls-pix-msg">${esc(p.msg)}</div>
      </div>
    `).join('');
  }

  saveCfg();
  mountStreamView();
  ensureStreamTile();
  setTimeout(ensureStreamTile, 320);
  setTimeout(ensureStreamTile, 1050);

  if (cfg.obsInvisible) {
    setTimeout(() => applyObsInvisible(true, true), 450);
  }

  window.LumoStream = {
    connect: connectTwitch,
    disconnect: disconnectTwitch,
    setNoGameMode: applyNoGameMode,
    setObsInvisible: applyObsInvisible,
    testPix: triggerTestPix,
    testRule: triggerTestRuleAlert
  };
})();
