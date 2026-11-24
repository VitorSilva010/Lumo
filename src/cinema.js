window.cinemaPlaying = false;
let cinemaTimers = [];

function playCinemaSfx(kind) {
  if (typeof voiceMode !== 'undefined' && voiceMode === 'mute') return;
  if (typeof isStealth === 'function' && isStealth()) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    if (kind === 'ship') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(215, now + 0.9);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.032, now + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 1.15);
    } else if (kind === 'drop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.55);
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.62);
    } else if (kind === 'land') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.26);
    }
  } catch (_) {}
}

function queueCine(fn, ms) {
  cinemaTimers.push(setTimeout(() => { if (window.cinemaPlaying) fn(); }, ms));
}

async function replayArrivalCinema() {
  if (typeof isExpanded !== 'undefined' && isExpanded) {
    await togglePanel(false);
    setTimeout(() => playArrivalCinema(), 220);
  } else {
    playArrivalCinema();
  }
}

async function playArrivalCinema() {
  if (window.cinemaPlaying || (typeof isShuttingDown !== 'undefined' && isShuttingDown)) return;
  window.cinemaPlaying = true;
  cinemaTimers.forEach(clearTimeout);
  cinemaTimers = [];

  const pillEl = document.getElementById('lumo-pill');
  if (pillEl) pillEl.style.visibility = 'hidden';
  document.getElementById('speech-bubble')?.classList.remove('show');
  await syncWindowMode('cinema');

  const stage = document.getElementById('cinema-stage');
  const ship = document.getElementById('mothership');
  const beam = document.getElementById('drop-beam');
  const cap = document.getElementById('drop-capsule');
  const face = document.getElementById('cine-face');
  const ring = document.getElementById('impact-ring');
  const bubble = document.getElementById('cinema-bubble');

  ship.className = '';
  beam.className = '';
  cap.className = '';
  face.className = 'cine-face';
  face.style.transform = 'translate(0, 0)';
  ring.className = '';
  bubble.className = '';
  bubble.textContent = '';
  stage.classList.add('active');

  // 1. Nave chega no topo
  queueCine(() => {
    ship.classList.add('arrive');
    playCinemaSfx('ship');
  }, 120);

  // 2. Nave flutua e abre o feixe de luz
  queueCine(() => {
    ship.classList.add('hovering');
    beam.classList.add('on');
    playChirp(420, 680, 0.22);
  }, 1300);

  // 3. Cápsula cai da nave
  queueCine(() => {
    cap.classList.add('falling');
    playCinemaSfx('drop');
  }, 1680);

  // 4. Impacto no PC + onda de choque + faíscas
  queueCine(() => {
    ring.classList.add('boom');
    playCinemaSfx('land');
    spawnParticles(240, 212, ['✦', '·', '★', '●'], ['#f6b974', '#fff3d6', '#67e8f9', '#fb7185'], 14);
  }, 2320);

  // 5. Nave vai embora e olhos acendem
  queueCine(() => {
    beam.classList.remove('on');
    ship.classList.remove('hovering', 'arrive');
    ship.classList.add('depart');
    cap.classList.remove('falling');
    cap.classList.add('landed');
    face.classList.add('boot');
    playChirp(480, 820, 0.22);
  }, 2900);

  // 6. Olha curioso para a esquerda
  queueCine(() => {
    face.className = 'cine-face on';
    face.style.transform = 'translate(-14px, -2px)';
    playChirp(520, 620, 0.14);
  }, 3600);

  // 7. Olha curioso para a direita
  queueCine(() => {
    face.style.transform = 'translate(14px, -2px)';
    playChirp(560, 680, 0.14);
  }, 4400);

  // 8. Encara o usuário e se apresenta
  queueCine(() => {
    face.style.transform = 'translate(0, 0)';
    face.className = 'cine-face blink';
    setTimeout(() => { if (window.cinemaPlaying) face.className = 'cine-face happy'; }, 150);
    bubble.textContent = 'Ufa... aterrissagem perfeita! Então é aqui o seu PC?';
    bubble.classList.add('show');
    speakText(bubble.textContent);
  }, 5200);

  queueCine(() => {
    face.className = 'cine-face on';
    bubble.textContent = 'Prazer! Eu sou o Lumo, seu novo companheiro de tela.';
    playChirp(580, 860, 0.2);
    speakText(bubble.textContent);
  }, 8000);

  queueCine(() => {
    face.className = 'cine-face happy';
    bubble.textContent = 'Pode ficar tranquilo... eu vim pra ficar por um bom tempo! ♥';
    spawnParticles(240, 200, ['♥', '✦', '★'], ['#fb7185', '#f6b974', '#fff3d6'], 12);
    playChirp(640, 1020, 0.26);
    speakText('Pode ficar tranquilo, eu vim pra ficar por um bom tempo!');
  }, 11000);

  // 9. Sobe suavemente via GPU até o pixel exato do topo da tela
  queueCine(() => {
    bubble.classList.remove('show');
    face.className = 'cine-face on';
    cap.classList.remove('landed');
    void cap.offsetWidth;
    cap.classList.add('docking');
    playChirp(520, 780, 0.22);
  }, 14300);

  // 10. Acopla na pílula real
  queueCine(() => finishArrivalCinema(), 15220);
}

async function finishArrivalCinema() {
  cinemaTimers.forEach(clearTimeout);
  cinemaTimers = [];
  window.cinemaPlaying = false;
  localStorage.setItem('lumo_intro_v1', '1');
  document.getElementById('cinema-stage')?.classList.remove('active');
  const pillEl = document.getElementById('lumo-pill');
  if (pillEl) pillEl.style.visibility = 'visible';
  await syncWindowMode('pill');
  setExpression('happy');
  hopPill();
  setTimeout(() => restoreIdleExpression(), 1500);
  if (typeof userName !== 'undefined' && !userName) {
    setTimeout(() => say('Clique em mim para me dizer seu nome!', 4400, true), 300);
  }
}

window.playArrivalCinema = playArrivalCinema;
window.replayArrivalCinema = replayArrivalCinema;
window.finishArrivalCinema = finishArrivalCinema;
