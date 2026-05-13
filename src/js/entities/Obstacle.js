import { GAME_CONFIG } from '../config/gameConfig.js';

export class Obstacle {
  constructor({ type, x }) {
    this.type = type;
    this.x = x;
    this.width = type.width;
    this.height = type.height;
    this.y = GAME_CONFIG.world.groundY - this.height;
    this.animationTime = Math.random() * 0.2;
    this.passed = false;
  }

  update(deltaTime, speed) {
    this.x -= speed * deltaTime;
    this.animationTime += deltaTime;
  }

  get frame() {
    if (!this.type.animated) return this.type.frame;

    return Math.floor(this.animationTime / GAME_CONFIG.obstacles.frameDuration) % 4;
  }

  get isGone() {
    return this.x + this.width < GAME_CONFIG.obstacles.despawnX;
  }

  get bounds() {
    return {
      x: this.x + this.width * 0.14,
      y: this.y + this.height * 0.12,
      width: this.width * 0.72,
      height: this.height * 0.82,
      top: this.y + this.height * 0.12,
    };
  }
}
