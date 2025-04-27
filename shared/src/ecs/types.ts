import { Vector3, Quaternion, Mesh } from 'babylonjs';
import type { Body as CannonBody } from 'cannon-es';
import { CollisionGroups } from './CollisionGroups';

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
    Environment = 'environment'
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

    // Weapon components
    weapons?: WeaponComponent[];
    activeWeaponIndex?: number;
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

export type ProjectileComponent = {
    projectileType: ProjectileType;
    damage: number;
    range: number;
    distanceTraveled: number;
    sourceId: string;
    timestamp: number;
    tick: number;
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
    /** Forward movement input */
    forward: boolean;
    /** Backward movement input */
    backward: boolean;
    /** Left movement input */
    left: boolean;
    /** Right movement input */
    right: boolean;
    /** Upward movement input */
    up: boolean;
    /** Downward movement input */
    down: boolean;
    /** Pitch up input */
    pitchUp: boolean;
    /** Pitch down input */
    pitchDown: boolean;
    /** Yaw left input */
    yawLeft: boolean;
    /** Yaw right input */
    yawRight: boolean;
    /** Roll left input */
    rollLeft: boolean;
    /** Roll right input */
    rollRight: boolean;
    /** Fire weapon input */
    fire: boolean;
    /** Zoom input */
    zoom: boolean;
    /** Switch to next weapon input */
    nextWeapon: boolean;
    /** Switch to previous weapon input */
    previousWeapon: boolean;
    /** Switch to weapon 1 */
    weapon1: boolean;
    /** Switch to weapon 2 */
    weapon2: boolean;
    /** Switch to weapon 3 */
    weapon3: boolean;
    /** Mouse movement delta */
    mouseDelta: { x: number; y: number };
    /** Current simulation tick */
    tick: number;
    /** Timestamp of the input in milliseconds */
    timestamp: number;
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
    /** Fire rate in rounds per second */
    fireRate: number;
    /** Speed of the projectile in m/s */
    projectileSpeed: number;
    /** Cooldown time between shots in seconds */
    cooldown: number;
    /** Maximum range of the weapon in meters */
    range: number;
    /** Whether the weapon is currently on cooldown */
    isOnCooldown: boolean;
    /** Last time the weapon was fired */
    lastFireTime: number;
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
        cooldown: 0.1,
        range: 1000,
        isOnCooldown: false,
        lastFireTime: 0
    },
    missile: {
        id: 'missile',
        name: 'Missile',
        projectileType: 'missile',
        damage: 50,
        fireRate: 1,
        projectileSpeed: 50,
        cooldown: 1,
        range: 2000,
        isOnCooldown: false,
        lastFireTime: 0
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
    projectileType: 'bullet' | 'missile';
    /** Position where the damage occurred */
    position: Vector3;
    /** Timestamp of the damage event */
    timestamp: number;
}
