import { GAME_CONFIG } from '../config/gameConfig.js';

export class Bull {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = GAME_CONFIG.bull.x;
    this.y = GAME_CONFIG.bull.y;
    this.width = GAME_CONFIG.bull.width;
    this.height = GAME_CONFIG.bull.height;
    this.animationTime = 0;
    this.dodgeTimer = 0;
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    this.dodgeTimer = Math.max(0, this.dodgeTimer - deltaTime);
  }

  dodge() {
    this.dodgeTimer = GAME_CONFIG.bull.dodgeDuration;
  }

  get offsetY() {
    if (this.dodgeTimer <= 0) return 0;

    const progress = this.dodgeTimer / GAME_CONFIG.bull.dodgeDuration;
    return Math.sin(progress * Math.PI) * -36;
  }

  get frame() {
    return Math.floor(this.animationTime / GAME_CONFIG.bull.frameDuration) % 4;
  }
}
