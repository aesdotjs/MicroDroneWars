import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createSceneSystem } from './SceneSystem';
import { ProjectileType, GameEntity } from '@shared/ecs/types';
import RAPIER from '@dimforge/rapier3d-deterministic-compat';

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    sceneSystem: ReturnType<typeof createSceneSystem>
) {
    const effectSystem = sceneSystem.getEffectSystem();

    function tickProjectile(entity: GameEntity, dt: number) {
        if (!entity.transform) return;
        // Get current velocity and position
        const velocity = entity.transform.velocity;
        const currentPos = entity.transform.position;
        
        // Calculate new position
        const movement = velocity.scale(dt);
        const newPos = currentPos.add(movement);

        // Update physics body position
        if (entity.physics?.body) {
            entity.physics.body.setNextKinematicTranslation(
                new RAPIER.Vector3(newPos.x, newPos.y, newPos.z)
            );
        }

        // Update transform position
        entity.transform.position.copyFrom(newPos);

        // Update distance traveled
        if (entity.projectile) {
            entity.projectile.distanceTraveled += movement.length();
        }
    }

    return {
        tickProjectile,
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform");
            for (const entity of projectiles) {
                if (!entity.render?.mesh) {
                    entity.render = { mesh: effectSystem.createProjectileMesh(entity) }
                }

                // Move the projectile if it's not impacted and is fake
                if (!entity.projectile?.impact && entity.projectile?.isFake) {
                    tickProjectile(entity, dt);
                }

                // Handle impact and removal
                if (entity.projectile?.impact) {
                    effectSystem.createImpactEffects(entity);
                    if (entity.projectile.projectileType === ProjectileType.Missile) {
                        physicsWorldSystem.applyMissileImpact(entity);
                    }
                    ecsWorld.remove(entity);
                }
                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 