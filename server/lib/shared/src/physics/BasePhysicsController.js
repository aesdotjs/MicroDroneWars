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
const CANNON = __importStar(require("cannon-es"));
const babylonjs_1 = require("babylonjs");
const SpringSimulator_1 = require("../utils/SpringSimulator");
const CollisionGroups_1 = require("./CollisionGroups");
/**
 * Base class for vehicle physics controllers.
 * Provides common physics functionality for both drones and planes.
 * Handles basic physics properties, collision detection, and common movement controls.
 */
class BasePhysicsController {
    /**
     * Creates a new BasePhysicsController instance.
     * Initializes physics body, collision filters, and spring simulators.
     * @param world - The CANNON.js physics world
     * @param config - Configuration for the vehicle physics
     */
    constructor(world, config) {
        var _a;
        /** Current engine power (0-1) */
        this.enginePower = 0;
        /** Maximum engine power */
        this.maxEnginePower = 1.0;
        /** Rate at which engine power can change */
        this.enginePowerChangeRate = 0.2;
        /** Last calculated drag value */
        this.lastDrag = 0;
        /** Current physics simulation tick */
        this.tick = 0;
        /** Current physics simulation timestamp */
        this.timestamp = 0;
        /** Last processed input timestamp */
        this.lastProcessedInputTimestamp = Date.now();
        /** Last processed input tick */
        this.lastProcessedInputTick = 0;
        this.world = world;
        this.config = config;
        // Get collision group and mask based on vehicle type
        const vehicleGroup = config.vehicleType === 'drone' ? CollisionGroups_1.CollisionGroups.Drones : CollisionGroups_1.CollisionGroups.Planes;
        const vehicleMask = CollisionGroups_1.collisionMasks[config.vehicleType === 'drone' ? 'Drone' : 'Plane'];
        // Initialize physics body with proper collision filters
        this.body = new CANNON.Body({
            mass: config.mass,
            material: new CANNON.Material('vehicleMaterial'),
            collisionFilterGroup: vehicleGroup,
            collisionFilterMask: vehicleMask,
            fixedRotation: false,
            linearDamping: config.vehicleType === 'drone' ? 0.1 : 0.5, // Lower damping for drones
            angularDamping: 0.5,
            type: CANNON.Body.DYNAMIC
        });
        // Add collision shape based on vehicle type
        if (config.vehicleType === 'drone') {
            // Drone shape - box with dimensions matching the drone mesh
            this.body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.5))); // Increased height for better stability
        }
        else {
            // Plane shape - box with dimensions matching the plane mesh
            this.body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.3, 0.5)));
        }
        // Add body to world
        this.world.addBody(this.body);
        // Initialize spring simulators
        this.springSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.aileronSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator_1.SpringSimulator(60, 0.1, 0.3);
        console.log('Physics body created:', {
            type: config.vehicleType,
            collisionGroup: vehicleGroup,
            collisionMask: vehicleMask,
            hasShape: this.body.shapes.length > 0,
            shapeType: (_a = this.body.shapes[0]) === null || _a === void 0 ? void 0 : _a.type
        });
    }
    /**
     * Gets the current physics state of the vehicle.
     * @returns The current physics state or null if the body doesn't exist
     */
    getState() {
        if (!this.body)
            return null;
        return {
            position: new babylonjs_1.Vector3(this.body.position.x, this.body.position.y, this.body.position.z),
            quaternion: new babylonjs_1.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w),
            linearVelocity: new babylonjs_1.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z),
            angularVelocity: new babylonjs_1.Vector3(this.body.angularVelocity.x, this.body.angularVelocity.y, this.body.angularVelocity.z),
            tick: this.tick,
            timestamp: this.timestamp,
            lastProcessedInputTimestamp: this.lastProcessedInputTimestamp,
            lastProcessedInputTick: this.lastProcessedInputTick
        };
    }
    /**
     * Sets the physics state of the vehicle.
     * @param state - The new physics state to apply
     */
    setState(state) {
        if (!this.body)
            return;
        this.body.position.set(state.position.x, state.position.y, state.position.z);
        this.body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        this.body.velocity.set(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
        this.body.angularVelocity.set(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
        this.tick = state.tick;
        this.timestamp = state.timestamp;
        this.lastProcessedInputTimestamp = state.lastProcessedInputTimestamp || Date.now();
        this.lastProcessedInputTick = state.lastProcessedInputTick || this.tick;
    }
    /**
     * Cleans up physics resources.
     * Removes the body from the physics world.
     */
    cleanup() {
        if (this.body) {
            this.world.removeBody(this.body);
        }
    }
    /**
     * Updates the engine power based on input.
     * Only applies to planes, not drones.
     * @param input - Physics input from the player
     */
    updateEnginePower(input) {
        // Only update engine power for planes, not drones
        if (this.config.vehicleType === 'plane') {
            if (!input) {
                this.enginePower = 0;
                return;
            }
            if (input.up) {
                this.enginePower = Math.min(this.enginePower + this.enginePowerChangeRate, this.maxEnginePower);
            }
            else if (input.down) {
                this.enginePower = Math.max(this.enginePower - this.enginePowerChangeRate, 0);
            }
        }
    }
    /**
     * Gets the orientation vectors of the vehicle in world space.
     * @returns Object containing forward, right, and up vectors
     */
    getOrientationVectors() {
        // Initialize vectors in local space
        let forward = new babylonjs_1.Vector3(0, 0, 1);
        let right = new babylonjs_1.Vector3(1, 0, 0);
        let up = new babylonjs_1.Vector3(0, 1, 0);
        // Transform vectors to world space using body's quaternion
        const quaternion = this.body.quaternion;
        const rotationMatrix = babylonjs_1.Matrix.FromQuaternionToRef(new babylonjs_1.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), new babylonjs_1.Matrix());
        forward = babylonjs_1.Vector3.TransformCoordinates(forward, rotationMatrix);
        right = babylonjs_1.Vector3.TransformCoordinates(right, rotationMatrix);
        up = babylonjs_1.Vector3.TransformCoordinates(up, rotationMatrix);
        return { forward, right, up };
    }
    /**
     * Applies mouse control input to the vehicle's rotation.
     * @param input - Physics input from the player
     * @param right - Right vector of the vehicle
     * @param up - Up vector of the vehicle
     */
    applyMouseControl(input, right, up) {
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
    }
    /**
     * Applies angular damping to the vehicle's rotation.
     * @param damping - Damping factor (default: 0.97)
     */
    applyAngularDamping(damping = 0.97) {
        this.body.angularVelocity.x *= damping;
        this.body.angularVelocity.y *= damping;
        this.body.angularVelocity.z *= damping;
    }
    /**
     * Gets the CANNON.js physics body of the vehicle.
     * @returns The physics body
     */
    getBody() {
        return this.body;
    }
}
exports.BasePhysicsController = BasePhysicsController;
