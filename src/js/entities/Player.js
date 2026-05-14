import { GAME_CONFIG } from '../config/gameConfig.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = GAME_CONFIG.player.x;
    this.width = GAME_CONFIG.player.width;
    this.height = GAME_CONFIG.player.height;
    this.y = GAME_CONFIG.world.groundY - this.height;
    this.velocityY = 0;
    this.isGrounded = true;
    this.coyoteTimer = 0;
    this.jumpsRemaining = GAME_CONFIG.player.maxJumps;
    this.animationTime = 0;
  }

  update(deltaTime, input) {
    if (this.isGrounded) {
      this.coyoteTimer = GAME_CONFIG.player.coyoteTime;
    } else {
      this.coyoteTimer -= deltaTime;
    }

    if (input.consumeJump() && (this.coyoteTimer > 0 || this.jumpsRemaining > 0)) {
      this.velocityY = GAME_CONFIG.player.jumpVelocity;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpsRemaining -= 1;
    }

    this.velocityY += GAME_CONFIG.world.gravity * deltaTime;
    this.y += this.velocityY * deltaTime;

    const floorY = GAME_CONFIG.world.groundY - this.height;
    if (this.y >= floorY) {
      this.y = floorY;
      this.velocityY = 0;
      this.isGrounded = true;
      this.jumpsRemaining = GAME_CONFIG.player.maxJumps;
    }

    this.animationTime += deltaTime;
  }

  bounce() {
    this.velocityY = GAME_CONFIG.player.stompBounceVelocity;
    this.isGrounded = false;
    this.jumpsRemaining = Math.max(1, GAME_CONFIG.player.maxJumps - 1);
  }

  get frame() {
    if (!this.isGrounded) {
      if (this.velocityY < -260) return 1;
      if (this.velocityY < 160) return 2;
      return 3;
    }

    const runFrames = GAME_CONFIG.player.runFrames;
    const frameIndex = Math.floor(this.animationTime / GAME_CONFIG.player.frameDuration);

    return runFrames[frameIndex % runFrames.length];
  }

  get bounds() {
    const inset = GAME_CONFIG.player.collisionInset;

    return {
      x: this.x + inset.x,
      y: this.y + inset.y,
      width: this.width - inset.x * 2,
      height: this.height - inset.y * 2,
      bottom: this.y + this.height - inset.y,
    };
  }
}
