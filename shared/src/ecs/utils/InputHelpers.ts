import { InputComponent } from '../types';

/**
 * Creates a default idle input state
 */
export function createIdleInput(tick: number): InputComponent {
    return {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        pitchUp: false,
        pitchDown: false,
        yawLeft: false,
        yawRight: false,
        rollLeft: false,
        rollRight: false,
        fire: false,
        zoom: false,
        nextWeapon: false,
        previousWeapon: false,
        weapon1: false,
        weapon2: false,
        weapon3: false,
        mouseDelta: { x: 0, y: 0 },
        tick: tick,
        timestamp: Date.now()
    };
}