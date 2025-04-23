import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from 'babylonjs';
import { VehiclePhysicsConfig, PhysicsInput, CollisionType, CollisionSeverity } from './types';
import { BasePhysicsController } from './BasePhysicsController';
import { CollisionManager, EnhancedCollisionEvent } from './CollisionManager';

/**
 * Physics controller for drone vehicles.
 * Implements drone-specific physics including stabilization, altitude control, and movement.
 */
export class DronePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    private momentumDamping: number = 0.99;
    private moveSpeed: number = 0.2;
    private rotationSpeed: number = 0.02; // Reduced from 0.1 for less sensitive keyboard controls
    private mouseSensitivity: number = 0.002; // Reduced sensitivity for smoother movement
    private integralError: number = 0;
    private targetAltitude: number = 10;
    private rollStabilizationStrength: number = 5.0; // Strength of auto-stabilization
    private maxRollAngle: number = Math.PI / 4; // Maximum allowed roll angle (45 degrees)
    private maxPitchAngle: number = Math.PI / 2.5; // Maximum pitch angle (about 72 degrees)

    /**
     * Creates a new DronePhysicsController instance.
     * @param world - The CANNON.js physics world
     * @param config - Configuration for the drone physics
     * @param id - Unique identifier for the drone
     * @param collisionManager - The collision manager instance
     * @param isGhost - Whether the drone is a ghost (default: false)
     */
    constructor(world: CANNON.World, config: VehiclePhysicsConfig, id: string, collisionManager: CollisionManager, isGhost: boolean = false) {
        super(world, config, id, collisionManager, isGhost);
        this.targetAltitude = this.body.position.y;
        this.config = config;
        const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.5));
        this.body.addShape(boxShape);
        // Register collision callback
        this.collisionManager.registerCollisionCallback(id, this.handleCollision.bind(this));
    }

    /**
     * Handles collision events specific to drones.
     * @param event - The enhanced collision event
     */
    protected handleCollision(event: EnhancedCollisionEvent): void {
        // Call base class collision handler
        super.handleCollision(event);

        // Drone-specific collision responses
        if (event.type === CollisionType.VehicleEnvironment) {
            // Add extra stabilization after environment collision
            if (event.severity === CollisionSeverity.Heavy) {
                this.applyStabilization(0.1); // Apply strong stabilization
            }
        } else if (event.type === CollisionType.VehicleVehicle) {
            // Add extra momentum damping after vehicle collision
            if (event.severity === CollisionSeverity.Heavy) {
                this.momentumDamping = 0.95; // Increase damping temporarily
                setTimeout(() => {
                    this.momentumDamping = 0.99; // Reset after 1 second
                }, 1000);
            }
        }
    }

    /**
     * Applies stabilization forces to keep the drone level.
     * Handles roll and pitch stabilization with angle limits.
     * @param deltaTime - Time elapsed since last update in seconds
     */
    private applyStabilization(deltaTime: number): void {
        const { right, up, forward } = this.getOrientationVectors();
        
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
            const rollCorrection = -rollAngle * this.rollStabilizationStrength * deltaTime;
            const rollAxis = new Vector3(forward.x, forward.y, forward.z);
            const rollQuat = new CANNON.Quaternion();
            rollQuat.setFromAxisAngle(new CANNON.Vec3(rollAxis.x, rollAxis.y, rollAxis.z), rollCorrection);
            this.body.quaternion = this.body.quaternion.mult(rollQuat);
        }
        
        // Limit maximum pitch angle
        if (Math.abs(pitchAngle) > this.maxPitchAngle) {
            const correction = (Math.abs(pitchAngle) - this.maxPitchAngle) * Math.sign(pitchAngle);
            const pitchCorrection = -correction * deltaTime * 2.0;
            const pitchQuat = new CANNON.Quaternion();
            pitchQuat.setFromAxisAngle(new CANNON.Vec3(right.x, right.y, right.z), pitchCorrection);
            this.body.quaternion = this.body.quaternion.mult(pitchQuat);
        }
        
        // Apply additional damping to angular velocity
        this.body.angularVelocity.scale(0.95, this.body.angularVelocity);
    }

    /**
     * Gets the orientation vectors of the drone in world space.
     * Overrides the base class method to use Babylon.js quaternion rotation.
     * @returns Object containing right, up, and forward vectors
     */
    protected getOrientationVectors(): { right: Vector3; up: Vector3; forward: Vector3 } {
        // Get the quaternion from the physics body
        const quat = this.body.quaternion;
        
        // Convert CANNON.js quaternion to Babylon.js quaternion
        const babylonQuat = new Quaternion(quat.x, quat.y, quat.z, quat.w);
        
        // Create basis vectors
        const right = new Vector3(1, 0, 0);
        const up = new Vector3(0, 1, 0);
        const forward = new Vector3(0, 0, 1);
        
        // Rotate vectors by the quaternion
        right.rotateByQuaternionAroundPointToRef(babylonQuat, Vector3.Zero(), right);
        up.rotateByQuaternionAroundPointToRef(babylonQuat, Vector3.Zero(), up);
        forward.rotateByQuaternionAroundPointToRef(babylonQuat, Vector3.Zero(), forward);
        
        return { right, up, forward };
    }

    /**
     * Updates the drone physics based on input.
     * Handles movement, rotation, stabilization, and altitude control.
     * @param deltaTime - Time elapsed since last update in seconds
     * @param input - Physics input from the player
     */
    public update(deltaTime: number, input: PhysicsInput): void {        
        // Get orientation vectors first
        const { right, up, forward } = this.getOrientationVectors();
        
        // Apply stabilization first
        this.applyStabilization(deltaTime);

        // Handle weapon controls
        if (input.nextWeapon) {
            this.nextWeapon();
        }
        if (input.previousWeapon) {
            this.previousWeapon();
        }
        if (input.weapon1) {
            this.switchWeapon(0);
        }
        if (input.weapon2) {
            this.switchWeapon(1);
        }
        if (input.weapon3) {
            this.switchWeapon(2);
        }
        
        this.fireWeapon(input);

        // Update weapons
        this.updateWeapons(deltaTime);

        // Calculate velocity and speed
        const velocity = new Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const currentSpeed = velocity.length();

        // Strong upward thrust to counteract gravity
        // const gravity = this.world.gravity;
        // const gravityForce = new Vector3(-gravity.x, -gravity.y, -gravity.z);
        
        // Calculate altitude error
        const currentAltitude = this.body.position.y;
        const altitudeError = this.targetAltitude - currentAltitude;
        
        // PID controller for altitude stabilization with stronger gains
        const kP = 2.0;
        const kI = 0.5;
        const kD = 0.5;
        
        // Calculate altitude control forces
        const proportionalForce = altitudeError * kP;
        const derivativeForce = -this.body.velocity.y * kD;
        const integralForce = this.integralError * kI;
        
        // Update integral error with anti-windup
        this.integralError += altitudeError * deltaTime;
        this.integralError = Math.max(-20, Math.min(20, this.integralError));
        
        // Combine forces with stronger base thrust
        const baseThrust = 25.0;
        const altitudeControlForce = proportionalForce + derivativeForce + integralForce;
        
        // Apply thrust and stabilization
        const thrust = new Vector3(0, 1, 0);
        thrust.scaleInPlace(baseThrust + altitudeControlForce);
        
        // Apply thrust in the up direction
        this.body.velocity.x += thrust.x * deltaTime;
        if (!input.down) {
            this.body.velocity.y += thrust.y * deltaTime;
        }
        this.body.velocity.z += thrust.z * deltaTime;

        // Get forward direction ignoring pitch and roll (only yaw)
        const forwardDirection = new Vector3(forward.x, 0, forward.z).normalize();
        const rightDirection = new Vector3(right.x, 0, right.z).normalize();
        // Movement controls relative to vehicle orientation
        const moveSpeed = this.moveSpeed * deltaTime * 60; // Scale by deltaTime and 60fps for consistent speed
        
        // Forward/backward movement (relative to vehicle's yaw)
        if (input.forward) {
            this.body.velocity.x += forwardDirection.x * moveSpeed;
            this.body.velocity.z += forwardDirection.z * moveSpeed;
        }
        if (input.backward) {
            this.body.velocity.x -= forwardDirection.x * moveSpeed;
            this.body.velocity.z -= forwardDirection.z * moveSpeed;
        }

        // Left/right strafing (relative to vehicle's yaw)
        if (input.left) {
            this.body.velocity.x -= rightDirection.x * moveSpeed;
            this.body.velocity.z -= rightDirection.z * moveSpeed;
        }
        if (input.right) {
            this.body.velocity.x += rightDirection.x * moveSpeed;
            this.body.velocity.z += rightDirection.z * moveSpeed;
        }

        // Vertical movement (using global up direction)
        if (input.up) {
            this.body.velocity.y += moveSpeed;
            this.targetAltitude = this.body.position.y + this.body.velocity.y * deltaTime;
        }
        if (input.down) {
            this.body.velocity.y -= moveSpeed;
            this.targetAltitude = this.body.position.y - this.body.velocity.y * deltaTime;
        }

        // Apply pitch control (keyboard only) - using quaternion multiplication
        if (input.pitchUp || input.pitchDown) {
            // Calculate current pitch angle
            const currentPitch = Math.asin(2 * (
                this.body.quaternion.w * this.body.quaternion.x -
                this.body.quaternion.y * this.body.quaternion.z
            ));
            
            // Only apply pitch if within limits
            const pitchAmount = input.pitchUp ? -this.rotationSpeed : this.rotationSpeed;
            if (Math.abs(currentPitch + pitchAmount) < this.maxPitchAngle) {
                const pitchQuat = new CANNON.Quaternion();
                pitchQuat.setFromAxisAngle(new CANNON.Vec3(right.x, right.y, right.z), pitchAmount);
                this.body.quaternion = pitchQuat.mult(this.body.quaternion);
            }
        }

        // Apply yaw control (keyboard only) - using quaternion multiplication
        if (input.yawLeft || input.yawRight) {
            const yawAmount = input.yawLeft ? -this.rotationSpeed : this.rotationSpeed;
            const yawQuat = new CANNON.Quaternion();
            yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
            this.body.quaternion = yawQuat.mult(this.body.quaternion);
        }

        // Modified mouse control to use quaternion-based rotation
        if (input.mouseDelta) {
            // Yaw (horizontal mouse movement)
            if (input.mouseDelta.x !== 0) {
                const yawAmount = input.mouseDelta.x * this.mouseSensitivity;
                const yawQuat = new CANNON.Quaternion();
                yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
                this.body.quaternion = yawQuat.mult(this.body.quaternion);
            }

            // Pitch (vertical mouse movement) with angle limiting
            if (input.mouseDelta.y !== 0) {
                const pitchAmount = input.mouseDelta.y * this.mouseSensitivity;
                
                // Calculate current pitch angle
                const currentPitch = Math.asin(2 * (
                    this.body.quaternion.w * this.body.quaternion.x -
                    this.body.quaternion.y * this.body.quaternion.z
                ));
                
                // Only apply pitch if within limits
                if (Math.abs(currentPitch + pitchAmount) < this.maxPitchAngle) {
                    const pitchQuat = new CANNON.Quaternion();
                    pitchQuat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), pitchAmount);
                    this.body.quaternion = this.body.quaternion.mult(pitchQuat);
                }
            }
        }

        // Apply momentum damping
        this.body.velocity.x *= this.momentumDamping;
        this.body.velocity.y *= this.momentumDamping;
        this.body.velocity.z *= this.momentumDamping;

        // Apply angular damping
        this.applyAngularDamping();
    }
} 