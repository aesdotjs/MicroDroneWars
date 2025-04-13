import * as CANNON from 'cannon';
import { Vector3 } from 'babylonjs';
import { VehiclePhysicsConfig, PhysicsInput } from './types';
import { BasePhysicsController } from './BasePhysicsController';

export class DronePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    private momentumDamping: number = 0.99;
    private moveSpeed: number = 0.1;
    private rotationSpeed: number = 0.02; // Reduced from 0.1 for less sensitive keyboard controls
    private mouseSensitivity: number = 0.002; // Reduced sensitivity for smoother movement
    private integralError: number = 0;
    private targetAltitude: number = 0;

    constructor(world: CANNON.World, config: VehiclePhysicsConfig) {
        super(world, config);
        this.targetAltitude = this.body.position.y;
        this.config = config;
    }

    public update(deltaTime: number, input: PhysicsInput): void {
        const { right, up, forward } = this.getOrientationVectors();

        // Calculate velocity and speed
        const velocity = new Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const currentSpeed = velocity.length();

        // Strong upward thrust to counteract gravity
        const gravity = this.world.gravity;
        const gravityForce = new Vector3(-gravity.x, -gravity.y, -gravity.z);
        
        // Dynamic target altitude - maintain current height when not actively moving
        if (input.up) {
            // When actively moving up/down, update target altitude
            this.targetAltitude = this.body.position.y + this.body.velocity.y * deltaTime;
        }
        if (input.down) {
            // When actively moving up/down, update target altitude
            this.targetAltitude = this.body.position.y - this.body.velocity.y * deltaTime;
        }
        
        // Calculate altitude error
        const currentAltitude = this.body.position.y;
        const altitudeError = this.targetAltitude - currentAltitude;
        
        // PID controller for altitude stabilization with stronger gains
        const kP = 2.0;  // Increased proportional gain for faster response
        const kI = 0.5;  // Increased integral gain for better steady-state error
        const kD = 0.5;  // Increased derivative gain for better damping
        
        // Calculate altitude control forces
        const proportionalForce = altitudeError * kP;
        const derivativeForce = -this.body.velocity.y * kD;
        const integralForce = this.integralError * kI;
        
        // Update integral error with anti-windup
        this.integralError += altitudeError * deltaTime;
        this.integralError = Math.max(-20, Math.min(20, this.integralError)); // Increased limits
        
        // Combine forces with stronger base thrust
        const baseThrust = 25.0; // Increased base thrust for stronger gravity counteraction
        const altitudeControlForce = proportionalForce + derivativeForce + integralForce;
        
        // Apply thrust and stabilization
        const thrust = new Vector3(0, 1, 0);
        thrust.scaleInPlace(baseThrust + altitudeControlForce);
        
        // Apply thrust in the up direction
        this.body.velocity.x += thrust.x * deltaTime;
        this.body.velocity.y += thrust.y * deltaTime;
        this.body.velocity.z += thrust.z * deltaTime;

        // Get forward direction ignoring pitch and roll (only yaw)
        const forwardDirection = new Vector3(forward.x, 0, forward.z).normalize();
        const rightDirection = new Vector3(right.x, 0, right.z).normalize();

        // Movement controls relative to vehicle orientation
        const moveSpeed = this.moveSpeed;
        
        // Forward/backward movement (relative to vehicle's yaw)
        if (input.forward) {
            this.body.velocity.x += forwardDirection.x * moveSpeed * 0.5;
            this.body.velocity.z += forwardDirection.z * moveSpeed * 0.5;
        }
        if (input.backward) {
            this.body.velocity.x -= forwardDirection.x * moveSpeed * 0.5;
            this.body.velocity.z -= forwardDirection.z * moveSpeed * 0.5;
        }

        // Left/right strafing (relative to vehicle's yaw)
        if (input.left) {
            this.body.velocity.x -= rightDirection.x * moveSpeed * 0.5;
            this.body.velocity.z -= rightDirection.z * moveSpeed * 0.5;
        }
        if (input.right) {
            this.body.velocity.x += rightDirection.x * moveSpeed * 0.5;
            this.body.velocity.z += rightDirection.z * moveSpeed * 0.5;
        }

        // Vertical movement (using global up direction)
        if (input.up) {
            this.body.velocity.y += moveSpeed;
        }
        if (input.down) {
            this.body.velocity.y -= moveSpeed;
        }

        // Apply pitch control (keyboard only) - reduced sensitivity
        if (input.pitchUp) {
            this.body.angularVelocity.x -= right.x * this.rotationSpeed * 0.5;
            this.body.angularVelocity.y -= right.y * this.rotationSpeed * 0.5;
            this.body.angularVelocity.z -= right.z * this.rotationSpeed * 0.5;
        }
        if (input.pitchDown) {
            this.body.angularVelocity.x += right.x * this.rotationSpeed * 0.5;
            this.body.angularVelocity.y += right.y * this.rotationSpeed * 0.5;
            this.body.angularVelocity.z += right.z * this.rotationSpeed * 0.5;
        }

        // Apply yaw control (keyboard only) - fixed to not affect Z movement
        if (input.yawLeft) {
            const yawAmount = -this.rotationSpeed * 0.5;
            const yawQuat = new CANNON.Quaternion();
            yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
            this.body.quaternion.mult(yawQuat, this.body.quaternion);
        }
        if (input.yawRight) {
            const yawAmount = this.rotationSpeed * 0.5;
            const yawQuat = new CANNON.Quaternion();
            yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
            this.body.quaternion.mult(yawQuat, this.body.quaternion);
        }

        // Apply mouse control (direct rotation)
        if (input.mouseDelta) {
            // Yaw (horizontal mouse movement)
            if (input.mouseDelta.x !== 0) {
                const yawAmount = input.mouseDelta.x * this.mouseSensitivity;
                const yawQuat = new CANNON.Quaternion();
                yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
                this.body.quaternion.mult(yawQuat, this.body.quaternion);
            }

            // Pitch (vertical mouse movement)
            if (input.mouseDelta.y !== 0) {
                const pitchAmount = input.mouseDelta.y * this.mouseSensitivity;
                const pitchQuat = new CANNON.Quaternion();
                pitchQuat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), pitchAmount);
                this.body.quaternion.mult(pitchQuat, this.body.quaternion);
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