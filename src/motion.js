// === LUMO v2.5.3 — TRANSIÇÕES DE TELA, REAÇÕES E MICRO-INTERAÇÕES ===
(function initLumoMotion() {
  // 1. Transição de abas unificada em alive.css + pill-hud.css (sem conflito/reflow)

  // 2. Evita que clicar num chip (/resumir, /cor, etc.) feche a barra antes do onclick disparar
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.quick-ai-dock .cmd-chip')) {
      e.preventDefault();
    }
  });

  // 3. Comemoração sutil ao concluir uma tarefa no Resumo
  document.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb || !cb.matches('#view-resumo input[type="checkbox"]') || !cb.checked) return;

    const card = cb.closest('.card');
    if (card) {
      card.classList.remove('task-celebrate');
      void card.offsetWidth;
      card.classList.add('task-celebrate');
      setTimeout(() => card.classList.remove('task-celebrate'), 650);
    }

    if (typeof playChirp === 'function') playChirp(620, 960, 0.14);
    if (typeof hopPill === 'function') hopPill();

    const busy =
      (typeof isThinking !== 'undefined' && isThinking) ||
      (typeof timerInterval !== 'undefined' && timerInterval);
    if (!busy && typeof setExpression === 'function') {
      setExpression('happy');
      setTimeout(() => {
        if (typeof restoreIdleExpression === 'function') restoreIdleExpression();
      }, 950);
    }
  });

  // 4. Transição suave de cores ao trocar tema, superfície ou cor de destaque
  let morphTimer = null;
  document.addEventListener('click', (e) => {
    if (e.target.closest('.surface-btn, .theme-btn, .accent-dot, .skin-btn, [data-theme], [data-surface]')) {
      document.body.classList.add('theme-morphing');
      clearTimeout(morphTimer);
      morphTimer = setTimeout(() => document.body.classList.remove('theme-morphing'), 340);
    }
  });
})();
