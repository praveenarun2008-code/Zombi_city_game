(() => {
  // ========== DOM ELEMENTS ==========
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('scoreValue');
  const distanceEl = document.getElementById('distanceValue');
  const levelEl = document.getElementById('levelValue');
  const targetEl = document.getElementById('targetValue');
  const coinEl = document.getElementById('coinValue');
  const healthFillEl = document.getElementById('healthFill');
  const statusTextEl = document.getElementById('statusText');


  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
  const levelOneWinOverlay = document.getElementById('levelOneWinOverlay');
  const finalScoreEl = document.getElementById('finalScoreValue');
  const finalHighScoreEl = document.getElementById('finalHighScoreValue');
  const completedLevelEl = document.getElementById('completedLevelValue');
  const levelDistanceEl = document.getElementById('levelDistanceValue');
  const levelScoreEl = document.getElementById('levelScoreValue');
  const winDistanceEl = document.getElementById('winDistanceValue');
  const winScoreEl = document.getElementById('winScoreValue');
  const restartButton = document.getElementById('restartButton');
  const nextLevelButton = document.getElementById('nextLevelButton');
  const winNextLevelButton = document.getElementById('winNextLevelButton');
  const backToMenuButton = document.getElementById('backToMenuButton');
  const winBackToMenuButton = document.getElementById('winBackToMenuButton');

// const pauseOverlay = document.getElementById('pauseOverlay');
// const gameOverOverlay = documnet.getElementById('gameOverOverlay');
// const levelCompletedOverlay = document.getElementById('levelCompletedOverlay');
// const levelOneWinOverlay = document.getElementById('levelOneWinOverlay');
// const finalScoreEl = document.getElementById('finalScoreValue');
// const completedLevelEl = document.getElementById('completedLevelValue');
// const levelDistanceEl = document.getElementById('levelDistancevAkue');
// const levelScoreEl = document.getElementById('levelScoreValue');
// const winDistanceEl = documnet.getElementById('winDistanceValue');
// const restartButton = docment.getElementById('restartButton');
// const nextLevelButton = document.getElementById('nextLevelButton');
// const winNextlevelButton = document.getElementById('winNextlevelButton');
// const backToMenuButton = document.getElementById('backToMenuButton');
// const winBackTomenuButton = document.getElementById('winbackToMenu');






  // ========== WORLD SETUP ==========
  const world = {
    width: canvas.width,
    height: canvas.height,
    groundY: canvas.height - 120
  };

  // ========== PHYSICS CONSTANTS ==========
  const GRAVITY = 2400;
  const JUMP_FORCE = -1250;
  const PLAYER_X = 190;
  const MAX_DELTA_TIME = 0.035; // Cap delta to prevent huge jumps
  const COYOTE_TIME = 0.12;
  const JUMP_BUFFER_TIME = 0.12;

  // ========== LEVEL CONFIGURATION ==========
  const LEVEL_TARGETS = {
    1: 1200,
    2: 3000,
    3: 7000,
    4: 12000,
    5: 18000,
    6: 21000,
    7: 27000,
    8: 32000,
    9: 42000,
    10: 50000
  };

  function getStartLevelFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get('level'));

    if (!Number.isFinite(raw)) {
      return 1;
    }

    const level = Math.floor(raw);
    if (level < 1) {
      return 1;
    }
    if (level > 10) {
      return 10;
    }
    return level;
  }

  let highScore = Number(localStorage.getItem('zce_high_score') || 0);

  // ========== GAME STATE ==========
  const gameState = {
    running: true,
    paused: false,
    gameOver: false,
    levelComplete: false,
    currentLevel: 1,
    levelTarget: LEVEL_TARGETS[1],
    elapsed: 0,
    score: 0,
    distance: 0,
    coins: 0,
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
    hitFlashTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0
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
    coinEl.textContent = gameState.coins;
    levelEl.textContent = gameState.currentLevel;
    targetEl.textContent = Math.floor(gameState.levelTarget);

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

    if (player.onGround) {
      player.coyoteTimer = COYOTE_TIME;
    } else {
      player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);
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

    if (player.jumpBufferTimer > 0) {
      player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - delta);
      attemptJump();
    }
  }

  function attemptJump() {
    if (!gameState.running || gameState.paused || gameState.gameOver) {
      return;
    }

    if (!player.onGround && player.coyoteTimer <= 0) {
      return;
    }

    if (player.isSliding) {
      endSlide();
    }

    player.onGround = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.velocityY = JUMP_FORCE;
    playSfx('jump');
  }

  function jump() {
    if (!gameState.running || gameState.paused || gameState.gameOver) {
      return;
    }

    player.jumpBufferTimer = JUMP_BUFFER_TIME;
    attemptJump();
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
        const healthBonus = randInt(10, 15);
        gameState.score += 40;
        gameState.coins += 1;
        gameState.health = Math.min(100, gameState.health + healthBonus);
        spawnExplosionAt(coin.x, coin.y);
        coins.splice(i, 1);
        setMessage(`💰 Coin collected +40, +${healthBonus} health`);
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

    // Check if level target reached
    if (gameState.distance >= gameState.levelTarget && !gameState.levelComplete) {
      triggerLevelComplete();
    }
  }

  // ========== GAME STATE MANAGEMENT ==========
  function triggerLevelComplete() {
    gameState.running = false;
    gameState.levelComplete = true;
    gameState.paused = false;

    playSfx('powerup');

    completedLevelEl.textContent = String(gameState.currentLevel);
    levelDistanceEl.textContent = String(Math.floor(gameState.distance));
    levelScoreEl.textContent = String(Math.floor(gameState.score));
    winDistanceEl.textContent = String(Math.floor(gameState.distance));
    winScoreEl.textContent = String(Math.floor(gameState.score));

    if (gameState.currentLevel === 1) {
      levelOneWinOverlay.classList.remove('hidden');
      levelCompleteOverlay.classList.add('hidden');
    } else {
      levelCompleteOverlay.classList.remove('hidden');
      levelOneWinOverlay.classList.add('hidden');
    }
    pauseOverlay.classList.add('hidden');

    if (gameState.currentLevel === 1) {
      setMessage('You win! Level 1 complete.');
    } else {
      setMessage(`Level ${gameState.currentLevel} Complete!`);
    }
    updateHud();
  }

  function advanceLevel() {
    if (gameState.currentLevel >= 10) {
      // Max level reached
      setMessage('🏆 All Levels Complete! You are a legend!');
      triggerGameOver();
      return;
    }

    gameState.currentLevel += 1;
    gameState.levelTarget = LEVEL_TARGETS[gameState.currentLevel] || 100000;
    gameState.levelComplete = false;
    gameState.running = true;
    gameState.paused = false;
    gameState.elapsed = 0;
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
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;

    obstacles.length = 0;
    coins.length = 0;
    powerups.length = 0;
    explosions.length = 0;

    levelCompleteOverlay.classList.add('hidden');
    levelOneWinOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    setMessage(`Level ${gameState.currentLevel} - Target: ${Math.floor(gameState.levelTarget)}m`);
    updateHud();
  }

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
    localStorage.setItem('zce_last_score', String(Math.floor(gameState.score)));

    finalScoreEl.textContent = String(Math.floor(gameState.score));
    finalHighScoreEl.textContent = String(highScore);
    gameOverOverlay.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');

    setMessage('You were overrun. Press R to restart.');
    updateHud();
  }

  function togglePause() {
    if (gameState.gameOver || gameState.levelComplete) {
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

  function restartGame(levelOverride) {
    const level = Number(levelOverride) || 1;

    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.levelComplete = false;
    gameState.currentLevel = level;
    gameState.levelTarget = LEVEL_TARGETS[level] || 100000;
    gameState.elapsed = 0;
    gameState.score = 0;
    gameState.distance = 0;
    gameState.coins = 0;
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
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;

    obstacles.length = 0;
    coins.length = 0;
    powerups.length = 0;
    explosions.length = 0;

    gameOverOverlay.classList.add('hidden');
    levelCompleteOverlay.classList.add('hidden');
    levelOneWinOverlay.classList.add('hidden');
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

    const t = gameState.elapsed;
    const bob = player.onGround ? Math.sin(t * 10) * 2 : 0;
    const swing = player.onGround && !player.isSliding ? Math.sin(t * 12) * 0.55 : Math.sin(t * 6) * 0.2;
    const lean = player.velocityY < -50 ? -0.12 : player.velocityY > 120 ? 0.1 : 0;

    const colors = {
      skin: flash ? '#ff7b8a' : '#7cd9a8',
      skinDark: flash ? '#c54a57' : '#4f8f6d',
      hood: flash ? '#a66d77' : '#6f806a',
      hoodDark: flash ? '#7c4a53' : '#556352',
      shirt: flash ? '#ffe0c0' : '#e2cfa4',
      shirtDark: flash ? '#c9a47f' : '#c5ad7d',
      pants: flash ? '#e0a371' : '#b97745',
      pantsDark: flash ? '#b57c52' : '#915736',
      shoe: '#463126',
      eyeWhite: '#f4f7f5',
      eyeDark: '#232a27',
      mouth: '#d3473b',
      teeth: '#f7f4e9',
      outline: '#252b28',
      shadow: 'rgba(0, 0, 0, 0.25)'
    };

    const w = player.width;
    const h = player.height;
    const u = w / 64;
    const v = h / 108;
    const sx = (x) => x * u;
    const sy = (y) => y * v;

    ctx.save();
    ctx.translate(player.x + w / 2, player.y + h / 2 + bob);
    ctx.rotate(lean);
    ctx.translate(-w / 2, -h / 2);

    // Ground shadow
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(w / 2, h - sy(6), sx(18), sy(4), 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    if (player.isSliding) {
      ctx.fillStyle = colors.pants;
      ctx.fillRect(sx(18), sy(80), sx(28), sy(14));
      ctx.fillStyle = colors.shoe;
      ctx.fillRect(sx(16), sy(90), sx(32), sy(8));
    } else {
      const hipY = sy(72);
      const legLen = sy(26);
      const legW = sx(10);
      const leftX = sx(26);
      const rightX = sx(38);

      const drawLeg = (x, angle) => {
        ctx.save();
        ctx.translate(x, hipY);
        ctx.rotate(angle);
        ctx.fillStyle = colors.pants;
        ctx.fillRect(-legW / 2, 0, legW, legLen);
        ctx.fillStyle = colors.shoe;
        ctx.fillRect(-legW / 2 - sx(3), legLen - sy(2), legW + sx(8), sy(8));
        ctx.restore();
      };

      drawLeg(leftX, swing * 0.55);
      drawLeg(rightX, -swing * 0.55);
    }

    // Back arm
    const shoulderY = sy(58);
    const shoulderX = sx(14);
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(-0.4 + swing * 0.4);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(0, 0, sx(8), sy(26));
    ctx.fillStyle = colors.skinDark;
    ctx.fillRect(-sx(2), sy(20), sx(12), sy(8));
    ctx.restore();

    // Torso (tattered shirt)
    ctx.fillStyle = colors.shirt;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(14), sy(54));
    ctx.lineTo(sx(50), sy(54));
    ctx.lineTo(sx(56), sy(82));
    ctx.lineTo(sx(44), sy(92));
    ctx.lineTo(sx(36), sy(86));
    ctx.lineTo(sx(26), sy(96));
    ctx.lineTo(sx(12), sy(84));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front arm with simple hand
    ctx.save();
    ctx.translate(sx(48), shoulderY);
    ctx.rotate(0.4 + swing * 0.5);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(0, 0, sx(8), sy(28));
    ctx.fillStyle = colors.skinDark;
    ctx.fillRect(-sx(2), sy(22), sx(12), sy(8));
    ctx.fillStyle = colors.skinDark;
    ctx.fillRect(sx(6), sy(24), sx(8), sy(4));
    ctx.fillRect(sx(6), sy(18), sx(7), sy(4));
    ctx.fillRect(sx(6), sy(12), sx(6), sy(4));
    ctx.restore();

    // Head hood
    ctx.fillStyle = colors.hood;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(14), sy(8));
    ctx.lineTo(sx(50), sy(6));
    ctx.lineTo(sx(58), sy(18));
    ctx.lineTo(sx(58), sy(50));
    ctx.lineTo(sx(48), sy(60));
    ctx.lineTo(sx(20), sy(60));
    ctx.lineTo(sx(8), sy(26));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Face
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.moveTo(sx(20), sy(22));
    ctx.lineTo(sx(48), sy(20));
    ctx.lineTo(sx(50), sy(50));
    ctx.lineTo(sx(22), sy(54));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = colors.eyeWhite;
    ctx.beginPath();
    ctx.arc(sx(28), sy(32), sx(7), 0, Math.PI * 2);
    ctx.arc(sx(44), sy(30), sx(8), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.eyeDark;
    ctx.beginPath();
    ctx.arc(sx(30), sy(34), sx(2.6), 0, Math.PI * 2);
    ctx.arc(sx(46), sy(32), sx(2.8), 0, Math.PI * 2);
    ctx.fill();

    // Mouth + teeth
    ctx.fillStyle = colors.mouth;
    ctx.beginPath();
    ctx.moveTo(sx(28), sy(44));
    ctx.lineTo(sx(48), sy(42));
    ctx.lineTo(sx(46), sy(56));
    ctx.lineTo(sx(30), sy(56));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.teeth;
    ctx.fillRect(sx(32), sy(46), sx(4), sy(6));
    ctx.fillRect(sx(38), sy(46), sx(4), sy(6));
    ctx.fillRect(sx(44), sy(45), sx(3), sy(6));

    // Hood rim
    ctx.fillStyle = colors.hoodDark;
    ctx.beginPath();
    ctx.moveTo(sx(16), sy(10));
    ctx.lineTo(sx(46), sy(8));
    ctx.lineTo(sx(40), sy(16));
    ctx.lineTo(sx(18), sy(18));
    ctx.closePath();
    ctx.fill();

    ctx.restore();

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


  // if(ob.type === 'boss'){
  //   ctx.fillStyle = '#4f5d56';
  //   ctx.fillReact(ob.x +36,ob.y+24,ob.width -72, ob.height-24);

  //   ctx.fillstyle = '#8db0a5';
  //   ctx.beginPath();
  //   ctx.arc(ob.x + ob.width /2, ob.y+28,28,0,Math.PI *2);
  //   ctx.fill();

  //   ctx.fillstyle = '#ff4f5e';
  //   ctx,fillReact(ob.x + 60, ob.y +26,10,7);
  //   ctx.fillReact(ob.x + ob.width -70, ob.y +26,10,7);

  //   ctx.fillStyle = 'rgba(144, 216, 169, 0.22)';
  //   ctx.fillRect(ob.x, ob.y + ob.height -12, ob.width, 12); 

  // }

  

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
    if (!gameState.running || gameState.paused || gameState.gameOver || gameState.levelComplete) {
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
    }
  }

  // ========== INPUT HANDLING ==========
  document.addEventListener('keydown', (event) => {
    // Prevent page scroll for arrow keys
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    if (event.repeat && event.key.toLowerCase() !== 'p') {
      return;
    }

    if (event.key === 'ArrowUp') {
      jump();
    }

    if (event.key === 'ArrowDown') {
      startSlide();
    }

    if (event.key.toLowerCase() === 'p') {
      togglePause();
    }

    if (event.key.toLowerCase() === 'r' && gameState.gameOver) {
      restartGame(gameState.currentLevel);
    }

    if (event.key.toLowerCase() === 'n' && gameState.levelComplete) {
      advanceLevel();
    }
  });

  canvas.addEventListener('click', (event) => {
    if (gameState.gameOver) {
      restartGame(gameState.currentLevel);
    } else if (gameState.levelComplete) {
      advanceLevel();
    }
  });

  restartButton.addEventListener('click', () => restartGame(gameState.currentLevel));
  nextLevelButton.addEventListener('click', advanceLevel);
  winNextLevelButton.addEventListener('click', advanceLevel);
  backToMenuButton.addEventListener('click', () => {
    window.location.href = './menu.html';
  });
  winBackToMenuButton.addEventListener('click', () => {
    window.location.href = './menu.html';
  });

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
  restartGame(getStartLevelFromUrl());
  requestAnimationFrame(loop);
})();





