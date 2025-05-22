import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity, InputComponent, TransformBuffer } from '@shared/ecs/types';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
// import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystem';
/**
 * Creates a system that processes inputs and applies them to vehicle and weapon systems
 */
export function createInputProcessorSystem(
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
) {
    const lastProcessedInputTicks = new Map<string, number>();
    const lastProcessedInputTimestamps = new Map<string, number>();
    const pendingProjectileIds = new Map<string, number>();

    return {
        /**
         * Processes inputs for an entity and applies them to vehicle and weapon systems
         */
        processInputs: (entity: GameEntity, inputBuffer: InputComponent[], transformBuffers: TransformBuffer[], dt: number) => {
            // Get last processed tick
            let lastProcessedTick = lastProcessedInputTicks.get(entity.id) ?? 0;
            let lastProcessedTimestamp = lastProcessedInputTimestamps.get(entity.id) ?? Date.now();
            // Sort inputs by tick
            const sortedInputs = inputBuffer.sort((a, b) => a.tick - b.tick);
            
            // console.log(`[InputProcessor] Processing inputs for entity ${entity.id}:`, {
            //     bufferSize: inputBuffer.length,
            //     lastProcessedTick,
            //     oldestInputTick: sortedInputs[0]?.tick,
            //     newestInputTick: sortedInputs[sortedInputs.length - 1]?.tick
            // });
            
            // Process each input in order
            let processedCount = 0;
            for (const input of sortedInputs) {
                if (input.tick > lastProcessedTick) {
                    physicsSystem.applyInput(dt, entity, input);
                    // Always update weapon system if entity has weapons
                    if (entity.vehicle?.weapons) {
                        if (input.fire && input.projectileId) {
                            pendingProjectileIds.set(entity.id, input.projectileId);
                            
                            // Find the transform state at the time of firing
                            const inputTime = input.timestamp;
                            const sortedTransforms = transformBuffers.sort((a, b) => 
                                Math.abs(a.tick.timestamp - inputTime) - Math.abs(b.tick.timestamp - inputTime)
                            );
                            
                            // Get the closest transform state to the input time
                            const closestTransform = sortedTransforms[0];
                            const timeDelta = (Date.now() - inputTime) / 1000; // Convert to seconds

                            input.projectileId = pendingProjectileIds.get(entity.id) ?? input.projectileId;
                            const projectileId = weaponSystem.applyInput(dt, entity, input, timeDelta, closestTransform);
                            if (projectileId) {
                                // projectile created, remove from pending projectile ids
                                pendingProjectileIds.delete(entity.id);
                            }
                        }
                    }
                    lastProcessedTick = input.tick;
                    lastProcessedTimestamp = input.timestamp;
                    processedCount++;
                }
            }

            // Update last processed tick and timestamp
            if (processedCount > 0) {
                // console.log(`[InputProcessor] Processed ${processedCount} inputs for entity ${entity.id}. New lastProcessedTick: ${lastProcessedTick}`);
                lastProcessedInputTicks.set(entity.id, lastProcessedTick);
                lastProcessedInputTimestamps.set(entity.id, lastProcessedTimestamp);
            } 
            // const nextInput = inputBuffer.shift();
            // if (nextInput) {
            //     physicsSystem.applyInput(dt, entity, nextInput);
            //     if (entity.vehicle?.weapons) {
            //         weaponSystem.applyInput(dt, entity, nextInput, nextInput.tick);
            //     }
            //     lastProcessedInputTicks.set(entity.id, nextInput.tick);
            //     lastProcessedInputTimestamps.set(entity.id, nextInput.timestamp);
            //     lastProcessedTick = nextInput.tick;
            // }

            // return inputBuffer.filter(input => input.tick > lastProcessedTick);
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
