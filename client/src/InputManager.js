import { Vector2 } from '@babylonjs/core';

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {
            // Left Stick (ZQSD)
            up: false,      // Z - Throttle up
            down: false,    // S - Throttle down
            left: false,    // Q - Yaw left
            right: false,   // D - Yaw right
            
            // Right Stick (IJKL)
            pitchUp: false,    // I - Pitch forward
            pitchDown: false,  // K - Pitch backward
            rollLeft: false,   // J - Roll left
            rollRight: false,  // L - Roll right
            
            // Other controls
            fire: false,    // Space - Fire
            zoom: false     // Right click - Zoom
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
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('focus', this.handleFocus);
        this.canvas.addEventListener('blur', this.handleBlur);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);

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


        switch(event.key.toLowerCase()) {
            // Left Stick (ZQSD)
            case 'z':
                this.keys.up = true;
                break;
            case 's':
                this.keys.down = true;
                break;
            case 'q':
                this.keys.left = true;
                break;
            case 'd':
                this.keys.right = true;
                break;
            
            // Right Stick (IJKL)
            case 'i':
                this.keys.pitchUp = true;
                break;
            case 'k':
                this.keys.pitchDown = true;
                break;
            case 'j':
                this.keys.rollLeft = true;
                break;
            case 'l':
                this.keys.rollRight = true;
                break;
            
            // Other controls
            case ' ':
                this.keys.fire = true;
                break;
        }

    }

    handleKeyUp(event) {
        if (!this.hasFocus) return;

        switch(event.key.toLowerCase()) {
            // Left Stick (ZQSD)
            case 'z':
                this.keys.up = false;
                break;
            case 's':
                this.keys.down = false;
                break;
            case 'q':
                this.keys.left = false;
                break;
            case 'd':
                this.keys.right = false;
                break;
            
            // Right Stick (IJKL)
            case 'i':
                this.keys.pitchUp = false;
                break;
            case 'k':
                this.keys.pitchDown = false;
                break;
            case 'j':
                this.keys.rollLeft = false;
                break;
            case 'l':
                this.keys.rollRight = false;
                break;
            
            // Other controls
            case ' ':
                this.keys.fire = false;
                break;
        }

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

    handleMouseDown(event) {
        this.handleClick();
        if (event.button === 2) { // Right click
            this.keys.zoom = true;
        }
    }

    handleMouseUp(event) {
        if (event.button === 2) { // Right click
            this.keys.zoom = false;
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
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }
} 