import backgroundSource from '../../assets/background_pamplona.png';
import bullSource from '../../assets/sprites/bull-run/sheet-transparent.png';
import obstacleSource from '../../assets/sprites/obstacles/sheet-transparent.png';
import femaleJumpSource from '../../assets/sprites/runner-female-jump/sheet-transparent.png';
import femaleRunSource from '../../assets/sprites/runner-female-run/sheet-transparent.png';
import maleJumpSource from '../../assets/sprites/runner-male-jump/sheet-transparent.png';
import maleRunSource from '../../assets/sprites/runner-male-run/sheet-transparent.png';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { Bull } from '../entities/Bull.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Player } from '../entities/Player.js';
import { loadImage } from '../utils/assets.js';
import { randomBetween } from '../utils/math.js';

const ASSETS = {
  background: loadImage(backgroundSource),
  bull: loadImage(bullSource),
  obstacles: loadImage(obstacleSource),
  runners: {
    female: {
      jump: loadImage(femaleJumpSource),
      run: loadImage(femaleRunSource),
    },
    male: {
      jump: loadImage(maleJumpSource),
      run: loadImage(maleRunSource),
    },
  },
};

export class GameScene {
  constructor({ input, onTime, onGameOver }) {
    this.input = input;
    this.onTime = onTime;
    this.onGameOver = onGameOver;
    this.player = new Player();
    this.bull = new Bull();
    this.reset('normal', GAME_CONFIG.player.defaultRunner);
  }

  reset(difficultyId = 'normal', runnerId = GAME_CONFIG.player.defaultRunner) {
    this.difficulty = GAME_CONFIG.difficulty[difficultyId] ?? GAME_CONFIG.difficulty.normal;
    this.difficultyId = difficultyId;
    this.runnerId = ASSETS.runners[runnerId] ? runnerId : GAME_CONFIG.player.defaultRunner;
    this.player.reset();
    this.bull.reset();
    this.obstacles = [];
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = this.difficulty.startSpawnDelay;
    this.isGameOver = false;
    this.isCaught = false;
    this.caughtTimer = 0;
    this.input.resetTransient();

    for (let index = 0; index < this.difficulty.initialObstacles; index += 1) {
      this.#spawnObstacle(GAME_CONFIG.obstacles.initialSpawnX + index * 300);
    }

    this.onTime(this.elapsed);
  }

  update(deltaTime) {
    if (this.isGameOver) return;

    if (this.isCaught) {
      this.#updateCaught(deltaTime);
      this.onTime(this.elapsed);
      return;
    }

    this.elapsed += deltaTime;
    this.distance += this.speed * deltaTime;

    this.player.update(deltaTime, this.input);
    this.bull.update(deltaTime);
    this.#updateObstacles(deltaTime);
    this.#checkCollisions();
    this.onTime(this.elapsed);
  }

  render(renderer) {
    renderer.clear();
    renderer.drawBackground(
      ASSETS.background,
      this.distance,
      GAME_CONFIG.world.backgroundSpeedRatio,
    );
    renderer.drawGround(GAME_CONFIG.world.groundY);

    this.#renderBull(renderer);
    this.#renderObstacles(renderer);
    this.#renderPlayer(renderer);
  }

  get speed() {
    return this.difficulty.startSpeed + this.elapsed * this.difficulty.speedRamp;
  }

  #updateObstacles(deltaTime) {
    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime, this.speed);

      if (!obstacle.passed && obstacle.x + obstacle.width < this.bull.x + this.bull.width * 0.62) {
        obstacle.passed = true;
        this.bull.dodge();
      }
    }

    this.obstacles = this.obstacles.filter((obstacle) => !obstacle.isGone);

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.#spawnObstacle();
      this.spawnTimer = this.#nextSpawnDelay();
    }
  }

  #spawnObstacle(forcedX = GAME_CONFIG.obstacles.spawnX) {
    const lastObstacle = this.obstacles.at(-1);
    const minX = lastObstacle
      ? lastObstacle.x + lastObstacle.width + GAME_CONFIG.obstacles.minGap
      : forcedX;
    const type = this.#chooseObstacleType();
    const x = Math.max(forcedX, minX + randomBetween(0, 90));

    this.obstacles.push(new Obstacle({ type, x }));
  }

  #chooseObstacleType() {
    const types = GAME_CONFIG.obstacles.types;
    const pressure = Math.min(0.5, this.elapsed / 100);
    const bullChance = 0.06 + pressure * 0.22;

    if (Math.random() < bullChance) {
      return types.find((type) => type.id === 'bull');
    }

    return types[Math.floor(Math.random() * (types.length - 1))];
  }

  #nextSpawnDelay() {
    const ramp = Math.min(0.56, this.elapsed * 0.006);
    const jitter = randomBetween(-0.12, 0.08);
    const earlyBreathingRoom = Math.max(0, 1 - this.elapsed / 18) * 0.45;

    return Math.max(
      this.difficulty.minSpawnDelay,
      this.difficulty.startSpawnDelay + earlyBreathingRoom - ramp + jitter,
    );
  }

  #checkCollisions() {
    const playerBounds = this.player.bounds;

    for (const obstacle of this.obstacles) {
      if (!this.#intersects(playerBounds, obstacle.bounds)) continue;

      const wasAbove =
        playerBounds.bottom - this.player.velocityY * 0.016 <= obstacle.bounds.top + 18;
      const isFalling = this.player.velocityY > 0;

      if (obstacle.type.stompable && wasAbove && isFalling) {
        obstacle.x = GAME_CONFIG.obstacles.despawnX - obstacle.width;
        this.player.bounce();
        this.bull.dodge();
        continue;
      }

      this.isCaught = true;
      this.caughtTimer = 0;
      break;
    }
  }

  #updateCaught(deltaTime) {
    this.caughtTimer += deltaTime;
    this.distance += this.speed * GAME_CONFIG.gameOver.caughtSpeedRatio * deltaTime;
    this.bull.update(deltaTime * 1.8);
    this.#updateCaughtObstacles(deltaTime);

    if (this.caughtTimer >= GAME_CONFIG.gameOver.caughtDuration) {
      this.isGameOver = true;
      this.onGameOver(this.elapsed);
    }
  }

  #updateCaughtObstacles(deltaTime) {
    const caughtSpeed = this.speed * GAME_CONFIG.gameOver.caughtSpeedRatio;

    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime, caughtSpeed);
    }

    this.obstacles = this.obstacles.filter((obstacle) => !obstacle.isGone);
  }

  #intersects(a, b) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  #renderPlayer(renderer) {
    if (this.isCaught) {
      this.#renderCaughtPlayer(renderer);
      return;
    }

    const playerX = this.player.x;
    const playerY = this.player.y;

    renderer.drawShadow({
      x: playerX + this.player.width / 2,
      y: GAME_CONFIG.world.groundY + 10,
      width: 46,
      alpha: this.player.isGrounded ? 0.24 : 0.12,
    });

    const image = this.player.isGrounded ? this.playerAssets.run : this.playerAssets.jump;
    const didDraw = renderer.drawSprite(image, {
      x: playerX,
      y: playerY,
      width: this.player.width,
      height: this.player.height,
      frame: this.player.frame,
      frames: 4,
    });

    if (!didDraw) {
      renderer.drawFallbackRect({ ...this.player, color: '#f8fafc' });
    }
  }

  #renderCaughtPlayer(renderer) {
    const width = GAME_CONFIG.player.fallWidth;
    const height = GAME_CONFIG.player.fallHeight;
    const playerX =
      this.player.x +
      this.caughtProgress * GAME_CONFIG.gameOver.playerKnockbackX -
      (width - this.player.width) * 0.5;
    const playerY =
      GAME_CONFIG.world.groundY -
      height +
      this.caughtProgress * GAME_CONFIG.gameOver.playerKnockbackY;
    const frame = Math.min(3, Math.floor(this.caughtProgress * 4));

    renderer.drawShadow({
      x: playerX + width / 2,
      y: GAME_CONFIG.world.groundY + 10,
      width: 52,
      alpha: 0.14,
    });

    const didDraw = renderer.drawSprite(this.playerAssets.jump, {
      x: playerX,
      y: playerY,
      width,
      height,
      frame: Math.min(frame, 3),
      frames: 4,
      rotation: this.caughtProgress * -0.32,
    });

    if (!didDraw) {
      renderer.drawFallbackRect({ x: playerX, y: playerY, width, height, color: '#f8fafc' });
    }
  }

  #renderBull(renderer) {
    const bullX = this.bull.x;

    renderer.drawShadow({
      x: bullX + this.bull.width / 2,
      y: GAME_CONFIG.world.groundY + 12,
      width: 80,
      alpha: 0.26,
    });
    renderer.drawSprite(ASSETS.bull, {
      x: bullX,
      y: this.bull.y + this.bull.offsetY,
      width: this.bull.width,
      height: this.bull.height,
      frame: this.bull.frame,
      frames: 4,
    });
  }

  #renderObstacles(renderer) {
    for (const obstacle of this.obstacles) {
      renderer.drawShadow({
        x: obstacle.x + obstacle.width / 2,
        y: GAME_CONFIG.world.groundY + 9,
        width: obstacle.width * 0.38,
        alpha: 0.2,
      });

      const image = obstacle.type.sprite === 'bull' ? ASSETS.bull : ASSETS.obstacles;
      const didDraw = renderer.drawSprite(image, {
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
        frame: obstacle.frame,
        frames: obstacle.type.animated ? 4 : 6,
        rows: obstacle.type.animated ? 1 : 2,
      });

      if (!didDraw) {
        renderer.drawFallbackRect({ ...obstacle, color: '#b45309' });
      }
    }
  }

  get caughtProgress() {
    return Math.min(1, this.caughtTimer / GAME_CONFIG.gameOver.caughtDuration);
  }

  get playerAssets() {
    return ASSETS.runners[this.runnerId] ?? ASSETS.runners[GAME_CONFIG.player.defaultRunner];
  }
}
