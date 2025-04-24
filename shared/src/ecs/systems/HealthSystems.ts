import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';

/**
 * Health system that handles damage and entity destruction
 */
export function createHealthSystem() {
    const damageableEntities = ecsWorld.with("health", "maxHealth");

    return {
        update: (dt: number) => {
            for (const entity of damageableEntities) {
                // Check for destruction
                if (entity.health! <= 0) {
                    // Handle vehicle destruction
                    if (entity.drone || entity.plane) {
                        // TODO: Trigger destruction effects
                        // For now, just remove the entity
                        ecsWorld.remove(entity);
                    }
                    // Handle projectile destruction
                    else if (entity.projectile) {
                        ecsWorld.remove(entity);
                    }
                }

                // Regenerate health if below max
                if (entity.health! < entity.maxHealth!) {
                    // Regenerate 1 health per second
                    entity.health = Math.min(
                        entity.maxHealth!,
                        entity.health! + dt
                    );
                }
            }
        }
    };
} 