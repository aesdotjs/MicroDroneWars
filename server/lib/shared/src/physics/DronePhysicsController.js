"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DronePhysicsController = void 0;
const CANNON = __importStar(require("cannon-es"));
const babylonjs_1 = require("babylonjs");
const BasePhysicsController_1 = require("./BasePhysicsController");
/**
 * Physics controller for drone vehicles.
 * Implements drone-specific physics including stabilization, altitude control, and movement.
 */
class DronePhysicsController extends BasePhysicsController_1.BasePhysicsController {
    /**
     * Creates a new DronePhysicsController instance.
     * @param world - The CANNON.js physics world
     * @param config - Configuration for the drone physics
     */
    constructor(world, config) {
        super(world, config);
        this.momentumDamping = 0.99;
        this.moveSpeed = 0.2;
        this.rotationSpeed = 0.02; // Reduced from 0.1 for less sensitive keyboard controls
        this.mouseSensitivity = 0.01; // Reduced sensitivity for smoother movement
        this.integralError = 0;
        this.targetAltitude = 10;
        this.rollStabilizationStrength = 5.0; // Strength of auto-stabilization
        this.maxRollAngle = Math.PI / 4; // Maximum allowed roll angle (45 degrees)
        this.maxPitchAngle = Math.PI / 2.5; // Maximum pitch angle (about 72 degrees)
        this.targetAltitude = this.body.position.y;
        this.config = config;
    }
    /**
     * Applies stabilization forces to keep the drone level.
     * Handles roll and pitch stabilization with angle limits.
     * @param deltaTime - Time elapsed since last update in seconds
     */
    applyStabilization(deltaTime) {
        const { right, up, forward } = this.getOrientationVectors();
        // Get current orientation
        const currentUp = new babylonjs_1.Vector3(up.x, up.y, up.z);
        const targetUp = new babylonjs_1.Vector3(0, 1, 0);
        // Calculate roll angle
        const rightDotUp = babylonjs_1.Vector3.Dot(new babylonjs_1.Vector3(right.x, right.y, right.z), targetUp);
        const rollAngle = Math.asin(rightDotUp);
        // Calculate pitch angle
        const forwardFlat = new babylonjs_1.Vector3(forward.x, 0, forward.z).normalize();
        const pitchAngle = Math.acos(babylonjs_1.Vector3.Dot(new babylonjs_1.Vector3(forward.x, forward.y, forward.z), forwardFlat));
        // Apply roll stabilization
        if (Math.abs(rollAngle) > 0.01) {
            const rollCorrection = -rollAngle * this.rollStabilizationStrength * deltaTime;
            const rollAxis = new babylonjs_1.Vector3(forward.x, forward.y, forward.z);
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
    getOrientationVectors() {
        // Get the quaternion from the physics body
        const quat = this.body.quaternion;
        // Convert CANNON.js quaternion to Babylon.js quaternion
        const babylonQuat = new babylonjs_1.Quaternion(quat.x, quat.y, quat.z, quat.w);
        // Create basis vectors
        const right = new babylonjs_1.Vector3(1, 0, 0);
        const up = new babylonjs_1.Vector3(0, 1, 0);
        const forward = new babylonjs_1.Vector3(0, 0, 1);
        // Rotate vectors by the quaternion
        right.rotateByQuaternionAroundPointToRef(babylonQuat, babylonjs_1.Vector3.Zero(), right);
        up.rotateByQuaternionAroundPointToRef(babylonQuat, babylonjs_1.Vector3.Zero(), up);
        forward.rotateByQuaternionAroundPointToRef(babylonQuat, babylonjs_1.Vector3.Zero(), forward);
        return { right, up, forward };
    }
    /**
     * Updates the drone physics based on input.
     * Handles movement, rotation, stabilization, and altitude control.
     * @param deltaTime - Time elapsed since last update in seconds
     * @param input - Physics input from the player
     */
    update(deltaTime, input) {
        // Get orientation vectors first
        const { right, up, forward } = this.getOrientationVectors();
        // Apply stabilization first
        this.applyStabilization(deltaTime);
        // Calculate velocity and speed
        const velocity = new babylonjs_1.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const currentSpeed = velocity.length();
        // Strong upward thrust to counteract gravity
        const gravity = this.world.gravity;
        const gravityForce = new babylonjs_1.Vector3(-gravity.x, -gravity.y, -gravity.z);
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
        const thrust = new babylonjs_1.Vector3(0, 1, 0);
        thrust.scaleInPlace(baseThrust + altitudeControlForce);
        // Apply thrust in the up direction
        this.body.velocity.x += thrust.x * deltaTime;
        this.body.velocity.y += thrust.y * deltaTime;
        this.body.velocity.z += thrust.z * deltaTime;
        // Get forward direction ignoring pitch and roll (only yaw)
        const forwardDirection = new babylonjs_1.Vector3(forward.x, 0, forward.z).normalize();
        const rightDirection = new babylonjs_1.Vector3(right.x, 0, right.z).normalize();
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
            const currentPitch = Math.asin(2 * (this.body.quaternion.w * this.body.quaternion.x -
                this.body.quaternion.y * this.body.quaternion.z));
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
                const currentPitch = Math.asin(2 * (this.body.quaternion.w * this.body.quaternion.x -
                    this.body.quaternion.y * this.body.quaternion.z));
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
exports.DronePhysicsController = DronePhysicsController;
