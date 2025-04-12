import { PhysicsInput } from '../../shared/src/physics/types';
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
            forward: new KeyBinding('w'),
            backward: new KeyBinding('s'),
            left: new KeyBinding('a'),
            right: new KeyBinding('d'),
            up: new KeyBinding(' '),
            down: new KeyBinding('shift'),
            
            // Rotation
            pitchUp: new KeyBinding('arrowup'),
            pitchDown: new KeyBinding('arrowdown'),
            yawLeft: new KeyBinding('arrowleft'),
            yawRight: new KeyBinding('arrowright'),
            rollLeft: new KeyBinding('q'),
            rollRight: new KeyBinding('e'),
            
            // Other controls
            fire: new KeyBinding(' '),
            zoom: new KeyBinding('r')
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
                const promise = (this.canvas as any).requestPointerLock();
                if (promise) {
                    promise.then(() => {
                        console.log('Pointer lock acquired');
                    }).catch((err: Error) => {
                        console.warn('Pointer lock request failed:', err);
                    });
                }
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === (this.canvas as unknown as Element);
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

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.hasFocus) {
            console.log('Key pressed but canvas not focused');
            return;
        }

        const key = event.key.toLowerCase();
        Object.values(this.keys).forEach(binding => {
            if (binding.getKey() === key) {
                binding.setPressed(true);
            }
        });
    }

    private handleKeyUp(event: KeyboardEvent): void {
        if (!this.hasFocus) return;

        const key = event.key.toLowerCase();
        Object.values(this.keys).forEach(binding => {
            if (binding.getKey() === key) {
                binding.setPressed(false);
            }
        });
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.isPointerLocked) {
            this.mouseDelta.x = event.movementX;
            this.mouseDelta.y = event.movementY;
        }
    }

    private handleFocus(): void {
        this.hasFocus = true;
        console.log('Canvas focused');
    }

    private handleBlur(): void {
        this.hasFocus = false;
        // Reset all keys when focus is lost
        Object.values(this.keys).forEach(binding => {
            binding.setPressed(false);
        });
        console.log('Canvas blurred');
    }

    private handleClick(): void {
        console.log('Canvas clicked');
        this.canvas.focus();
        this.hasFocus = true;
        if (!this.isPointerLocked) {
            const promise = (this.canvas as any).requestPointerLock();
            if (promise) {
                promise.then(() => {
                    console.log('Pointer lock acquired');
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

        return {
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
            mouseDelta: { ...this.mouseDelta }
        };
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