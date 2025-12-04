const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const btn = document.getElementById('btn');
// welcome modal elements
const welcomeEl = document.getElementById('welcome');
const playCountEl = document.getElementById('playCount');
const startPlayBtn = document.getElementById('startPlay');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const upBtn = document.getElementById('up');
const downBtn = document.getElementById('down');
const jumpBtn = document.getElementById('jump');

let running = false;
let gameOver = false;
let lastTime = 0;
let spawnAcc = 0;
let score = 0;
let cars = 0;
let roadSpeed = 180; // px/s downward scroll speed

const W = canvas.width;
const H = canvas.height;
const laneLines = 3; // just for visuals
let touchTarget = null; // {x,y} in canvas coords for mobile steering

const player = {
  x: W * 0.5 - 22,
  y: H - 120,
  w: 44,
  h: 72,
  color: '#4f46e5',
  speed: 220, // px/s
  vx: 0,
  vy: 0,
  jumpT: 0, // seconds into jump (0 = grounded)
  jumpDur: 0.7,
  jumpPeak: 90, // visual lift in px (higher than a car height)
  canJump: true
};
const obstacles = [];
const laneDashes = [];
const banners = [];

function reset() {
  running = true;
  gameOver = false;
  lastTime = 0;
  spawnAcc = 0;
  score = 0;
  cars = 0;
  roadSpeed = 180;
  player.x = W * 0.5 - player.w/2;
  player.y = H - 120;
  player.vx = 0; player.vy = 0;
  player.jumpT = 0; player.canJump = true;
  obstacles.length = 0;
  laneDashes.length = 0;
  banners.length = 0;
  for (let i = 0; i < 16; i++) laneDashes.push({ y: i * 48 });
  for (let i = 0; i < 4; i++) banners.push({ y: i * 220 + 80 });
  btn.textContent = 'Pause';
  btn.disabled = false;
  scoreEl.textContent = '0';
  requestAnimationFrame(loop);
}

function rect(x, y, w, h, r, c) {
  ctx.fillStyle = c;
  if (!r) { ctx.fillRect(x, y, w, h); return; }
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function drawCar(x, y, w, h, c) {
  rect(x, y, w, h, 10, c);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  rect(x+6, y+10, 6, 16, 3, '#1b1f2a');
  rect(x+w-12, y+10, 6, 16, 3, '#1b1f2a');
  rect(x+6, y+h-26, 6, 16, 3, '#1b1f2a');
  rect(x+w-12, y+h-26, 6, 16, 3, '#1b1f2a');
  rect(x+8, y+28, w-16, h-56, 6, 'rgba(180,200,255,0.15)');
}

function spawnObstacle() {
  const type = Math.random();
  const w = 44, h = 72;
  const colors = ['#ef4444','#22c55e','#eab308','#06b6d4'];
  const color = () => colors[Math.floor(Math.random()*colors.length)];

  // 45% single car
  if (type < 0.45) {
    const x = 10 + Math.random() * (W - 20 - w);
    const y = -h - 20;
    obstacles.push({ x, y, w, h, color: color() });
    return;
  }
  // 55% pair with gap you can pass between
  const gap = Math.max(player.w + 12, 70 - Math.min(40, score / 60));
  const total = W - 20; // usable width
  const leftW = (total - gap) * (0.2 + Math.random() * 0.5);
  const rightW = total - gap - leftW;
  const leftX = 10;
  const rightX = 10 + leftW + gap;
  const y = -h - 20;
  // span as blocks approximated by cars tiled to ensure consistent collision visuals
  const carW = w;
  let filled = 0;
  for (let x0 = leftX; x0 + carW <= leftX + leftW; x0 += carW + 6) {
    obstacles.push({ x: x0, y, w, h, color: color() });
    filled++;
  }
  for (let x0 = rightX; x0 + carW <= rightX + rightW; x0 += carW + 6) {
    obstacles.push({ x: x0, y, w, h, color: color() });
    filled++;
  }
}

function update(dt) {
  const dy = roadSpeed * dt;
  for (let i = 0; i < laneDashes.length; i++) {
    laneDashes[i].y += dy;
    if (laneDashes[i].y > H) laneDashes[i].y -= H + 24;
  }
  for (let i = 0; i < banners.length; i++) {
    banners[i].y += dy;
    if (banners[i].y > H + 60) banners[i].y -= (H + 280);
  }
  spawnAcc += dt;
  const spawnEvery = Math.max(0.55, 1.05 - Math.min(0.6, score / 6000));
  if (spawnAcc > spawnEvery) {
    spawnAcc = 0;
    spawnObstacle();
  }
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y += dy;
    // count when an obstacle has passed the player
    if (!o.passed && o.y > player.y + player.h) {
      o.passed = true;
      cars++;
      score = cars; // score equals cars passed
      scoreEl.textContent = score.toString();
    }
    if (o.y > H + 100) obstacles.splice(i, 1);
  }
  // player movement
  // touch steering: smoothly move toward target if present
  if (touchTarget) {
    const cx = player.x + player.w/2;
    const cy = player.y + player.h/2;
    let dx = touchTarget.x - cx;
    let dyv = touchTarget.y - cy;
    const dist = Math.hypot(dx, dyv);
    const s = player.speed;
    if (dist > 2) {
      player.vx = (dx / dist) * s;
      player.vy = (dyv / dist) * s;
    } else {
      player.vx = 0; player.vy = 0;
    }
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  // bounds
  const minX = 10, maxX = W - 10 - player.w;
  const minY = H * 0.35, maxY = H - 10 - player.h;
  if (player.x < minX) player.x = minX;
  if (player.x > maxX) player.x = maxX;
  if (player.y < minY) player.y = minY;
  if (player.y > maxY) player.y = maxY;

  // jump update
  if (player.jumpT > 0) {
    player.jumpT += dt;
    if (player.jumpT >= player.jumpDur) {
      player.jumpT = 0;
      player.canJump = true;
      // jump finished -> remove indicator active state
      const ji = document.getElementById('jump-indicator');
      if (ji) ji.classList.remove('active');
    }
  }

  // score is cars passed; HUD updated above when cars increments
  // slightly increase difficulty over time
  roadSpeed = Math.min(300, 180 + score * 0.35);
}

function collide(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function drawRoad() {
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, W, H);
  // faint vertical separators (visual only)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  const laneW = W / laneLines;
  for (let i = 1; i < laneLines; i++) {
    const x = i * laneW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  // moving dashed center markers
  const dashW = 10, dashH = 28;
  for (let i = 0; i < laneDashes.length; i++) {
    const y = laneDashes[i].y;
    for (let l = 0; l < laneLines; l++) {
      const x = l * laneW + laneW/2 - dashW/2;
      rect(x, y, dashW, dashH, 4, 'rgba(255,255,255,0.12)');
    }
  }
  // scrolling banners with name
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  for (let i = 0; i < banners.length; i++) {
    const y = Math.floor(banners[i].y);
    const bx = 24, bw = W - 48, bh = 22;
    rect(bx, y, bw, bh, 8, 'rgba(255,255,255,0.06)');
    // small flag triangles at sides
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(bx - 8, y + 2); ctx.lineTo(bx, y + 2); ctx.lineTo(bx, y + bh - 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + bw + 8, y + 2); ctx.lineTo(bx + bw, y + 2); ctx.lineTo(bx + bw, y + bh - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8eaed';
    ctx.fillText('WiyarGames', W/2, y + bh/2 + 5);
  }
}

function draw() {
  drawRoad();
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    drawCar(o.x, o.y, o.w, o.h, o.color);
  }
  // visual jump offset
  let jumpZ = 0;
  if (player.jumpT > 0) {
    const t = Math.min(1, player.jumpT / player.jumpDur); // 0..1
    // sine easing for smooth up/down
    jumpZ = Math.sin(Math.PI * t) * player.jumpPeak;
  }
  drawCar(player.x, player.y - jumpZ, player.w, player.h, player.color);
}

function loop(ts) {
  if (!running) return;
  if (!lastTime) lastTime = ts;
  const dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;
  update(dt);
  draw();
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const b = { x: o.x, y: o.y, w: o.w, h: o.h };
    const a = { x: player.x, y: player.y, w: player.w, h: player.h };
    // if overlapping while jumping, mark obstacle as cleared so it won't collide after landing
    if (collide(a, b)) {
      if (player.jumpT > 0) { o.cleared = true; continue; }
      if (o.cleared) continue;
      running = false;
      gameOver = true;
      btn.textContent = 'Restart';
      flash();
      break;
    }
  }
  if (running) requestAnimationFrame(loop);
}

function flash() {
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  rect(40, H/2-70, W-80, 140, 12, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = '#e8eaed';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Crash! Score: ' + Math.floor(score), W/2, H/2 - 10);
  ctx.fillText('Press Restart or Space', W/2, H/2 + 24);
}

// controls
const keys = { left:false, right:false, up:false, down:false };
function onKey(e, down) {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = down;
  else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = down;
  else if (e.key === 'ArrowUp' || e.key === 'w') keys.up = down;
  else if (e.key === 'ArrowDown' || e.key === 's') keys.down = down;
}
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (gameOver) { reset(); return; }
    if (!running) { running = true; btn.textContent='Pause'; requestAnimationFrame(loop); return; }
    // jump on space when running
    doJump();
    const ji = document.getElementById('jump-indicator');
    if (ji) ji.classList.add('active');
    return;
  }
  onKey(e, true);
  updateVelocity();
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    // if jump already ended, remove highlight; else keep until update clears it
    const ji = document.getElementById('jump-indicator');
    if (ji && player.jumpT <= 0) ji.classList.remove('active');
    return;
  }
  onKey(e, false);
  updateVelocity();
});

function updateVelocity() {
  const s = player.speed;
  player.vx = (keys.left ? -s : 0) + (keys.right ? s : 0);
  player.vy = (keys.up ? -s : 0) + (keys.down ? s : 0);
}

function doJump() {
  if (!player.canJump || player.jumpT > 0) return;
  player.canJump = false;
  player.jumpT = 0.0001; // start jump
  const ji = document.getElementById('jump-indicator');
  if (ji) ji.classList.add('active');
}

function bindHold(btn, onPress) {
  let id = null;
  const start = () => { btn.classList.add('pressed'); onPress(); id = setInterval(onPress, 120); };
  const end = () => { btn.classList.remove('pressed'); if (id) clearInterval(id), id = null; };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev => btn.addEventListener(ev, end));
}

// mobile buttons: continuous movement while holding
function bindDirectionalHold(el, setKey) {
  let hold = false;
  const start = (e)=>{ e.preventDefault(); hold = true; setKey(true); updateVelocity(); };
  const end = ()=>{ hold = false; setKey(false); updateVelocity(); };
  el.addEventListener('pointerdown', start);
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev, end));
}

bindDirectionalHold(leftBtn, v=>keys.left=v);
bindDirectionalHold(rightBtn, v=>keys.right=v);
bindDirectionalHold(upBtn, v=>keys.up=v);
bindDirectionalHold(downBtn, v=>keys.down=v);
jumpBtn.addEventListener('click', () => {
  doJump();
  if (navigator.vibrate) navigator.vibrate(15);
});
// pressed visual for jump on touch
jumpBtn.addEventListener('pointerdown', ()=> jumpBtn.classList.add('pressed'));
['pointerup','pointercancel','pointerleave'].forEach(ev => jumpBtn.addEventListener(ev, ()=> jumpBtn.classList.remove('pressed')));

// touch steering handlers on canvas
function toCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    e.preventDefault();
    touchTarget = toCanvasPoint(e);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!touchTarget) return;
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    e.preventDefault();
    touchTarget = toCanvasPoint(e);
  }
});
const clearTouch = (e)=>{
  if (touchTarget) {
    touchTarget = null;
    // stop drift
    player.vx = 0; player.vy = 0;
  }
};
['pointerup','pointercancel','pointerleave','pointerout'].forEach(ev => canvas.addEventListener(ev, clearTouch));

btn.addEventListener('click', () => {
  if (gameOver) { reset(); return; }
  running = !running;
  if (running) { btn.textContent = 'Pause'; requestAnimationFrame(loop); }
  else btn.textContent = 'Resume';
});

// welcome modal / play counter
function initWelcome() {
  // increment persistent play count per visit
  let count = 0;
  try {
    const raw = localStorage.getItem('playCount');
    count = raw ? parseInt(raw, 10) || 0 : 0;
    count += 1;
    localStorage.setItem('playCount', String(count));
  } catch (e) {
    count += 1; // fallback volatile
  }
  if (playCountEl) playCountEl.textContent = count.toLocaleString();
  if (welcomeEl) {
    welcomeEl.hidden = false;
    // disable running until start pressed
    running = false;
  }
}

if (startPlayBtn) {
  startPlayBtn.addEventListener('click', () => {
    if (welcomeEl) welcomeEl.hidden = true;
    reset();
  });
}

// show welcome on load instead of auto-start
initWelcome();
