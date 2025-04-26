import { world as ecsWorld } from '../../../../shared/src/ecs/world';
import { GameEntity, InputComponent } from '../../../../shared/src/ecs/types';
import { createInputProcessorSystem } from './InputProcessorSystem';
import { createDroneSystem } from '../../../../shared/src/ecs/systems/VehicleSystems';
import { createPlaneSystem } from '../../../../shared/src/ecs/systems/VehicleSystems';
import { createWeaponSystem } from '../../../../shared/src/ecs/systems/WeaponSystems';

const MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps

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

export function createInputSystem(
    droneSystem: ReturnType<typeof createDroneSystem>,
    planeSystem: ReturnType<typeof createPlaneSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
) {
    const inputBuffers = new Map<string, InputComponent[]>();
    const inputProcessor = createInputProcessorSystem(droneSystem, planeSystem, weaponSystem);

    return {
        addInput: (id: string, input: InputComponent) => {
            if (!inputBuffers.has(id)) {
                inputBuffers.set(id, []);
            }
            const buffer = inputBuffers.get(id)!;
            buffer.push(input);
            
            // Keep buffer size reasonable
            while (buffer.length > MAX_INPUT_BUFFER_SIZE) {
                buffer.shift();
            }
        },

        update: (dt: number) => {
            const entities = ecsWorld.with("vehicle", "physics", "tick");
            
            for (const entity of entities) {
                if (!inputBuffers.has(entity.id)) {
                    inputBuffers.set(entity.id, []);
                }

                const buffer = inputBuffers.get(entity.id)!;
                inputProcessor.processInputs(entity, buffer, dt);
            }
        },

        getLastProcessedInputTick: (id: string): number => {
            return inputProcessor.getLastProcessedInputTick(id);
        },

        getLastProcessedInputTimestamp: (id: string): number => {
            return inputProcessor.getLastProcessedInputTimestamp(id);
        },

        cleanup: (id: string) => {
            inputBuffers.delete(id);
            inputProcessor.cleanup(id);
        }
    };
} 