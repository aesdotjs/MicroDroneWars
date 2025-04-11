export class KeyBinding {
    constructor(key) {
        this.key = key;
        this.isPressed = false;
        this.justPressed = false;
        this.justReleased = false;
    }

    update() {
        this.justPressed = false;
        this.justReleased = false;
    }

    setPressed(pressed) {
        if (pressed && !this.isPressed) {
            this.justPressed = true;
        } else if (!pressed && this.isPressed) {
            this.justReleased = true;
        }
        this.isPressed = pressed;
    }
} 