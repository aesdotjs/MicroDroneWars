import { ArcRotateCamera, Vector3, Quaternion, Scene, Matrix } from '@babylonjs/core';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles camera control and following
 */
export function createCameraSystem(scene: Scene, camera: ArcRotateCamera) {
    console.log('Creating camera system...');
    
    // Find local player using owner component
    let attachedEntity: GameEntity | null = null;
    const FOLLOW_DISTANCE = 3;
    const FOLLOW_HEIGHT = 1;
    const FOLLOW_SPEED = 0.1;
    const ROTATION_SPEED = 0.1;

    // Query for local player vehicle
    const localPlayerQuery = ecsWorld.with("owner", "transform", "vehicle", "render").where(
        ({owner}) => owner?.isLocal
    );

    const attachCamera = (entity: GameEntity) => {
        attachedEntity = entity;
        console.log('Camera attached to entity:', attachedEntity.id);
    }

    return {
        attachCamera,
        detachCamera: () => {
            attachedEntity = null;
            console.log('Camera detached');
        },
        update: (dt: number) => {
            // If no entity is attached, try to find and attach to local player
            if (!attachedEntity) {
                const localPlayer = localPlayerQuery.entities[0];
                if (localPlayer && localPlayer.render!.mesh) {
                    attachCamera(localPlayer);
                } else {
                    return;
                }
            }

            if (!attachedEntity?.transform) {
                return;
            }
            const position = attachedEntity.transform.position;
            const quaternion = attachedEntity.transform.rotation;

            // Get the forward vector from the quaternion
            const forward = new Vector3(0, 0, 1);
            const up = new Vector3(0, 1, 0);
            forward.rotateByQuaternionToRef(quaternion, forward);
            up.rotateByQuaternionToRef(quaternion, up);

            // Calculate camera position using spherical coordinates
            const distance = FOLLOW_DISTANCE;
            const heightOffset = FOLLOW_HEIGHT;

            // Get the vehicle's forward direction projected onto XZ plane
            const forwardFlat = new Vector3(forward.x, 0, forward.z).normalize();

            // Calculate pitch angle (clamped to prevent flip)
            const pitchAngle = Math.asin(forward.y);
            const clampedPitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitchAngle));
            
            // Calculate camera position
            const cameraPos = position.clone();
            cameraPos.addInPlace(new Vector3(
                -forwardFlat.x * distance * Math.cos(-clampedPitch),
                heightOffset + distance * Math.sin(-clampedPitch),
                -forwardFlat.z * distance * Math.cos(-clampedPitch)
            ));

            // Update camera position and target
            camera.position = cameraPos;
            camera.target = position;
        }
    };
} 