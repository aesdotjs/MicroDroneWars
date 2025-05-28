import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { ProjectileType, GameEntity, EntityType, ImpactComponent } from '@shared/ecs/types';
import { Vector3 } from '@babylonjs/core';
import RAPIER from '@dimforge/rapier3d-deterministic-compat';

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    function tickProjectile(entity: GameEntity, dt: number) {
        if (!entity.transform || !entity.physics?.body) return;

        // Check for collision before moving
        const impact = physicsWorldSystem.checkCollision(entity, dt);
        if (impact) {
            // Set impact and let the update loop handle removal
            entity.projectile!.impact = impact;
            return;
        }

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
        // entity.transform.position.copyFrom(newPos);

        // Update distance traveled
        if (entity.projectile) {
            entity.projectile.distanceTraveled += movement.length();
        }
    }

    return {
        tickProjectile,
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform", "physics");
            for (const entity of projectiles) {
                if (entity.projectile?.impact) {
                    if (entity.projectile.projectileType === ProjectileType.Missile) {
                        physicsWorldSystem.applyMissileImpact(entity);
                    }
                    ecsWorld.remove(entity);
                    continue;
                }

                // Move the projectile
                tickProjectile(entity, dt);

                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 