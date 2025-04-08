export class InputManager {
    constructor() {
        this.keys = {
            forward: false,    // Z key
            backward: false,   // S key
            left: false,      // Q key
            right: false,      // D key
            up: false,        // Space key
            down: false,      // Ctrl key
            fire: false       // Left mouse button
        };

        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.mousePosition = { x: 0, y: 0 };

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case 'z':
                this.keys.forward = true;
                break;
            case 's':
                this.keys.backward = true;
                break;
            case 'q':
                this.keys.left = true;
                break;
            case 'd':
                this.keys.right = true;
                break;
            case ' ':
                this.keys.up = true;
                break;
            case 'control':
                this.keys.down = true;
                break;
        }
    }

    handleKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case 'z':
                this.keys.forward = false;
                break;
            case 's':
                this.keys.backward = false;
                break;
            case 'q':
                this.keys.left = false;
                break;
            case 'd':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.up = false;
                break;
            case 'control':
                this.keys.down = false;
                break;
        }
    }

    handleMouseMove(event) {
        this.mouseDeltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        this.mouseDeltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        this.mousePosition = { x: event.clientX, y: event.clientY };
    }

    handleMouseDown(event) {
        if (event.button === 0) { // Left mouse button
            this.keys.fire = true;
        }
    }

    handleMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            this.keys.fire = false;
        }
    }

    resetMouseDelta() {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
    }
} 