
import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createSceneSystem } from './SceneSystem';
import { Vector3 } from '@babylonjs/core';
/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    sceneSystem: ReturnType<typeof createSceneSystem>
) {
    const effectSystem = sceneSystem.getEffectSystem();
    return {
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform");
            for (const entity of projectiles) {
                // Remove if exceeded range or has impact
                if (entity.projectile?.impact) {
                    effectSystem.createImpactEffects(entity);
                    ecsWorld.remove(entity);
                    continue;
                }
                if (entity.physics?.body) {
                    physicsWorldSystem.applyBodyTransform(entity, entity.physics.body);  
                }
            }
        }
    };
} 