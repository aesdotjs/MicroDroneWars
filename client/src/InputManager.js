import { Vector2 } from '@babylonjs/core';

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false,
            zoom: false
        };
        this.mouseDelta = { x: 0, y: 0 };
        this.hasFocus = false;
        this.isPointerLocked = false;

        // Make canvas focusable and set initial focus
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.style.outline = 'none'; // Remove focus outline
        this.canvas.focus();

        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleClick = this.handleClick.bind(this);

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('focus', this.handleFocus);
        this.canvas.addEventListener('blur', this.handleBlur);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousedown', this.handleClick); // Add mousedown handler

        // Prevent default browser shortcuts when canvas is focused
        this.canvas.addEventListener('keydown', (e) => {
            if (this.hasFocus) {
                e.preventDefault();
            }
        });

        // Set up pointer lock
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
            if (this.isPointerLocked) {
                this.hasFocus = true;
            }
        });

        console.log('InputManager initialized:', {
            hasCanvas: !!this.canvas,
            hasFocus: this.hasFocus,
            isPointerLocked: this.isPointerLocked
        });
    }

    handleKeyDown(event) {
        if (!this.hasFocus) {
            console.log('Key pressed but canvas not focused');
            return;
        }

        console.log('Key pressed:', event.code, 'Canvas focused:', this.hasFocus);

        // AZERTY key mappings
        switch (event.code) {
            case 'KeyW': // Z key on AZERTY
                this.keys.forward = true;
                break;
            case 'KeyS': // S key on AZERTY
                this.keys.backward = true;
                break;
            case 'KeyA': // Q key on AZERTY
                this.keys.left = true;
                break;
            case 'KeyD': // D key on AZERTY
                this.keys.right = true;
                break;
            case 'Space': // Space for up
                this.keys.up = true;
                break;
            case 'ControlLeft': // Left Ctrl for down
            case 'ControlRight': // Right Ctrl for down
                this.keys.down = true;
                break;
            case 'KeyQ': // A key on AZERTY
                this.keys.fire = true;
                break;
        }

        console.log('Keys state:', this.keys);
    }

    handleKeyUp(event) {
        if (!this.hasFocus) return;

        console.log('Key released:', event.code);

        // AZERTY key mappings
        switch (event.code) {
            case 'KeyW': // Z key on AZERTY
                this.keys.forward = false;
                break;
            case 'KeyS': // S key on AZERTY
                this.keys.backward = false;
                break;
            case 'KeyA': // Q key on AZERTY
                this.keys.left = false;
                break;
            case 'KeyD': // D key on AZERTY
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.up = false;
                break;
            case 'ControlLeft':
            case 'ControlRight':
                this.keys.down = false;
                break;
            case 'KeyQ': // A key on AZERTY
                this.keys.fire = false;
                break;
        }

        console.log('Keys state:', this.keys);
    }

    handleMouseMove(event) {
        if (this.isPointerLocked) {
            this.mouseDelta.x = event.movementX;
            this.mouseDelta.y = event.movementY;
        }
    }

    handleFocus() {
        this.hasFocus = true;
        console.log('Canvas focused');
    }

    handleBlur() {
        this.hasFocus = false;
        // Reset all keys when focus is lost
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
        console.log('Canvas blurred');
    }

    handleClick() {
        console.log('Canvas clicked');
        this.canvas.focus();
        this.hasFocus = true;
        if (!this.isPointerLocked) {
            this.canvas.requestPointerLock().catch(err => {
                console.warn('Pointer lock request failed:', err);
            });
        }
    }

    getInput() {
        return {
            ...this.keys,
            mouseDelta: { ...this.mouseDelta }
        };
    }

    resetMouseDelta() {
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }

    cleanup() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('focus', this.handleFocus);
        document.removeEventListener('blur', this.handleBlur);
        this.canvas.removeEventListener('click', this.handleClick);
        
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }
} 