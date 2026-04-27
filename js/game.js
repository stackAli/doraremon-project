const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const comicsEl = document.getElementById("comics");
const livesEl = document.getElementById("lives");
const powerEl = document.getElementById("power");
const gameStateLabel = document.getElementById("gameStateLabel");
const startBtn = document.getElementById("startGame");
const modal = document.getElementById("pocketModal");
const openPocket = document.getElementById("openPocket");
const closePocket = document.getElementById("closePocket");
const pocketGrid = document.getElementById("gamePocketGrid");

let running = false;
let isPaused = false;
let gameState = "menu"; // menu | playing | paused | gameover
let frame = 0;
let score = 0;
let comics = 0;
let lives = 3;
let speed = 4.7;
let activePower = "None";
let invisible = false;
let keys = {};
let obstacles = [];
let comicItems = [];
let gadgetItems = [];
let particles = [];
let floatingTexts = [];
let combo = 0;
let comboTimer = 0;
let freezeTimer = 0;
let magnetTimer = 0;

const player = {
  x: 110,
  y: 365,
  w: 52,
  h: 72,
  vy: 0,
  vx: 0,
  ground: false,
  fly: false,
  shrink: false,
  grow: false
};

const ground = 460;

const nobitaSprite = new Image();
nobitaSprite.crossOrigin = "anonymous";
nobitaSprite.src = window.NOBITA_SPRITE || "https://www.pngitem.com/pimgs/m/204-2047786_doraemon-png-nobita-transparent-png.png";


function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function setGameState(state) {
  gameState = state;
  if (gameStateLabel) {
    const labelMap = {
      menu: "Menu",
      playing: "Playing",
      paused: "Paused",
      gameover: "Game Over"
    };
    gameStateLabel.textContent = labelMap[state] || state;
  }
}

function resetGame() {
  running = true;
  isPaused = false;
  setGameState("playing");
  frame = 0;
  score = 0;
  comics = 0;
  lives = 3;
  speed = 4.7;
  activePower = "None";
  invisible = false;
  keys = {};
  obstacles = [];
  comicItems = [];
  gadgetItems = [];
  particles = [];
  floatingTexts = [];
  combo = 0;
  comboTimer = 0;
  freezeTimer = 0;
  magnetTimer = 0;

  Object.assign(player, {
    x: 110,
    y: 365,
    w: 52,
    h: 72,
    vy: 0,
    vx: 0,
    ground: false,
    fly: false,
    shrink: false,
    grow: false
  });

  updateHud();
  requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  comicsEl.textContent = comics;
  livesEl.textContent = lives;
  powerEl.textContent = activePower;
}

function renderGamePocket() {
  const pocket = Store.pocket();
  if (!pocket.length) {
    pocketGrid.innerHTML = `<div class="empty-state"><h2>Pocket empty</h2><p class="muted">Collect gadgets in the game or create them in the Gadget Lab.</p></div>`;
    return;
  }
  pocketGrid.innerHTML = pocket.map(g => gadgetCardHTML(g, "game")).join("");
}

function openPocketModal() {
  if (!running || gameState === "gameover") {
    renderGamePocket();
    modal.classList.remove("hidden");
    return;
  }

  isPaused = true;
  setGameState("paused");
  renderGamePocket();
  modal.classList.remove("hidden");
}

function closePocketModal() {
  modal.classList.add("hidden");
  if (running && gameState !== "gameover") {
    isPaused = false;
    setGameState("playing");
  }
}

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRect(c, r) {
  const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
  const dx = c.x - cx;
  const dy = c.y - cy;
  return (dx * dx + dy * dy) <= c.r * c.r;
}

function spawnObstacle() {
  const options = [
    { name: "Gian", color: "#7c3aed", w: 58, h: 78 },
    { name: "Exam", color: "#ef4444", w: 54, h: 60 },
    { name: "Teacher", color: "#f97316", w: 58, h: 72 },
    { name: "Trap", color: "#334155", w: 76, h: 40 }
  ];
  const o = options[Math.floor(Math.random() * options.length)];
  obstacles.push({ ...o, x: canvas.width + 60, y: ground - o.h });
}

function spawnComic() {
  comicItems.push({
    x: canvas.width + 40,
    y: 190 + Math.random() * 150,
    r: 19,
    spin: 0
  });
}

function spawnGadgetItem() {
  const sample = GadgetDB.samples[Math.floor(Math.random() * GadgetDB.samples.length)];
  gadgetItems.push({
    x: canvas.width + 40,
    y: 170 + Math.random() * 170,
    r: 23,
    pulse: 0,
    gadget: sample
  });
}

function addParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - .5) * 6,
      vy: (Math.random() - .9) * 6,
      life: 35 + Math.random() * 20,
      maxLife: 55,
      size: 3 + Math.random() * 4,
      color
    });
  }
}

function addFloatingText(x, y, text, color = "#062c43") {
  floatingTexts.push({ x, y, text, color, life: 55 });
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += .12;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  floatingTexts.forEach(t => {
    t.y -= .7;
    t.life--;
  });
  floatingTexts = floatingTexts.filter(t => t.life > 0);
}

function handleMovement() {
  player.vx = 0;
  if (keys.ArrowLeft || keys.a) player.vx = -5.4;
  if (keys.ArrowRight || keys.d) player.vx = 5.4;

  player.x += player.vx;
  player.x = Math.max(30, Math.min(player.x, canvas.width - player.w - 30));

  if (player.fly) {
    if (keys.ArrowUp || keys.w || keys[" "]) player.vy -= 0.55;
    player.vy += 0.15;
  } else {
    player.vy += 0.78;
  }

  player.y += player.vy;

  if (player.y + player.h >= ground) {
    player.y = ground - player.h;
    player.vy = 0;
    player.ground = true;
  } else {
    player.ground = false;
  }
}

function jump() {
  if (isPaused || !running) return;

  if (player.fly) {
    player.vy = -6;
    addParticles(player.x + player.w / 2, player.y + player.h, "#ffd23f", 8);
    return;
  }

  if (player.ground) {
    player.vy = -15.5;
    player.ground = false;
    addParticles(player.x + player.w / 2, player.y + player.h, "#08a8f4", 8);
  }
}

function update() {
  frame++;
  score += speed * 0.14;

  if (comboTimer > 0) comboTimer--;
  if (freezeTimer > 0) freezeTimer--;
  if (magnetTimer > 0) magnetTimer--;
  if (comboTimer <= 0) combo = 0;

  if (frame % 95 === 0) spawnObstacle();
  if (frame % 78 === 0) spawnComic();
  if (frame % 210 === 0) spawnGadgetItem();

  handleMovement();

  obstacles.forEach(o => { if (freezeTimer <= 0) o.x -= speed; });
  comicItems.forEach(c => {
    if (magnetTimer > 0) {
      const dx = (player.x + player.w / 2) - c.x;
      const dy = (player.y + player.h / 2) - c.y;
      c.x += dx * 0.055;
      c.y += dy * 0.055;
    } else {
      c.x -= speed;
    }
    c.spin += .08;
  });
  gadgetItems.forEach(g => {
    g.x -= speed;
    g.pulse += .08;
  });

  obstacles = obstacles.filter(o => o.x + o.w > -20);
  comicItems = comicItems.filter(c => c.x + c.r > -20);
  gadgetItems = gadgetItems.filter(g => g.x + g.r > -20);

  obstacles.forEach((o, index) => {
    if (rects(player, o)) {
      if (player.grow) {
        addParticles(o.x + o.w / 2, o.y + o.h / 2, "#f97316", 18);
        addFloatingText(o.x, o.y - 10, "+60 Break", "#f97316");
        obstacles.splice(index, 1);
        score += 60;
        return;
      }

      if (invisible) {
        addParticles(o.x + o.w / 2, o.y + o.h / 2, "#8b5cf6", 12);
        obstacles.splice(index, 1);
        return;
      }

      lives--;
      addParticles(player.x + player.w / 2, player.y + player.h / 2, "#ef4444", 18);
      addFloatingText(player.x, player.y - 20, "-1 Life", "#ef4444");
      obstacles.splice(index, 1);
      if (lives <= 0) endGame();
    }
  });

  comicItems.forEach((c, index) => {
    if (circleRect(c, player)) {
      comics++;
      combo++;
      comboTimer = 130;
      const gained = 45 + combo * 5;
      score += gained;
      comicItems.splice(index, 1);
      Store.addStats({ comics: 1 });
      addParticles(c.x, c.y, "#f97316", 16);
      addFloatingText(c.x - 16, c.y - 18, `+${gained}`, "#f97316");
      toast(`Comic collected · Combo x${combo}`);
    }
  });

  gadgetItems.forEach((g, index) => {
    if (circleRect(g, player)) {
      const newGadget = GadgetDB.create(g.gadget);
      GadgetDB.add(newGadget);
      score += 70;
      gadgetItems.splice(index, 1);
      addParticles(g.x, g.y, "#08a8f4", 20);
      addFloatingText(g.x - 28, g.y - 22, `+ ${newGadget.name}`, "#075985");
      toast(`${newGadget.name} added to pocket`);
    }
  });

  updateParticles();

  const stats = Store.stats();
  if (score > stats.score) {
    Store.setStats({ ...stats, score: Math.floor(score) });
    Store.updateMissionProgress();
  }

  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "#b8ecff");
  grd.addColorStop(.56, "#f7fcff");
  grd.addColorStop(.66, "#9ae6a3");
  grd.addColorStop(1, "#68c972");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,.88)";
  for (let i = 0; i < 6; i++) {
    const x = (i * 230 - frame * 0.28) % (canvas.width + 180);
    const y = 70 + (i % 3) * 38;
    ctx.beginPath();
    ctx.arc(x + 40, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 75, y - 6, 38, 0, Math.PI * 2);
    ctx.arc(x + 115, y, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // distant city shapes
  ctx.fillStyle = "rgba(6,44,67,.08)";
  for (let i = 0; i < 10; i++) {
    const x = (i * 130 - frame * 0.18) % (canvas.width + 120);
    const h = 45 + (i % 4) * 18;
    ctx.fillRect(x, ground - h - 8, 62, h);
  }

  ctx.fillStyle = "#3c9b49";
  ctx.fillRect(0, ground, canvas.width, 9);

  ctx.fillStyle = "rgba(6,44,67,.07)";
  for (let x = 0; x < canvas.width; x += 70) {
    ctx.fillRect((x - frame * speed * 0.35) % canvas.width, ground + 24, 36, 5);
  }

  // soft screen gloss
  ctx.fillStyle = "rgba(255,255,255,.035)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  ctx.save();
  ctx.globalAlpha = invisible ? 0.48 : 1;

  ctx.fillStyle = "rgba(6,44,67,.20)";
  ctx.beginPath();
  ctx.ellipse(player.x + player.w / 2, ground + 9, player.w * .78, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (nobitaSprite.complete && nobitaSprite.naturalWidth > 0) {
    const bob = Math.sin(frame * .18) * 2;
    ctx.drawImage(nobitaSprite, player.x - 20, player.y - 44 + bob, player.w + 40, player.h + 56);
  } else {
    // Fallback Nobita-style drawing if the online image is blocked.
    ctx.fillStyle = "#facc15";
    roundRect(player.x, player.y, player.w, player.h, 14);
    ctx.fill();
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(player.x + 6, player.y + player.h * .55, player.w - 12, player.h * .36);
    ctx.fillStyle = "#fee2b7";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y - 12, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2 - 8, player.y - 16, 8, 0, Math.PI * 2);
    ctx.arc(player.x + player.w / 2 + 10, player.y - 16, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.fillRect(player.x + 5, player.y - 38, player.w - 10, 13);
  }

  if (player.fly) {
    ctx.fillStyle = "#ffd23f";
    roundRect(player.x + 2, player.y - 62, player.w + 8, 8, 5);
    ctx.fill();
    ctx.fillRect(player.x + player.w / 2 - 3, player.y - 58, 6, 32);
    ctx.fillStyle = "rgba(255,210,63,.32)";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 58, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player.grow || player.shrink || invisible) {
    ctx.strokeStyle = player.grow ? "#f97316" : player.shrink ? "#38bdf8" : "#8b5cf6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 54, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObjects() {
  obstacles.forEach(o => {
    ctx.fillStyle = "rgba(6,44,67,.18)";
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, ground + 8, o.w * .7, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = o.color;
    roundRect(o.x, o.y, o.w, o.h, 11);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(o.name, o.x + o.w / 2, o.y - 8);
  });

  comicItems.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.sin(c.spin) * .12);
    ctx.fillStyle = "#fff7ed";
    roundRect(-16, -20, 32, 40, 7);
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#f97316";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📘", 0, 2);
    ctx.restore();
  });

  gadgetItems.forEach(g => {
    const pulse = Math.sin(g.pulse) * 3;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(g.x, g.y, g.r + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#08a8f4";
    ctx.stroke();
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(GadgetDB.icon(g.gadget.type), g.x, g.y);
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  floatingTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.life / 55);
    ctx.fillStyle = t.color;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

function drawOverlayText(title, subtitle, buttonHint = "") {
  ctx.fillStyle = "rgba(6,44,67,.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,.12)";
  roundRect(canvas.width / 2 - 250, 150, 500, 190, 30);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillText(title, canvas.width / 2, 220);
  ctx.font = "22px Arial";
  ctx.fillText(subtitle, canvas.width / 2, 263);

  if (buttonHint) {
    ctx.font = "bold 18px Arial";
    ctx.fillText(buttonHint, canvas.width / 2, 302);
  }
}

function drawPausedOverlay() {
  ctx.fillStyle = "rgba(6,44,67,.50)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "bold 44px Arial";
  ctx.fillText("Game Paused", canvas.width / 2, 230);
  ctx.font = "20px Arial";
  ctx.fillText("Choose a gadget from the pocket to continue.", canvas.width / 2, 266);
}

function draw() {
  drawBackground();
  drawPlayer();
  drawObjects();
  drawParticles();

  if (isPaused) drawPausedOverlay();
}

function loop() {
  if (!running) return;

  if (!isPaused) {
    update();
  } else {
    updateParticles();
  }

  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  isPaused = false;
  setGameState("gameover");
  Store.saveScore(Math.floor(score), comics);
  draw();
  drawOverlayText("Mission Failed", `Score ${Math.floor(score)} · Comics ${comics}`, "Score saved to leaderboard");
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

window.gameUseGadget = function(id) {
  const gadget = GadgetDB.use(id);
  if (!gadget) return;
  closePocketModal();

  activePower = gadget.name;
  toast(`${gadget.name} activated`);

  if (gadget.type === "teleport") {
    player.x = Math.min(canvas.width - player.w - 50, player.x + 230);
    obstacles.forEach(o => o.x -= 120);
    score += 50;
    addParticles(player.x, player.y + player.h / 2, "#08a8f4", 26);
    activePower = "Anywhere Door";
    setTimeout(() => activePower = "None", 1200);
  }

  if (gadget.type === "fly") {
    player.fly = true;
    addParticles(player.x + player.w / 2, player.y, "#ffd23f", 24);
    setTimeout(() => {
      player.fly = false;
      activePower = "None";
    }, 5500);
  }

  if (gadget.type === "shrink") {
    player.shrink = true;
    player.w = 36;
    player.h = 48;
    addParticles(player.x + player.w / 2, player.y + player.h / 2, "#38bdf8", 22);
    setTimeout(() => {
      player.shrink = false;
      player.w = 52;
      player.h = 72;
      activePower = "None";
    }, 5500);
  }

  if (gadget.type === "grow") {
    player.grow = true;
    player.w = 72;
    player.h = 96;
    addParticles(player.x + player.w / 2, player.y + player.h / 2, "#f97316", 24);
    setTimeout(() => {
      player.grow = false;
      player.w = 52;
      player.h = 72;
      activePower = "None";
    }, 5500);
  }

  if (gadget.type === "slow") {
    const old = speed;
    speed = Math.max(2, speed - 2.7);
    addParticles(canvas.width / 2, canvas.height / 2, "#8b5cf6", 32);
    setTimeout(() => {
      speed = old;
      activePower = "None";
    }, 5500);
  }

  if (gadget.type === "blast") {
    const target = obstacles.shift();
    if (target) {
      addParticles(target.x + target.w / 2, target.y + target.h / 2, "#ef4444", 28);
    }
    score += 80;
    setTimeout(() => activePower = "None", 1000);
  }

  if (gadget.type === "invisible") {
    invisible = true;
    addParticles(player.x + player.w / 2, player.y + player.h / 2, "#8b5cf6", 24);
    setTimeout(() => {
      invisible = false;
      activePower = "None";
    }, 5000);
  }

  if (gadget.type === "magnet") {
    magnetTimer = 520;
    addParticles(player.x + player.w / 2, player.y + player.h / 2, "#08a8f4", 24);
    addFloatingText(player.x, player.y - 20, "Comic Magnet", "#075985");
    setTimeout(() => activePower = "None", 6500);
  }

  if (gadget.type === "heal") {
    lives = Math.min(5, lives + 1);
    score += 40;
    addParticles(player.x + player.w / 2, player.y + player.h / 2, "#22c55e", 24);
    addFloatingText(player.x, player.y - 20, "+1 Life", "#16a34a");
    setTimeout(() => activePower = "None", 1200);
  }

  if (gadget.type === "freeze") {
    freezeTimer = 360;
    addParticles(canvas.width / 2, canvas.height / 2, "#38bdf8", 34);
    addFloatingText(canvas.width / 2, 150, "Enemies Frozen", "#075985");
    setTimeout(() => activePower = "None", 5200);
  }

  if (gadget.type === "bonus") {
    score += 180;
    addFloatingText(player.x, player.y - 20, "+180 Memory", "#f97316");
    setTimeout(() => activePower = "None", 900);
  }

  updateHud();
};

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "p") {
    openPocketModal();
    return;
  }

  if (isPaused) return;

  keys[e.key] = true;
  if (e.code === "Space" || e.key === "ArrowUp") {
    e.preventDefault();
    jump();
  }
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

startBtn.addEventListener("click", resetGame);
openPocket.addEventListener("click", openPocketModal);
closePocket.addEventListener("click", closePocketModal);

setGameState("menu");
draw();
drawOverlayText("Nobita’s Rescue Mission", "Collect comics, unlock gadgets, avoid trouble", "Click Start / Restart to begin");
