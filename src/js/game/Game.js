import { GAME_CONFIG } from '../config/gameConfig.js';
import { TEXTS } from '../i18n/texts.js';
import { GameScene } from '../scenes/GameScene.js';
import { formatTime } from '../utils/time.js';
import { readNumber, readString, writeNumber, writeString } from '../utils/storage.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';

export class Game {
  #animationFrame = null;
  #lastTime = 0;
  #isRunning = false;

  constructor(elements) {
    this.elements = elements;
    this.renderer = new Renderer(elements.canvas, GAME_CONFIG.canvas);
    this.input = new Input(elements.canvas);
    this.language = readString(GAME_CONFIG.storage.languageKey, 'es');
    this.bestTime = readNumber(GAME_CONFIG.storage.bestTimeKey);
    this.difficulty = elements.difficultySelect.value;
    this.scene = new GameScene({
      input: this.input,
      onTime: (seconds) => this.#setTime(seconds),
      onGameOver: (seconds) => this.#handleGameOver(seconds),
    });

    this.#bindEvents();
    this.#applyLanguage();
    this.#setTime(0);
    this.#setBestTime(this.bestTime);
    this.#showScreen('start');
    this.scene.render(this.renderer);
  }

  start() {
    this.stop();
    this.difficulty = this.elements.difficultySelect.value;
    this.scene.reset(this.difficulty);
    this.#showScreen('game');
    this.#isRunning = true;
    this.#lastTime = performance.now();
    this.#animationFrame = requestAnimationFrame((time) => this.#tick(time));
  }

  pause() {
    if (!this.#isRunning) return;

    this.#isRunning = false;
    this.#showScreen('pause');
  }

  resume() {
    if (this.scene.isGameOver) return;

    this.#showScreen('game');
    this.#isRunning = true;
    this.#lastTime = performance.now();
    this.#animationFrame = requestAnimationFrame((time) => this.#tick(time));
  }

  goHome() {
    this.stop();
    this.scene.reset(this.difficulty);
    this.#setTime(0);
    this.#showScreen('start');
    this.scene.render(this.renderer);
  }

  stop() {
    this.#isRunning = false;

    if (this.#animationFrame) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  #tick(time) {
    if (!this.#isRunning) return;

    const deltaTime = Math.min((time - this.#lastTime) / 1000, 0.05);
    this.#lastTime = time;

    if (this.input.consumePause()) {
      this.pause();
      return;
    }

    this.scene.update(deltaTime);
    this.scene.render(this.renderer);

    this.#animationFrame = requestAnimationFrame((nextTime) => this.#tick(nextTime));
  }

  #bindEvents() {
    this.elements.playButton.addEventListener('click', () => this.start());
    this.elements.restartButtons.forEach((button) => {
      button.addEventListener('click', () => this.start());
    });
    this.elements.continueButton.addEventListener('click', () => this.resume());
    this.elements.homeButtons.forEach((button) => {
      button.addEventListener('click', () => this.goHome());
    });
    this.elements.menuButton.addEventListener('click', () => this.pause());
    this.elements.shareButton.addEventListener('click', () => this.#share());
    this.elements.languageSelect.addEventListener('change', () => {
      this.language = this.elements.languageSelect.value;
      writeString(GAME_CONFIG.storage.languageKey, this.language);
      this.#applyLanguage();
    });
    window.addEventListener('blur', () => this.pause());
  }

  #handleGameOver(seconds) {
    this.stop();

    if (seconds > this.bestTime) {
      this.bestTime = seconds;
      writeNumber(GAME_CONFIG.storage.bestTimeKey, seconds);
      this.#setBestTime(seconds);
    }

    this.#showScreen('gameover');
  }

  #setTime(seconds) {
    this.elements.timeElement.textContent = formatTime(seconds);
  }

  #setBestTime(seconds) {
    this.elements.bestTimeElement.textContent = formatTime(seconds);
  }

  #showScreen(screen) {
    const isGame = screen === 'game';
    this.elements.overlay.hidden = isGame;
    this.elements.hud.hidden = !isGame;
    this.elements.startPanel.hidden = screen !== 'start';
    this.elements.pausePanel.hidden = screen !== 'pause';
    this.elements.gameOverPanel.hidden = screen !== 'gameover';
  }

  #applyLanguage() {
    const text = TEXTS[this.language] ?? TEXTS.es;
    document.documentElement.lang = this.language;

    this.elements.languageSelect.value = this.language;
    this.elements.titleElements.forEach((element) => {
      element.textContent = text.title;
    });

    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = text[element.dataset.i18n] ?? element.textContent;
    }
  }

  async #share() {
    const text = TEXTS[this.language]?.shareText ?? TEXTS.es.shareText;

    if (navigator.share) {
      await navigator.share({ title: TEXTS[this.language].title, text });
      return;
    }

    await navigator.clipboard?.writeText(text);
  }
}
