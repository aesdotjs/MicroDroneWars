import { ArcRotateCamera, Vector3, Quaternion, Scene, Matrix } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles camera control and following
 */
export function createCameraSystem(scene: Scene, camera: ArcRotateCamera) {
    console.log('Creating camera system...');
    
    // Find local player using owner component
    let attachedEntity: GameEntity | null = null;
    const FOLLOW_DISTANCE = 10;
    const FOLLOW_HEIGHT = 5;
    const FOLLOW_SPEED = 0.1;
    const ROTATION_SPEED = 0.1;

    return {
        attachCamera: (entity: GameEntity) => {
            attachedEntity = entity;
            console.log('Camera attached to entity:', attachedEntity.id);
        },
        detachCamera: () => {
            attachedEntity = null;
            console.log('Camera detached');
        },
        update: (dt: number) => {
            if (!attachedEntity || !attachedEntity.transform) {
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
            camera.target = position.add(new Vector3(0, 2, 0));
        }
    };
} 