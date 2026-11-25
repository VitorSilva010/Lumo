// === LUMO v2.0.0 — RESUMIR PÁGINAS, LER ARQUIVOS, TRANSCREVER ÁUDIOS E SALVAR DOCS ===
let activeDocCtx = null;
let pdfJsPromise = null;

function _esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isAudioFile(f) {
  return /\.(mp3|wav|ogg|opus|m4a|aac|webm|flac)$/i.test(f.name || '') || (f.type || '').startsWith('audio/');
}

function isDocFile(f) {
  return /\.(txt|md|csv|json|xml|html|htm|log|js|ts|css|py|rs|pdf)$/i.test(f.name || '')
    || (f.type || '').startsWith('text/')
    || f.type === 'application/pdf';
}

function setDocContext(title, text) {
  if (!text) {
    activeDocCtx = null;
  } else {
    activeDocCtx = { title: title || 'Documento', text: text.slice(0, 11000) };
  }
  renderDocCtxBar();
}

function renderDocCtxBar() {
  const bar = document.getElementById('doc-ctx-bar');
  if (!bar) return;
  if (!activeDocCtx) {
    bar.classList.remove('show');
    bar.innerHTML = '';
    return;
  }
  bar.innerHTML =
    `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📄 Em contexto: <strong>${_esc(activeDocCtx.title)}</strong></span>` +
    `<button type="button" class="del-btn" title="Remover contexto" onclick="clearDocContext()">×</button>`;
  bar.classList.add('show');
}

function clearDocContext() {
  setDocContext('', '');
}

// Carrega pdf.js sob demanda apenas quando o usuário lê um PDF
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsPromise) return pdfJsPromise;
  pdfJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('Falha ao inicializar leitor de PDF.'));
      }
    };
    s.onerror = () => { pdfJsPromise = null; reject(new Error('Sem internet para carregar leitor de PDF.')); };
    document.head.appendChild(s);
  });
  return pdfJsPromise;
}

async function extractTextFromPocketFile(f) {
  const res = await fetch(f.dataUrl);
  const buf = await res.arrayBuffer();
  if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const maxPages = Math.min(pdf.numPages, 15);
    const parts = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      parts.push(tc.items.map((it) => it.str).join(' '));
    }
    return parts.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf).trim();
}

// === LOADING VISUAL NA ABA IA ===
function startAiLoading(userLabel) {
  openView('ia');
  if (userLabel) appendMsg(userLabel, 'user');
  const btn = document.getElementById('ai-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  isThinking = true;
  document.getElementById('lumo-pill')?.classList.add('thinking');
  setExpression('thinking');
  const box = document.getElementById('chat-box');
  const tb = document.createElement('div');
  tb.className = 'msg ai';
  tb.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  box.appendChild(tb);
  box.scrollTop = box.scrollHeight;
  return tb;
}

function stopAiLoading(tb) {
  if (tb) tb.remove();
  isThinking = false;
  document.getElementById('lumo-pill')?.classList.remove('thinking');
  restoreIdleExpression();
  const btn = document.getElementById('ai-send-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
}

// === 1. RESUMIR PÁGINA WEB OU TEXTO ===
function extractFirstUrl(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/(https?:\/\/[^\s]+|www\.[^\s]+|(?:m\.)?(?:youtube\.com|youtu\.be)\/[^\s]+)/i);
  if (!m) return '';
  const cleaned = m[1].replace(/[.,;!?)]+$/, '');
  return /^https?:\/\//i.test(cleaned) ? cleaned : 'https://' + cleaned;
}

async function handleSummarizeInput(rawArg) {
  let arg = String(rawArg || '').trim();
  if (!arg && invoke) {
    arg = (await invoke('get_clipboard_text').catch(() => '')) || '';
  }
  if (!arg) {
    say('Cole um link depois de /resumo ou copie uma URL no Ctrl+C!', 3400, true);
    return;
  }
  const url = extractFirstUrl(arg);
  if (url) {
    await summarizeWebOrText({ url });
  } else if (arg.length >= 60) {
    await summarizeWebOrText({ text: arg, title: 'Texto do Ctrl+C', userLabel: 'Resumir texto do Ctrl+C' });
  } else {
    say('Informe uma URL completa (YouTube/site) ou um texto maior para resumir.', 3200, true);
  }
}

async function summarizeWebOrText({ url = '', text = '', title = '', question = '', userLabel = '' }) {
  if (typeof openView === 'function') openView('ia');
  const tb = startAiLoading(userLabel || (url ? `Resumir: ${url}` : `Resumir: ${title || 'texto'}`));
  try {
    const res = await fetch(`${API_BASE}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
      body: JSON.stringify({ url, text, title, question })
    });
    const rawBody = await res.text();
    let data = {};
    try { data = JSON.parse(rawBody); } catch (_) {
      data = { error: `Resposta inválida do servidor (HTTP ${res.status}).` };
    }
    stopAiLoading(tb);
    if (res.ok && data.summary) {
      const header = data.title && !question ? `📌 ${data.title}\n\n` : '';
      appendMsg(header + data.summary, 'ai');
      hopPill();
      playChirp(580, 880, 0.16);
      speakText(data.summary.slice(0, 180));
    } else {
      appendMsg(data.error || 'Não consegui resumir este conteúdo.', 'ai');
    }
  } catch (err) {
    stopAiLoading(tb);
    appendMsg('Erro de conexão com o Lumo Cloud: ' + err.message, 'ai');
  }
}

// === 2. LER ARQUIVO DO BOLSO ===
async function readPocketDoc(idx, askAfter = false) {
  const f = pocketFiles[idx];
  if (!f) return;
  const tb = startAiLoading(askAfter ? `Carregando "${f.name}" para perguntas...` : `Lendo e resumindo "${f.name}"...`);
  try {
    const text = await extractTextFromPocketFile(f);
    if (!text || text.length < 25) {
      stopAiLoading(tb);
      appendMsg('Não encontrei texto selecionável nesse arquivo (se for PDF escaneado como foto, o texto não está embutido).', 'ai');
      return;
    }
    setDocContext(f.name, text);
    if (askAfter) {
      stopAiLoading(tb);
      appendMsg(`Li "${f.name}" (${text.length} caracteres). Pode fazer qualquer pergunta sobre ele aqui embaixo!`, 'ai');
      hopPill();
      document.getElementById('ai-input')?.focus();
      return;
    }
    const res = await fetch(`${API_BASE}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lumo-Client': 'lumo-desktop-v1' },
      body: JSON.stringify({ title: f.name, text: text.slice(0, 11000) })
    });
    const data = await res.json();
    stopAiLoading(tb);
    if (data.summary) {
      appendMsg(`📄 ${f.name}\n\n${data.summary}`, 'ai');
      hopPill();
      playChirp(600, 900, 0.18);
    } else {
      appendMsg(data.error || 'Não consegui resumir o arquivo.', 'ai');
    }
  } catch (err) {
    stopAiLoading(tb);
    appendMsg('Erro ao ler arquivo: ' + err.message, 'ai');
  }
}

// === 3. TRANSCREVER ÁUDIO NO BOLSO (WHISPER GROQ) ===
async function transcribePocketAudio(idx) {
  const f = pocketFiles[idx];
  if (!f) return;
  const tb = startAiLoading(`Transcrevendo áudio: ${f.name}`);
  try {
    const blob = await (await fetch(f.dataUrl)).blob();
    const form = new FormData();
    form.append('file', blob, f.name || 'audio.ogg');
    form.append('summarize', '1');

    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      headers: { 'X-Lumo-Client': 'lumo-desktop-v1' },
      body: form
    });
    const data = await res.json();
    stopAiLoading(tb);

    if (data.transcript) {
      setDocContext(`Áudio: ${f.name}`, data.transcript);
      const formatted = data.summary
        ? `🎙️ Resumo do áudio (${f.name}):\n${data.summary}\n\n— Transcrição completa —\n${data.transcript}`
        : `🎙️ Transcrição (${f.name}):\n\n${data.transcript}`;
      appendMsg(formatted, 'ai');
      hopPill();
      playChirp(620, 940, 0.2);
    } else {
      appendMsg(data.error || 'Não consegui transcrever o áudio.', 'ai');
    }
  } catch (err) {
    stopAiLoading(tb);
    appendMsg('Erro ao transcrever: ' + err.message, 'ai');
  }
}

// === 4. EXPORTAR RESPOSTA COMO DOCUMENTO (.DOC WORD OU .MD) ===
function mdToSimpleHtml(text) {
  const lines = String(text || '').split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const fmt = (s) => _esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^[-*•]\s+/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${fmt(line.replace(/^[-*•]\s+/, ''))}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (!line) continue;
    if (/^###\s+/.test(line)) html += `<h3>${fmt(line.slice(4))}</h3>`;
    else if (/^##\s+/.test(line)) html += `<h2>${fmt(line.slice(3))}</h2>`;
    else if (/^#\s+/.test(line)) html += `<h1>${fmt(line.slice(2))}</h1>`;
    else html += `<p>${fmt(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

async function saveAiDocument(text, ext) {
  if (!invoke) return;
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `Lumo_Doc_${stamp}.${ext}`;
  let payload = text;

  if (ext === 'doc') {
    const datePt = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    payload = `\uFEFF<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="pt-BR">
<head><meta charset="UTF-8"><title>Documento Lumo</title>
<style>
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.55; margin: 2.2cm; font-size: 11.5pt; }
  h1 { font-size: 18pt; color: #0f172a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; }
  h2 { font-size: 14pt; color: #1e293b; margin-top: 16px; }
  h3 { font-size: 12pt; color: #334155; }
  p { margin: 7px 0; }
  ul { margin: 6px 0 10px 18px; }
  li { margin: 4px 0; }
  .meta { font-size: 9pt; color: #64748b; margin-bottom: 16px; }
</style></head>
<body>
  <div class="meta">Gerado pelo Lumo · ${datePt}</div>
  ${mdToSimpleHtml(text)}
</body></html>`;
  } else {
    payload = '\uFEFF' + text;
  }

  try {
    const bytes = Array.from(new TextEncoder().encode(payload));
    await invoke('save_file_bytes', { filename, bytes });
    hopPill();
    playChirp(640, 960, 0.2);
    say(`Salvo em Lumo_Arquivos\\${filename}`, 3400, true);
  } catch (err) {
    say('Erro ao salvar documento: ' + err, 3200, true);
  }
}

// === OVERRIDES LIMPOS SOBRE APP.JS ===
window.appendMsg = function (text, who) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  const body = document.createElement('div');
  body.className = 'msg-body';
  body.textContent = text;
  div.appendChild(body);

  if (who === 'ai') {
    const bar = document.createElement('div');
    bar.className = 'msg-actions';

    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'msg-act-btn';
      b.textContent = label;
      b.onclick = () => fn(b);
      return b;
    };

    bar.appendChild(mkBtn('Copiar', (b) => {
      if (invoke) invoke('set_clipboard_text', { text });
      else navigator.clipboard?.writeText(text);
      b.textContent = 'Copiado ✓';
      setTimeout(() => { b.textContent = 'Copiar'; }, 1600);
    }));
    bar.appendChild(mkBtn('Salvar .doc', () => saveAiDocument(text, 'doc')));
    bar.appendChild(mkBtn('Salvar .md', () => saveAiDocument(text, 'md')));
    div.appendChild(bar);
  }

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
};

window.renderPocket = function () {
  const sub = document.getElementById('sub-bolso');
  if (sub) sub.textContent = pocketFiles.length ? `${pocketFiles.length} arquivo(s)` : 'Docs · Áudio · Img';
  const list = document.getElementById('pocket-list');
  if (!list) return;
  if (!pocketFiles.length) {
    list.innerHTML = '<div style="font-size:11.5px; color:var(--muted); text-align:center; margin-top:12px;">Salvos em <strong>Área de Trabalho\\Lumo_Arquivos</strong>.</div>';
    return;
  }
  list.innerHTML = '';
  pocketFiles.forEach((f, idx) => {
    const isImg = (f.type || '').startsWith('image/');
    const isAud = isAudioFile(f);
    const isDoc = !isImg && !isAud && isDocFile(f);
    const thumb = isImg
      ? `<img class="pocket-thumb" src="${f.dataUrl}" />`
      : `<div class="pocket-thumb">${isAud ? '🎙️' : isDoc ? '📄' : '📦'}</div>`;

    let actions = '';
    if (isImg) {
      actions = `
        <button class="btn-ghost" onclick="convertImage(${idx},'image/webp','webp')">→ WebP</button>
        <button class="btn-ghost" onclick="convertImage(${idx},'image/jpeg','jpg')">→ JPG</button>
        <button class="btn-ghost" onclick="convertImage(${idx},'image/png','png')">→ PNG</button>
        <button class="btn-ghost" onclick="convertImageToPdf(${idx})">→ PDF</button>`;
    } else if (isAud) {
      actions = `
        <button class="btn-primary" style="padding:5px 10px; font-size:11px;" onclick="transcribePocketAudio(${idx})">🎙️ Transcrever & Resumir</button>
        <button class="btn-ghost" onclick="saveRawPocket(${idx})">Salvar</button>`;
    } else if (isDoc) {
      actions = `
        <button class="btn-primary" style="padding:5px 10px; font-size:11px;" onclick="readPocketDoc(${idx}, false)">✦ Resumir c/ IA</button>
        <button class="btn-ghost" onclick="readPocketDoc(${idx}, true)">Perguntar</button>
        <button class="btn-ghost" onclick="saveRawPocket(${idx})">Salvar</button>`;
    } else {
      actions = `<button class="btn-ghost" onclick="saveRawPocket(${idx})">Salvar na pasta Lumo</button>`;
    }

    const div = document.createElement('div');
    div.className = 'pocket-item';
    div.innerHTML = `
      <div class="pocket-head">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          ${thumb}
          <div style="overflow:hidden;">
            <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:255px;">${_esc(f.name)}</div>
            <div style="font-size:10.5px; color:var(--muted);">${formatSize(f.size)}</div>
          </div>
        </div>
        <button class="del-btn" onclick="removePocket(${idx})">×</button>
      </div>
      <div class="pocket-actions">${actions}</div>`;
    list.appendChild(div);
  });
};

// Perguntas no chat usam automaticamente o documento/áudio em contexto, se houver
const _baseExecutePrompt = window.executePrompt;
window.executePrompt = async function (prompt) {
  const raw = String(prompt || '').trim();
  const resMatch = raw.match(/^\/resum(?:ir|o)(?:\s+([\s\S]*))?$/i);
  if (resMatch) {
    await handleSummarizeInput(resMatch[1] || '');
    return;
  }
  const ytUrl = extractFirstUrl(raw);
  if (ytUrl && /(?:youtube\.com|youtu\.be)/i.test(ytUrl) && !activeDocCtx) {
    const ask = raw.replace(ytUrl, '').trim();
    await summarizeWebOrText({
      url: ytUrl,
      question: ask.length >= 4 && !/^resum/i.test(ask) ? ask : '',
      userLabel: raw
    });
    return;
  }
  if (activeDocCtx) {
    await summarizeWebOrText({
      title: activeDocCtx.title,
      text: activeDocCtx.text,
      question: prompt,
      userLabel: prompt
    });
    return;
  }
  return _baseExecutePrompt(prompt);
};

// Comandos /resumir, /resumo e /doc na barra rápida
const _baseQuickCommand = window.quickCommand;
window.quickCommand = async function (e) {
  const input = document.getElementById('quick-ai-input');
  const raw = (input?.value || '').trim();
  const lower = raw.toLowerCase();

  const resMatch = raw.match(/^\/resum(?:ir|o)(?:\s+([\s\S]*))?$/i);
  if (resMatch) {
    e.preventDefault();
    stopTypingLook();
    input.value = '';
    await handleSummarizeInput(resMatch[1] || '');
    return;
  }

  const directUrl = extractFirstUrl(raw);
  if (directUrl && /(?:youtube\.com|youtu\.be)/i.test(directUrl) && !lower.startsWith('/')) {
    e.preventDefault();
    stopTypingLook();
    input.value = '';
    const ask = raw.replace(directUrl, '').trim();
    await summarizeWebOrText({
      url: directUrl,
      question: ask.length >= 4 && !/^resum/i.test(ask) ? ask : '',
      userLabel: raw
    });
    return;
  }

  if (lower.startsWith('/doc ')) {
    e.preventDefault();
    stopTypingLook();
    const topic = raw.slice(5).trim();
    input.value = '';
    if (!topic) return;
    setDocContext('', '');
    openView('ia');
    await _baseExecutePrompt(
      `Crie um documento bem estruturado em português (com título usando # e seções com ## e tópicos claros) sobre: ${topic}`
    );
    return;
  }

  return _baseQuickCommand(e);
};

const _baseClearChat = window.clearChat;
window.clearChat = function () {
  clearDocContext();
  return _baseClearChat();
};

window.readPocketDoc = readPocketDoc;
window.transcribePocketAudio = transcribePocketAudio;
window.saveAiDocument = saveAiDocument;
window.clearDocContext = clearDocContext;
