import { UniversalCamera, Vector3, Quaternion, Scene, Matrix } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles camera control and following
 */
export function createCameraSystem(scene: Scene, camera: UniversalCamera) {
    console.log('Creating camera system...');
    
    // Find local player using owner component
    let attachedEntity: GameEntity | null = null;
    const FOLLOW_DISTANCE = 10;
    const FOLLOW_HEIGHT = 5;
    const FOLLOW_OFFSET = new Vector3(0, FOLLOW_HEIGHT, FOLLOW_DISTANCE);
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

            // Calculate target position
            const targetPosition = attachedEntity.transform.position.clone();
            const targetRotation = attachedEntity.transform.rotation.clone();

            // Transform follow offset by player rotation
            const rotatedOffset = FOLLOW_OFFSET.clone();
            const rotationMatrix = new Matrix();
            targetRotation.toRotationMatrix(rotationMatrix);
            Vector3.TransformNormalToRef(rotatedOffset, rotationMatrix, rotatedOffset);

            // Calculate desired camera position
            const desiredPosition = targetPosition.add(rotatedOffset);

            // Smoothly move camera
            camera.position = Vector3.Lerp(
                camera.position,
                desiredPosition,
                FOLLOW_SPEED
            );

            // Smoothly rotate camera to look at player
            const currentLookDirection = camera.getDirection(Vector3.Forward());
            const targetLookDirection = targetPosition.subtract(camera.position).normalize();
            const newLookDirection = Vector3.Lerp(
                currentLookDirection,
                targetLookDirection,
                ROTATION_SPEED
            );

            // Set camera rotation to look at player
            const lookAt = camera.position.add(newLookDirection);
            camera.setTarget(lookAt);
        }
    };
} 