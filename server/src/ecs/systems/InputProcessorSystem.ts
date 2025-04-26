import { world as ecsWorld } from '../../../../shared/src/ecs/world';
import { GameEntity, InputComponent } from '../../../../shared/src/ecs/types';
import { createIdleInput } from './InputSystems';
import { createDroneSystem } from '../../../../shared/src/ecs/systems/VehicleSystems';
import { createPlaneSystem } from '../../../../shared/src/ecs/systems/VehicleSystems';
import { createWeaponSystem } from '../../../../shared/src/ecs/systems/WeaponSystems';

/**
 * Creates a system that processes inputs and applies them to vehicle and weapon systems
 */
export function createInputProcessorSystem(
    droneSystem: ReturnType<typeof createDroneSystem>,
    planeSystem: ReturnType<typeof createPlaneSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
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
                const idleInput = createIdleInput(entity.tick!.tick);
                droneSystem.update(dt, entity, idleInput);
                planeSystem.update(dt, entity, idleInput);
                weaponSystem.update(dt, entity, idleInput);
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
                    droneSystem.update(dt, entity, input);
                    planeSystem.update(dt, entity, input);
                    weaponSystem.update(dt, entity, input);
                    lastProcessedTick = input.tick;
                    processedCount++;
                }
            }

            // Update last processed tick and timestamp
            if (processedCount > 0) {
                lastProcessedInputTicks.set(entity.id, lastProcessedTick);
                lastProcessedInputTimestamps.set(entity.id, Date.now());
            }

            // Return number of processed inputs
            return processedCount;
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
         * Cleans up resources for an entity
         */
        cleanup: (id: string) => {
            lastProcessedInputTicks.delete(id);
            lastProcessedInputTimestamps.delete(id);
        }
    };
}
