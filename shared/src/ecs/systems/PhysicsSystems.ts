import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';

/**
 * Physics system that updates entity positions and rotations based on physics bodies
 */
export function createPhysicsSystem(cannonWorld: CANNON.World) {
    const physicsEntities = ecsWorld.with("body", "position", "rotation");

    return {
        update: (dt: number) => {
            // Step the physics world
            cannonWorld.step(1/60, dt, 3);

            // Update entity positions and rotations from physics bodies
            for (const entity of physicsEntities) {
                const body = entity.body!;
                
                // Update position
                entity.position!.x = body.position.x;
                entity.position!.y = body.position.y;
                entity.position!.z = body.position.z;

                // Update rotation
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
 * Vehicle control system that applies forces based on input
 */
export function createVehicleControlSystem(cannonWorld: CANNON.World) {
    const controllableVehicles = ecsWorld.with("body", "input", "drone", "plane");

    return function vehicleControlSystem(dt: number) {
        for (const entity of controllableVehicles) {
            const body = entity.body!;
            const input = entity.input!;

            // Get orientation vectors
            const forward = new Vector3(0, 0, 1);
            const right = new Vector3(1, 0, 0);
            const up = new Vector3(0, 1, 0);

            // Apply forces based on input
            if (input.forward) {
                body.applyLocalForce(
                    new CANNON.Vec3(0, 0, entity.thrust || 10),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
            if (input.backward) {
                body.applyLocalForce(
                    new CANNON.Vec3(0, 0, -(entity.thrust || 10)),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
            if (input.left) {
                body.applyLocalForce(
                    new CANNON.Vec3(-(entity.strafeForce || 5), 0, 0),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
            if (input.right) {
                body.applyLocalForce(
                    new CANNON.Vec3(entity.strafeForce || 5, 0, 0),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
            if (input.up) {
                body.applyLocalForce(
                    new CANNON.Vec3(0, entity.lift || 10, 0),
                    new CANNON.Vec3(0, 0, 0)
                );
            }
            if (input.down) {
                body.applyLocalForce(
                    new CANNON.Vec3(0, -(entity.lift || 10), 0),
                    new CANNON.Vec3(0, 0, 0)
                );
            }

            // Apply rotation based on input
            if (input.yawLeft) {
                body.applyTorque(new CANNON.Vec3(0, entity.torque || 1, 0));
            }
            if (input.yawRight) {
                body.applyTorque(new CANNON.Vec3(0, -(entity.torque || 1), 0));
            }
            if (input.pitchUp) {
                body.applyTorque(new CANNON.Vec3(entity.torque || 1, 0, 0));
            }
            if (input.pitchDown) {
                body.applyTorque(new CANNON.Vec3(-(entity.torque || 1), 0, 0));
            }
            if (input.rollLeft) {
                body.applyTorque(new CANNON.Vec3(0, 0, entity.torque || 1));
            }
            if (input.rollRight) {
                body.applyTorque(new CANNON.Vec3(0, 0, -(entity.torque || 1)));
            }

            // Apply mouse control if present
            if (input.mouseDelta) {
                const mouseXEffect = input.mouseDelta.x * 0.005;
                const mouseYEffect = input.mouseDelta.y * 0.005;
                
                body.applyTorque(new CANNON.Vec3(
                    mouseYEffect * (entity.torque || 1),
                    mouseXEffect * (entity.torque || 1),
                    0
                ));
            }
        }
    };
}