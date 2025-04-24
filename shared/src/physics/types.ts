import { Vector3, Quaternion } from 'babylonjs';
import type { Body as CannonBody } from 'cannon-es';
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
 * Basic physics configuration for the world.
 * Contains global physics settings like gravity.
 */
export interface PhysicsConfig {
    /** Gravity acceleration in m/s² */
    gravity: number;
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
 * Represents a weapon that can be equipped on vehicles
 */
export interface Weapon {
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
 * Represents a projectile in the game
 */
export interface Projectile {
    /** Unique identifier for the projectile */
    id: string;
    /** Type of projectile */
    type: 'bullet' | 'missile';
    /** Position of the projectile */
    position: Vector3;
    /** Direction the projectile is moving */
    direction: Vector3;
    /** Speed of the projectile in m/s */
    speed: number;
    /** Damage dealt by the projectile */
    damage: number;
    /** Range of the projectile in meters */
    range: number;
    /** Distance traveled so far */
    distanceTraveled: number;
    /** ID of the vehicle that fired the projectile */
    sourceId: string;
    /** Timestamp when the projectile was created */
    timestamp: number;
    /** Current physics tick */
    tick: number;
}