import { MOUSE_SENSITIVITY } from "./config.js";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

// Minimal hand-rolled pointer-lock FPS look, so we don't need to vendor
// three.js's separate PointerLockControls example module. Tracks yaw/pitch
// as plain numbers (radians) and lets the caller apply them to a camera.
export class MouseLookControls {
  constructor(domElement) {
    this.domElement = domElement;
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.onLockChange = null;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onLockChange = this._onLockChange.bind(this);

    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("mousemove", this._onMouseMove);
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  setYaw(yaw) {
    this.yaw = yaw;
  }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.domElement;
    if (this.onLockChange) this.onLockChange(this.locked);
  }

  _onMouseMove(e) {
    if (!this.locked) return;
    this.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pitch -= e.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  }

  dispose() {
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("mousemove", this._onMouseMove);
  }
}
