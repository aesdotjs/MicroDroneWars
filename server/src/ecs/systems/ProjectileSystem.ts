
import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';

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
                // Remove if exceeded range or has impact
                if (entity.projectile?.impact || entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                    continue;
                }
                if (entity.physics?.body) {
                    physicsWorldSystem.applyBodyTransform(entity, entity.physics.body);  
                }
                // Update distance traveled
                const distance = entity.transform!.velocity.length() * dt;
                entity.projectile!.distanceTraveled += distance;
            }
        }
    };
} 