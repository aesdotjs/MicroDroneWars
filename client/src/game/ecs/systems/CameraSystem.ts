import { UniversalCamera, Vector3, Quaternion, Scene, Matrix } from 'babylonjs';
import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';

/**
 * Creates a system that handles camera control and following
 */
export function createCameraSystem(scene: Scene, camera: UniversalCamera) {
    const localPlayer = ecsWorld.with("drone", "plane", "position", "rotation").first;
    const FOLLOW_DISTANCE = 10;
    const FOLLOW_HEIGHT = 5;
    const FOLLOW_OFFSET = new Vector3(0, FOLLOW_HEIGHT, FOLLOW_DISTANCE);
    const FOLLOW_SPEED = 0.1;
    const ROTATION_SPEED = 0.1;

    return {
        update: (dt: number) => {
            if (!localPlayer || !localPlayer.position || !localPlayer.rotation) return;

            // Calculate target position
            const targetPosition = localPlayer.position.clone();
            const targetRotation = localPlayer.rotation.clone();

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