import { Vector3, Quaternion, Matrix } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, InputComponent, VehicleType } from '../types';
import { DroneSettings, PlaneSettings } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
import RAPIER from '@dimforge/rapier3d-deterministic-compat';

/**
 * Creates a system that handles drone-specific physics
 */
export function createDroneSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const drones = ecsWorld.with("vehicle", "physics", "transform").where(({vehicle}) => vehicle.vehicleType === VehicleType.Drone);
    const momentumDamping = 0.99;
    const moveSpeed = 10;
    const rotationSpeed = 2;
    const mouseSensitivity = 0.002;
    const integralError = new Map<string, number>();
    const targetAltitude = new Map<string, number>();
    const rollStabilizationStrength = 5.0;
    const maxRollAngle = Math.PI / 4;
    const maxPitchAngle = Math.PI / 2.5;

    return {
        update: (dt: number) => {
            for (const entity of drones) {
                const body = entity.physics!.body;
                if (!body) continue;

                // Initialize altitude tracking if needed
                if (!targetAltitude.has(entity.id)) {
                    targetAltitude.set(entity.id, body.translation().y);
                }

                // Get orientation vectors
                const { right, up, forward } = getOrientationVectors(body);

                // Apply stabilization
                applyStabilization(entity, body, dt);

                // Calculate velocity and speed
                const linvel = body.linvel();
                const velocity = new Vector3(linvel.x, linvel.y, linvel.z);
                const currentSpeed = velocity.length();

                // Calculate altitude error
                const currentAltitude = body.translation().y;
                const altitudeError = targetAltitude.get(entity.id)! - currentAltitude;
                
                // PID controller for altitude stabilization
                const kP = 2.0;
                const kI = 0.5;
                const kD = 0.5;
                
                // Calculate altitude control forces
                const proportionalForce = altitudeError * kP;
                const derivativeForce = -linvel.y * kD;
                const integralForce = (integralError.get(entity.id) || 0) * kI;
                
                // Update integral error with anti-windup
                integralError.set(entity.id, 
                    Math.max(-20, Math.min(20, (integralError.get(entity.id) || 0) + altitudeError * dt))
                );
                
                // Combine forces with stronger base thrust
                const baseThrust = 25.0;
                const altitudeControlForce = proportionalForce + derivativeForce + integralForce;
                
                // Apply thrust and stabilization
                const thrust = new Vector3(0, 1, 0);
                thrust.scaleInPlace(baseThrust + altitudeControlForce);
                
                // Apply thrust in the up direction
                body.setLinvel({
                    x: linvel.x + thrust.x * dt,
                    y: linvel.y + thrust.y * dt,
                    z: linvel.z + thrust.z * dt
                }, true);

                // Apply momentum damping
                const dampedLinvel = body.linvel();
                body.setLinvel({
                    x: dampedLinvel.x * momentumDamping,
                    y: dampedLinvel.y * momentumDamping,
                    z: dampedLinvel.z * momentumDamping
                }, true);

                // Apply angular damping
                const angvel = body.angvel();
                body.setAngvel({
                    x: angvel.x * 0.95,
                    y: angvel.y * 0.95,
                    z: angvel.z * 0.95
                }, true);
            }
        },
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            const body = entity.physics!.body;
            if (!body) {
                console.warn(`Entity ${entity.id} has no physics body`);
                return;
            }
            const settings = DroneSettings;

            // Get orientation vectors
            const { right, up, forward } = getOrientationVectors(body);

            // Get forward direction ignoring pitch and roll (only yaw)
            const forwardDirection = new Vector3(forward.x, 0, forward.z).normalize();
            const rightDirection = new Vector3(right.x, 0, right.z).normalize();
            const upDirection = new Vector3(0, 1, 0);
            
            // Forward/backward movement
            let linvel = body.linvel();
            if (input.forward) {
                linvel.x += forwardDirection.x * moveSpeed * dt;
                linvel.z += forwardDirection.z * moveSpeed * dt;
            }
            if (input.backward) {
                linvel.x -= forwardDirection.x * moveSpeed * dt;
                linvel.z -= forwardDirection.z * moveSpeed * dt;
            }

            // Left/right strafing
            if (input.left) {
                linvel.x += rightDirection.x * moveSpeed * dt;
                linvel.z += rightDirection.z * moveSpeed * dt;
            }
            if (input.right) {
                linvel.x -= rightDirection.x * moveSpeed * dt;
                linvel.z -= rightDirection.z * moveSpeed * dt;
            }

            // Vertical movement
            if (input.up) {
                linvel.y += moveSpeed * dt;
                targetAltitude.set(entity.id, body.translation().y + linvel.y * dt);
            }
            if (input.down) {
                linvel.y -= moveSpeed * dt;
                targetAltitude.set(entity.id, body.translation().y - linvel.y * dt);
            }
            body.setLinvel(linvel, true);

            // Apply pitch control with angle limiting
            if (input.pitchUp || input.pitchDown) {
                const rot = body.rotation();
                const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
                const currentPitch = Math.asin(2 * (
                    q.w * q.x - q.y * q.z
                ));
                const pitchAmount = input.pitchUp ? rotationSpeed * dt : -rotationSpeed * dt;
                if (Math.abs(currentPitch + pitchAmount) < maxPitchAngle) {
                    const axis = new Vector3(right.x, right.y, right.z);
                    const pitchQuat = Quaternion.RotationAxis(axis, pitchAmount);
                    const newQuat = pitchQuat.multiply(q);
                    body.setRotation({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, true);
                }
            }

            // Apply yaw control
            if (input.yawLeft || input.yawRight) {
                const rot = body.rotation();
                const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
                const yawAmount = input.yawLeft ? rotationSpeed * dt : -rotationSpeed * dt;
                const axis = new Vector3(0, 1, 0);
                const yawQuat = Quaternion.RotationAxis(axis, yawAmount);
                const newQuat = yawQuat.multiply(q);
                body.setRotation({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, true);
            }

            // Apply mouse control with quaternion-based rotation
            if (input.mouseDelta) {
                const rot = body.rotation();
                let combinedQuat = new Quaternion(rot.x, rot.y, rot.z, rot.w);
                // Yaw (horizontal mouse movement) - using world up axis
                if (input.mouseDelta.x !== 0) {
                    const yawAmount = -input.mouseDelta.x * mouseSensitivity;
                    const yawQuat = Quaternion.RotationAxis(new Vector3(0, 1, 0), yawAmount);
                    combinedQuat = yawQuat.multiply(combinedQuat);
                }
                // Pitch (vertical mouse movement) with angle limiting
                if (input.mouseDelta.y !== 0) {
                    const pitchAmount = input.mouseDelta.y * mouseSensitivity;
                    const currentPitch = Math.asin(2 * (
                        combinedQuat.w * combinedQuat.x -
                        combinedQuat.y * combinedQuat.z
                    ));
                    if (Math.abs(currentPitch + pitchAmount) < maxPitchAngle) {
                        const pitchQuat = Quaternion.RotationAxis(new Vector3(right.x, right.y, right.z), pitchAmount);
                        combinedQuat = pitchQuat.multiply(combinedQuat);
                    }
                }
                body.setRotation({ x: combinedQuat.x, y: combinedQuat.y, z: combinedQuat.z, w: combinedQuat.w }, true);
            }
        }
    };
}

/**
 * Creates a system that handles plane-specific physics
 */
export function createPlaneSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const planes = ecsWorld.with("vehicle", "physics", "transform").where(({vehicle}) => vehicle.vehicleType === VehicleType.Plane);
    const enginePower = new Map<string, number>();
    const lastDrag = new Map<string, number>();

    return {
        update: (dt: number) => {
            for (const entity of planes) {
                const body = entity.physics!.body;
                if (!body) continue;
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

                // Apply angular damping with flight mode influence
                body.setAngvel({
                    x: angvel.x * (1 - 0.02 * flightModeInfluence) * 0.95,
                    y: angvel.y * (1 - 0.02 * flightModeInfluence) * 0.95,
                    z: angvel.z * (1 - 0.02 * flightModeInfluence) * 0.95
                }, true);
            }
        },
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            const body = entity.physics!.body;
            if (!body) {
                console.warn(`Entity ${entity.id} has no physics body`);
                return;
            }
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

            // Apply mouse control
            if (input.mouseDelta) {
                const yawAmount = -input.mouseDelta.x * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                const pitchAmount = -input.mouseDelta.y * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                // Apply yaw (horizontal mouse movement)
                angvel.x += up.x * yawAmount;
                angvel.y += up.y * yawAmount;
                angvel.z += up.z * yawAmount;
                // Apply pitch (vertical mouse movement)
                angvel.x += right.x * pitchAmount;
                angvel.y += right.y * pitchAmount;
                angvel.z += right.z * pitchAmount;
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

/**
 * Applies stabilization forces to keep the drone level
 */
function applyStabilization(entity: GameEntity, body: RAPIER.RigidBody, dt: number) {
    const { right, up, forward } = getOrientationVectors(body);
    // Get current orientation
    const currentUp = new Vector3(up.x, up.y, up.z);
    const targetUp = new Vector3(0, 1, 0);
    // Calculate roll angle (around forward axis)
    const rightDotUp = Vector3.Dot(new Vector3(right.x, right.y, right.z), targetUp);
    const rollAngle = Math.asin(rightDotUp);
    // Calculate pitch angle (around right axis)
    const forwardFlat = new Vector3(forward.x, 0, forward.z).normalize();
    const pitchAngle = Math.acos(Vector3.Dot(new Vector3(forward.x, forward.y, forward.z), forwardFlat));
    // Apply roll stabilization
    if (Math.abs(rollAngle) > 0.01) {
        const rollCorrection = -rollAngle * 5.0 * dt;
        const rollAxis = new Vector3(forward.x, forward.y, forward.z);
        const rot = body.rotation();
        const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
        const rollQuat = Quaternion.RotationAxis(rollAxis, rollCorrection);
        const newQuat = q.multiply(rollQuat);
        body.setRotation({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, true);
    }
    // Limit maximum pitch angle
    if (Math.abs(pitchAngle) > Math.PI / 2.5) {
        const correction = (Math.abs(pitchAngle) - Math.PI / 2.5) * Math.sign(pitchAngle);
        const pitchCorrection = -correction * dt * 2.0;
        const rot = body.rotation();
        const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
        const pitchQuat = Quaternion.RotationAxis(new Vector3(right.x, right.y, right.z), pitchCorrection);
        const newQuat = q.multiply(pitchQuat);
        body.setRotation({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, true);
    }
    // Apply additional damping to angular velocity
    const angvel = body.angvel();
    body.setAngvel({ x: angvel.x * 0.95, y: angvel.y * 0.95, z: angvel.z * 0.95 }, true);
} 