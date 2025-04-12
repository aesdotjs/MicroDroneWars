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
exports.VehiclePhysics = void 0;
const CANNON = __importStar(require("cannon"));
class VehiclePhysics {
    constructor(body, config) {
        this.enginePower = 0;
        this.maxEnginePower = 1.0;
        this.enginePowerChangeRate = 0.2;
        this.body = body;
        this.config = config;
    }
    update(deltaTime, input) {
        // Update engine power
        if (input.up) {
            this.enginePower = Math.min(this.enginePower + deltaTime * this.enginePowerChangeRate, this.maxEnginePower);
        }
        else if (input.down) {
            this.enginePower = Math.max(this.enginePower - deltaTime * this.enginePowerChangeRate, 0);
        }
        // Get orientation vectors
        const right = new CANNON.Vec3(1, 0, 0);
        const up = new CANNON.Vec3(0, 1, 0);
        const forward = new CANNON.Vec3(0, 0, 1);
        this.body.vectorToWorldFrame(right, right);
        this.body.vectorToWorldFrame(up, up);
        this.body.vectorToWorldFrame(forward, forward);
        // Apply vehicle-specific physics
        if (this.config.vehicleType === 'drone') {
            this.applyDronePhysics(deltaTime, input, right, up, forward);
        }
        else {
            this.applyPlanePhysics(deltaTime, input, right, up, forward);
        }
    }
    applyDronePhysics(deltaTime, input, right, up, forward) {
        // Vertical stabilization
        const gravityCompensation = 9.81 * deltaTime * 0.98;
        const vertStab = up.clone();
        vertStab.scale(gravityCompensation * this.enginePower, vertStab);
        this.body.velocity.x += vertStab.x;
        this.body.velocity.y += vertStab.y;
        this.body.velocity.z += vertStab.z;
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
        if (input.mouseX !== 0) {
            const mouseXEffect = input.mouseX * 0.005;
            this.body.angularVelocity.x += up.x * mouseXEffect;
            this.body.angularVelocity.y += up.y * mouseXEffect;
            this.body.angularVelocity.z += up.z * mouseXEffect;
        }
        if (input.mouseY !== 0) {
            const mouseYEffect = input.mouseY * 0.005;
            this.body.angularVelocity.x += right.x * mouseYEffect;
            this.body.angularVelocity.y += right.y * mouseYEffect;
            this.body.angularVelocity.z += right.z * mouseYEffect;
        }
        // Angular damping
        this.body.angularVelocity.x *= 0.97;
        this.body.angularVelocity.y *= 0.97;
        this.body.angularVelocity.z *= 0.97;
    }
    applyPlanePhysics(deltaTime, input, right, up, forward) {
        // Calculate current speed
        const velocity = new CANNON.Vec3().copy(this.body.velocity);
        const currentSpeed = velocity.dot(forward);
        // Flight mode influence based on speed
        let flightModeInfluence = currentSpeed / 10;
        flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);
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
        // Apply thrust
        let speedModifier = 0.02;
        if (input.up && !input.down) {
            speedModifier = 0.06;
        }
        else if (!input.up && input.down) {
            speedModifier = -0.05;
        }
        this.body.velocity.x += (currentSpeed * 0.003 + speedModifier) * forward.x * this.enginePower;
        this.body.velocity.y += (currentSpeed * 0.003 + speedModifier) * forward.y * this.enginePower;
        this.body.velocity.z += (currentSpeed * 0.003 + speedModifier) * forward.z * this.enginePower;
        // Apply lift
        let lift = Math.pow(currentSpeed, 1) * 0.005 * this.enginePower;
        lift = Math.min(Math.max(lift, 0), 0.05);
        this.body.velocity.x += up.x * lift;
        this.body.velocity.y += up.y * lift;
        this.body.velocity.z += up.z * lift;
        // Angular damping
        this.body.angularVelocity.x *= (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.y *= (1 - 0.02 * flightModeInfluence);
        this.body.angularVelocity.z *= (1 - 0.02 * flightModeInfluence);
    }
}
exports.VehiclePhysics = VehiclePhysics;
