"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = exports.Flag = exports.Plane = exports.Drone = exports.Vehicle = exports.PhysicsState = void 0;
const schema_1 = require("@colyseus/schema");
/**
 * Represents the physical state of an object in the game world.
 * Contains position, rotation, and velocity information.
 */
class PhysicsState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** X coordinate of the object's position */
        this.positionX = 0;
        /** Y coordinate of the object's position */
        this.positionY = 0;
        /** Z coordinate of the object's position */
        this.positionZ = 0;
        /** X component of the object's rotation quaternion */
        this.quaternionX = 0;
        /** Y component of the object's rotation quaternion */
        this.quaternionY = 0;
        /** Z component of the object's rotation quaternion */
        this.quaternionZ = 0;
        /** W component of the object's rotation quaternion */
        this.quaternionW = 1;
        /** X component of the object's linear velocity */
        this.linearVelocityX = 0;
        /** Y component of the object's linear velocity */
        this.linearVelocityY = 0;
        /** Z component of the object's linear velocity */
        this.linearVelocityZ = 0;
        /** X component of the object's angular velocity */
        this.angularVelocityX = 0;
        /** Y component of the object's angular velocity */
        this.angularVelocityY = 0;
        /** Z component of the object's angular velocity */
        this.angularVelocityZ = 0;
        /** Current tick */
        this.tick = 0;
        /** Timestamp of the state in milliseconds */
        this.timestamp = 0;
        /** Last processed input timestamp */
        this.lastProcessedInputTimestamp = 0;
        /** Last processed input tick */
        this.lastProcessedInputTick = 0;
    }
}
exports.PhysicsState = PhysicsState;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "positionX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "positionY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "positionZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "quaternionX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "quaternionY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "quaternionZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "quaternionW", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "linearVelocityX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "linearVelocityY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "linearVelocityZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "angularVelocityX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "angularVelocityY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "angularVelocityZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "tick", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "timestamp", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "lastProcessedInputTimestamp", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], PhysicsState.prototype, "lastProcessedInputTick", void 0);
/**
 * Base class for all vehicles in the game.
 * Extends PhysicsState with vehicle-specific properties.
 */
class Vehicle extends PhysicsState {
    constructor() {
        super(...arguments);
        /** Current health points of the vehicle */
        this.health = 100;
        /** Whether the vehicle is currently carrying a flag */
        this.hasFlag = false;
        /** Team number (0 or 1) the vehicle belongs to */
        this.team = 0;
        /** Type of vehicle (e.g., "drone" or "plane") */
        this.vehicleType = "";
    }
}
exports.Vehicle = Vehicle;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Vehicle.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Object)
], Vehicle.prototype, "hasFlag", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Vehicle.prototype, "team", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], Vehicle.prototype, "vehicleType", void 0);
/**
 * Represents a drone vehicle in the game.
 * Has specific movement and health characteristics.
 */
class Drone extends Vehicle {
    constructor() {
        super(...arguments);
        /** Maximum speed the drone can achieve */
        this.maxSpeed = 5;
        /** Rate at which the drone can accelerate */
        this.acceleration = 0.2;
        /** Rate at which the drone can turn */
        this.turnRate = 0.05;
        /** Maximum health points the drone can have */
        this.maxHealth = 150;
    }
}
exports.Drone = Drone;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Drone.prototype, "maxSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Drone.prototype, "acceleration", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Drone.prototype, "turnRate", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Drone.prototype, "maxHealth", void 0);
/**
 * Represents a plane vehicle in the game.
 * Has specific movement and health characteristics.
 */
class Plane extends Vehicle {
    constructor() {
        super(...arguments);
        /** Maximum speed the plane can achieve */
        this.maxSpeed = 10;
        /** Rate at which the plane can accelerate */
        this.acceleration = 0.3;
        /** Rate at which the plane can turn */
        this.turnRate = 0.03;
        /** Maximum health points the plane can have */
        this.maxHealth = 100;
    }
}
exports.Plane = Plane;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Plane.prototype, "maxSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Plane.prototype, "acceleration", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Plane.prototype, "turnRate", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Plane.prototype, "maxHealth", void 0);
/**
 * Represents a flag in the game.
 * Can be carried by vehicles and has team affiliation.
 */
class Flag extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** X coordinate of the flag's position */
        this.x = 0;
        /** Y coordinate of the flag's position */
        this.y = 0;
        /** Z coordinate of the flag's position */
        this.z = 0;
        /** Team number (0 or 1) the flag belongs to */
        this.team = 0;
        /** ID of the vehicle currently carrying the flag, or null if not carried */
        this.carriedBy = null;
        /** Whether the flag is at its base position */
        this.atBase = true;
    }
}
exports.Flag = Flag;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Flag.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Flag.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Flag.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], Flag.prototype, "team", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", Object)
], Flag.prototype, "carriedBy", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Object)
], Flag.prototype, "atBase", void 0);
/**
 * Represents the complete game state.
 * Contains all vehicles, flags, and server tick information.
 */
class State extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** Map of all vehicles in the game, keyed by session ID */
        this.vehicles = new schema_1.MapSchema();
        /** Map of all flags in the game, keyed by flag ID */
        this.flags = new schema_1.MapSchema();
        /** Current server tick number for synchronization */
        this.serverTick = 0;
    }
}
exports.State = State;
__decorate([
    (0, schema_1.type)({ map: Vehicle }),
    __metadata("design:type", Object)
], State.prototype, "vehicles", void 0);
__decorate([
    (0, schema_1.type)({ map: Flag }),
    __metadata("design:type", Object)
], State.prototype, "flags", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Object)
], State.prototype, "serverTick", void 0);
