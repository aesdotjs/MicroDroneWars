import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, InputComponent } from '@shared/ecs/types';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
// import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystems';
/**
 * Creates a system that processes inputs and applies them to vehicle and weapon systems
 */
export function createInputProcessorSystem(
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
) {
    const lastProcessedInputTicks = new Map<string, number>();
    const lastProcessedInputTimestamps = new Map<string, number>();

    return {
        /**
         * Processes inputs for an entity and applies them to vehicle and weapon systems
         */
        processInputs: (entity: GameEntity, inputBuffer: InputComponent[], dt: number) => {
            // Get last processed tick
            let lastProcessedTick = lastProcessedInputTicks.get(entity.id) ?? 0;
            if (!inputBuffer || inputBuffer.length === 0) {
                // Apply idle input if no inputs available
                // lastProcessedInputTicks.set(entity.id, lastProcessedTick + 1);
                const idleInput = createIdleInput(lastProcessedTick + 1);
                physicsSystem.update(dt, entity, idleInput);
                if (entity.vehicle?.weapons) {
                    weaponSystem.update(dt, entity, idleInput, lastProcessedTick + 1);
                }
                return [];
            }
            
            // Sort inputs by tick
            const sortedInputs = inputBuffer.sort((a, b) => a.tick - b.tick);
            
            // console.log(`[InputProcessor] Processing inputs for entity ${entity.id}:`, {
            //     bufferSize: inputBuffer.length,
            //     lastProcessedTick,
            //     currentTick: physicsWorldSystem.getCurrentTick(),
            //     oldestInputTick: sortedInputs[0]?.tick,
            //     newestInputTick: sortedInputs[sortedInputs.length - 1]?.tick
            // });
            
            // Process each input in order
            let processedCount = 0;
            for (const input of sortedInputs) {
                if (input.tick > lastProcessedTick) {
                    physicsSystem.update(dt, entity, input);
                    // Set fire to true on the next processed input if the current input is a fire and the weapon is on cooldown
                    if (input.fire && input.projectileId && weaponSystem.isOnCooldown(entity)) {
                        const nextInput = sortedInputs[processedCount];
                        if (nextInput) {
                            nextInput.fire = true;
                            nextInput.projectileId = input.projectileId;
                        }
                    }
                    // Always update weapon system if entity has weapons
                    if (entity.vehicle?.weapons) {
                        weaponSystem.update(dt, entity, input, input.tick);
                    }
                    lastProcessedTick = input.tick;
                    processedCount++;
                }
            }

            // Update last processed tick and timestamp
            if (processedCount > 0) {
                // console.log(`[InputProcessor] Processed ${processedCount} inputs for entity ${entity.id}. New lastProcessedTick: ${lastProcessedTick}`);
                lastProcessedInputTicks.set(entity.id, lastProcessedTick);
                lastProcessedInputTimestamps.set(entity.id, Date.now());
            } 

            // Return only unprocessed inputs
            return sortedInputs.filter(input => input.tick > lastProcessedTick);
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
