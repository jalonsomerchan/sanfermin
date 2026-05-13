import backgroundSource from '../../assets/background_pamplona.png';
import bullSource from '../../assets/sprites/bull-run/sheet-transparent.png';
import obstacleSource from '../../assets/sprites/obstacles/sheet-transparent.png';
import playerJumpSource from '../../assets/sprites/player-jump/sheet-transparent.png';
import playerRunSource from '../../assets/sprites/player-run/sheet-transparent.png';
import runnerSource from '../../assets/sprites/runner-obstacle/sheet-transparent.png';
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
  playerJump: loadImage(playerJumpSource),
  playerRun: loadImage(playerRunSource),
  runner: loadImage(runnerSource),
};

export class GameScene {
  constructor({ input, onTime, onGameOver }) {
    this.input = input;
    this.onTime = onTime;
    this.onGameOver = onGameOver;
    this.player = new Player();
    this.bull = new Bull();
    this.reset('normal');
  }

  reset(difficultyId = 'normal') {
    this.difficulty = GAME_CONFIG.difficulty[difficultyId] ?? GAME_CONFIG.difficulty.normal;
    this.difficultyId = difficultyId;
    this.player.reset();
    this.bull.reset();
    this.obstacles = [];
    this.elapsed = 0;
    this.distance = 0;
    this.spawnTimer = 1.1;
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
    const pressure = Math.min(0.55, this.elapsed / 90);
    const runnerChance = 0.08 + pressure * 0.28;

    if (Math.random() < runnerChance) {
      return types.find((type) => type.id === 'runner');
    }

    return types[Math.floor(Math.random() * (types.length - 1))];
  }

  #nextSpawnDelay() {
    const ramp = Math.min(0.56, this.elapsed * 0.006);
    const jitter = randomBetween(-0.12, 0.08);

    return Math.max(this.difficulty.minSpawnDelay, this.difficulty.startSpawnDelay - ramp + jitter);
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
    const playerX = this.isCaught
      ? this.player.x + this.caughtProgress * GAME_CONFIG.gameOver.playerKnockbackX
      : this.player.x;
    const playerY = this.isCaught
      ? this.player.y + this.caughtProgress * GAME_CONFIG.gameOver.playerKnockbackY
      : this.player.y;

    renderer.drawShadow({
      x: playerX + this.player.width / 2,
      y: GAME_CONFIG.world.groundY + 10,
      width: 46,
      alpha: this.player.isGrounded ? 0.24 : 0.12,
    });

    const image = this.player.isGrounded ? ASSETS.playerRun : ASSETS.playerJump;
    const didDraw = renderer.drawSprite(image, {
      x: playerX,
      y: playerY,
      width: this.player.width,
      height: this.player.height,
      frame: this.player.frame,
      frames: 4,
      rotation: this.isCaught ? this.caughtProgress * 0.5 : 0,
      alpha: this.isCaught ? 1 - this.caughtProgress * 0.25 : 1,
    });

    if (!didDraw) {
      renderer.drawFallbackRect({ ...this.player, color: '#f8fafc' });
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

      const image = obstacle.type.animated ? ASSETS.runner : ASSETS.obstacles;
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
}
