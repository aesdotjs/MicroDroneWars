import { PhysicsInput } from '@shared/physics/types';
import { KeyBinding } from './KeyBinding';

/**
 * Manages all game input including keyboard and mouse controls.
 * Handles key bindings, mouse movement, and pointer lock functionality.
 * Provides a unified interface for getting input state.
 */
export class InputManager {
    /** The canvas element to capture input from */
    private canvas: HTMLCanvasElement;
    /** Collection of key bindings for all game controls */
    private keys: {
        // Movement
        forward: KeyBinding;
        backward: KeyBinding;
        left: KeyBinding;
        right: KeyBinding;
        up: KeyBinding;
        down: KeyBinding;
        
        // Rotation
        pitchUp: KeyBinding;
        pitchDown: KeyBinding;
        yawLeft: KeyBinding;
        yawRight: KeyBinding;
        rollLeft: KeyBinding;
        rollRight: KeyBinding;
        
        // Other controls
        fire: KeyBinding;
        zoom: KeyBinding;
    };
    /** Current mouse movement delta */
    private mouseDelta: { x: number; y: number };
    /** Whether the canvas has focus */
    private hasFocus: boolean;
    /** Whether the pointer is locked to the canvas */
    private isPointerLocked: boolean;

    /**
     * Creates a new InputManager instance.
     * Sets up key bindings and event listeners for input handling.
     * @param canvas - The canvas element to capture input from
     */
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.keys = {
            // Movement
            forward: new KeyBinding('KeyW'),
            backward: new KeyBinding('KeyS'),
            left: new KeyBinding('KeyA'),
            right: new KeyBinding('KeyD'),
            up: new KeyBinding('Space'),
            down: new KeyBinding('ShiftLeft'),
            
            // Rotation
            pitchUp: new KeyBinding('ArrowUp'),
            pitchDown: new KeyBinding('ArrowDown'),
            yawLeft: new KeyBinding('ArrowLeft'),
            yawRight: new KeyBinding('ArrowRight'),
            rollLeft: new KeyBinding('KeyQ'),
            rollRight: new KeyBinding('KeyE'),
            
            // Other controls
            fire: new KeyBinding('MouseLeft'),
            zoom: new KeyBinding('MouseRight')
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

        // Set up pointer lock change handler
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === (this.canvas as unknown as Element);
            if (this.isPointerLocked) {
                this.hasFocus = true;
                console.log('Pointer lock acquired');
            } else {
                console.log('Pointer lock lost');
            }
        });

        console.log('InputManager initialized:', {
            hasCanvas: !!this.canvas,
            hasFocus: this.hasFocus,
            isPointerLocked: this.isPointerLocked
        });
    }

    /**
     * Handles key down events.
     * Updates key bindings and prevents default browser behavior when canvas is focused.
     * @param event - The keyboard event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // Check both hasFocus and isPointerLocked since we want to accept input when either is true
        if (!this.hasFocus && !this.isPointerLocked) {
            console.log('Key pressed but canvas not focused');
            return;
        }

        // Prevent default browser shortcuts when canvas is focused
        if (this.hasFocus || this.isPointerLocked) {
            event.preventDefault();
        }

        // Use event.code for more reliable key detection
        const code = event.code;
        Object.values(this.keys).forEach(binding => {
            if (binding.getKey() === code) {
                binding.setPressed(true);
            }
        });
    }

    /**
     * Handles key up events.
     * Updates key bindings when canvas is focused.
     * @param event - The keyboard event
     */
    private handleKeyUp(event: KeyboardEvent): void {
        // Check both hasFocus and isPointerLocked since we want to accept input when either is true
        if (!this.hasFocus && !this.isPointerLocked) {
            return;
        }

        // Use event.code for more reliable key detection
        const code = event.code;
        Object.values(this.keys).forEach(binding => {
            if (binding.getKey() === code) {
                binding.setPressed(false);
            }
        });
    }

    /**
     * Handles mouse movement events.
     * Updates mouse delta when canvas is focused.
     * @param event - The mouse event
     */
    private handleMouseMove(event: MouseEvent): void {
        // Check both hasFocus and isPointerLocked since we want to accept input when either is true
        if (!this.hasFocus || !this.isPointerLocked) {
            return;
        }

        this.mouseDelta.x += event.movementX;
        this.mouseDelta.y += event.movementY;
    }

    /**
     * Handles canvas focus events.
     * Updates focus state and logs the event.
     */
    private handleFocus(): void {
        this.hasFocus = true;
        console.log('Canvas focused');
    }

    /**
     * Handles canvas blur events.
     * Updates focus state and logs the event.
     */
    private handleBlur(): void {
        this.hasFocus = false;
        console.log('Canvas blurred');
    }

    /**
     * Handles canvas click events.
     * Requests pointer lock if not already locked.
     */
    private handleClick(): void {
        console.log('Canvas clicked');
        if (!this.isPointerLocked) {
            const promise = (this.canvas as any).requestPointerLock();
            if (promise) {
                promise.then(() => {
                    console.log('Pointer lock acquired');
                    this.hasFocus = true;
                }).catch((err: Error) => {
                    console.warn('Pointer lock request failed:', err);
                });
            }
        }
    }

    /**
     * Handles mouse down events.
     * Handles right click for zoom control.
     * @param event - The mouse event
     */
    private handleMouseDown(event: MouseEvent): void {
        this.handleClick();
        if (event.button === 2) { // Right click
            this.keys.zoom.setPressed(true);
        }
    }

    /**
     * Handles mouse up events.
     * Handles right click release for zoom control.
     * @param event - The mouse event
     */
    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 2) { // Right click
            this.keys.zoom.setPressed(false);
        }
    }

    /**
     * Gets the current input state.
     * Updates all key bindings and returns the current input state.
     * @returns The current physics input state
     */
    public getInput(): any {
        // Update all key bindings
        Object.values(this.keys).forEach(binding => {
            binding.update();
        });

        // Get current mouse delta and reset it
        const currentMouseDelta = { ...this.mouseDelta };
        this.resetMouseDelta();

        const input = {
            forward: this.keys.forward.getIsPressed(),
            backward: this.keys.backward.getIsPressed(),
            left: this.keys.left.getIsPressed(),
            right: this.keys.right.getIsPressed(),
            up: this.keys.up.getIsPressed(),
            down: this.keys.down.getIsPressed(),
            pitchUp: this.keys.pitchUp.getIsPressed(),
            pitchDown: this.keys.pitchDown.getIsPressed(),
            yawLeft: this.keys.yawLeft.getIsPressed(),
            yawRight: this.keys.yawRight.getIsPressed(),
            rollLeft: this.keys.rollLeft.getIsPressed(),
            rollRight: this.keys.rollRight.getIsPressed(),
            mouseDelta: currentMouseDelta,
        };

        return input;
    }

    /**
     * Resets the mouse movement delta.
     */
    public resetMouseDelta(): void {
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }

    public isIdle(): boolean {
        return !this.keys.forward.getIsPressed() &&
               !this.keys.backward.getIsPressed() &&
               !this.keys.left.getIsPressed() &&
               !this.keys.right.getIsPressed() &&
               !this.keys.pitchUp.getIsPressed() &&
               !this.keys.pitchDown.getIsPressed() &&
               !this.keys.yawLeft.getIsPressed() &&
               !this.keys.yawRight.getIsPressed() &&
               !this.keys.rollLeft.getIsPressed() &&
               !this.keys.rollRight.getIsPressed() &&
               !this.keys.up.getIsPressed() &&
               !this.keys.down.getIsPressed() &&
               !this.keys.fire.getIsPressed() &&
               !this.keys.zoom.getIsPressed() &&
               this.mouseDelta.x === 0 && 
               this.mouseDelta.y === 0;
    }

    /**
     * Cleans up event listeners and resources.
     * Removes all event listeners and exits pointer lock if active.
     */
    public cleanup(): void {
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