import femaleRunPreview from '../../assets/sprites/runner-female-run/animation.gif';
import maleRunPreview from '../../assets/sprites/runner-male-run/animation.gif';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { TEXTS } from '../i18n/texts.js';
import { GameScene } from '../scenes/GameScene.js';
import { formatTime } from '../utils/time.js';
import {
  readNumber,
  readObject,
  readString,
  writeNumber,
  writeObject,
  writeString,
} from '../utils/storage.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';

const RUNNER_PREVIEWS = {
  female: femaleRunPreview,
  male: maleRunPreview,
};

export class Game {
  #animationFrame = null;
  #lastTime = 0;
  #isRunning = false;

  constructor(elements) {
    this.elements = elements;
    this.renderer = new Renderer(elements.canvas, GAME_CONFIG.canvas);
    this.input = new Input(elements.canvas);
    this.language = readString(GAME_CONFIG.storage.languageKey, 'es');
    this.runnerId = this.#normalizeRunnerId(
      readString(GAME_CONFIG.storage.runnerKey, GAME_CONFIG.player.defaultRunner),
    );
    this.scores = this.#readScores();
    this.bestTimes = this.#calculateBestTimes(this.scores);
    this.bestTime = Math.max(0, ...Object.values(this.bestTimes));
    this.difficulty = elements.difficultySelect.value;
    this.elements.runnerSelect.value = this.runnerId;
    this.scene = new GameScene({
      input: this.input,
      onTime: (seconds) => this.#setTime(seconds),
      onGameOver: (seconds) => this.#handleGameOver(seconds),
    });

    this.#bindEvents();
    this.#applyRunnerPreviews();
    this.#applyLanguage();
    this.scene.reset(this.difficulty, this.runnerId);
    this.#setTime(0);
    this.#setBestTime(this.bestTime);
    this.#setLevelBestTime();
    this.#showScreen('start');
    this.scene.render(this.renderer);
  }

  chooseRunner() {
    this.stop();
    this.#showScreen('runner');
    this.scene.reset(this.difficulty, this.runnerId);
    this.scene.render(this.renderer);
  }

  start() {
    this.stop();
    this.difficulty = this.#normalizeDifficultyId(this.elements.difficultySelect.value);
    this.runnerId = this.#normalizeRunnerId(this.elements.runnerSelect.value);
    writeString(GAME_CONFIG.storage.runnerKey, this.runnerId);
    this.scene.reset(this.difficulty, this.runnerId);
    this.#setLevelBestTime();
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
    this.scene.reset(this.difficulty, this.runnerId);
    this.#setTime(0);
    this.#setLevelBestTime();
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
    this.elements.playButton.addEventListener('click', () => this.chooseRunner());
    this.elements.runnerBackButton.addEventListener('click', () => this.#showScreen('runner'));
    this.elements.runnerChoiceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.#selectRunner(button.dataset.runner);
        this.#showScreen('difficulty');
      });
    });
    this.elements.difficultyChoiceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.#selectDifficulty(button.dataset.difficulty);
        this.start();
      });
    });
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
    this.elements.runnerSelect.addEventListener('change', () => {
      this.#selectRunner(this.elements.runnerSelect.value);
      this.scene.reset(this.difficulty, this.runnerId);
      this.scene.render(this.renderer);
    });
    window.addEventListener('blur', () => this.pause());
  }

  #handleGameOver(seconds) {
    this.stop();

    const difficultyScores = [...(this.scores[this.difficulty] ?? []), seconds];
    this.scores = { ...this.scores, [this.difficulty]: difficultyScores };
    this.bestTimes = this.#calculateBestTimes(this.scores);
    writeObject(GAME_CONFIG.storage.scoresKey, this.scores);
    writeObject(GAME_CONFIG.storage.bestTimeByDifficultyKey, this.bestTimes);
    this.#setLevelBestTime();

    this.bestTime = Math.max(0, ...Object.values(this.bestTimes));
    if (seconds > readNumber(GAME_CONFIG.storage.bestTimeKey)) {
      writeNumber(GAME_CONFIG.storage.bestTimeKey, seconds);
    }
    this.#setBestTime(this.bestTime);

    this.#showScreen('gameover');
  }

  #setTime(seconds) {
    this.elements.timeElement.textContent = formatTime(seconds);
  }

  #setBestTime(seconds) {
    this.elements.bestTimeElement.textContent = formatTime(seconds);
  }

  #setLevelBestTime() {
    this.elements.levelBestTimeElement.textContent = formatTime(
      this.bestTimes[this.difficulty] ?? 0,
    );
  }

  #selectRunner(runnerId) {
    this.runnerId = this.#normalizeRunnerId(runnerId);
    this.elements.runnerSelect.value = this.runnerId;
    writeString(GAME_CONFIG.storage.runnerKey, this.runnerId);
    this.#updateChoiceState(this.elements.runnerChoiceButtons, 'runner', this.runnerId);
  }

  #selectDifficulty(difficultyId) {
    this.difficulty = this.#normalizeDifficultyId(difficultyId);
    this.elements.difficultySelect.value = this.difficulty;
    this.#setLevelBestTime();
    this.#updateChoiceState(this.elements.difficultyChoiceButtons, 'difficulty', this.difficulty);
  }

  #normalizeRunnerId(runnerId) {
    if (GAME_CONFIG.player.runnerIds.includes(runnerId)) return runnerId;

    return GAME_CONFIG.player.defaultRunner;
  }

  #normalizeDifficultyId(difficultyId) {
    if (GAME_CONFIG.difficulty[difficultyId]) return difficultyId;

    return 'easy';
  }

  #readScores() {
    const savedScores = readObject(GAME_CONFIG.storage.scoresKey, {});
    const normalizedScores = Object.fromEntries(
      Object.entries(savedScores)
        .map(([difficultyId, scores]) => [
          difficultyId,
          Array.isArray(scores) ? scores.map(Number).filter(Number.isFinite) : [],
        ])
        .filter(([, scores]) => scores.length > 0),
    );

    if (Object.keys(normalizedScores).length > 0) return normalizedScores;

    const savedRecords = readObject(GAME_CONFIG.storage.bestTimeByDifficultyKey, {});
    const legacyBest = readNumber(GAME_CONFIG.storage.bestTimeKey);
    const migratedScores = Object.fromEntries(
      Object.entries(savedRecords)
        .map(([difficultyId, record]) => [difficultyId, Number(record)])
        .filter(([, record]) => Number.isFinite(record) && record > 0)
        .map(([difficultyId, record]) => [difficultyId, [record]]),
    );

    if (Object.keys(migratedScores).length > 0) return migratedScores;
    if (legacyBest <= 0) return {};

    return { normal: [legacyBest] };
  }

  #calculateBestTimes(scores) {
    return Object.fromEntries(
      Object.entries(scores).map(([difficultyId, values]) => [
        difficultyId,
        Math.max(0, ...values),
      ]),
    );
  }

  #applyRunnerPreviews() {
    this.elements.runnerPreviewImages.forEach((image) => {
      image.src = RUNNER_PREVIEWS[image.dataset.runnerPreview] ?? RUNNER_PREVIEWS.male;
    });
    this.#selectRunner(this.runnerId);
    this.#selectDifficulty(this.difficulty);
  }

  #updateChoiceState(buttons, key, value) {
    buttons.forEach((button) => {
      const isSelected = button.dataset[key] === value;
      button.setAttribute('aria-pressed', String(isSelected));
      button.classList.toggle('ring-4', isSelected);
      button.classList.toggle('ring-amber-200', isSelected);
    });
  }

  #showScreen(screen) {
    const isGame = screen === 'game';
    this.elements.overlay.hidden = isGame;
    this.elements.hud.hidden = !isGame;
    this.elements.startPanel.hidden = screen !== 'start';
    this.elements.runnerPanel.hidden = screen !== 'runner';
    this.elements.difficultyPanel.hidden = screen !== 'difficulty';
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
