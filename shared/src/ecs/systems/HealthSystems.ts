import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
/**
 * Health system that handles damage and entity destruction
 */
export function createHealthSystem() {
    const damageableEntities = ecsWorld.with("gameState");

    return {
        update: (dt: number) => {
            for (const entity of damageableEntities) {
                // Check for destruction
                if (entity.gameState!.health <= 0) {
                    // Handle vehicle destruction
                    if (entity.vehicle) {
                        // TODO: Trigger destruction effects
                        // For now, just remove the entity
                        // ecsWorld.remove(entity);
                    }
                }
            }
        }
    };
} 