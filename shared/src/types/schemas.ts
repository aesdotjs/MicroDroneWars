import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { Vector3, Quaternion } from 'babylonjs';

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
 * Represents a unified entity in the game state.
 * This schema can represent any entity type (vehicle, projectile, flag, etc.)
 * with a common set of base properties and type-specific data.
 */
export class EntitySchema extends Schema {
    /** Unique identifier for the entity */
    @type("string") id = "";
    /** Type of entity (e.g. "drone", "plane", "projectile", "flag") */
    @type("string") type = "";
    /** Team number (0 or 1) for team-based entities */
    @type("number") team = 0;

    // Transform data
    @type("float32") positionX = 0;
    @type("float32") positionY = 0;
    @type("float32") positionZ = 0;
    @type("float32") quaternionX = 0;
    @type("float32") quaternionY = 0;
    @type("float32") quaternionZ = 0;
    @type("float32") quaternionW = 1;
    @type("float32") linearVelocityX = 0;
    @type("float32") linearVelocityY = 0;
    @type("float32") linearVelocityZ = 0;
    @type("float32") angularVelocityX = 0;
    @type("float32") angularVelocityY = 0;
    @type("float32") angularVelocityZ = 0;

    // Common state data
    @type("number") health = 100;
    @type("number") maxHealth = 100;
    @type("boolean") hasFlag = false;
    @type("string") carriedBy = "";
    @type("boolean") atBase = true;

    // Vehicle-specific data
    @type("string") vehicleType = "";
    @type([Weapon]) weapons = new ArraySchema<Weapon>();
    @type("number") activeWeaponIndex = 0;

    // Projectile-specific data
    @type("string") projectileType = "";
    @type("number") damage = 0;
    @type("number") range = 0;
    @type("number") distanceTraveled = 0;
    @type("string") sourceId = "";
    @type("number") speed = 0;

    // Timestamps and ticks
    @type("number") tick = 0;
    @type("number") timestamp = 0;
    @type("number") lastProcessedInputTimestamp = 0;
    @type("number") lastProcessedInputTick = 0;
}

/**
 * Represents the complete game state.
 * Contains all entities and server tick information.
 */
export class State extends Schema {
    /** Map of all entities in the game, keyed by entity ID */
    @type({ map: EntitySchema }) entities = new MapSchema<EntitySchema>();
    /** Current server tick number for synchronization */
    @type("number") serverTick = 0;
    /** Next available entity ID */
    @type("number") nextEntityId = 0;
} 