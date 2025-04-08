export class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            rollLeft: false,
            rollRight: false,
            fire: false
        };

        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'w': this.keys.forward = true; break;
            case 's': this.keys.backward = true; break;
            case 'a': this.keys.left = true; break;
            case 'd': this.keys.right = true; break;
            case 'q': this.keys.rollLeft = true; break;
            case 'e': this.keys.rollRight = true; break;
            case ' ': this.keys.fire = true; break;
            case 'shift': this.keys.up = true; break;
            case 'control': this.keys.down = true; break;
        }
    }

    handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'w': this.keys.forward = false; break;
            case 's': this.keys.backward = false; break;
            case 'a': this.keys.left = false; break;
            case 'd': this.keys.right = false; break;
            case 'q': this.keys.rollLeft = false; break;
            case 'e': this.keys.rollRight = false; break;
            case ' ': this.keys.fire = false; break;
            case 'shift': this.keys.up = false; break;
            case 'control': this.keys.down = false; break;
        }
    }

    handleMouseMove(e) {
        this.mouseDeltaX = e.movementX;
        this.mouseDeltaY = e.movementY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    handleMouseDown(e) {
        if (e.button === 0) { // Left click
            this.keys.fire = true;
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) { // Left click
            this.keys.fire = false;
        }
    }

    resetMouseDelta() {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
    }
} 