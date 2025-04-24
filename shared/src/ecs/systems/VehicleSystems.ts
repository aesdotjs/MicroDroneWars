import * as CANNON from 'cannon-es';
import { Vector3, Quaternion, Matrix } from 'babylonjs';
import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { DroneSettings, PlaneSettings } from '../../physics/VehicleSettings';

/**
 * Creates a system that handles drone-specific physics
 */
export function createDroneSystem(cannonWorld: CANNON.World) {
    const drones = ecsWorld.with("drone", "body", "position", "rotation", "input");
    const momentumDamping = 0.99;
    const moveSpeed = 0.2;
    const rotationSpeed = 0.02;
    const mouseSensitivity = 0.002;
    const integralError = new Map<string, number>();
    const targetAltitude = new Map<string, number>();
    const rollStabilizationStrength = 5.0;
    const maxRollAngle = Math.PI / 4;
    const maxPitchAngle = Math.PI / 2.5;

    return {
        update: (dt: number) => {
            for (const entity of drones) {
                const body = entity.body!;
                const input = entity.input!;
                const settings = DroneSettings;

                // Initialize altitude tracking if needed
                if (!targetAltitude.has(entity.id)) {
                    targetAltitude.set(entity.id, body.position.y);
                }

                // Get orientation vectors
                const { right, up, forward } = getOrientationVectors(body);

                // Apply stabilization
                applyStabilization(entity, body, dt);

                // Calculate velocity and speed
                const velocity = new Vector3(body.velocity.x, body.velocity.y, body.velocity.z);
                const currentSpeed = velocity.length();

                // Calculate altitude error
                const currentAltitude = body.position.y;
                const altitudeError = targetAltitude.get(entity.id)! - currentAltitude;
                
                // PID controller for altitude stabilization
                const kP = 2.0;
                const kI = 0.5;
                const kD = 0.5;
                
                // Calculate altitude control forces
                const proportionalForce = altitudeError * kP;
                const derivativeForce = -body.velocity.y * kD;
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
                body.velocity.x += thrust.x * dt;
                if (!input.down) {
                    body.velocity.y += thrust.y * dt;
                }
                body.velocity.z += thrust.z * dt;

                // Get forward direction ignoring pitch and roll (only yaw)
                const forwardDirection = new Vector3(forward.x, 0, forward.z).normalize();
                const rightDirection = new Vector3(right.x, 0, right.z).normalize();
                
                // Movement controls relative to vehicle orientation
                const moveSpeed = settings.forceMultiplier * dt * 60;
                
                // Forward/backward movement
                if (input.forward) {
                    body.velocity.x += forwardDirection.x * moveSpeed;
                    body.velocity.z += forwardDirection.z * moveSpeed;
                }
                if (input.backward) {
                    body.velocity.x -= forwardDirection.x * moveSpeed;
                    body.velocity.z -= forwardDirection.z * moveSpeed;
                }

                // Left/right strafing
                if (input.left) {
                    body.velocity.x -= rightDirection.x * moveSpeed;
                    body.velocity.z -= rightDirection.z * moveSpeed;
                }
                if (input.right) {
                    body.velocity.x += rightDirection.x * moveSpeed;
                    body.velocity.z += rightDirection.z * moveSpeed;
                }

                // Vertical movement
                if (input.up) {
                    body.velocity.y += moveSpeed;
                    targetAltitude.set(entity.id, body.position.y + body.velocity.y * dt);
                }
                if (input.down) {
                    body.velocity.y -= moveSpeed;
                    targetAltitude.set(entity.id, body.position.y - body.velocity.y * dt);
                }

                // Apply pitch control
                if (input.pitchUp || input.pitchDown) {
                    const currentPitch = Math.asin(2 * (
                        body.quaternion.w * body.quaternion.x -
                        body.quaternion.y * body.quaternion.z
                    ));
                    
                    const pitchAmount = input.pitchUp ? -rotationSpeed : rotationSpeed;
                    if (Math.abs(currentPitch + pitchAmount) < maxPitchAngle) {
                        const pitchQuat = new CANNON.Quaternion();
                        pitchQuat.setFromAxisAngle(new CANNON.Vec3(right.x, right.y, right.z), pitchAmount);
                        body.quaternion = pitchQuat.mult(body.quaternion);
                    }
                }

                // Apply yaw control
                if (input.yawLeft || input.yawRight) {
                    const yawAmount = input.yawLeft ? -rotationSpeed : rotationSpeed;
                    const yawQuat = new CANNON.Quaternion();
                    yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
                    body.quaternion = yawQuat.mult(body.quaternion);
                }

                // Apply momentum damping
                body.velocity.x *= momentumDamping;
                body.velocity.y *= momentumDamping;
                body.velocity.z *= momentumDamping;

                // Apply angular damping
                body.angularVelocity.x *= 0.95;
                body.angularVelocity.y *= 0.95;
                body.angularVelocity.z *= 0.95;
            }
        }
    };
}

/**
 * Creates a system that handles plane-specific physics
 */
export function createPlaneSystem(cannonWorld: CANNON.World) {
    const planes = ecsWorld.with("plane", "body", "position", "rotation", "input");
    const enginePower = new Map<string, number>();
    const lastDrag = new Map<string, number>();

    return {
        update: (dt: number) => {
            for (const entity of planes) {
                const body = entity.body!;
                const input = entity.input!;
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
                const velocity = new Vector3(body.velocity.x, body.velocity.y, body.velocity.z);
                const currentSpeed = Vector3.Dot(velocity, new Vector3(forward.x, forward.y, forward.z));

                // Flight mode influence based on speed
                let flightModeInfluence = currentSpeed / 10;
                flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

                // Mass adjustment based on speed
                let lowerMassInfluence = currentSpeed / 10;
                lowerMassInfluence = Math.min(Math.max(lowerMassInfluence, 0), 1);
                body.mass = settings.mass * (1 - (lowerMassInfluence * 0.6));

                // Scale control inputs by deltaTime and 60fps for consistent behavior
                const controlScale = dt * 60;

                // Rotation stabilization
                let lookVelocity = velocity.clone();
                const velLength = lookVelocity.length();
                
                if (velLength > 0.1) {
                    lookVelocity.normalize();
                    
                    const rotStabVelocity = new Quaternion();
                    const axis = new Vector3();
                    const dot = Vector3.Dot(new Vector3(forward.x, forward.y, forward.z), lookVelocity);
                    
                    const clampedDot = Math.max(-1, Math.min(1, dot));
                    const angle = Math.acos(clampedDot);
                    
                    if (angle > 0.001) {
                        Vector3.CrossToRef(new Vector3(forward.x, forward.y, forward.z), lookVelocity, axis);
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
                            let loopFix = (input.up && currentSpeed > 0 ? 0 : 1);
                            
                            body.angularVelocity.x += rotStabEuler.x * rotStabInfluence * loopFix;
                            body.angularVelocity.y += rotStabEuler.y * rotStabInfluence;
                            body.angularVelocity.z += rotStabEuler.z * rotStabInfluence * loopFix;
                        }
                    }
                }

                // Apply pitch control
                if (input.pitchUp) {
                    body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                } else if (input.pitchDown) {
                    body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                }

                // Apply yaw control
                if (input.left) {
                    body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                } else if (input.right) {
                    body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                }

                // Apply roll control
                if (input.rollLeft) {
                    body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                } else if (input.rollRight) {
                    body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                    body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * enginePower.get(entity.id)! * controlScale;
                }

                // Thrust
                let speedModifier = 0.02;
                if (input.up && !input.down) {
                    speedModifier = 0.06;
                } else if (!input.up && input.down) {
                    speedModifier = -0.05;
                }

                // Scale thrust by deltaTime
                const thrustScale = dt * 60;
                body.velocity.x += (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.x * enginePower.get(entity.id)! * thrustScale;
                body.velocity.y += (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.y * enginePower.get(entity.id)! * thrustScale;
                body.velocity.z += (velLength * lastDrag.get(entity.id)! + speedModifier) * forward.z * enginePower.get(entity.id)! * thrustScale;

                // Drag
                const drag = Math.pow(velLength, 1) * 0.003 * enginePower.get(entity.id)!;
                body.velocity.x -= body.velocity.x * drag;
                body.velocity.y -= body.velocity.y * drag;
                body.velocity.z -= body.velocity.z * drag;
                lastDrag.set(entity.id, drag);

                // Lift
                let lift = Math.pow(velLength, 1) * 0.005 * enginePower.get(entity.id)!;
                lift = Math.min(Math.max(lift, 0), 0.05);
                body.velocity.x += up.x * lift * thrustScale;
                body.velocity.y += up.y * lift * thrustScale;
                body.velocity.z += up.z * lift * thrustScale;

                // Apply angular damping with flight mode influence
                body.angularVelocity.x *= (1 - 0.02 * flightModeInfluence);
                body.angularVelocity.y *= (1 - 0.02 * flightModeInfluence);
                body.angularVelocity.z *= (1 - 0.02 * flightModeInfluence);

                // Add extra damping to prevent continuous rotation
                body.angularVelocity.x *= 0.95;
                body.angularVelocity.y *= 0.95;
                body.angularVelocity.z *= 0.95;
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

/**
 * Applies stabilization forces to keep the drone level
 */
function applyStabilization(entity: GameEntity, body: CANNON.Body, dt: number) {
    const { right, up, forward } = getOrientationVectors(body);
    
    // Get current orientation
    const currentUp = new Vector3(up.x, up.y, up.z);
    const targetUp = new Vector3(0, 1, 0);
    
    // Calculate roll angle
    const rightDotUp = Vector3.Dot(new Vector3(right.x, right.y, right.z), targetUp);
    const rollAngle = Math.asin(rightDotUp);
    
    // Calculate pitch angle
    const forwardFlat = new Vector3(forward.x, 0, forward.z).normalize();
    const pitchAngle = Math.acos(Vector3.Dot(new Vector3(forward.x, forward.y, forward.z), forwardFlat));
    
    // Apply roll stabilization
    if (Math.abs(rollAngle) > 0.01) {
        const rollCorrection = -rollAngle * 5.0 * dt;
        const rollAxis = new Vector3(forward.x, forward.y, forward.z);
        const rollQuat = new CANNON.Quaternion();
        rollQuat.setFromAxisAngle(new CANNON.Vec3(rollAxis.x, rollAxis.y, rollAxis.z), rollCorrection);
        body.quaternion = body.quaternion.mult(rollQuat);
    }
    
    // Limit maximum pitch angle
    if (Math.abs(pitchAngle) > Math.PI / 2.5) {
        const correction = (Math.abs(pitchAngle) - Math.PI / 2.5) * Math.sign(pitchAngle);
        const pitchCorrection = -correction * dt * 2.0;
        const pitchQuat = new CANNON.Quaternion();
        pitchQuat.setFromAxisAngle(new CANNON.Vec3(right.x, right.y, right.z), pitchCorrection);
        body.quaternion = body.quaternion.mult(pitchQuat);
    }
    
    // Apply additional damping to angular velocity
    body.angularVelocity.scale(0.95, body.angularVelocity);
} 