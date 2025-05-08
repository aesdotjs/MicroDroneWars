import { Vector3, Quaternion, Mesh, TransformNode } from '@babylonjs/core';
import type { Body as CannonBody, Vec3 } from 'cannon-es';

export enum VehicleType {
    Drone = 'drone',
    Plane = 'plane'
};

export enum ProjectileType {
    Bullet = 'bullet',
    Missile = 'missile'
};

export enum WeaponType {
    Chaingun = 'chaingun',
    Missile = 'missile'
};

export enum EntityType {
    Vehicle = 'vehicle',
    Projectile = 'projectile',
    Flag = 'flag',
    Checkpoint = 'checkpoint',
    Environment = 'environment',
    Level = 'level'
};

/**
 * Owner component for tracking entity ownership
 */
export interface OwnerComponent {
    /** The ID of the player that owns this entity */
    id: string;
    /** Quickly identifies the local player entity */
    isLocal: boolean;
}

/**
 * Game state component for tracking entity state
 */
export interface GameStateComponent {
    /** Current health of the entity */
    health: number;
    /** Maximum health of the entity */
    maxHealth: number;
    /** Team number (0 or 1) for team-based entities */
    team: number;
    /** Whether the entity has a flag */
    hasFlag: boolean;
    /** Whether the entity is carrying a flag */
    carryingFlag: boolean;
    /** ID of the entity carrying this entity */
    carriedBy?: string;
    /** Whether the entity is at its base */
    atBase: boolean;
}


/**
 * Base interface for all game entities in the ECS system.
 * Components are optional properties that entities may have.
 */
export interface GameEntity {
    /** Unique identifier for the entity */
    id: string;
    
    /** Type of entity (e.g. "drone", "plane", "projectile", "flag") */
    type?: EntityType;

    /** Transform component for position, rotation and velocity */
    transform?: TransformComponent;
    /** Server-side transform for debug visualization */
    serverTransform?: TransformComponent;

    /** Physics component for physical properties and behavior */
    physics?: PhysicsComponent;

    /** Vehicle component for vehicle-specific properties */
    vehicle?: VehicleComponent;

    /** Projectile component for projectile-specific properties */
    projectile?: ProjectileComponent;

    /** Input component for control inputs */
    // input?: InputComponent;

    /** Render component for visual representation */
    render?: RenderComponent;

    /** Tick and timestamp component for synchronization */
    tick?: TickComponent;

    /** Owner component for tracking entity ownership */
    owner?: OwnerComponent;

    /** Game state component for tracking entity state */
    gameState?: GameStateComponent;

    /** Asset component for handling meshes and sounds */
    asset?: AssetComponent;
}

/**
 * Component type definitions for type safety and documentation
 */
export type TransformComponent = {
    position: Vector3;
    rotation: Quaternion;
    velocity: Vector3;
    angularVelocity: Vector3;
};

export type PhysicsComponent = {
    body: CannonBody;
    mass: number;
    drag: number;
    angularDrag: number;
    maxSpeed: number;
    maxAngularSpeed: number;
    maxAngularAcceleration: number;
    angularDamping: number;
    forceMultiplier: number;
    thrust: number;
    lift: number;
    torque: number;
};

/**
 * Vehicle component for vehicle-specific properties
 */
export interface VehicleComponent {
    /** Type of vehicle (drone or plane) */
    vehicleType: VehicleType;
    /** Array of weapons equipped on the vehicle */
    weapons: WeaponComponent[];
    /** Index of the currently active weapon */
    activeWeaponIndex: number;
}

export type ImpactComponent = {
    position: Vector3;
    normal: Vector3;
    impactVelocity: number;
    targetId: string;
    targetType: string;
}

export type ProjectileComponent = {
    projectileType: ProjectileType;
    damage: number;
    range: number;
    distanceTraveled: number;
    sourceId: string;
    speed: number;
    impact?: ImpactComponent;
};


export type RenderComponent = {
    mesh: Mesh;
    targetPosition?: Vector3;
    targetRotation?: Quaternion;
};

export type TickComponent = {
    tick: number;
    timestamp: number;
    lastProcessedInputTimestamp?: number;
    lastProcessedInputTick?: number;
}


/**
 * Input state for vehicle control.
 * Represents all possible control inputs for vehicles.
 */
export interface InputComponent {
    /** Forward movement is currently held down */
    forward: boolean;
    /** Forward key went down this frame (+forward) */
    forwardPressed: boolean;
    /** Forward key went up   this frame (−forward) */
    forwardReleased: boolean;

    backward: boolean;
    backwardPressed: boolean;
    backwardReleased: boolean;

    left: boolean;
    leftPressed: boolean;
    leftReleased: boolean;

    right: boolean;
    rightPressed: boolean;
    rightReleased: boolean;

    up: boolean;
    upPressed: boolean;
    upReleased: boolean;

    down: boolean;
    downPressed: boolean;
    downReleased: boolean;

    pitchUp: boolean;
    pitchUpPressed: boolean;
    pitchUpReleased: boolean;

    pitchDown: boolean;
    pitchDownPressed: boolean;
    pitchDownReleased: boolean;

    yawLeft: boolean;
    yawLeftPressed: boolean;
    yawLeftReleased: boolean;

    yawRight: boolean;
    yawRightPressed: boolean;
    yawRightReleased: boolean;

    rollLeft: boolean;
    rollLeftPressed: boolean;
    rollLeftReleased: boolean;

    rollRight: boolean;
    rollRightPressed: boolean;
    rollRightReleased: boolean;

    /** Fire weapon edge‐trigger only */
    firePressed: boolean;
    fireReleased: boolean;
    /** “Held” flag if you still want it client‐side */
    fire: boolean;

    /** Zoom edge‐trigger only */
    zoomPressed: boolean;
    zoomReleased: boolean;
    zoom: boolean;

    /** Switch weapons (one‐offs, edge only) */
    nextWeapon: boolean;
    previousWeapon: boolean;
    weapon1: boolean;
    weapon2: boolean;
    weapon3: boolean;

    /** Mouse movement delta */
    mouseDelta: { x: number; y: number };

    /** Filled in by the physics/network systems */
    tick: number;
    timestamp: number;
    projectileId: number;
}

/**
 * Represents a collision event between two physics bodies.
 * Contains information about the colliding bodies and contact details.
 */
export interface CollisionEvent {
    /** First colliding body */
    bodyA: CannonBody;
    /** Second colliding body */
    bodyB: CannonBody;
    /** Contact information between the bodies */
    target: {
        contacts: {
            /** Gets the impact velocity along the contact normal */
            getImpactVelocityAlongNormal: () => number;
            /** Gets the contact normal vector */
            getNormal: () => CANNON.Vec3;
            /** Contact normal vector */
            ni: CANNON.Vec3;
            /** Contact point on body A */
            ri: CANNON.Vec3;
            /** Contact point on body B */
            rj: CANNON.Vec3;
            /** Body A */
            bi: CannonBody;
            /** Body B */
            bj: CannonBody;
        }[];
    };
}


/**
 * Represents the type of collision that occurred
 */
export enum CollisionType {
    VehicleVehicle = 'vehicle-vehicle',
    VehicleEnvironment = 'vehicle-environment',
    VehicleProjectile = 'vehicle-projectile',
    VehicleFlag = 'vehicle-flag'
}

/**
 * Represents the severity of a collision
 */
export enum CollisionSeverity {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy'
}

/**
 * Represents a collision event involving a vehicle.
 * Specialized version of CollisionEvent for vehicle-specific handling.
 */
export interface VehicleCollisionEvent {
    /** The vehicle body involved in the collision */
    body: CannonBody;
    /** Contact information */
    // contacts is inside a target object
    target: {
        contacts: {
            /** Gets the impact velocity along the contact normal */
            getImpactVelocityAlongNormal: () => number;
            /** Gets the contact normal vector */
            getNormal: () => CANNON.Vec3;
            /** Contact point on body A */
            ri: CANNON.Vec3;
            /** Contact point on body B */
            rj: CANNON.Vec3;
        }[];
    };    
}

/**
 * Buffer for storing and interpolating physics states.
 * Used for network synchronization and smooth movement.
 */
export interface TransformBuffer {
    transform: TransformComponent;
    tick: TickComponent;
}

/**
 * Configuration for vehicle physics properties.
 * Defines the physical characteristics and behavior of vehicles.
 */
export interface VehiclePhysicsConfig {
    /** Mass of the vehicle in kg */
    mass: number;
    /** Linear drag coefficient */
    drag: number;
    /** Angular drag coefficient */
    angularDrag: number;
    /** Maximum speed in m/s */
    maxSpeed: number;
    /** Maximum angular speed in rad/s */
    maxAngularSpeed: number;
    /** Maximum angular acceleration in rad/s² */
    maxAngularAcceleration: number;
    /** Angular damping factor */
    angularDamping: number;
    /** Force multiplier for movement */
    forceMultiplier: number;
    /** Type of vehicle (drone or plane) */
    vehicleType: VehicleType;
    /** Thrust force in N */
    thrust: number;
    /** Lift force in N */
    lift: number;
    /** Torque force in N·m */
    torque: number;
}

/**
 * Configuration for state interpolation.
 * Controls how states are interpolated for smooth movement.
 */
export interface InterpolationConfig {
    /** Delay in milliseconds before applying interpolated states */
    delay: number;
    /** Maximum number of states to buffer */
    maxBufferSize: number;
    /** Interpolation factor (0-1) */
    interpolationFactor: number;
}

/**
 * Default physics settings for drone vehicles.
 * Defines the physical properties and behavior characteristics of drones.
 */
export const DroneSettings: VehiclePhysicsConfig = {
    /** Type of vehicle - drone */
    vehicleType: VehicleType.Drone,
    /** Mass of the drone in kg */
    mass: 10,
    /** Linear drag coefficient */
    drag: 0.8,
    /** Angular drag coefficient */
    angularDrag: 0.8,
    /** Maximum speed in m/s */
    maxSpeed: 20,
    /** Maximum angular speed in rad/s */
    maxAngularSpeed: 0.2,
    /** Maximum angular acceleration in rad/s² */
    maxAngularAcceleration: 0.05,
    /** Angular damping factor */
    angularDamping: 0.9,
    /** Force multiplier for movement */
    forceMultiplier: 0.005,
    /** Thrust force in N */
    thrust: 20,
    /** Lift force in N */
    lift: 15,
    /** Torque force in N·m */
    torque: 1,
};

/**
 * Default physics settings for plane vehicles.
 * Defines the physical properties and behavior characteristics of planes.
 */
export const PlaneSettings: VehiclePhysicsConfig = {
    /** Type of vehicle - plane */
    vehicleType: VehicleType.Plane,
    /** Mass of the plane in kg */
    mass: 50,
    /** Linear drag coefficient */
    drag: 0.8,
    /** Angular drag coefficient */
    angularDrag: 0.8,
    /** Maximum speed in m/s */
    maxSpeed: 20,
    /** Maximum angular speed in rad/s */
    maxAngularSpeed: 0.2,
    /** Maximum angular acceleration in rad/s² */
    maxAngularAcceleration: 0.05,
    /** Angular damping factor */
    angularDamping: 0.9,
    /** Force multiplier for movement */
    forceMultiplier: 0.005,
    /** Thrust force in N */
    thrust: 30,
    /** Lift force in N */
    lift: 12,
    /** Torque force in N·m */
    torque: 2,
};

/**
 * Represents a weapon that can be equipped on vehicles
 */
export interface WeaponComponent {
    /** Unique identifier for the weapon type */
    id: string;
    /** Display name of the weapon */
    name: string;
    /** Type of projectile this weapon fires */
    projectileType: 'bullet' | 'missile';
    /** Damage dealt by the weapon */
    damage: number;
    /** Base fire rate in rounds per second */
    fireRate?: number;
    /** Minimum fire rate in rounds per second (when overheated) */
    minFireRate: number;
    /** Maximum fire rate in rounds per second (when fully cooled) */
    maxFireRate: number;
    /** Current heat accumulator (0-1) */
    heatAccumulator?: number;
    /** Heat generation per shot (0-1) */
    heatPerShot: number;
    /** Heat dissipation rate per second (0-1) */
    heatDissipationRate: number;
    /** Speed of the projectile in m/s */
    projectileSpeed: number;
    /** Maximum range of the weapon in meters */
    range: number;
    /** Whether the weapon is currently on cooldown */
    isOnCooldown?: boolean;
    /** Last tick the weapon was fired */
    lastFireTick?: number;
}

/**
 * Default weapons available in the game
 */
export const DefaultWeapons: { [key: string]: WeaponComponent } = {
    chaingun: {
        id: 'chaingun',
        name: 'Chaingun',
        projectileType: 'bullet',
        damage: 10,
        fireRate: 10,
        projectileSpeed: 100,
        range: 250,
        isOnCooldown: false,
        lastFireTick: 0,
        minFireRate: 2,
        maxFireRate: 5,
        heatAccumulator: 0,
        heatPerShot: 0.08,
        heatDissipationRate: 0.5,
    },
    missile: {
        id: 'missile',
        name: 'Missile',
        projectileType: 'missile',
        damage: 50,
        fireRate: 1,
        projectileSpeed: 50,
        range: 500,
        isOnCooldown: false,
        lastFireTick: 0,
        minFireRate: .5,
        maxFireRate: .5,
        heatAccumulator: 0,
        heatPerShot: 0,
        heatDissipationRate: 0
    }
};

/**
 * Event emitted when a vehicle takes damage
 */
export interface DamageEvent {
    /** ID of the vehicle that took damage */
    targetId: string;
    /** Amount of damage taken */
    damage: number;
    /** Type of projectile that caused the damage */
    projectileType: ProjectileType;
    /** Position where the damage occurred */
    position: Vector3;
    /** Timestamp of the damage event */
    timestamp: number;
}

/**
 * Asset component for handling meshes and sounds
 */
export interface AssetComponent {
    /** Array of visibl meshes in the entity */
    meshes?: Mesh[];
    /** Array of collision meshes in the entity */
    collisionMeshes?: Mesh[];
    /** Array of trigger meshes in the entity */
    triggerMeshes?: Mesh[];
    /** Whether the assets are loaded */
    isLoaded: boolean;
    /** The path to the asset file */
    assetPath: string;
    /** The type of asset (e.g. "glb", "gltf", "babylon") */
    assetType: string;
    /** The scale of the asset */
    scale: number;
}

/**
 * Defines collision groups for different types of physics bodies in the game.
 * Uses bit flags to enable efficient collision filtering.
 */
export enum CollisionGroups {
    /** Default collision group for basic physics objects */
    Default = 1,
    /** Collision group for drone vehicles */
    Drones = 2,
    /** Collision group for plane vehicles */
    Planes = 4,
    /** Collision group for environment objects (ground, obstacles) */
    Environment = 8,
    /** Collision group for projectile objects */
    Projectiles = 16,
    /** Collision group for flag objects */
    Flags = 32,
    /** Collision group for trimesh colliders */
    TrimeshColliders = 64
}

/**
 * Interface defining collision masks for different vehicle types.
 * Each mask specifies which collision groups a vehicle can collide with.
 */
export interface CollisionMasks {
    /** Collision mask for drone vehicles */
    Drone: number;
    /** Collision mask for plane vehicles */
    Plane: number;
    /** Collision mask for projectile objects */
    Projectile: number;
    /** Collision mask for flag objects */
    Flag: number;
    /** Collision mask for environment objects */
    Environment: number;
}

/**
 * Predefined collision masks for different vehicle types.
 * Each mask is a combination of collision groups that the vehicle can interact with.
 */
export const collisionMasks: CollisionMasks = {
    /** Drone collision mask - can collide with environment, projectiles, flags, and planes */
    Drone: CollisionGroups.Drones | CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Planes,
    /** Plane collision mask - can collide with environment, projectiles, flags, and drones */
    Plane: CollisionGroups.Planes | CollisionGroups.Environment | CollisionGroups.Projectiles | CollisionGroups.Flags | CollisionGroups.Drones,
    /** Projectile collision mask - can collide with drones, planes, and environment, but not with its source */
    Projectile: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Environment,
    /** Flag collision mask - can collide with drones and planes */
    Flag: CollisionGroups.Drones | CollisionGroups.Planes,
    /** Environment collision mask - can collide with drones, planes, projectiles, and flags */
    Environment: CollisionGroups.Drones | CollisionGroups.Planes | CollisionGroups.Projectiles | CollisionGroups.Flags,
}; 
