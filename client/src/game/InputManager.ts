import { PhysicsInput } from '@shared/physics/types';
import { KeyBinding } from './KeyBinding';

export class InputManager {
    private canvas: HTMLCanvasElement;
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
    private mouseDelta: { x: number; y: number };
    private hasFocus: boolean;
    private isPointerLocked: boolean;

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

    private handleMouseMove(event: MouseEvent): void {
        // Check both hasFocus and isPointerLocked since we want to accept input when either is true
        if (!this.hasFocus || !this.isPointerLocked) {
            return;
        }

        // Accumulate mouse movement
        this.mouseDelta.x += event.movementX;
        this.mouseDelta.y += event.movementY;
    }

    private handleFocus(): void {
        this.hasFocus = true;
        console.log('Canvas focused');
    }

    private handleBlur(): void {
        this.hasFocus = false;
        console.log('Canvas blurred');
    }

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

    private handleMouseDown(event: MouseEvent): void {
        this.handleClick();
        if (event.button === 2) { // Right click
            this.keys.zoom.setPressed(true);
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 2) { // Right click
            this.keys.zoom.setPressed(false);
        }
    }

    public getInput(): PhysicsInput {
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
            mouseDelta: currentMouseDelta
        };

        return input;
    }

    public resetMouseDelta(): void {
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }

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