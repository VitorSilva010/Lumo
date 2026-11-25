// === LUMO v2.1.0 — MICRO-ANIMAÇÕES & VIDA NO MASCOTE ===
(function initAliveEngine() {
  let currentViewId = 'resumo';
  let workBadgeActive = false;
  let lastDoubleBlinkAt = 0;

  function playSoftTick(up = true) {
    if (typeof voiceMode !== 'undefined' && (voiceMode === 'mute' || voiceMode === 'spoken')) return;
    if (typeof isStealth === 'function' && isStealth()) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(up ? 520 : 430, now);
      osc.frequency.exponentialRampToValueAtTime(up ? 640 : 350, now + 0.055);
      g.gain.setValueAtTime(0.018, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.065);
    } catch (_) {}
  }

  // 1. Injeta barra de progresso na pílula sem mexer no layout existente
  const pillEl = document.getElementById('lumo-pill');
  if (pillEl && !document.getElementById('pill-work-bar')) {
    const bar = document.createElement('div');
    bar.id = 'pill-work-bar';
    pillEl.appendChild(bar);
  }

  function setPillWorking(active, label = '✦ Pensando...') {
    const pill = document.getElementById('lumo-pill');
    const badge = document.getElementById('pill-badge');
    if (pill) pill.classList.toggle('ai-working', Boolean(active));
    if (!badge) return;

    const timerRunning = typeof timerInterval !== 'undefined' && Boolean(timerInterval);
    if (active) {
      if (!timerRunning) {
        badge.textContent = label;
        badge.classList.add('show');
        workBadgeActive = true;
      }
    } else if (workBadgeActive) {
      workBadgeActive = false;
      if (timerRunning && typeof updateTimerUI === 'function') {
        updateTimerUI();
      } else {
        badge.classList.remove('show');
      }
    }
  }

  // 2. Transições laterais direcionais em openView
  if (typeof window.openView === 'function') {
    const _origOpenView = window.openView;
    window.openView = function (viewName) {
      const goingBack = viewName === 'resumo' && currentViewId !== 'resumo';
      const changed = viewName !== currentViewId;
      currentViewId = viewName;

      _origOpenView(viewName);

      const target = document.getElementById('view-' + viewName);
      if (target && changed) {
        target.classList.remove('slide-forward', 'slide-back');
        void target.offsetWidth;
        const cls = goingBack ? 'slide-back' : 'slide-forward';
        target.classList.add(cls);
        setTimeout(() => target.classList.remove(cls), 280);
        playSoftTick(!goingBack);
      }
    };
  }

  // 3. Reação "engolir arquivo" + partículas temáticas no Bolso
  if (typeof window.handleFiles === 'function') {
    const _origHandleFiles = window.handleFiles;
    window.handleFiles = async function (fileList) {
      const arr = Array.from(fileList || []);
      if (arr.length && pillEl) {
        const first = arr[0];
        const name = (first?.name || '').toLowerCase();
        const type = first?.type || '';
        let syms = ['✦', '📦', '·'];
        let cols = ['#f6b974', '#fff3d6', '#c4b5fd'];
        if (type.startsWith('audio/') || /\.(ogg|opus|mp3|wav|m4a)$/i.test(name)) {
          syms = ['🎙️', '♪', '✦'];
          cols = ['#67e8f9', '#f6b974', '#fff3d6'];
        } else if (type === 'application/pdf' || /\.(pdf|txt|md|csv|json)$/i.test(name)) {
          syms = ['📄', '✦', '·'];
          cols = ['#34d399', '#f6b974', '#fff3d6'];
        } else if (type.startsWith('image/')) {
          syms = ['🖼️', '✦', '★'];
          cols = ['#f472b6', '#f6b974', '#fff3d6'];
        }

        pillEl.classList.remove('gulp');
        void pillEl.offsetWidth;
        pillEl.classList.add('gulp');
        setTimeout(() => pillEl.classList.remove('gulp'), 580);

        const r = pillEl.getBoundingClientRect();
        if (typeof spawnParticles === 'function') {
          spawnParticles(r.left + r.width / 2, r.top + r.height / 2, syms, cols, 9);
        }
      }
      return _origHandleFiles(fileList);
    };
  }

  // 4. Indicador de progresso vivo durante Whisper / Resumo / IA
  if (typeof window.startAiLoading === 'function' && typeof window.stopAiLoading === 'function') {
    const _origStart = window.startAiLoading;
    const _origStop = window.stopAiLoading;
    window.startAiLoading = function (userLabel) {
      const txt = String(userLabel || '').toLowerCase();
      const badgeLabel = txt.includes('transcrev')
        ? '🎙️ Ouvindo...'
        : (txt.includes('resumir') || txt.includes('lendo') || txt.includes('carregando'))
          ? '📄 Lendo...'
          : '✦ Pensando...';
      setPillWorking(true, badgeLabel);
      return _origStart(userLabel);
    };
    window.stopAiLoading = function (tb) {
      setPillWorking(false);
      return _origStop(tb);
    };
  }

  // Sincroniza também quando o chat normal ativa .thinking na pílula
  if (pillEl) {
    new MutationObserver(() => {
      const thinking = pillEl.classList.contains('thinking');
      if (thinking && !pillEl.classList.contains('ai-working')) {
        setPillWorking(true, '✦ Pensando...');
      } else if (!thinking && pillEl.classList.contains('ai-working')) {
        setPillWorking(false);
      }
    }).observe(pillEl, { attributes: true, attributeFilter: ['class'] });
  }

  // 5. Piscada dupla natural (0 timers extras — pega carona na piscada existente)
  const faceEl = document.getElementById('lumo-face');
  if (faceEl) {
    let wasBlinking = false;
    new MutationObserver(() => {
      const isBlinking = faceEl.classList.contains('blink');
      if (wasBlinking && !isBlinking) {
        const now = Date.now();
        const busy = ['happy', 'sleepy', 'goodbye', 'dizzy', 'love', 'thinking'].some((c) => faceEl.classList.contains(c));
        const invisible = (typeof isHiddenInGame !== 'undefined' && isHiddenInGame)
          || (typeof trayOnlyMode !== 'undefined' && trayOnlyMode && typeof isExpanded !== 'undefined' && !isExpanded);
        if (!busy && !invisible && now - lastDoubleBlinkAt > 5500 && Math.random() < 0.26) {
          lastDoubleBlinkAt = now;
          setTimeout(() => {
            if (!faceEl.classList.contains('blink')) {
              faceEl.classList.add('blink');
              setTimeout(() => faceEl.classList.remove('blink'), 110);
            }
          }, 115);
        }
      }
      wasBlinking = isBlinking;
    }).observe(faceEl, { attributes: true, attributeFilter: ['class'] });
  }

  // 6. Micro-olhares curiosos quando tranquilo na tela (pausa total se oculto/bandeja)
  setInterval(() => {
    const hidden = (typeof isHiddenInGame !== 'undefined' && isHiddenInGame)
      || (typeof isShuttingDown !== 'undefined' && isShuttingDown)
      || (typeof window.cinemaPlaying !== 'undefined' && window.cinemaPlaying)
      || (typeof trayOnlyMode !== 'undefined' && trayOnlyMode && typeof isExpanded !== 'undefined' && !isExpanded);
    if (hidden || (typeof isExpanded !== 'undefined' && isExpanded) || (typeof isThinking !== 'undefined' && isThinking)) return;
    if (!faceEl || ['sleepy', 'bored', 'dizzy', 'love', 'happy', 'music'].some((c) => faceEl.classList.contains(c))) return;

    const idleMs = typeof lastInteraction !== 'undefined' ? Date.now() - lastInteraction : 0;
    const cursorIdleMs = typeof lastCursorMoveMs !== 'undefined' ? Date.now() - lastCursorMoveMs : 9999;
    if (idleMs > 7000 && idleMs < 95000 && cursorIdleMs > 3000 && Math.random() < 0.35) {
      const dir = Math.random() < 0.5 ? -6 : 6;
      faceEl.classList.add('curious');
      if (typeof setEyeTarget === 'function') setEyeTarget(dir, -1.5);
      setTimeout(() => {
        faceEl.classList.remove('curious');
        const nowIdle = typeof lastCursorMoveMs !== 'undefined' ? Date.now() - lastCursorMoveMs : 9999;
        if (typeof setEyeTarget === 'function' && nowIdle > 2500) setEyeTarget(0, 0);
      }, 1150);
    }
  }, 13000);

  // 7. Reação curiosa ao copiar link/dólar (analyzeClipHelp)
  if (typeof window.analyzeClipHelp === 'function') {
    const _origClipHelp = window.analyzeClipHelp;
    window.analyzeClipHelp = function (text) {
      const res = _origClipHelp(text);
      const b = document.getElementById('speech-bubble');
      if (b && b.classList.contains('show') && faceEl) {
        faceEl.classList.add('curious');
        if (typeof hopPill === 'function') hopPill();
        setTimeout(() => faceEl.classList.remove('curious'), 1600);
      }
      return res;
    };
  }

  // 8. Pop + faíscas discretas ao marcar tarefa como concluída
  if (typeof window.toggleTask === 'function') {
    const _origToggleTask = window.toggleTask;
    window.toggleTask = function (idx) {
      const willBeDone = typeof tasks !== 'undefined' && tasks[idx] && !tasks[idx].done;
      _origToggleTask(idx);
      if (willBeDone) {
        const items = document.querySelectorAll('#task-list .task-item');
        const row = items[idx];
        if (row) {
          row.classList.add('just-done');
          const r = row.getBoundingClientRect();
          if (typeof spawnParticles === 'function') {
            spawnParticles(r.left + 18, r.top + r.height / 2, ['✦', '✓', '·'], ['#34d399', '#f6b974', '#fff3d6'], 6);
          }
        }
      }
    };
  }
})();

