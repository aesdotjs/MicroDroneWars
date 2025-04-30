import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, InputComponent } from '@shared/ecs/types';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';

/**
 * Creates a system that processes inputs and applies them to vehicle and weapon systems
 */
export function createInputProcessorSystem(
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const lastProcessedInputTicks = new Map<string, number>();
    const lastProcessedInputTimestamps = new Map<string, number>();

    return {
        /**
         * Processes inputs for an entity and applies them to vehicle and weapon systems
         */
        processInputs: (entity: GameEntity, inputBuffer: InputComponent[], dt: number) => {
            if (!inputBuffer || inputBuffer.length === 0) {
                // Apply idle input if no inputs available
                const idleInput = createIdleInput(physicsWorldSystem.getCurrentTick());
                physicsSystem.update(dt, entity, idleInput);
                return;
            }

            // Get last processed tick
            let lastProcessedTick = lastProcessedInputTicks.get(entity.id) ?? 0;
            
            // Sort inputs by tick
            const sortedInputs = inputBuffer.sort((a, b) => a.tick - b.tick);
            
            // Process each input in order
            let processedCount = 0;
            for (const input of sortedInputs) {
                if (input.tick > lastProcessedTick) {
                    physicsSystem.update(dt, entity, input);
                    lastProcessedTick = input.tick;
                    processedCount++;
                }
            }
            sortedInputs.splice(0, processedCount);
            // Update last processed tick and timestamp
            if (processedCount > 0) {
                lastProcessedInputTicks.set(entity.id, lastProcessedTick);
                lastProcessedInputTimestamps.set(entity.id, Date.now());
            }

            // Return number of processed inputs
            return sortedInputs;
        },

        /**
         * Gets the last processed input tick for an entity
         */
        getLastProcessedInputTick: (id: string): number => {
            return lastProcessedInputTicks.get(id) || 0;
        },

        /**
         * Gets the last processed input timestamp for an entity
         */
        getLastProcessedInputTimestamp: (id: string): number => {
            return lastProcessedInputTimestamps.get(id) || Date.now();
        },

        /**
         * Sets the last processed input tick for an entity
         */
        setLastProcessedInputTick: (id: string, tick: number) => {
            lastProcessedInputTicks.set(id, tick);
        },

        /**
         * Sets the last processed input timestamp for an entity
         */
        setLastProcessedInputTimestamp: (id: string, timestamp: number) => {
            lastProcessedInputTimestamps.set(id, timestamp);
        },

        /**
         * Cleans up resources for an entity
         */
        cleanup: (id: string) => {
            lastProcessedInputTicks.delete(id);
            lastProcessedInputTimestamps.delete(id);
        }
    };
}
