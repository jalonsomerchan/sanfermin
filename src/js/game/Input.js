export class Input {
  #keys = new Set();
  #pressed = new Set();
  #pointerStart = null;
  #jumpQueued = false;

  constructor(target) {
    this.target = target;
    this.#bindEvents();
  }

  consumeJump() {
    const wantsJump =
      this.#jumpQueued ||
      this.#pressed.has('Space') ||
      this.#pressed.has('ArrowUp') ||
      this.#pressed.has('KeyW');

    this.#jumpQueued = false;
    this.#pressed.delete('Space');
    this.#pressed.delete('ArrowUp');
    this.#pressed.delete('KeyW');

    return wantsJump;
  }

  consumePause() {
    const wantsPause = this.#pressed.has('Escape') || this.#pressed.has('KeyP');

    this.#pressed.delete('Escape');
    this.#pressed.delete('KeyP');

    return wantsPause;
  }

  resetTransient() {
    this.#pressed.clear();
    this.#jumpQueued = false;
  }

  #bindEvents() {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
        event.preventDefault();
      }

      if (!this.#keys.has(event.code)) {
        this.#pressed.add(event.code);
      }

      this.#keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.#keys.delete(event.code);
    });

    this.target.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.target.setPointerCapture(event.pointerId);
      this.#pointerStart = { x: event.clientX, y: event.clientY };
      this.#jumpQueued = true;
    });

    this.target.addEventListener('click', (event) => {
      event.preventDefault();
      this.#jumpQueued = true;
    });

    this.target.addEventListener('pointerup', (event) => {
      event.preventDefault();
      if (!this.#pointerStart) return;

      const deltaY = event.clientY - this.#pointerStart.y;
      const deltaX = event.clientX - this.#pointerStart.x;
      const isSwipeUp = deltaY < -28 && Math.abs(deltaY) > Math.abs(deltaX);

      if (isSwipeUp) {
        this.#jumpQueued = true;
      }

      this.#pointerStart = null;
    });

    this.target.addEventListener('pointercancel', () => {
      this.#pointerStart = null;
    });
  }
}
