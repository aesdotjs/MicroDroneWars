
import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { ProjectileType } from '@shared/ecs/types';

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {

    return {
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform");
            for (const entity of projectiles) {
                if (entity.projectile?.impact) {
                    if (entity.projectile.projectileType === ProjectileType.Missile) {
                        physicsWorldSystem.applyMissileImpact(entity);
                    }
                    console.log('remove projectile', entity.id);
                    ecsWorld.remove(entity);
                    continue;
                }
                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                    continue;
                }
                // Update distance traveled
                const distance = entity.transform!.velocity.length() * dt;
                entity.projectile!.distanceTraveled += distance;
            }
        }
    };
} 