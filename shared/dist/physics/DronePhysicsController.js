"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DronePhysicsController = void 0;
const core_1 = require("@babylonjs/core");
const BasePhysicsController_1 = require("./BasePhysicsController");
class DronePhysicsController extends BasePhysicsController_1.BasePhysicsController {
    constructor(world, config) {
        super(world, config);
        this.hoverForce = 9.81;
        this.config = config;
        // Initialize motor properties
        this.motorPositions = {
            frontLeft: new core_1.Vector3(-1.2, 0, 1.2),
            frontRight: new core_1.Vector3(1.2, 0, 1.2),
            backLeft: new core_1.Vector3(-1.2, 0, -1.2),
            backRight: new core_1.Vector3(1.2, 0, -1.2)
        };
        this.motorThrust = {
            frontLeft: 0,
            frontRight: 0,
            backLeft: 0,
            backRight: 0
        };
        this.motorSpeed = {
            frontLeft: this.hoverForce,
            frontRight: this.hoverForce,
            backLeft: this.hoverForce,
            backRight: this.hoverForce
        };
    }
    update(deltaTime, input) {
        this.updateEnginePower(input);
        const { right, up, forward } = this.getOrientationVectors();
        // Calculate velocity and speed
        const velocity = new core_1.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const speed = velocity.length();
        // Vertical stabilization with gravity compensation
        const gravity = this.world.gravity;
        let gravityCompensation = new core_1.Vector3(-gravity.x, -gravity.y, -gravity.z).normalize();
        gravityCompensation.scaleInPlace(deltaTime);
        gravityCompensation.scaleInPlace(0.98);
        // Calculate dot product for gravity compensation
        const globalUp = new core_1.Vector3(0, 1, 0);
        const dot = core_1.Vector3.Dot(globalUp, up);
        gravityCompensation.scaleInPlace(Math.sqrt(Math.max(0, Math.min(dot, 1))));
        // Vertical damping
        const vertDamping = new core_1.Vector3(0, this.body.velocity.y, 0).scale(-0.01);
        const vertStab = up.clone();
        vertStab.scaleInPlace(gravityCompensation.length());
        vertStab.addInPlace(vertDamping);
        vertStab.scaleInPlace(this.enginePower);
        this.body.velocity.x += vertStab.x;
        this.body.velocity.y += vertStab.y;
        this.body.velocity.z += vertStab.z;
        // Positional damping
        this.body.velocity.x *= 0.995;
        this.body.velocity.z *= 0.995;
        // Apply main thrust
        if (input.up) {
            this.body.velocity.x += up.x * 0.15 * this.enginePower;
            this.body.velocity.y += up.y * 0.15 * this.enginePower;
            this.body.velocity.z += up.z * 0.15 * this.enginePower;
        }
        else if (input.down) {
            this.body.velocity.x -= up.x * 0.15 * this.enginePower;
            this.body.velocity.y -= up.y * 0.15 * this.enginePower;
            this.body.velocity.z -= up.z * 0.15 * this.enginePower;
        }
        // Apply pitch control
        if (input.pitchUp) {
            this.body.angularVelocity.x += right.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += right.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += right.z * 0.07 * this.enginePower;
        }
        else if (input.pitchDown) {
            this.body.angularVelocity.x -= right.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= right.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= right.z * 0.07 * this.enginePower;
        }
        // Apply roll control
        if (input.rollLeft) {
            this.body.angularVelocity.x += forward.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += forward.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += forward.z * 0.07 * this.enginePower;
        }
        else if (input.rollRight) {
            this.body.angularVelocity.x -= forward.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= forward.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= forward.z * 0.07 * this.enginePower;
        }
        // Apply yaw control
        if (input.left) {
            this.body.angularVelocity.x -= up.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y -= up.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z -= up.z * 0.07 * this.enginePower;
        }
        else if (input.right) {
            this.body.angularVelocity.x += up.x * 0.07 * this.enginePower;
            this.body.angularVelocity.y += up.y * 0.07 * this.enginePower;
            this.body.angularVelocity.z += up.z * 0.07 * this.enginePower;
        }
        // Apply mouse control
        if (input.mouseDelta) {
            if (input.mouseDelta.x !== 0) {
                const mouseXEffect = input.mouseDelta.x * 0.005;
                this.body.angularVelocity.x += up.x * mouseXEffect;
                this.body.angularVelocity.y += up.y * mouseXEffect;
                this.body.angularVelocity.z += up.z * mouseXEffect;
            }
            if (input.mouseDelta.y !== 0) {
                const mouseYEffect = input.mouseDelta.y * 0.005;
                this.body.angularVelocity.x += right.x * mouseYEffect;
                this.body.angularVelocity.y += right.y * mouseYEffect;
                this.body.angularVelocity.z += right.z * mouseYEffect;
            }
        }
        // Angular damping
        this.body.angularVelocity.x *= 0.97;
        this.body.angularVelocity.y *= 0.97;
        this.body.angularVelocity.z *= 0.97;
    }
}
exports.DronePhysicsController = DronePhysicsController;
