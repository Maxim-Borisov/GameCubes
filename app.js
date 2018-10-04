// import { Scene } from './scene'

class Application {

  constructor() {
    this.canvas = this.element('canvas');

    this.scene = new Scene(this);
    this.scene.initGL(this.canvas);

    this.canvas.addEventListener('mousedown',   this.scene.mousePress.bind(this.scene));
    this.canvas.addEventListener('mouseup',     this.scene.mouseRelease.bind(this.scene));
    this.canvas.addEventListener('mousemove',   this.scene.mouseMove.bind(this.scene));
    this.canvas.addEventListener('contextmenu', this.rejectEvent.bind(this));

    this.scene.itemSelected = this.itemSelected.bind(this);

    this.attachAction('btn-start', () => this.toggleGameStart(!this.scene.pause));

    this.eventLoop();
  }

  element(id) {
    return document.getElementById(id);
  }

  attachAction(elementId, action) {
    let elem = this.element(elementId);
    elem && elem.addEventListener('click', action);
  }

  setElementText(elementId, str) {
    let elem = this.element(elementId);
    elem && (elem.innerText = str);
  }

  getElementText(elementId) {
    let elem = this.element(elementId);
    return (elem && elem.innerText);
  }

  rejectEvent(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  eventLoop(resolution = 200 /* ms */) {
    this.scene.loop(resolution);
    requestAnimationFrame(this.eventLoop.bind(this, resolution));
  }

  itemSelected(item, idx) {
    console.log('item found:', item && item._id);
    this.scene.removeItem(idx);
    this.incrementScore();
  }

  getCurrentScore() {
    return parseInt(this.getElementText('score'));
  }

  setCurrentScore(score) {
    this.setElementText('score', '' + score);
  }

  toggleGameStart(disabled) {
    let enable = !disabled;

    this.scene.start(enable);
    this.setElementText('btn-start', enable ? 'Stop' : 'Start');

    if (disabled) this.setElementText('score', '0');
  }

  // Use this method to increase score
  incrementScore() {
    let scoreValue = this.getCurrentScore();
    this.setCurrentScore(++scoreValue);
  }

}

let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new Application();
});
