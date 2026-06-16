import { GAME_CONFIG } from '../config/gameConfig.js';

export class Obstacle {
  constructor({ type, x }) {
    this.type = type;
    this.x = x;
    this.width = type.width;
    this.height = type.height;
    this.y = type.y ?? GAME_CONFIG.world.groundY - this.height + (type.groundOffset ?? 0);
    this.animationTime = Math.random() * 0.2;
    this.passed = false;
  }

  update(deltaTime, speed) {
    this.x -= speed * deltaTime;
    this.animationTime += deltaTime;
  }

  get frame() {
    if (!this.type.animated) return this.type.frame;

    const frameDuration =
      this.type.sprite === 'bull'
        ? GAME_CONFIG.obstacles.bullFrameDuration
        : GAME_CONFIG.obstacles.frameDuration;

    return Math.floor(this.animationTime / frameDuration) % 4;
  }

  get isGone() {
    return this.x + this.width < GAME_CONFIG.obstacles.despawnX;
  }

  get bounds() {
    const inset = this.type.collisionInset ?? {
      x: 0.22,
      y: 0.2,
      width: 0.56,
      height: 0.62,
    };

    return {
      x: this.x + this.width * inset.x,
      y: this.y + this.height * inset.y,
      width: this.width * inset.width,
      height: this.height * inset.height,
      top: this.y + this.height * inset.y,
    };
  }
}
