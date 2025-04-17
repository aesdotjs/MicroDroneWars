import { Schema, MapSchema, type } from "@colyseus/schema";
import { PhysicsInput } from "@shared/physics/types";

/**
 * Represents the physical state of an object in the game world.
 * Contains position, rotation, and velocity information.
 */
export class PhysicsState extends Schema {
    /** X coordinate of the object's position */
    @type("number") positionX = 0;
    /** Y coordinate of the object's position */
    @type("number") positionY = 0;
    /** Z coordinate of the object's position */
    @type("number") positionZ = 0;
    /** X component of the object's rotation quaternion */
    @type("number") quaternionX = 0;
    /** Y component of the object's rotation quaternion */
    @type("number") quaternionY = 0;
    /** Z component of the object's rotation quaternion */
    @type("number") quaternionZ = 0;
    /** W component of the object's rotation quaternion */
    @type("number") quaternionW = 1;
    /** X component of the object's linear velocity */
    @type("number") linearVelocityX = 0;
    /** Y component of the object's linear velocity */
    @type("number") linearVelocityY = 0;
    /** Z component of the object's linear velocity */
    @type("number") linearVelocityZ = 0;
    /** X component of the object's angular velocity */
    @type("number") angularVelocityX = 0;
    /** Y component of the object's angular velocity */
    @type("number") angularVelocityY = 0;
    /** Z component of the object's angular velocity */
    @type("number") angularVelocityZ = 0;
    /** Current tick */
    @type("number") tick = 0;
    /** Timestamp of the state in milliseconds */
    @type("number") timestamp = 0;
}

/**
 * Base class for all vehicles in the game.
 * Extends PhysicsState with vehicle-specific properties.
 */
export class Vehicle extends PhysicsState {
    /** Current health points of the vehicle */
    @type("number") health = 100;
    /** Whether the vehicle is currently carrying a flag */
    @type("boolean") hasFlag = false;
    /** Team number (0 or 1) the vehicle belongs to */
    @type("number") team = 0;
    /** Type of vehicle (e.g., "drone" or "plane") */
    @type("string") vehicleType = "";
    /** Last received physics input */
    lastInput: PhysicsInput = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        pitchUp: false,
        pitchDown: false,
        yawLeft: false,
        yawRight: false,
        rollLeft: false,
        rollRight: false,
        mouseDelta: { x: 0, y: 0 },
        tick: 0,
        timestamp: 0
    };
}

/**
 * Represents a drone vehicle in the game.
 * Has specific movement and health characteristics.
 */
export class Drone extends Vehicle {
    /** Maximum speed the drone can achieve */
    @type("number") maxSpeed = 5;
    /** Rate at which the drone can accelerate */
    @type("number") acceleration = 0.2;
    /** Rate at which the drone can turn */
    @type("number") turnRate = 0.05;
    /** Maximum health points the drone can have */
    @type("number") maxHealth = 150;
}

/**
 * Represents a plane vehicle in the game.
 * Has specific movement and health characteristics.
 */
export class Plane extends Vehicle {
    /** Maximum speed the plane can achieve */
    @type("number") maxSpeed = 10;
    /** Rate at which the plane can accelerate */
    @type("number") acceleration = 0.3;
    /** Rate at which the plane can turn */
    @type("number") turnRate = 0.03;
    /** Maximum health points the plane can have */
    @type("number") maxHealth = 100;
}

/**
 * Represents a flag in the game.
 * Can be carried by vehicles and has team affiliation.
 */
export class Flag extends Schema {
    /** X coordinate of the flag's position */
    @type("number") x = 0;
    /** Y coordinate of the flag's position */
    @type("number") y = 0;
    /** Z coordinate of the flag's position */
    @type("number") z = 0;
    /** Team number (0 or 1) the flag belongs to */
    @type("number") team = 0;
    /** ID of the vehicle currently carrying the flag, or null if not carried */
    @type("string") carriedBy = null;
    /** Whether the flag is at its base position */
    @type("boolean") atBase = true;
}

/**
 * Represents the complete game state.
 * Contains all vehicles, flags, and server tick information.
 */
export class State extends Schema {
    /** Map of all vehicles in the game, keyed by session ID */
    @type({ map: Vehicle }) vehicles = new MapSchema<Vehicle>();
    /** Map of all flags in the game, keyed by flag ID */
    @type({ map: Flag }) flags = new MapSchema<Flag>();
    /** Current server tick number for synchronization */
    @type("number") serverTick = 0;
}
