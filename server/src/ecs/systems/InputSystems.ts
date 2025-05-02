import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, InputComponent } from '@shared/ecs/types';
import { createInputProcessorSystem } from './InputProcessorSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
const MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystems';

export function createInputSystem(
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
) {
    const inputBuffers = new Map<string, InputComponent[]>();
    const inputProcessor = createInputProcessorSystem(physicsSystem, weaponSystem);

    return {
        inputProcessor,
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
            const entities = ecsWorld.with("vehicle", "physics", "tick", "owner");
            
            for (const entity of entities) {
                if (!inputBuffers.has(entity.owner!.id)) {
                    inputBuffers.set(entity.owner!.id, []);
                }

                const buffer = inputBuffers.get(entity.owner!.id)!;
                const updatedBuffer = inputProcessor.processInputs(entity, buffer, dt);
                if (updatedBuffer) {
                    inputBuffers.set(entity.owner!.id, updatedBuffer);
                }
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