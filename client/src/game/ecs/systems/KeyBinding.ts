/**
 * Represents a key binding for game input.
 * Tracks the state of a single key including press, release, and hold states.
 */
export class KeyBinding {
    private _isDown     = false;
    private _justDown   = false;
    private _justUp     = false;
  
    constructor(public readonly code: string) {}
  
    /** Call once at the start of each frame to reset edges */
    public beginFrame() {
      this._justDown = false;
      this._justUp   = false;
    }
  
    /** Call when you learn the raw “isKeyDown” for this frame */
    public update(rawDown: boolean) {
      if (rawDown && !this._isDown)   this._justDown = true;
      if (!rawDown && this._isDown)   this._justUp   = true;
      this._isDown = rawDown;
    }

    /** Manually trigger a “press” for non‐keyboard events (e.g. mouse wheel) */
    public triggerPress() {
      this._justDown = true;
    }

    /** Manually trigger a “release” if you ever need it */
    public triggerRelease() {
      this._justUp = true;
    }
  
    get isDown()    { return this._isDown; }
    get justDown()  { return this._justDown; }
    get justUp()    { return this._justUp; }
}