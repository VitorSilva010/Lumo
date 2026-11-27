// === LUMO v3.0.6 — SHIFT+ENTER (PARÁGRAFOS) & MARKDOWN NAS RESPOSTAS DA IA ===
(function initLumoChatUx() {
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderInlineMarkdown(raw) {
    let s = escHtml(raw);
    // Código inline `...`
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Negrito + itálico ***...***
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Negrito **...**
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // Itálico *...*
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    return s;
  }

  function formatAiBubble(msgEl) {
    if (!msgEl || !msgEl.classList.contains('ai') || msgEl.dataset.mdDone === '1') return;
    // Formata apenas os nós de texto diretos ou o bloco de texto, preservando botões (Copiar / .doc / .md)
    const walker = document.createTreeWalker(msgEl, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('button, code, pre, script, style')) continue;
      if (/[*`]/.test(node.nodeValue || '')) textNodes.push(node);
    }
    if (!textNodes.length) return;

    for (const tn of textNodes) {
      const html = renderInlineMarkdown(tn.nodeValue);
      if (html !== escHtml(tn.nodeValue)) {
        const span = document.createElement('span');
        span.innerHTML = html;
        tn.replaceWith(span);
      }
    }
    msgEl.dataset.mdDone = '1';
  }

  function autoResize(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(96, Math.max(36, ta.scrollHeight)) + 'px';
  }

  function bindTextarea(ta) {
    if (!ta || ta.dataset.shiftEnterBound === '1') return;
    ta.dataset.shiftEnterBound = '1';
    ta.addEventListener('input', () => autoResize(ta));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = ta.closest('form');
        if (form) {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        setTimeout(() => autoResize(ta), 20);
      }
    });
    autoResize(ta);
  }

  // Observa o #chat-box para formatar Markdown assim que novas respostas da IA chegarem
  const chatBox = document.getElementById('chat-box');
  if (chatBox) {
    chatBox.querySelectorAll('.msg.ai').forEach(formatAiBubble);
    new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            if (n.classList?.contains('ai')) formatAiBubble(n);
            else n.querySelectorAll?.('.msg.ai').forEach(formatAiBubble);
          }
        });
      }
    }).observe(chatBox, { childList: true, subtree: true });
  }

  // Aplica no textarea da IA e observa quando o textarea do Lumo Ping for montado
  bindTextarea(document.getElementById('ai-input'));
  const pfPane = document.getElementById('pf-friends-pane');
  if (pfPane) {
    new MutationObserver(() => {
      bindTextarea(document.getElementById('pf-dm-input'));
    }).observe(pfPane, { childList: true, subtree: true });
  }
  bindTextarea(document.getElementById('pf-dm-input'));
})();
