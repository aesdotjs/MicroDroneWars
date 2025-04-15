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
exports.PhysicsWorld = void 0;
const core_1 = require("@babylonjs/core");
const CANNON = __importStar(require("cannon"));
class PhysicsWorld {
    constructor(engine) {
        this.bodies = new Map();
        this.engine = engine;
        this.scene = new core_1.Scene(engine);
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 7;
        this.world.defaultContactMaterial.friction = 0.5;
        // Create ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: new CANNON.Material('groundMaterial')
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
    }
    getWorld() {
        return this.world;
    }
    update(deltaTime) {
        this.world.step(Math.min(deltaTime, 1 / 60));
    }
    createVehicle(id, config) {
        const body = new CANNON.Body({
            mass: config.mass || 50,
            position: new CANNON.Vec3(0, 2, 0),
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.15, 0.5)),
            material: new CANNON.Material('vehicleMaterial')
        });
        this.world.addBody(body);
        this.bodies.set(id, body);
        return body;
    }
    getVehicleState(id) {
        const body = this.bodies.get(id);
        if (!body)
            return null;
        return {
            position: new core_1.Vector3(body.position.x, body.position.y, body.position.z),
            quaternion: new core_1.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
            linearVelocity: new core_1.Vector3(body.velocity.x, body.velocity.y, body.velocity.z),
            angularVelocity: new core_1.Vector3(body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z)
        };
    }
    applyInput(id, input) {
        const body = this.bodies.get(id);
        if (!body)
            return;
        // Apply forces based on input
        // This will be implemented in the VehiclePhysics class
    }
}
exports.PhysicsWorld = PhysicsWorld;
