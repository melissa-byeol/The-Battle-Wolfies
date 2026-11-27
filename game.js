const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const btnPlay = document.getElementById('btn-play');
const menuOst = document.getElementById('menu-ost');

// Configuración de tiempos de la intro (en segundos)
const TIMING = {
  waitBeforePan: 2.0,    // Espera inicial de 2s sobre la pradera
  zoomInDuration: 1.2,   // Zoom in ligero
  zoomOutDuration: 1.8,  // Zoom out panorámico (junto al fade in del OST)
  ostFadeDuration: 2.2,  // Duración del fade in del audio
  targetVolume: 0.75     // Volumen máximo del OST (0.0 a 1.0)
};

// Estado general
let state = 'INTRO'; // 'INTRO' | 'MENU'
let introTime = 0;
let globalTime = 0;
let lastTimestamp = 0;

// Estado del fade in del audio
let ostStarted = false;
let ostFading = false;
let ostFadeElapsed = 0;
let pendingOstPlay = false;

// Cámara
const camera = {
  zoom: 1.28,
  offsetY: -25
};

// Tropas en espera: aliados (borde azul) y enemigos (borde rojo)
const allies = [
  { x: 110, y: 415, r: 22, color: '#f5f6fa', phase: 0.0, speed: 4.5 },
  { x: 165, y: 422, r: 18, color: '#dcdde1', phase: 1.2, speed: 5.0 },
  { x: 215, y: 410, r: 28, color: '#7f8fa6', phase: 2.4, speed: 3.2 },
  { x: 75,  y: 430, r: 20, color: '#fbc531', phase: 0.7, speed: 4.8 },
  { x: 265, y: 425, r: 16, color: '#00a8ff', phase: 3.1, speed: 5.5 },
  { x: 140, y: 438, r: 24, color: '#9c88ff', phase: 1.9, speed: 3.8 }
];

const enemies = [
  { x: 850, y: 415, r: 22, color: '#f5f6fa', phase: 0.5, speed: 4.5 },
  { x: 795, y: 422, r: 18, color: '#dcdde1', phase: 1.7, speed: 5.0 },
  { x: 740, y: 405, r: 34, color: '#718093', phase: 2.9, speed: 2.8 },
  { x: 885, y: 430, r: 20, color: '#e84118', phase: 1.1, speed: 4.8 },
  { x: 690, y: 426, r: 16, color: '#4cd137', phase: 3.5, speed: 5.4 },
  { x: 820, y: 438, r: 23, color: '#8c7ae6', phase: 2.2, speed: 4.0 }
];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function triggerMenuOstFadeIn() {
  if (ostStarted) return;

  menuOst.volume = 0;
  const playPromise = menuOst.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        ostStarted = true;
        ostFading = true;
        pendingOstPlay = false;
      })
      .catch(() => {
        // Si el navegador bloquea el autoplay, se reintentará al primer clic/tecla
        pendingOstPlay = true;
      });
  } else {
    ostStarted = true;
    ostFading = true;
  }
}

function updateOstFade(dt) {
  if (!ostFading) return;

  ostFadeElapsed += dt;
  const progress = Math.min(ostFadeElapsed / TIMING.ostFadeDuration, 1);
  menuOst.volume = progress * TIMING.targetVolume;

  if (progress >= 1) {
    ostFading = false;
  }
}

function resetIntro() {
  state = 'INTRO';
  introTime = 0;
  camera.zoom = 1.28;
  camera.offsetY = -25;
  uiLayer.classList.remove('visible');

  // Reinicia también el OST y su fade in
  menuOst.pause();
  menuOst.currentTime = 0;
  menuOst.volume = 0;
  ostStarted = false;
  ostFading = false;
  ostFadeElapsed = 0;
  pendingOstPlay = false;
}

function update(dt) {
  globalTime += dt;

  if (state === 'INTRO') {
    introTime += dt;

    const t1End = TIMING.waitBeforePan;
    const t2End = t1End + TIMING.zoomInDuration;
    const t3End = t2End + TIMING.zoomOutDuration;

    // 1. Espera de 2s contemplando la pradera
    if (introTime <= t1End) {
      camera.zoom = 1.28;
      camera.offsetY = -25;
    }
    // 2. Zoom in ligero
    else if (introTime <= t2End) {
      const p = easeInOutCubic((introTime - t1End) / TIMING.zoomInDuration);
      camera.zoom = 1.28 + (1.46 - 1.28) * p;
      camera.offsetY = -25 + (-40 - -25) * p;
    }
    // 3. Zoom out panorámico + inicio de fade in del OST
    else if (introTime <= t3End) {
      triggerMenuOstFadeIn();

      const p = easeInOutCubic((introTime - t2End) / TIMING.zoomOutDuration);
      camera.zoom = 1.46 + (1.0 - 1.46) * p;
      camera.offsetY = -40 + (0 - -40) * p;
    }
    // 4. Fin de intro -> mostrar menú
    else {
      triggerMenuOstFadeIn();
      camera.zoom = 1.0;
      camera.offsetY = 0;
      state = 'MENU';
      uiLayer.classList.add('visible');
    }
  }

  updateOstFade(dt);
}

function drawMeadowBackground() {
  // 1. Cielo degradado
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#4bcffa');
  skyGrad.addColorStop(0.65, '#a3e4ff');
  skyGrad.addColorStop(1, '#dff9fb');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-250, -250, canvas.width + 500, canvas.height + 500);

  // 2. Sol
  ctx.fillStyle = 'rgba(255, 250, 205, 0.7)';
  ctx.beginPath();
  ctx.arc(480, 170, 55, 0, Math.PI * 2);
  ctx.fill();

  // 3. Colinas lejanas
  ctx.fillStyle = '#7bed9f';
  ctx.beginPath();
  ctx.moveTo(-150, 540);
  ctx.lineTo(-150, 340);
  ctx.quadraticCurveTo(240, 270, 520, 330);
  ctx.quadraticCurveTo(780, 380, 1110, 310);
  ctx.lineTo(1110, 540);
  ctx.closePath();
  ctx.fill();

  // 4. Pradera media
  ctx.fillStyle = '#2ed573';
  ctx.beginPath();
  ctx.moveTo(-150, 540);
  ctx.lineTo(-150, 375);
  ctx.quadraticCurveTo(320, 410, 620, 365);
  ctx.quadraticCurveTo(840, 335, 1110, 380);
  ctx.lineTo(1110, 540);
  ctx.closePath();
  ctx.fill();

  // 5. Suelo principal
  ctx.fillStyle = '#26de81';
  ctx.fillRect(-150, 415, canvas.width + 300, 180);

  ctx.strokeStyle = '#20bf6b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-150, 415);
  ctx.lineTo(canvas.width + 150, 415);
  ctx.stroke();
}

function drawUnitCircle(unit, borderColor) {
  const bounce = Math.abs(Math.sin(globalTime * unit.speed + unit.phase)) * 6;
  const drawY = unit.y - bounce;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(unit.x, unit.y + unit.r - 2, unit.r * 0.85, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = unit.color;
  ctx.beginPath();
  ctx.arc(unit.x, drawY, unit.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 4.5;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2 + camera.offsetY);

  drawMeadowBackground();

  [...allies].sort((a, b) => a.y - b.y).forEach((u) => drawUnitCircle(u, '#1e90ff'));
  [...enemies].sort((a, b) => a.y - b.y).forEach((u) => drawUnitCircle(u, '#ff4757'));

  ctx.restore();
}

function loop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function unlockPendingAudio() {
  if (pendingOstPlay) {
    triggerMenuOstFadeIn();
  }
}

function startGame() {
  if (state !== 'MENU') return;
  alert('¡A la batalla! Aquí conectaremos el bucle de combate.');
}

btnPlay.addEventListener('click', () => {
  unlockPendingAudio();
  startGame();
});

window.addEventListener('pointerdown', unlockPendingAudio, { passive: true });

window.addEventListener('keydown', (e) => {
  unlockPendingAudio();

  const panStartTime = TIMING.waitBeforePan + TIMING.zoomInDuration;
  const fullIntroTime = panStartTime + TIMING.zoomOutDuration;

  if (e.code === 'Enter' || e.code === 'Space') {
    if (state === 'INTRO') {
      introTime = fullIntroTime;
    } else if (state === 'MENU') {
      startGame();
    }
  } else if (e.code === 'KeyR') {
    resetIntro();
  }
});

requestAnimationFrame(loop);
