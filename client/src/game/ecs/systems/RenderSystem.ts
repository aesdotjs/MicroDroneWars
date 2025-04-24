import { Scene } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles rendering of entities in the scene
 */
export function createRenderSystem(scene: Scene) {
    const renderables = ecsWorld.with("mesh", "position");

    return {
        update: (dt: number) => {
            for (const entity of renderables) {
                if (!entity.mesh || !entity.position) continue;

                // Update position
                entity.mesh.position.copyFrom(entity.position);

                // Update rotation if available
                if (entity.rotation) {
                    entity.mesh.rotationQuaternion = entity.rotation;
                }

                // Update visibility based on entity state
                if (entity.health !== undefined) {
                    entity.mesh.isVisible = entity.health > 0;
                }
            }
        }
    };
} 