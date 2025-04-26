import { Scene } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles rendering of entities in the scene
 */
export function createRenderSystem(scene: Scene) {
    // Find entities with render and transform components
    const renderables = ecsWorld.with("render", "transform");

    return {
        update: (dt: number) => {
            for (const entity of renderables) {
                if (!entity.render?.mesh || !entity.transform) continue;

                // Update position
                entity.render.mesh.position.copyFrom(entity.transform.position);

                // Update rotation if available
                if (entity.transform.rotation) {
                    entity.render.mesh.rotationQuaternion = entity.transform.rotation;
                }
            }
        }
    };
} 