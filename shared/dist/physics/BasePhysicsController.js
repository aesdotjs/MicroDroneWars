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
exports.BasePhysicsController = void 0;
const CANNON = __importStar(require("cannon"));
const core_1 = require("@babylonjs/core");
const SpringSimulator_1 = require("../utils/SpringSimulator");
class BasePhysicsController {
    constructor(world, config) {
        this.enginePower = 0;
        this.world = world;
        this.config = config;
        // Initialize physics body
        this.body = new CANNON.Body({
            mass: config.mass,
            material: new CANNON.Material('vehicleMaterial')
        });
        // Add body to world
        this.world.addBody(this.body);
        // Initialize spring simulators
        this.springSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.aileronSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
    }
    getState() {
        if (!this.body)
            return null;
        return {
            position: new core_1.Vector3(this.body.position.x, this.body.position.y, this.body.position.z),
            quaternion: new core_1.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w),
            linearVelocity: new core_1.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z),
            angularVelocity: new core_1.Vector3(this.body.angularVelocity.x, this.body.angularVelocity.y, this.body.angularVelocity.z)
        };
    }
    setState(state) {
        if (!this.body)
            return;
        this.body.position.set(state.position.x, state.position.y, state.position.z);
        this.body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        this.body.velocity.set(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
        this.body.angularVelocity.set(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
    }
    cleanup() {
        if (this.body) {
            this.world.remove(this.body);
        }
    }
    updateEnginePower(input) {
        // Update engine power based on input
        if (input.up) {
            this.enginePower = Math.min(this.enginePower + 0.1, 1.0);
        }
        else if (input.down) {
            this.enginePower = Math.max(this.enginePower - 0.1, 0.0);
        }
    }
    getOrientationVectors() {
        const forward = new core_1.Vector3(0, 0, 1);
        const right = new core_1.Vector3(1, 0, 0);
        const up = new core_1.Vector3(0, 1, 0);
        // Transform vectors by body's quaternion
        const quaternion = new core_1.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
        forward.rotateByQuaternionAroundPointToRef(quaternion, core_1.Vector3.Zero(), forward);
        right.rotateByQuaternionAroundPointToRef(quaternion, core_1.Vector3.Zero(), right);
        up.rotateByQuaternionAroundPointToRef(quaternion, core_1.Vector3.Zero(), up);
        return { forward, right, up };
    }
    getBody() {
        return this.body;
    }
}
exports.BasePhysicsController = BasePhysicsController;
