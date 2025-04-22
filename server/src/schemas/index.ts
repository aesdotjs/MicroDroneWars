import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

/**
 * Represents a weapon in the game state
 */
export class Weapon extends Schema {
    /** Unique identifier for the weapon type */
    @type("string") id = "";
    /** Display name of the weapon */
    @type("string") name = "";
    /** Type of projectile this weapon fires */
    @type("string") projectileType = "";
    /** Damage dealt by the weapon */
    @type("number") damage = 0;
    /** Fire rate in rounds per second */
    @type("number") fireRate = 0;
    /** Speed of the projectile in m/s */
    @type("number") projectileSpeed = 0;
    /** Cooldown time between shots in seconds */
    @type("number") cooldown = 0;
    /** Maximum range of the weapon in meters */
    @type("number") range = 0;
    /** Whether the weapon is currently on cooldown */
    @type("boolean") isOnCooldown = false;
    /** Last time the weapon was fired */
    @type("number") lastFireTime = 0;
}

/**
 * Represents a projectile in the game state
 */
export class Projectile extends Schema {
    /** Unique identifier for the projectile */
    @type("string") id = "";
    /** Type of projectile */
    @type("string") type = "";
    /** X coordinate of the projectile's position */
    @type("number") positionX = 0;
    /** Y coordinate of the projectile's position */
    @type("number") positionY = 0;
    /** Z coordinate of the projectile's position */
    @type("number") positionZ = 0;
    /** X component of the projectile's direction */
    @type("number") directionX = 0;
    /** Y component of the projectile's direction */
    @type("number") directionY = 0;
    /** Z component of the projectile's direction */
    @type("number") directionZ = 0;
    /** Speed of the projectile in m/s */
    @type("number") speed = 0;
    /** Damage dealt by the projectile */
    @type("number") damage = 0;
    /** Range of the projectile in meters */
    @type("number") range = 0;
    /** Distance traveled so far */
    @type("number") distanceTraveled = 0;
    /** ID of the vehicle that fired the projectile */
    @type("string") sourceId = "";
    /** Timestamp when the projectile was created */
    @type("number") timestamp = 0;
    /** Current physics tick */
    @type("number") tick = 0;
}

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
    /** Last processed input timestamp */
    @type("number") lastProcessedInputTimestamp = 0;
    /** Last processed input tick */
    @type("number") lastProcessedInputTick = 0;
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
    /** Array of equipped weapons */
    @type([Weapon]) weapons = new ArraySchema<Weapon>();
    /** Index of the currently active weapon */
    @type("number") activeWeaponIndex = 0;
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
    /** Map of all projectiles in the game, keyed by projectile ID */
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    /** Current server tick number for synchronization */
    @type("number") serverTick = 0;
}
