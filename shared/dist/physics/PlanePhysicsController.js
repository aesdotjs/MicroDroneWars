"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanePhysicsController = void 0;
const babylonjs_1 = require("babylonjs");
const BasePhysicsController_1 = require("./BasePhysicsController");
class PlanePhysicsController extends BasePhysicsController_1.BasePhysicsController {
    constructor(world, config) {
        super(world, config);
        this.lastDrag = 0;
        this.enginePower = 0;
        this.config = config;
    }
    update(deltaTime, input) {
        this.updateEnginePower(input);
        const { right, up, forward } = this.getOrientationVectors();
        // Calculate velocity and speed
        const velocity = new babylonjs_1.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        const currentSpeed = babylonjs_1.Vector3.Dot(velocity, new babylonjs_1.Vector3(forward.x, forward.y, forward.z));
        // Flight mode influence based on speed
        let flightModeInfluence = currentSpeed / 10;
        flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);
        // Mass adjustment based on speed
        let lowerMassInfluence = currentSpeed / 10;
        lowerMassInfluence = Math.min(Math.max(lowerMassInfluence, 0), 1);
        this.body.mass = this.config.mass * (1 - (lowerMassInfluence * 0.6));
        // Rotation stabilization
        let lookVelocity = velocity.clone();
        const velLength = lookVelocity.length();
        if (velLength > 0.1) {
            lookVelocity.normalize();
            const rotStabVelocity = new babylonjs_1.Quaternion();
            const axis = new babylonjs_1.Vector3();
            const dot = babylonjs_1.Vector3.Dot(new babylonjs_1.Vector3(forward.x, forward.y, forward.z), lookVelocity);
            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clampedDot);
            if (angle > 0.001) {
                babylonjs_1.Vector3.CrossToRef(new babylonjs_1.Vector3(forward.x, forward.y, forward.z), lookVelocity, axis);
                const axisLength = axis.length();
                if (axisLength > 0.001) {
                    axis.normalize();
                    babylonjs_1.Quaternion.RotationAxisToRef(axis, angle, rotStabVelocity);
                    rotStabVelocity.x *= 0.3;
                    rotStabVelocity.y *= 0.3;
                    rotStabVelocity.z *= 0.3;
                    rotStabVelocity.w *= 0.3;
                    const rotStabEuler = new babylonjs_1.Vector3();
                    let euler = new babylonjs_1.Vector3();
                    euler = rotStabVelocity.toEulerAngles();
                    rotStabEuler.copyFrom(euler);
                    let rotStabInfluence = Math.min(Math.max(velLength - 1, 0), 0.1);
                    let loopFix = (input.up && currentSpeed > 0 ? 0 : 1);
                    this.body.angularVelocity.x += rotStabEuler.x * rotStabInfluence * loopFix;
                    this.body.angularVelocity.y += rotStabEuler.y * rotStabInfluence;
                    this.body.angularVelocity.z += rotStabEuler.z * rotStabInfluence * loopFix;
                }
            }
        }
        // Apply pitch control
        if (input.pitchUp) {
            this.body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * this.enginePower;
        }
        else if (input.pitchDown) {
            this.body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * this.enginePower;
        }
        // Apply yaw control
        if (input.left) {
            this.body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * this.enginePower;
        }
        else if (input.right) {
            this.body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * this.enginePower;
        }
        // Apply roll control
        if (input.rollLeft) {
            this.body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * this.enginePower;
        }
        else if (input.rollRight) {
            this.body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * this.enginePower;
            this.body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * this.enginePower;
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
        // Thrust
        let speedModifier = 0.02;
        if (input.up && !input.down) {
            speedModifier = 0.06;
        }
        else if (!input.up && input.down) {
            speedModifier = -0.05;
        }
        this.body.velocity.x += (velLength * this.lastDrag + speedModifier) * forward.x * this.enginePower;
        this.body.velocity.y += (velLength * this.lastDrag + speedModifier) * forward.y * this.enginePower;
        this.body.velocity.z += (velLength * this.lastDrag + speedModifier) * forward.z * this.enginePower;
        // Drag
        const drag = Math.pow(velLength, 1) * 0.003 * this.enginePower;
        this.body.velocity.x -= this.body.velocity.x * drag;
        this.body.velocity.y -= this.body.velocity.y * drag;
        this.body.velocity.z -= this.body.velocity.z * drag;
        this.lastDrag = drag;
        // Lift
        let lift = Math.pow(velLength, 1) * 0.005 * this.enginePower;
        lift = Math.min(Math.max(lift, 0), 0.05);
        this.body.velocity.x += up.x * lift;
        this.body.velocity.y += up.y * lift;
        this.body.velocity.z += up.z * lift;
        // Angular damping
        this.body.angularVelocity.x = this.body.angularVelocity.x * (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.y = this.body.angularVelocity.y * (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.z = this.body.angularVelocity.z * (1 - 0.02 * flightModeInfluence);
        // Add damping to prevent continuous rotation
        const mouseDamping = 0.95;
        this.body.angularVelocity.x *= mouseDamping;
        this.body.angularVelocity.y *= mouseDamping;
        this.body.angularVelocity.z *= mouseDamping;
    }
}
exports.PlanePhysicsController = PlanePhysicsController;
