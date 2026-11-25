const dailyMessages = [
  'Um passo pequeno hoje vale mais do que o plano perfeito que fica só na cabeça.',
  'Respire fundo, ajeite a postura e bebe um gole de água — seu cérebro agradece.',
  'Foco não é fazer tudo ao mesmo tempo; é escolher o que importa nos próximos 25 minutos.',
  'Dias comuns bem aproveitados constroem resultados fora do comum.',
  'Se algo travou, faça uma pausa de 5 minutos. A melhor solução aparece longe da tela.',
  'Consistência silenciosa vence picos de empolgação toda vez.',
  'Comece pela tarefa mais chata logo cedo — o resto do dia fica muito mais leve.',
  'Você não precisa estar 100% motivado para começar; basta começar pelos primeiros 2 minutos.',
  'Fechar abas que você não está usando já clareia metade dos pensamentos.',
  'Cada versão nova que você entrega hoje é melhor do que a ideia guardada ontem.',
  'Descansar faz parte do progresso — não confunda cansaço com falta de vontade.',
  'Curiosidade + prática constante é o atalho mais honesto para dominar qualquer assunto.',
  'Celebre as pequenas vitórias do dia; elas são o combustível das grandes.',
  'Se está pesado demais, quebre em três pedaços menores e mate só o primeiro agora.',
  'Seu "eu" de amanhã vai agradecer pelo cuidado que você tiver com seu tempo hoje.'
];

let motdIndex = Math.floor(Date.now() / 86400000) % dailyMessages.length;
let currentNewsCat = 'geral';

function renderMotd() {
  const el = document.getElementById('motd-text');
  if (el) el.textContent = dailyMessages[motdIndex % dailyMessages.length];
}

function nextMotd() {
  motdIndex = (motdIndex + 1) % dailyMessages.length;
  renderMotd();
  if (typeof playChirp === 'function') playChirp(580, 820, 0.13);
}

function renderNewsList(items) {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = '';
  items.slice(0, 3).forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'news-item';
    btn.type = 'button';
    btn.innerHTML =
      `<span class="news-title">${String(item.title || '').replace(/</g, '&lt;')}</span>` +
      `<span class="news-src">${String(item.source || 'Notícias').replace(/</g, '&lt;')}</span>`;
    btn.onclick = () => {
      if (typeof playChirp === 'function') playChirp(520, 740, 0.12);
      if (typeof invoke === 'function' && invoke) invoke('open_external_url', { url: item.link });
      else window.open(item.link, '_blank');
    };
    list.appendChild(btn);
  });
}

async function loadNews(cat = currentNewsCat, force = false) {
  currentNewsCat = cat;
  document.querySelectorAll('.news-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  const list = document.getElementById('news-list');
  if (!list) return;

  const cacheKey = 'lumo_news_' + cat;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) {}

  if (!force && cached && Date.now() - cached.ts < 1800000 && cached.items?.length) {
    renderNewsList(cached.items);
    return;
  }

  list.innerHTML = '<div style="font-size:11px; color:var(--muted); padding:4px;">Buscando manchetes de hoje...</div>';
  try {
    const base = typeof API_BASE !== 'undefined' ? API_BASE : 'https://lumo-ai.sivavieiravitor.workers.dev';
    const res = await fetch(`${base}/news?cat=${encodeURIComponent(cat)}`);
    const data = await res.json();
    if (Array.isArray(data.items) && data.items.length) {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: data.items }));
      renderNewsList(data.items);
      return;
    }
  } catch (_) {}

  if (cached?.items?.length) {
    renderNewsList(cached.items);
  } else {
    list.innerHTML = '<div style="font-size:11px; color:var(--muted); padding:4px;">Não foi possível carregar manchetes agora. Toque em ↻ para tentar novamente.</div>';
  }
}

window.nextMotd = nextMotd;
window.loadNews = loadNews;

(function initDailyUpgrade() {
  renderMotd();
  loadNews('geral', false);

  const panelEl = document.getElementById('panel');
  if (!panelEl) return;

  panelEl.addEventListener('animationend', (ev) => {
    if (ev.animationName === 'cardRise' && ev.target?.classList) {
      ev.target.classList.remove('cascade-in');
    }
  });

  new MutationObserver(() => {
    if (!panelEl.classList.contains('open')) return;
    const targets = panelEl.querySelectorAll(
      '#view-resumo .hero-bento, #view-resumo .motd-card, #view-resumo .mini-media-strip, #view-resumo .hub-tile, #view-resumo .card, #view-resumo .news-card'
    );
    targets.forEach((el, idx) => {
      el.classList.remove('cascade-in');
      void el.offsetWidth;
      const delay = Math.min(idx * 22, 180);
      el.style.setProperty('--cdelay', delay + 'ms');
      el.classList.add('cascade-in');
      setTimeout(() => el.classList.remove('cascade-in'), delay + 380);
    });
  }).observe(panelEl, { attributes: true, attributeFilter: ['class'] });
})();
