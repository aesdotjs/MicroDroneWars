import * as CANNON from 'cannon-es';
import { Vector3, Quaternion, Matrix } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { CollisionGroups } from '../CollisionGroups';

/**
 * Creates a system that handles common vehicle physics
 */
export function createVehiclePhysicsSystem(cannonWorld: CANNON.World) {
    const vehicles = ecsWorld.with("body", "position", "rotation", "input", "drone", "plane");

    return {
        update: (dt: number) => {
            for (const entity of vehicles) {
                const body = entity.body!;
                const input = entity.input!;

                // Get orientation vectors
                const { right, up, forward } = getOrientationVectors(body);

                // Apply mouse control
                if (input.mouseDelta) {
                    const mouseXEffect = input.mouseDelta.x * 0.005;
                    const mouseYEffect = input.mouseDelta.y * 0.005;
                    
                    body.applyTorque(new CANNON.Vec3(
                        mouseYEffect * (entity.torque || 1),
                        mouseXEffect * (entity.torque || 1),
                        0
                    ));
                }

                // Apply angular damping
                body.angularVelocity.x *= 0.95;
                body.angularVelocity.y *= 0.95;
                body.angularVelocity.z *= 0.95;

                // Update entity position and rotation from physics body
                entity.position!.x = body.position.x;
                entity.position!.y = body.position.y;
                entity.position!.z = body.position.z;

                entity.rotation!.x = body.quaternion.x;
                entity.rotation!.y = body.quaternion.y;
                entity.rotation!.z = body.quaternion.z;
                entity.rotation!.w = body.quaternion.w;

                // Update velocities
                if (entity.velocity) {
                    entity.velocity.x = body.velocity.x;
                    entity.velocity.y = body.velocity.y;
                    entity.velocity.z = body.velocity.z;
                }

                if (entity.angularVelocity) {
                    entity.angularVelocity.x = body.angularVelocity.x;
                    entity.angularVelocity.y = body.angularVelocity.y;
                    entity.angularVelocity.z = body.angularVelocity.z;
                }
            }
        }
    };
}

/**
 * Gets the orientation vectors of a physics body
 */
function getOrientationVectors(body: CANNON.Body): { right: Vector3; up: Vector3; forward: Vector3 } {
    // Initialize vectors in local space
    let forward = new Vector3(0, 0, 1);
    let right = new Vector3(1, 0, 0);
    let up = new Vector3(0, 1, 0);

    // Transform vectors to world space using body's quaternion
    const quaternion = body.quaternion;
    const rotationMatrix = Matrix.FromQuaternionToRef(
        new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
        new Matrix()
    );

    forward = Vector3.TransformCoordinates(forward, rotationMatrix);
    right = Vector3.TransformCoordinates(right, rotationMatrix);
    up = Vector3.TransformCoordinates(up, rotationMatrix);

    return { forward, right, up };
} 