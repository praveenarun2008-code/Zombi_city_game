(() => {
  
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('scoreValue');
  const distanceEl = document.getElementById('distanceValue');
  const highScoreEl = document.getElementById('highScoreValue');
  const speedLevelEl = document.getElementById('speedLevelValue');
  const healthFillEl = document.getElementById('healthFill');
  const statusTextEl = document.getElementById('statusText');



  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreEl = document.getElementById('finalScoreValue');
  const finalHighScoreEl = document.getElementById('finalHighScoreValue');
  const restartButton = document.getElementById('restartButton');

  



  
  // ========== WORLD SETUP ==========
  const world = {
    width: canvas.width,
    height: canvas.height,
    groundY: canvas.height - 120
  };

  // ========== PHYSICS CONSTANTS ==========
  const GRAVITY = 1900;
  const JUMP_FORCE = -1300;
  const PLAYER_X = 190;
  const MAX_DELTA_TIME = 0.035; // Cap delta to prevent huge jumps

  let highScore = Number(localStorage.getItem('zce_high_score') || 0);

  // ========== GAME STATE ==========
  const gameState = {
    running: true,
    paused: false,
    gameOver: false,
    elapsed: 0,
    score: 0,
    distance: 0,
    health: 100,
    speedLevel: 1,
    baseSpeed: 285,
    obstacleTimer: 0,
    coinTimer: 0,
    powerupTimer: 0,
    shieldTimer: 0,
    slowTimer: 0,
    bossNextAt: 1000,
    bossActive: false,
    message: 'Run for your life...'
  };

  // ========== PLAYER STATE ==========
  const player = {
    x: PLAYER_X,
    y: world.groundY - 108,
    width: 64,
    height: 108,
    standingHeight: 108,
    slidingHeight: 64,
    velocityY: 0,
    isSliding: false,
    slideTimer: 0,
    onGround: true,
    hitFlashTimer: 0
  };

  // ========== ENTITY ARRAYS ==========
  const obstacles = [];
  const coins = [];
  const powerups = [];
  const explosions = [];
  const skylineBuildings = [];
  const nearBuildings = [];

  // ========== UTILITY FUNCTIONS ==========
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  // ========== AUDIO SYSTEM ==========
  function playSfx(kind) {
    // Web Audio API synthetic sound effects
    if (!window.AudioContext) {
      return;
    }

    const soundMap = {
      coin: 800,
      jump: 500,
      hit: 160,
      powerup: 980,
      boss: 120,
      gameover: 90
    };

    const frequency = soundMap[kind] || 600;
    const duration = kind === 'boss' ? 0.18 : 0.08;

    if (!playSfx.ctx) {
      playSfx.ctx = new window.AudioContext();
    }

    const context = playSfx.ctx;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.03;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  // ========== MESSAGE/HUD SYSTEM ==========
  function setMessage(text) {
    gameState.message = text;
    statusTextEl.textContent = text;
  }

  function updateHud() {
    scoreEl.textContent = Math.floor(gameState.score);
    distanceEl.textContent = Math.floor(gameState.distance);
    highScoreEl.textContent = Math.floor(highScore);
    speedLevelEl.textContent = gameState.speedLevel;

    healthFillEl.style.width = `${Math.max(0, gameState.health)}%`;

    if (gameState.health > 60) {
      healthFillEl.style.background = 'linear-gradient(90deg, #2cff89, #8effaf)';
    } else if (gameState.health > 30) {
      healthFillEl.style.background = 'linear-gradient(90deg, #ffdf54, #ffad54)';
    } else {
      healthFillEl.style.background = 'linear-gradient(90deg, #ff5f73, #ff7d6e)';
    }
  }

  // ========== BUILDING GENERATION ==========
  function createBuildingLayer(target, count, minWidth, maxWidth, minHeight, maxHeight, baseY) {
    target.length = 0;

    let cursor = -40;
    for (let i = 0; i < count; i += 1) {
      const width = randInt(minWidth, maxWidth);
      const height = randInt(minHeight, maxHeight);
      const gap = randInt(28, 100);

      target.push({
        x: cursor,
        width,
        height,
        y: baseY - height,
        brokenTop: randInt(4, 18)
      });

      cursor += width + gap;
    }
  }

  function initScene() {
    createBuildingLayer(skylineBuildings, 20, 70, 180, 120, 290, world.groundY - 10);
    createBuildingLayer(nearBuildings, 16, 120, 230, 100, 200, world.groundY + 4);
  }

  // ========== SPEED & DIFFICULTY ==========
  function getGameSpeed() {
    const slowMultiplier = gameState.slowTimer > 0 ? 0.55 : 1;
    return gameState.baseSpeed * slowMultiplier;
  }

  function updateBuildingLayer(layer, speedFactor, delta) {
    const speed = getGameSpeed() * speedFactor;

    for (let i = 0; i < layer.length; i += 1) {
      const b = layer[i];
      b.x -= speed * delta;
    }

    let farthest = Math.max(...layer.map((item) => item.x + item.width));

    for (let i = 0; i < layer.length; i += 1) {
      const b = layer[i];
      if (b.x + b.width < -60) {
        const width = randInt(70, 220);
        const height = randInt(90, 300);
        b.x = farthest + randInt(28, 120);
        b.width = width;
        b.height = height;
        b.y = world.groundY - height + randInt(-10, 30);
        b.brokenTop = randInt(4, 18);
        farthest = b.x + width;
      }
    }
  }

  // ========== OBSTACLE SPAWNING ==========
  function spawnObstacle(typeOverride) {
    const type = typeOverride || chooseObstacleType();

    let x = world.width + randInt(120, 340);
    if (obstacles.length > 0) {
      const rightMost = Math.max(...obstacles.map((ob) => ob.x + ob.width));
      const minGap = randInt(230, 320) + gameState.speedLevel * 20;
      x = Math.max(x, rightMost + minGap);
    }
    const common = {
      x,
      hit: false
    };

    if (type === 'car') {
      obstacles.push({
        ...common,
        type,
        width: 122,
        height: 64,
        y: world.groundY - 64,
        damage: randInt(12, 18)
      });
      return;
    }

    if (type === 'hangingSign') {
      obstacles.push({
        ...common,
        type,
        width: 102,
        height: 88,
        y: world.groundY - 168,
        damage: randInt(12, 20)
      });
      return;
    }

    if (type === 'firePit') {
      obstacles.push({
        ...common,
        type,
        width: 116,
        height: 30,
        y: world.groundY - 30,
        damage: randInt(14, 22)
      });
      return;
    }

    if (type === 'boss') {
      obstacles.push({
        ...common,
        type,
        width: 148,
        height: 170,
        y: world.groundY - 170,
        damage: 34
      });
    }
  }

  function chooseObstacleType() {
    const roll = Math.random();

    if (roll < 0.44) {
      return 'car';
    }

    if (roll < 0.8) {
      return 'hangingSign';
    }

    return 'firePit';
  }

  function obstacleSpawnInterval() {
    const levelFactor = Math.max(0.8, 1 - (gameState.speedLevel - 1) * 0.055);
    const min = 2.2 * levelFactor;
    const max = 3.8 * levelFactor;
    return rand(min, max);
  }

  // ========== COIN SPAWNING ==========
  function spawnCoin() {
    coins.push({
      x: world.width + randInt(60, 260),
      y: world.groundY - randInt(90, 240),
      radius: 14,
      wobble: rand(0, Math.PI * 2)
    });
  }

  // ========== POWERUP SPAWNING ==========
  function spawnPowerup() {
    const type = Math.random() < 0.5 ? 'shield' : 'slow';

    powerups.push({
      type,
      x: world.width + randInt(60, 220),
      y: world.groundY - randInt(120, 240),
      size: 30,
      pulse: rand(0, Math.PI * 2)
    });
  }

  function spawnBossIfNeeded() {
    if (gameState.bossActive) {
      return;
    }

    if (gameState.score >= gameState.bossNextAt) {
      gameState.bossActive = true;
      gameState.bossNextAt += 1000;
      spawnObstacle('boss');
      playSfx('boss');
      setMessage('🧟 Boss Zombie incoming!');
    }
  }

  // ========== PLAYER MOVEMENT ==========
  function updatePlayer(delta) {
    if (!player.onGround) {
      player.velocityY += GRAVITY * delta;
      player.y += player.velocityY * delta;

      if (player.y >= world.groundY - player.height) {
        player.y = world.groundY - player.height;
        player.velocityY = 0;
        player.onGround = true;
      }
    }

    if (player.isSliding) {
      player.slideTimer -= delta;
      if (player.slideTimer <= 0) {
        endSlide();
      }
    }

    if (player.hitFlashTimer > 0) {
      player.hitFlashTimer -= delta;
    }
  }

  function jump() {
    if (!gameState.running || gameState.paused || gameState.gameOver) {
      return;
    }

    if (!player.onGround) {
      return;
    }

    if (player.isSliding) {
      endSlide();
    }

    player.onGround = false;
    player.velocityY = JUMP_FORCE;
    playSfx('jump');
  }

  function startSlide() {
    if (!gameState.running || gameState.paused || gameState.gameOver) {
      return;
    }

    if (!player.onGround || player.isSliding) {
      return;
    }

    player.isSliding = true;
    player.slideTimer = 0.75;

    player.height = player.slidingHeight;
    player.y = world.groundY - player.height;
  }

  function endSlide() {
    if (!player.isSliding) {
      return;
    }

    player.isSliding = false;
    player.height = player.standingHeight;
    player.y = world.groundY - player.height;
  }

  // ========== COLLISION DETECTION ==========
  function playerRect() {
    return {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };
  }

  function intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function obstacleRect(ob) {
    return {
      x: ob.x,
      y: ob.y,
      width: ob.width,
      height: ob.height
    };
  }

  // ========== DAMAGE & POWERUPS ==========
  function hurtPlayer(damage) {
    if (gameState.shieldTimer > 0) {
      setMessage('🛡️ Shield absorbed the hit!');
      return;
    }

    gameState.health = Math.max(0, gameState.health - damage);
    player.hitFlashTimer = 0.2;
    spawnExplosionAt(player.x + player.width / 2, player.y + player.height / 2);
    playSfx('hit');
    setMessage(`💥 Hit! -${damage} health`);

    if (gameState.health <= 0) {
      triggerGameOver();
    }
  }

  function applyPowerup(type) {
    if (type === 'shield') {
      gameState.shieldTimer = 6;
      setMessage('🛡️ Shield activated for 6s');
    } else {
      gameState.slowTimer = 5;
      setMessage('⏱️ Slow motion enabled for 5s');
    }
    playSfx('powerup');
  }

  // ========== ENTITY UPDATES ==========
  function updateEntities(delta) {
    const speed = getGameSpeed();

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const ob = obstacles[i];
      ob.x -= speed * delta;

      if (ob.type === 'boss' && ob.x + ob.width < 0) {
        gameState.bossActive = false;
      }

      if (ob.x + ob.width < -60) {
        obstacles.splice(i, 1);
        continue;
      }

      if (intersects(playerRect(), obstacleRect(ob))) {
        spawnExplosionAt(ob.x + ob.width / 2, ob.y + ob.height / 2);
        hurtPlayer(ob.damage);

        if (ob.type === 'boss') {
          gameState.bossActive = false;
        }

        obstacles.splice(i, 1);
      }
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i -= 1) {
      const coin = coins[i];
      coin.x -= speed * delta;
      coin.wobble += delta * 8;

      if (coin.x + coin.radius < -30) {
        coins.splice(i, 1);
        continue;
      }

      const rect = {
        x: coin.x - coin.radius,
        y: coin.y - coin.radius,
        width: coin.radius * 2,
        height: coin.radius * 2
      };

      if (intersects(playerRect(), rect)) {
        gameState.score += 40;
        spawnExplosionAt(coin.x, coin.y);
        coins.splice(i, 1);
        setMessage('💰 Coin collected +40');
        playSfx('coin');
      }
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i -= 1) {
      const p = powerups[i];
      p.x -= speed * delta;
      p.pulse += delta * 6;

      if (p.x + p.size < -30) {
        powerups.splice(i, 1);
        continue;
      }

      const rect = {
        x: p.x - p.size / 2,
        y: p.y - p.size / 2,
        width: p.size,
        height: p.size
      };

      if (intersects(playerRect(), rect)) {
        applyPowerup(p.type);
        powerups.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      explosions[i].life -= delta;
      if (explosions[i].life <= 0) {
        explosions.splice(i, 1);
      }
    }
  }

  function updateSpawners(delta) {
    gameState.obstacleTimer -= delta;
    gameState.coinTimer -= delta;
    gameState.powerupTimer -= delta;

    if (gameState.obstacleTimer <= 0) {
      spawnObstacle();
      gameState.obstacleTimer = obstacleSpawnInterval();
    }

    if (gameState.coinTimer <= 0) {
      spawnCoin();
      gameState.coinTimer = rand(1.4, 2.8);
    }

    if (gameState.powerupTimer <= 0) {
      spawnPowerup();
      gameState.powerupTimer = rand(10, 16);
    }

    spawnBossIfNeeded();
  }

  function updateGameProgress(delta) {
    gameState.elapsed += delta;

    gameState.speedLevel = 1 + Math.floor(gameState.elapsed / 30);
    gameState.baseSpeed = 285 + (gameState.speedLevel - 1) * 32;

    if (gameState.shieldTimer > 0) {
      gameState.shieldTimer -= delta;
      if (gameState.shieldTimer <= 0) {
        setMessage('Shield faded');
      }
    }

    if (gameState.slowTimer > 0) {
      gameState.slowTimer -= delta;
      if (gameState.slowTimer <= 0) {
        setMessage('Slow motion ended');
      }
    }

    gameState.distance += getGameSpeed() * delta * 0.05;
    gameState.score += delta * 16;
  }

  // ========== GAME STATE MANAGEMENT ==========
  function triggerGameOver() {
    if (gameState.gameOver) {
      return;
    }

    gameState.running = false;
    gameState.gameOver = true;
    gameState.paused = false;

    playSfx('gameover');

    highScore = Math.max(highScore, Math.floor(gameState.score));
    localStorage.setItem('zce_high_score', String(highScore));

    finalScoreEl.textContent = String(Math.floor(gameState.score));
    finalHighScoreEl.textContent = String(highScore);
    gameOverOverlay.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');

    setMessage('You were overrun. Press R to restart.');
    updateHud();
  }

  function togglePause() {
    if (gameState.gameOver) {
      return;
    }

    gameState.paused = !gameState.paused;

    if (gameState.paused) {
      pauseOverlay.classList.remove('hidden');
      setMessage('⏸️ Paused');
    } else {
      pauseOverlay.classList.add('hidden');
      setMessage('Back in the run...');
    }
  }

  function restartGame() {
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.elapsed = 0;
    gameState.score = 0;
    gameState.distance = 0;
    gameState.health = 100;
    gameState.speedLevel = 1;
    gameState.baseSpeed = 285;
    gameState.obstacleTimer = rand(1.0, 2.0);
    gameState.coinTimer = rand(1.2, 2.2);
    gameState.powerupTimer = rand(7, 10);
    gameState.shieldTimer = 0;
    gameState.slowTimer = 0;
    gameState.bossNextAt = 1000;
    gameState.bossActive = false;

    player.y = world.groundY - player.standingHeight;
    player.height = player.standingHeight;
    player.velocityY = 0;
    player.onGround = true;
    player.isSliding = false;
    player.slideTimer = 0;
    player.hitFlashTimer = 0;

    obstacles.length = 0;
    coins.length = 0;
    powerups.length = 0;
    explosions.length = 0;

    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    setMessage('Run for your life...');
    updateHud();
  }

  // ========== DRAWING FUNCTIONS ==========
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, world.height);
    grad.addColorStop(0, '#111722');
    grad.addColorStop(0.5, '#151015');
    grad.addColorStop(1, '#0e130f');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, world.width, world.height);

    // Moon
    ctx.fillStyle = 'rgba(226, 236, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(1020, 110, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBuildingLayer(layer, color, windowColor) {
    ctx.fillStyle = color;

    for (let i = 0; i < layer.length; i += 1) {
      const b = layer[i];
      ctx.fillRect(b.x, b.y, b.width, b.height);

      ctx.fillStyle = 'rgba(15, 15, 15, 0.22)';
      ctx.fillRect(b.x, b.y, b.width, b.brokenTop);

      ctx.fillStyle = windowColor;
      for (let wx = b.x + 10; wx < b.x + b.width - 10; wx += 20) {
        for (let wy = b.y + 10; wy < b.y + b.height - 10; wy += 18) {
          if (Math.random() < 0.13) {
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      ctx.fillStyle = color;
    }
  }

  function drawGround() {
    ctx.fillStyle = '#18211d';
    ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

    // Animated ground line
    ctx.strokeStyle = 'rgba(120, 154, 137, 0.16)';
    ctx.lineWidth = 2;
    for (let x = -40; x < world.width + 60; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x + ((gameState.elapsed * getGameSpeed() * 0.22) % 80), world.groundY + 8);
      ctx.lineTo(x + 30 + ((gameState.elapsed * getGameSpeed() * 0.22) % 80), world.groundY + 8);
      ctx.stroke();
    }
  }

  function drawZombieHands() {
    const handCount = 18;
    const spacing = world.width / handCount;

    for (let i = 0; i < handCount; i += 1) {
      const x = i * spacing + ((gameState.elapsed * 25) % spacing) - 10;
      const y = world.height - 16;
      const h = 22 + Math.sin(gameState.elapsed * 6 + i) * 9;

      ctx.strokeStyle = 'rgba(125, 214, 154, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y - h);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 2, y - h);
      ctx.lineTo(x - 4, y - h - 8);
      ctx.moveTo(x + 2, y - h);
      ctx.lineTo(x + 8, y - h - 7);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const flash = player.hitFlashTimer > 0 && Math.floor(player.hitFlashTimer * 30) % 2 === 0;

    const bodyColor = flash ? '#ff6373' : '#63f79e';
    ctx.fillStyle = bodyColor;

    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#123f25';
    ctx.fillRect(player.x + 12, player.y + 16, player.width - 24, 20);

    if (player.isSliding) {
      ctx.fillStyle = '#0a2617';
      ctx.fillRect(player.x + 10, player.y + player.height - 16, player.width - 14, 8);
    } else {
      ctx.fillStyle = '#0a2617';
      ctx.fillRect(player.x + 6, player.y + player.height - 18, 18, 18);
      ctx.fillRect(player.x + player.width - 24, player.y + player.height - 18, 18, 18);
    }

    // Shield effect
    if (gameState.shieldTimer > 0) {
      const alpha = 0.26 + Math.sin(gameState.elapsed * 9) * 0.08;
      ctx.strokeStyle = `rgba(94, 183, 255, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawObstacle(ob) {
    if (ob.type === 'car') {
      ctx.fillStyle = '#6f7f8d';
      ctx.fillRect(ob.x, ob.y + 18, ob.width, ob.height - 18);
      ctx.fillStyle = '#5f2c2f';
      ctx.fillRect(ob.x + 25, ob.y, ob.width - 45, 28);
      ctx.fillStyle = '#14191f';
      ctx.beginPath();
      ctx.arc(ob.x + 35, ob.y + ob.height, 16, 0, Math.PI * 2);
      ctx.arc(ob.x + ob.width - 35, ob.y + ob.height, 16, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (ob.type === 'hangingSign') {
      ctx.strokeStyle = '#868c89';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.width / 2, 0);
      ctx.lineTo(ob.x + ob.width / 2, ob.y + 18);
      ctx.stroke();

      ctx.fillStyle = '#a58a56';
      ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
      
      // Draw DANGER text
      ctx.fillStyle = '#3a2f16';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DANGER', ob.x + ob.width / 2, ob.y + ob.height / 2);
      return;
    }

    if (ob.type === 'firePit') {
      ctx.fillStyle = '#2a1e16';
      ctx.fillRect(ob.x, ob.y + 20, ob.width, ob.height - 20);

      for (let i = 0; i < 6; i += 1) {
        const flameX = ob.x + 12 + i * 24;
        const flameH = 14 + Math.sin(gameState.elapsed * 9 + i) * 8;

        ctx.fillStyle = i % 2 === 0 ? '#ff7d3b' : '#ff4b3a';
        ctx.beginPath();
        ctx.moveTo(flameX, ob.y + 20);
        ctx.lineTo(flameX + 10, ob.y - flameH);
        ctx.lineTo(flameX + 20, ob.y + 20);
        ctx.fill();
      }
      return;
    }

    if (ob.type === 'boss') {
      ctx.fillStyle = '#4f5d56';
      ctx.fillRect(ob.x + 36, ob.y + 24, ob.width - 72, ob.height - 24);

      ctx.fillStyle = '#8db0a5';
      ctx.beginPath();
      ctx.arc(ob.x + ob.width / 2, ob.y + 28, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff4f5e';
      ctx.fillRect(ob.x + 60, ob.y + 26, 10, 7);
      ctx.fillRect(ob.x + ob.width - 70, ob.y + 26, 10, 7);

      ctx.fillStyle = 'rgba(144, 216, 169, 0.22)';
      ctx.fillRect(ob.x, ob.y + ob.height - 12, ob.width, 12);
    }
  }

  function drawCoin(coin) {
    const pulse = 1 + Math.sin(coin.wobble) * 0.12;
    const r = coin.radius * pulse;

    ctx.fillStyle = '#ffdd57';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ae7f12';
    ctx.fillRect(coin.x - 2, coin.y - 8, 4, 16);
  }

  function drawPowerup(p) {
    const size = p.size * (1 + Math.sin(p.pulse) * 0.1);

    if (p.type === 'shield') {
      ctx.strokeStyle = '#66b8ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath();
    ctx.moveTo(p.x - size / 2, p.y - size / 2);
    ctx.lineTo(p.x - size / 7, p.y - size / 2);
    ctx.lineTo(p.x - size / 3, p.y + size / 2);
    ctx.lineTo(p.x + size / 2, p.y - size / 8);
    ctx.lineTo(p.x + size / 6, p.y - size / 8);
    ctx.lineTo(p.x + size / 3, p.y - size / 2);
    ctx.fill();
  }

  function drawExplosions() {
    for (let i = 0; i < explosions.length; i += 1) {
      const e = explosions[i];
      const radius = 30 * (1 - e.life / e.maxLife);
      const alpha = e.life / e.maxLife;

      ctx.strokeStyle = `rgba(255, 165, 78, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawScene() {
    drawSky();
    drawBuildingLayer(skylineBuildings, '#1f2b32', 'rgba(146, 169, 178, 0.12)');
    drawBuildingLayer(nearBuildings, '#2a3134', 'rgba(192, 219, 203, 0.08)');
    drawGround();

    for (let i = 0; i < obstacles.length; i += 1) {
      drawObstacle(obstacles[i]);
    }

    for (let i = 0; i < coins.length; i += 1) {
      drawCoin(coins[i]);
    }

    for (let i = 0; i < powerups.length; i += 1) {
      drawPowerup(powerups[i]);
    }

    drawExplosions();
    drawPlayer();
    drawZombieHands();
  }

  function spawnExplosionAt(x, y) {
    explosions.push({
      x,
      y,
      life: 0.3,
      maxLife: 0.3
    });
  }

  // ========== GAME UPDATE LOOP ==========
  function update(delta) {
    if (!gameState.running || gameState.paused || gameState.gameOver) {
      return;
    }

    updateGameProgress(delta);
    updateBuildingLayer(skylineBuildings, 0.22, delta);
    updateBuildingLayer(nearBuildings, 0.48, delta);
    updatePlayer(delta);
    updateSpawners(delta);
    updateEntities(delta);
    updateHud();

    if (gameState.score > highScore) {
      highScore = Math.floor(gameState.score);
      highScoreEl.textContent = String(highScore);
    }
  }

  // ========== INPUT HANDLING ==========
  document.addEventListener('keydown', (event) => {
    if (event.repeat && event.key.toLowerCase() !== 'p') {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      jump();
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      startSlide();
    }

    if (event.key.toLowerCase() === 'p') {
      togglePause();
    }

    if (event.key.toLowerCase() === 'r' && gameState.gameOver) {
      restartGame();
    }
  });

  canvas.addEventListener('click', (event) => {
    if (gameState.gameOver) {
      restartGame();
    }
  });

  restartButton.addEventListener('click', restartGame);

  // ========== ANIMATION LOOP ==========
  let lastTime = performance.now();

  function loop(now) {
    const delta = Math.min(MAX_DELTA_TIME, (now - lastTime) / 1000);
    lastTime = now;

    update(delta);
    drawScene();

    requestAnimationFrame(loop);
  }

  // ========== INITIALIZATION ==========
  initScene();
  updateHud();
  setMessage('Run for your life...');
  restartGame();
  requestAnimationFrame(loop);
})();





