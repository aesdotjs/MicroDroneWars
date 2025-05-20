import { Vector3, Quaternion, Matrix } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, InputComponent, VehicleType } from '../types';
import { PlaneSettings } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
import * as RAPIER from '@dimforge/rapier3d-deterministic-compat';

/**
 * Creates a system that handles plane-specific physics
 */
export function createPlaneSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const planes = ecsWorld.with("vehicle", "physics", "transform").where(({vehicle}) => vehicle.vehicleType === VehicleType.Plane);
    const enginePower = new Map<string, number>();
    const lastDrag = new Map<string, number>();

    // Constants for plane control
    const PLANE_MOUSE_SENSITIVITY = 0.02;
    const PLANE_MAX_PITCH = Math.PI / 2.5;

    return {
        update: (dt: number) => {
            for (const entity of planes) {
                if (!entity.physics || !entity.physics.body) continue;
                const body = entity.physics.body;
                const settings = PlaneSettings;

                // Initialize engine power if needed
                if (!enginePower.has(entity.id)) {
                    enginePower.set(entity.id, 0);
                }
                if (!lastDrag.has(entity.id)) {
                    lastDrag.set(entity.id, 0);
                }

                // Get orientation vectors
                const { right, up, forward } = getOrientationVectors(body);

                // Calculate velocity and speed
                const linvel = body.linvel();
                const velocity = new Vector3(linvel.x, linvel.y, linvel.z);
                const forwardVec = new Vector3(forward.x, forward.y, forward.z);
                const currentSpeed = Vector3.Dot(velocity, forwardVec);

                // Flight mode influence based on speed
                let flightModeInfluence = currentSpeed / 10;
                flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

                // Mass adjustment based on speed
                let lowerMassInfluence = currentSpeed / 10;
                lowerMassInfluence = Math.min(Math.max(lowerMassInfluence, 0), 1);
                // Rapier does not allow direct mass set, so skip

                // Scale control inputs by deltaTime and 60fps for consistent behavior
                const controlScale = dt;

                // Rotation stabilization
                let lookVelocity = velocity.clone();
                const velLength = lookVelocity.length();
                
                if (velLength > 0.1) {
                    lookVelocity.normalize();
                    const rotStabVelocity = new Quaternion();
                    const axis = new Vector3();
                    const dot = Vector3.Dot(forwardVec, lookVelocity);
                    const clampedDot = Math.max(-1, Math.min(1, dot));
                    const angle = Math.acos(clampedDot);
                    if (angle > 0.001) {
                        Vector3.CrossToRef(forwardVec, lookVelocity, axis);
                        const axisLength = axis.length();
                        if (axisLength > 0.001) {
                            axis.normalize();
                            Quaternion.RotationAxisToRef(axis, angle, rotStabVelocity);
                            rotStabVelocity.x *= 0.3;
                            rotStabVelocity.y *= 0.3;
                            rotStabVelocity.z *= 0.3;
                            rotStabVelocity.w *= 0.3;
                            const rotStabEuler = new Vector3();
                            let euler = new Vector3();
                            euler = rotStabVelocity.toEulerAngles();
                            rotStabEuler.copyFrom(euler);
                            let rotStabInfluence = Math.min(Math.max(velLength - 1, 0), 0.1);
                            const angvel = body.angvel();
                            body.setAngvel({
                                x: angvel.x + rotStabEuler.x * rotStabInfluence,
                                y: angvel.y + rotStabEuler.y * rotStabInfluence,
                                z: angvel.z + rotStabEuler.z * rotStabInfluence
                            }, true);
                        }
                    }
                }

                // Thrust
                const speedModifier = 0.02;
                const thrustScale = dt;
                const angvel = body.angvel();
                body.setLinvel({
                    x: linvel.x + (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.x * enginePower.get(entity.id)! * thrustScale,
                    y: linvel.y + (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.y * enginePower.get(entity.id)! * thrustScale,
                    z: linvel.z + (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.z * enginePower.get(entity.id)! * thrustScale
                }, true);

                // Drag
                const drag = Math.pow(velLength, 1) * 0.003 * enginePower.get(entity.id)!;
                body.setLinvel({
                    x: body.linvel().x - body.linvel().x * drag,
                    y: body.linvel().y - body.linvel().y * drag,
                    z: body.linvel().z - body.linvel().z * drag
                }, true);
                lastDrag.set(entity.id, drag);

                // Lift
                let lift = Math.pow(velLength, 1) * 0.005 * enginePower.get(entity.id)!;
                lift = Math.min(Math.max(lift, 0), 0.05);
                body.setLinvel({
                    x: body.linvel().x + up.x * lift * thrustScale,
                    y: body.linvel().y + up.y * lift * thrustScale,
                    z: body.linvel().z + up.z * lift * thrustScale
                }, true);
            }
        },
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            if (!entity.physics || !entity.physics.body) {
                console.warn(`Entity ${entity.id} has no physics body`);
                return;
            }
            const body = entity.physics.body;
            const settings = PlaneSettings;

            // Initialize engine power if needed
            if (!enginePower.has(entity.id)) {
                enginePower.set(entity.id, 0);
            }
            if (!lastDrag.has(entity.id)) {
                lastDrag.set(entity.id, 0);
            }

            // Update engine power
            if (input.up) {
                enginePower.set(entity.id, 
                    Math.min(enginePower.get(entity.id)! + 0.2, 1.0)
                );
            } else if (input.down) {
                enginePower.set(entity.id, 
                    Math.max(enginePower.get(entity.id)! - 0.2, 0)
                );
            }

            // Get orientation vectors
            const { right, up, forward } = getOrientationVectors(body);

            // Calculate velocity and speed
            const linvel = body.linvel();
            const velocity = new Vector3(linvel.x, linvel.y, linvel.z);
            const forwardVec = new Vector3(forward.x, forward.y, forward.z);
            const currentSpeed = Vector3.Dot(velocity, forwardVec);

            // Flight mode influence based on speed
            let flightModeInfluence = currentSpeed / 10;
            flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

            // Scale control inputs by deltaTime and 60fps for consistent behavior
            const controlScale = dt;

            // Apply pitch control
            let angvel = body.angvel();
            if (input.pitchUp) {
                angvel.x -= right.x * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y -= right.y * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z -= right.z * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            } else if (input.pitchDown) {
                angvel.x += right.x * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y += right.y * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z += right.z * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            }

            // Apply yaw control
            if (input.left) {
                angvel.x -= up.x * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y -= up.y * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z -= up.z * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            } else if (input.right) {
                angvel.x += up.x * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y += up.y * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z += up.z * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            }

            // Apply roll control
            if (input.rollLeft) {
                angvel.x += forward.x * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y += forward.y * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z += forward.z * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            } else if (input.rollRight) {
                angvel.x -= forward.x * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.y -= forward.y * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                angvel.z -= forward.z * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
            }

            // Apply mouse control with quaternion-based rotation
            if (input.mouseDelta) {
                const rot = body.rotation();
                let currentQuat = new Quaternion(rot.x, rot.y, rot.z, rot.w);

                // Convert quaternion to Euler angles
                let euler = currentQuat.toEulerAngles();

                // Zero out roll
                euler.z = 0;

                // Apply mouse delta to yaw and pitch
                euler.y -= input.mouseDelta.x * PLANE_MOUSE_SENSITIVITY * flightModeInfluence * enginePower.get(entity.id)! * controlScale; // Yaw (around world up)
                euler.x += input.mouseDelta.y * PLANE_MOUSE_SENSITIVITY * flightModeInfluence * enginePower.get(entity.id)! * controlScale; // Pitch (around local right)

                // Clamp pitch to avoid flipping
                if (euler.x > PLANE_MAX_PITCH) euler.x = PLANE_MAX_PITCH;
                if (euler.x < -PLANE_MAX_PITCH) euler.x = -PLANE_MAX_PITCH;

                // Rebuild quaternion from yaw and pitch (no roll)
                currentQuat = Quaternion.FromEulerAngles(euler.x, euler.y, 0);

                // Set the new rotation
                body.setRotation({
                    x: currentQuat.x,
                    y: currentQuat.y,
                    z: currentQuat.z,
                    w: currentQuat.w
                }, true);
            }
            body.setAngvel(angvel, true);
        }
    };
}

/**
 * Gets the orientation vectors of a physics body
 */
function getOrientationVectors(body: RAPIER.RigidBody): { right: Vector3; up: Vector3; forward: Vector3 } {
    // Initialize vectors in local space for right-handed system
    // In right-handed: X = right, Y = up, Z = forward
    let forward = new Vector3(0, 0, 1);  // Z is forward
    let right = new Vector3(1, 0, 0);    // X is right
    let up = new Vector3(0, 1, 0);       // Y is up

    // Transform vectors to world space using body's quaternion
    const rot = body.rotation();
    const quaternion = new Quaternion(rot.x, rot.y, rot.z, rot.w);
    const rotationMatrix = Matrix.FromQuaternionToRef(
        quaternion,
        new Matrix()
    );

    forward = Vector3.TransformCoordinates(forward, rotationMatrix);
    right = Vector3.TransformCoordinates(right, rotationMatrix);
    up = Vector3.TransformCoordinates(up, rotationMatrix);

    return { forward, right, up };
}
