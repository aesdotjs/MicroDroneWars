import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

/**
 * Represents a weapon in the game state
 */
export class WeaponSchema extends Schema {
    /** Unique identifier for the weapon type */
    @type("string") id = "";
    /** Display name of the weapon */
    @type("string") name = "";
    /** Type of projectile this weapon fires */
    @type("string") projectileType = "";
    /** Damage dealt by the weapon */
    @type("number") damage = 0;
    /** Minimum fire rate in rounds per second */
    @type("number") minFireRate = 0;
    /** Maximum fire rate in rounds per second */
    @type("number") maxFireRate = 0;
    /** Heat per shot for the weapon */
    @type("number") heatPerShot = 0;
    /** Heat dissipation rate for the weapon */
    @type("number") heatDissipationRate = 0;
    /** Speed of the projectile in m/s */
    @type("number") projectileSpeed = 0;
    /** Maximum range of the weapon in meters */
    @type("number") range = 0;
}

/**
 * Transform component schema
 */
export class TransformSchema extends Schema {
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
}

/**
 * Vehicle component schema
 */
export class VehicleSchema extends Schema {
    /** Type of vehicle (drone or plane) */
    @type("string") vehicleType = "";
    /** Array of weapons equipped on the vehicle */
    @type([WeaponSchema]) weapons = new ArraySchema<WeaponSchema>();
    /** Index of the currently active weapon */
    @type("number") activeWeaponIndex = 0;
}

/**
 * Projectile component schema
 */
export class ProjectileSchema extends Schema {
    @type("string") projectileType = "";
    @type("number") damage = 0;
    @type("number") range = 0;
    @type("number") distanceTraveled = 0;
    @type("string") sourceId = "";
    @type("number") speed = 0;
}

/**
 * Tick and timestamp component schema
 */
export class TickSchema extends Schema {
    @type("number") tick = 0;
    @type("number") timestamp = 0;
    @type("number") lastProcessedInputTimestamp = 0;
    @type("number") lastProcessedInputTick = 0;
}

/**
 * Owner component schema
 */
export class OwnerSchema extends Schema {
    @type("string") id = "";
}

/**
 * Game state component schema
 */
export class GameStateSchema extends Schema {
    @type("number") health = 100;
    @type("number") maxHealth = 100;
    @type("number") team = 0;
    @type("boolean") hasFlag = false;
    @type("boolean") carryingFlag = false;
    @type("string") carriedBy = "";
    @type("boolean") atBase = true;
}

/**
 * Asset component schema
 */
export class AssetSchema extends Schema {
    @type("string") assetPath = "";
    @type("string") assetType = "";
    @type("number") scale = 1;
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

    /** Transform component */
    @type(TransformSchema) transform = new TransformSchema();

    /** Vehicle component */
    @type(VehicleSchema) vehicle = new VehicleSchema();

    /** Projectile component */
    @type(ProjectileSchema) projectile = new ProjectileSchema();

    /** Tick and timestamp component */
    @type(TickSchema) tick = new TickSchema();

    /** Owner component */
    @type(OwnerSchema) owner = new OwnerSchema();

    /** Game state component */
    @type(GameStateSchema) gameState = new GameStateSchema();

    /** Asset component */
    @type(AssetSchema) asset = new AssetSchema();
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