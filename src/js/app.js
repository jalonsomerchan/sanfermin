import '../css/main.css';
import { Game } from './game/Game.js';

const game = new Game({
  canvas: document.querySelector('#game-canvas'),
  hud: document.querySelector('#hud'),
  timeElement: document.querySelector('#time'),
  bestTimeElement: document.querySelector('#best-time'),
  overlay: document.querySelector('#overlay'),
  startPanel: document.querySelector('#start-panel'),
  pausePanel: document.querySelector('#pause-panel'),
  gameOverPanel: document.querySelector('#game-over-panel'),
  playButton: document.querySelector('#play-button'),
  shareButton: document.querySelector('#share-button'),
  continueButton: document.querySelector('#continue-button'),
  restartButtons: document.querySelectorAll('.restart-button'),
  homeButtons: document.querySelectorAll('.home-button, #home-button'),
  menuButton: document.querySelector('#menu-button'),
  languageSelect: document.querySelector('#language-select'),
  difficultySelect: document.querySelector('#difficulty-select'),
  runnerSelect: document.querySelector('#runner-select'),
  titleElements: document.querySelectorAll('[data-title]'),
});

window.game = game;
