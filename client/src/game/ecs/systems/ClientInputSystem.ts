import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, PhysicsInput } from '@shared/ecs/types';

/**
 * Creates a system that handles client-side input processing
 */
export function createClientInputSystem(canvas: HTMLCanvasElement) {
    const keys = new Map<string, boolean>();
    const mouseDelta = { x: 0, y: 0 };
    let hasFocus = false;
    let isPointerLocked = false;

    // Key bindings
    const keyBindings = {
        // Movement
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        up: 'Space',
        down: 'ShiftLeft',
        
        // Rotation
        pitchUp: 'ArrowUp',
        pitchDown: 'ArrowDown',
        yawLeft: 'ArrowLeft',
        yawRight: 'ArrowRight',
        rollLeft: 'KeyQ',
        rollRight: 'KeyE',
        
        // Weapon controls
        fire: 'MouseLeft',
        nextWeapon: 'MouseWheelUp',
        previousWeapon: 'MouseWheelDown',
        weapon1: '1',
        weapon2: '2',
        weapon3: '3',
        zoom: 'MouseRight'
    };

    // Event handlers
    const handleKeyDown = (event: KeyboardEvent) => {
        if (!hasFocus && !isPointerLocked) return;
        if (hasFocus || isPointerLocked) event.preventDefault();
        keys.set(event.code, true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
        if (!hasFocus && !isPointerLocked) return;
        keys.set(event.code, false);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!hasFocus || !isPointerLocked) return;
        mouseDelta.x += event.movementX;
        mouseDelta.y += event.movementY;
    };

    const handleFocus = () => {
        hasFocus = true;
    };

    const handleBlur = () => {
        hasFocus = false;
    };

    const handleClick = () => {
        if (!isPointerLocked) {
            const promise = (canvas as any).requestPointerLock();
            if (promise) {
                promise.then(() => {
                    hasFocus = true;
                }).catch((err: Error) => {
                    console.warn('Pointer lock request failed:', err);
                });
            }
        }
    };

    const handleMouseDown = (event: MouseEvent) => {
        handleClick();
        if (event.button === 0) keys.set('MouseLeft', true);
        else if (event.button === 2) keys.set('MouseRight', true);
    };

    const handleMouseUp = (event: MouseEvent) => {
        if (event.button === 0) keys.set('MouseLeft', false);
        else if (event.button === 2) keys.set('MouseRight', false);
    };

    // Set up canvas
    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';
    canvas.focus();

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Set up pointer lock change handler
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === (canvas as unknown as Element);
        if (isPointerLocked) hasFocus = true;
    });

    return {
        update: (dt: number) => {
            const localPlayer = ecsWorld.with("drone", "plane", "input").first;
            if (!localPlayer) return;

            // Create input state
            const input: PhysicsInput = {
                forward: keys.get(keyBindings.forward) || false,
                backward: keys.get(keyBindings.backward) || false,
                left: keys.get(keyBindings.left) || false,
                right: keys.get(keyBindings.right) || false,
                up: keys.get(keyBindings.up) || false,
                down: keys.get(keyBindings.down) || false,
                pitchUp: keys.get(keyBindings.pitchUp) || false,
                pitchDown: keys.get(keyBindings.pitchDown) || false,
                yawLeft: keys.get(keyBindings.yawLeft) || false,
                yawRight: keys.get(keyBindings.yawRight) || false,
                rollLeft: keys.get(keyBindings.rollLeft) || false,
                rollRight: keys.get(keyBindings.rollRight) || false,
                fire: keys.get(keyBindings.fire) || false,
                zoom: keys.get(keyBindings.zoom) || false,
                nextWeapon: keys.get(keyBindings.nextWeapon) || false,
                previousWeapon: keys.get(keyBindings.previousWeapon) || false,
                weapon1: keys.get(keyBindings.weapon1) || false,
                weapon2: keys.get(keyBindings.weapon2) || false,
                weapon3: keys.get(keyBindings.weapon3) || false,
                mouseDelta: { x: mouseDelta.x, y: mouseDelta.y },
                timestamp: Date.now(),
                tick: 0 // Will be set by physics system
            };

            // Update entity input
            localPlayer.input = input;

            // Reset mouse delta
            mouseDelta.x = 0;
            mouseDelta.y = 0;
        },

        isIdle: () => {
            return !Array.from(keys.values()).some(v => v) && 
                   mouseDelta.x === 0 && 
                   mouseDelta.y === 0;
        },

        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('focus', handleFocus);
            canvas.removeEventListener('blur', handleBlur);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mouseup', handleMouseUp);
            
            if (isPointerLocked) {
                document.exitPointerLock();
            }
        }
    };
} 