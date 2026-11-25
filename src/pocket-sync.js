// === LUMO v2.8.0 — BOLSO NUVEM SINCRONIZADO (CELULAR <-> WINDOWS) ===
(function initCloudPocket() {
  const POCKET_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev') + '/pocket';
  let items = [];
  let knownIds = new Set();
  let initialized = false;
  let busy = false;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function getToken() {
    if (typeof syncToken !== 'undefined' && syncToken) return String(syncToken).toUpperCase();
    return (localStorage.getItem('lumo_sync_token') || '').toUpperCase();
  }
  function isSyncOn() {
    if (typeof mobileSyncEnabled !== 'undefined') return Boolean(mobileSyncEnabled);
    return localStorage.getItem('lumo_mobile_sync') === 'true';
  }

  // Injeta card Bolso Nuvem dentro de #view-bolso
  const bolsoView = document.getElementById('view-bolso');
  if (bolsoView && !document.getElementById('cloud-pocket-card')) {
    bolsoView.insertAdjacentHTML(
      'afterbegin',
      `<div class="card cloud-pocket-card" id="cloud-pocket-card">
        <div class="label-xs">
          <span>Bolso Nuvem · Celular ↔ PC</span>
          <button type="button" class="cp-mini" onclick="refreshCloudPocket(true)">↻</button>
        </div>
        <div class="cp-actions">
          <button type="button" class="cp-btn" onclick="pushClipboardToCloudPocket()">📋 Enviar Ctrl+C</button>
          <label class="cp-btn" style="cursor:pointer;">
            📎 Enviar Arquivo
            <input type="file" id="cp-file-input" style="display:none;" onchange="pushFileToCloudPocket(this)" />
          </label>
        </div>
        <div class="cp-list" id="cp-list">
          <div style="font-size:10.5px; color:var(--muted); text-align:center; padding:8px;">Carregando Bolso Nuvem...</div>
        </div>
      </div>`
    );
  }

  function renderList() {
    const list = document.getElementById('cp-list');
    if (!list) return;
    const token = getToken();
    if (!token || !isSyncOn()) {
      list.innerHTML = `<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:8px;">Ative o pareamento no ícone de <strong>Celular</strong> no topo para sincronizar com o Lumo Mobile.</div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = `<div style="font-size:10.5px; color:var(--muted); text-align:center; padding:8px;">Vazio · Envie um arquivo ou Ctrl+C acima ou pelo celular.</div>`;
      return;
    }
    list.innerHTML = items.map((it) => {
      const src = it.source === 'mobile' ? '📱 Celular' : '💻 PC';
      const primaryBtn = it.kind === 'file'
        ? `<button type="button" class="cp-mini" onclick="downloadCloudPocketItem(${it.id})">Baixar</button>`
        : (it.kind === 'url'
            ? `<button type="button" class="cp-mini" onclick="openCloudPocketItem(${it.id})">Abrir</button>`
            : `<button type="button" class="cp-mini" onclick="copyCloudPocketItem(${it.id})">Copiar</button>`);
      return `<div class="cp-item">
        <div class="cp-info">
          <div class="cp-name" title="${esc(it.name)}">${esc(it.name)}</div>
          <div class="cp-meta">${src} · ${fmtBytes(it.size || 0)}</div>
        </div>
        <div class="cp-mini-row">
          ${primaryBtn}
          <button type="button" class="cp-mini" onclick="deleteCloudPocketItem(${it.id})">×</button>
        </div>
      </div>`;
    }).join('');
  }

  async function refreshCloudPocket(manual = false) {
    const token = getToken();
    if (!token || !isSyncOn() || busy) { renderList(); return; }
    busy = true;
    try {
      const res = await fetch(`${POCKET_API}?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      const next = Array.isArray(data.items) ? data.items : [];
      if (initialized) {
        const brandNew = next.find((it) => !knownIds.has(it.id) && it.source === 'mobile');
        if (brandNew) {
          if (typeof hopPill === 'function') hopPill();
          if (typeof playChirp === 'function') playChirp(560, 860, 0.15);
          if (typeof say === 'function') say(`📱 Chegou no Bolso: ${brandNew.name}`, 4200, true);
        }
      }
      knownIds = new Set(next.map((x) => x.id));
      items = next;
      initialized = true;
      renderList();
      if (manual && typeof say === 'function') say('Bolso Nuvem atualizado!', 1800, true);
    } catch (_) {} finally { busy = false; }
  }

  async function pushClipboardToCloudPocket() {
    const token = getToken();
    if (!token) { if (typeof say === 'function') say('Ative o Pareamento Mobile no topo primeiro!', 2600, true); return; }
    if (!isSyncOn() && typeof toggleMobileSync === 'function') toggleMobileSync(true);
    let txt = '';
    if (typeof invoke === 'function') txt = (await invoke('get_clipboard_text').catch(() => '')) || '';
    if (!txt && navigator.clipboard) txt = (await navigator.clipboard.readText().catch(() => '')) || '';
    txt = txt.trim();
    if (!txt) { if (typeof say === 'function') say('Nenhum texto no Ctrl+C para enviar.', 2200, true); return; }
    const isUrl = /^https?:\/\/\S+$/i.test(txt);
    const res = await fetch(POCKET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
      body: JSON.stringify({
        token,
        source: 'pc',
        kind: isUrl ? 'url' : 'text',
        name: isUrl ? txt.replace(/^https?:\/\//i, '').slice(0, 48) : 'Ctrl+C do PC',
        mime: 'text/plain',
        content: txt,
        size: txt.length
      })
    }).catch(() => null);
    if (res && res.ok) {
      if (typeof hopPill === 'function') hopPill();
      if (typeof playChirp === 'function') playChirp(540, 820, 0.14);
      if (typeof say === 'function') say('Enviado pro Bolso do celular!', 2200, true);
      refreshCloudPocket(false);
    }
  }

  function pushFileToCloudPocket(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const token = getToken();
    if (!token) { if (typeof say === 'function') say('Ative o Pareamento Mobile no topo primeiro!', 2600, true); return; }
    if (!isSyncOn() && typeof toggleMobileSync === 'function') toggleMobileSync(true);
    if (file.size > 1.5 * 1024 * 1024) {
      if (typeof say === 'function') say('Limite do Bolso Nuvem: 1,5 MB.', 2600, true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await fetch(POCKET_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
        body: JSON.stringify({
          token,
          source: 'pc',
          kind: 'file',
          name: file.name,
          mime: file.type || 'application/octet-stream',
          content: String(reader.result || ''),
          size: file.size
        })
      }).catch(() => null);
      if (res && res.ok) {
        if (typeof hopPill === 'function') hopPill();
        if (typeof say === 'function') say(`Arquivo "${file.name}" enviado pro celular!`, 2600, true);
        refreshCloudPocket(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function copyCloudPocketItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (typeof invoke === 'function') invoke('set_clipboard_text', { text: it.content }).catch(() => {});
    navigator.clipboard?.writeText(it.content).catch(() => {});
    if (typeof say === 'function') say('Copiado pro Ctrl+C!', 1800, true);
  }
  function openCloudPocketItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (typeof invoke === 'function') invoke('open_external_url', { url: it.content }).catch(() => window.open(it.content, '_blank'));
    else window.open(it.content, '_blank');
  }
  function downloadCloudPocketItem(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const a = document.createElement('a');
    a.href = it.content;
    a.download = it.name || 'arquivo';
    a.click();
  }
  async function deleteCloudPocketItem(id) {
    const token = getToken();
    if (!token) return;
    await fetch(`${POCKET_API}?token=${encodeURIComponent(token)}&id=${id}`, { method: 'DELETE' }).catch(() => {});
    items = items.filter((x) => x.id !== id);
    renderList();
  }

  window.refreshCloudPocket = refreshCloudPocket;
  window.pushClipboardToCloudPocket = pushClipboardToCloudPocket;
  window.pushFileToCloudPocket = pushFileToCloudPocket;
  window.copyCloudPocketItem = copyCloudPocketItem;
  window.openCloudPocketItem = openCloudPocketItem;
  window.downloadCloudPocketItem = downloadCloudPocketItem;
  window.deleteCloudPocketItem = deleteCloudPocketItem;

  renderList();
  setTimeout(() => refreshCloudPocket(false), 2500);
  setInterval(() => {
    if (typeof isShuttingDown !== 'undefined' && isShuttingDown) return;
    refreshCloudPocket(false);
  }, 9000);
})();
