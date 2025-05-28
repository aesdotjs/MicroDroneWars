import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, InputComponent, TransformBuffer } from '@shared/ecs/types';
import { createInputProcessorSystem } from './InputProcessorSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystem';
import { createStateSyncSystem } from './StateSyncSystem';
import { createProjectileSystem } from './ProjectileSystem';

export function createInputSystem(
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>,
    projectileSystem: ReturnType<typeof createProjectileSystem>,
    clientLatencies: Map<string, number>
) {
    const MAX_TRANSFORM_BUFFERS = 60;
    const MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps
    const inputBuffers = new Map<string, InputComponent[]>();
    const transformBuffers = new Map<string, TransformBuffer[]>();
    const inputProcessor = createInputProcessorSystem(physicsSystem, weaponSystem, projectileSystem);

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
                if (!transformBuffers.has(entity.owner!.id)) {
                    transformBuffers.set(entity.owner!.id, []);
                }

                const inputBuffer = inputBuffers.get(entity.owner!.id)!;
                const entityTransformBuffers = transformBuffers.get(entity.owner!.id)!;
                const updatedBuffer = inputProcessor.processInputs(entity, inputBuffer, entityTransformBuffers, dt, clientLatencies.get(entity.owner!.id) ?? 0);
                if (updatedBuffer) {
                    inputBuffers.set(entity.owner!.id, updatedBuffer);
                }
            }
        },

        addTransformBuffer: (id: string, transformBuffer: TransformBuffer) => {
            if (!transformBuffers.has(id)) {
                transformBuffers.set(id, []);
            }
            const buffer = transformBuffers.get(id)!;
            // Create a deep copy of the transform buffer to avoid reference issues
            const transformCopy: TransformBuffer = {
                transform: {
                    position: transformBuffer.transform.position.clone(),
                    rotation: transformBuffer.transform.rotation.clone(),
                    velocity: transformBuffer.transform.velocity.clone(),
                    angularVelocity: transformBuffer.transform.angularVelocity.clone()
                },
                tick: { ...transformBuffer.tick }
            };
            buffer.push(transformCopy);
            while (buffer.length > MAX_TRANSFORM_BUFFERS) {
                buffer.shift();
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
            transformBuffers.delete(id);
        }
    };
} 