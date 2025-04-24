import { Vector3, Quaternion, Mesh } from 'babylonjs';
import type { Body as CannonBody } from 'cannon-es';
import { CollisionGroups } from '../physics/CollisionGroups';

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