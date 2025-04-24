import { Vector3, Quaternion, Mesh } from 'babylonjs';
import type { Body as CannonBody } from 'cannon-es';
import { CollisionGroups } from './CollisionGroups';

/**
 * Base interface for all game entities in the ECS system.
 * Components are optional properties that entities may have.
 */
export interface GameEntity {
    /** Unique identifier for the entity */
    id: string;
    
    /** Type of entity (e.g. "drone", "plane", "projectile", "flag") */
    type?: string;

    // Transform components
    position?: Vector3;
    rotation?: Quaternion;
    velocity?: Vector3;
    angularVelocity?: Vector3;

    // Physics components
    body?: CannonBody;
    collisionGroup?: number;
    collisionMask?: number;
    mass?: number;
    drag?: number;
    angularDrag?: number;
    maxSpeed?: number;
    maxAngularSpeed?: number;
    maxAngularAcceleration?: number;
    angularDamping?: number;
    forceMultiplier?: number;
    thrust?: number;
    lift?: number;
    torque?: number;
    minSpeed?: number;
    bankAngle?: number;
    wingArea?: number;
    strafeForce?: number;
    minHeight?: number;

    // Game state components
    health?: number;
    maxHealth?: number;
    team?: number;
    hasFlag?: boolean;
    carryingFlag?: boolean;
    carriedBy?: string;
    atBase?: boolean;

    // Vehicle type tags
    drone?: boolean;
    plane?: boolean;
    projectile?: boolean;
    flag?: boolean;
    environment?: boolean;
    checkpoint?: boolean;
    checkpointIndex?: number;

    // Vehicle-specific data
    vehicleType?: string;

    // Weapon components
    weapons?: {
        id: string;
        name: string;
        projectileType: 'bullet' | 'missile';
        damage: number;
        fireRate: number;
        projectileSpeed: number;
        cooldown: number;
        range: number;
        isOnCooldown: boolean;
        lastFireTime: number;
    }[];
    activeWeaponIndex?: number;

    // Projectile components
    projectileType?: string;
    damage?: number;
    range?: number;
    distanceTraveled?: number;
    sourceId?: string;
    speed?: number;

    // Input components (server-side)
    input?: {
        forward: boolean;
        backward: boolean;
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        pitchUp: boolean;
        pitchDown: boolean;
        yawLeft: boolean;
        yawRight: boolean;
        rollLeft: boolean;
        rollRight: boolean;
        fire: boolean;
        zoom: boolean;
        nextWeapon: boolean;
        previousWeapon: boolean;
        weapon1: boolean;
        weapon2: boolean;
        weapon3: boolean;
        mouseDelta?: { x: number; y: number };
        tick: number;
        timestamp: number;
    };

    // Rendering components (client-side)
    mesh?: Mesh;
    targetPosition?: Vector3;
    targetRotation?: Quaternion;

    // Timestamps and ticks
    tick?: number;
    timestamp?: number;
    lastProcessedInputTimestamp?: number;
    lastProcessedInputTick?: number;
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
    minSpeed: number;
    bankAngle: number;
    wingArea: number;
    strafeForce: number;
    minHeight: number;
};

export type VehicleComponent = {
    health: number;
    maxHealth: number;
    team: number;
    hasFlag: boolean;
    carryingFlag: boolean;
    carriedBy?: string;
    weapons: {
        id: string;
        name: string;
        projectileType: 'bullet' | 'missile';
        damage: number;
        fireRate: number;
        projectileSpeed: number;
        cooldown: number;
        range: number;
        isOnCooldown: boolean;
        lastFireTime: number;
    }[];
    activeWeaponIndex: number;
};

export type ProjectileComponent = {
    damage: number;
    range: number;
    distanceTraveled: number;
    sourceId: string;
    timestamp: number;
    tick: number;
};

export type InputComponent = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    pitchUp: boolean;
    pitchDown: boolean;
    yawLeft: boolean;
    yawRight: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    fire: boolean;
    zoom: boolean;
    nextWeapon: boolean;
    previousWeapon: boolean;
    weapon1: boolean;
    weapon2: boolean;
    weapon3: boolean;
    mouseDelta?: { x: number; y: number };
    tick: number;
    timestamp: number;
};

export type RenderComponent = {
    mesh: Mesh;
    targetPosition?: Vector3;
    targetRotation?: Quaternion;
};

/**
 * Represents the complete physics state of a vehicle or object.
 * Contains position, orientation, and velocity information.
 */
export interface PhysicsState {
    /** Current position in 3D space */
    position: { x: number; y: number; z: number };
    /** Current orientation as a quaternion */
    quaternion: { x: number; y: number; z: number; w: number };
    /** Current linear velocity */
    linearVelocity: { x: number; y: number; z: number };
    /** Current angular velocity */
    angularVelocity: { x: number; y: number; z: number };
    /** Current tick */
    tick: number;
    /** Timestamp of the state in milliseconds */
    timestamp: number;
    /** Last processed input timestamp */
    lastProcessedInputTimestamp?: number;
    /** Last processed input tick */
    lastProcessedInputTick?: number;
}

/**
 * Input state for vehicle control.
 * Represents all possible control inputs for vehicles.
 */
export interface PhysicsInput {
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
export interface StateBuffer {
    /** Array of recent physics states */
    state: PhysicsState;
    /** Last processed simulation tick */
    tick: number;
    /** Timestamp of the last processed state */
    timestamp: number;
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
    vehicleType: 'drone' | 'plane';
    /** Thrust force in N */
    thrust: number;
    /** Lift force in N */
    lift: number;
    /** Torque force in N·m */
    torque: number;
    /** Minimum speed in m/s */
    minSpeed?: number;
    /** Maximum bank angle in radians */
    bankAngle?: number;
    /** Wing area in m² */
    wingArea?: number;
    /** Sideways force multiplier */
    strafeForce?: number;
    /** Minimum height above ground in m */
    minHeight?: number;
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
    vehicleType: 'drone',
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
    vehicleType: 'plane',
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
