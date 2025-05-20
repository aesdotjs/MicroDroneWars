import { Vector3, Quaternion, Matrix } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, InputComponent, VehicleType } from '../types';
import { DroneSettings } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
import * as RAPIER from '@dimforge/rapier3d-deterministic-compat';

/**
 * Creates a system that handles drone-specific physics
 */
export function createDroneSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const drones = ecsWorld.with("vehicle", "physics", "transform").where(({vehicle}) => vehicle.vehicleType === VehicleType.Drone);
    const moveSpeed = 10;
    const rotationSpeed = 2;
    const mouseSensitivity = 0.002;
    const integralError = new Map<string, number>();
    const targetAltitude = new Map<string, number>();
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

                // Apply stabilization
                // applyStabilization(entity, body, dt);

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
            }
        },
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            if (!entity.physics || !entity.physics.body) {
                console.warn(`Entity ${entity.id} has no physics body`);
                return;
            }
            const body = entity.physics.body;
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
                // Make down movement faster to overcome thrust/gravity
                linvel.y -= moveSpeed * 2 * dt;
                targetAltitude.set(entity.id, body.translation().y - linvel.y * dt);
            }
            // When up or down is released, save the current Y as the new target altitude
            if (input.upReleased || input.downReleased) {
                targetAltitude.set(entity.id, body.translation().y);
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
                let currentQuat = new Quaternion(rot.x, rot.y, rot.z, rot.w);

                // Convert quaternion to Euler angles
                let euler = currentQuat.toEulerAngles();

                // Zero out roll
                euler.z = 0;

                // Apply mouse delta to yaw and pitch
                euler.y -= input.mouseDelta.x * mouseSensitivity; // Yaw (around world up)
                euler.x += input.mouseDelta.y * mouseSensitivity; // Pitch (around local right)

                // Clamp pitch to avoid flipping
                if (euler.x > maxPitchAngle) euler.x = maxPitchAngle;
                if (euler.x < -maxPitchAngle) euler.x = -maxPitchAngle;

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
 * Applies gentle stabilization forces to prevent flipping while allowing intentional movement
 */
function applyStabilization(entity: GameEntity, body: RAPIER.RigidBody, dt: number) {
    const { right, up, forward } = getOrientationVectors(body);

    // Get current orientation
    const currentUp = new Vector3(up.x, up.y, up.z);
    const targetUp = new Vector3(0, 1, 0);

    // Calculate roll angle (around forward axis)
    const rightDotUp = Vector3.Dot(new Vector3(right.x, right.y, right.z), targetUp);
    const rollAngle = Math.asin(rightDotUp);

    // Only correct roll, do not touch pitch or yaw
    const ROLL_STABILIZATION_STRENGTH = 3; // Gentle, tweak as needed
    if (Math.abs(rollAngle) > 0.001) { // Only correct if not already flat
        const rollCorrection = -rollAngle * ROLL_STABILIZATION_STRENGTH * dt;
        const rollAxis = new Vector3(forward.x, forward.y, forward.z);
        const rot = body.rotation();
        const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
        const rollQuat = Quaternion.RotationAxis(rollAxis, rollCorrection);
        const newQuat = q.multiply(rollQuat);
        body.setRotation({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, true);
    }
} 