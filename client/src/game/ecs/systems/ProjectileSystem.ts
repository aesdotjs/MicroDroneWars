
import { world as ecsWorld } from '@shared/ecs/world';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createNetworkPredictionSystem } from './NetworkPredictionSystem';
import { TransformBuffer } from '@shared/ecs/types';
import { Vector3, Quaternion } from '@babylonjs/core';
/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    networkPredictionSystem: ReturnType<typeof createNetworkPredictionSystem>
) {

    return {
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform");
            for (const entity of projectiles) {
                if (entity.physics?.body) {
                    const transformBuffer: TransformBuffer = {
                        transform: {
                            position: new Vector3(entity.physics.body.position.x, entity.physics.body.position.y, entity.physics.body.position.z),
                            rotation: new Quaternion(entity.physics.body.quaternion.x, entity.physics.body.quaternion.y, entity.physics.body.quaternion.z, entity.physics.body.quaternion.w),
                            velocity: new Vector3(entity.physics.body.velocity.x, entity.physics.body.velocity.y, entity.physics.body.velocity.z),
                            angularVelocity: new Vector3(entity.physics.body.angularVelocity.x, entity.physics.body.angularVelocity.y, entity.physics.body.angularVelocity.z)
                        },
                        tick: {
                            tick: physicsWorldSystem.getCurrentTick(),
                            timestamp: Date.now(),
                            lastProcessedInputTimestamp: Date.now(),
                            lastProcessedInputTick: physicsWorldSystem.getCurrentTick()
                        }
                    };
                    networkPredictionSystem.addEntityState(entity.id, transformBuffer); 
                }
                // Update distance traveled
                const distance = entity.transform!.velocity.length() * dt;
                entity.projectile!.distanceTraveled += distance;
                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 