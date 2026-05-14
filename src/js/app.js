import '../css/main.css';
import { Game } from './game/Game.js';

const game = new Game({
  canvas: document.querySelector('#game-canvas'),
  hud: document.querySelector('#hud'),
  timeElement: document.querySelector('#time'),
  bestTimeElement: document.querySelector('#best-time'),
  overlay: document.querySelector('#overlay'),
  startPanel: document.querySelector('#start-panel'),
  runnerPanel: document.querySelector('#runner-panel'),
  difficultyPanel: document.querySelector('#difficulty-panel'),
  pausePanel: document.querySelector('#pause-panel'),
  gameOverPanel: document.querySelector('#game-over-panel'),
  playButton: document.querySelector('#play-button'),
  shareButton: document.querySelector('#share-button'),
  continueButton: document.querySelector('#continue-button'),
  restartButtons: document.querySelectorAll('.restart-button'),
  homeButtons: document.querySelectorAll('.home-button, #home-button'),
  menuButton: document.querySelector('#menu-button'),
  runnerBackButton: document.querySelector('#runner-back-button'),
  languageSelect: document.querySelector('#language-select'),
  difficultySelect: document.querySelector('#difficulty-select'),
  difficultyChoiceButtons: document.querySelectorAll('.difficulty-choice'),
  runnerSelect: document.querySelector('#runner-select'),
  runnerChoiceButtons: document.querySelectorAll('.runner-choice'),
  runnerPreviewImages: document.querySelectorAll('[data-runner-preview]'),
  levelBestTimeElement: document.querySelector('#level-best-time'),
  titleElements: document.querySelectorAll('[data-title]'),
});

window.game = game;
