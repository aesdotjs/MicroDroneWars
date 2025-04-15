import { Vector3, Quaternion } from 'babylonjs';

/**
 * Represents the complete physics state of a vehicle or object.
 * Contains position, orientation, and velocity information.
 */
export interface PhysicsState {
    /** Current position in 3D space */
    position: Vector3;
    /** Current orientation as a quaternion */
    quaternion: Quaternion;
    /** Current linear velocity */
    linearVelocity: Vector3;
    /** Current angular velocity */
    angularVelocity: Vector3;
    /** Timestamp of the state in milliseconds */
    timestamp: number;
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
    /** Mouse movement delta */
    mouseDelta?: { x: number; y: number };
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
    bodyA: CANNON.Body;
    /** Second colliding body */
    bodyB: CANNON.Body;
    /** Contact information between the bodies */
    contact: {
        /** Gets the impact velocity along the contact normal */
        getImpactVelocityAlongNormal: () => number;
        /** Gets the contact normal vector */
        getNormal: () => CANNON.Vec3;
        /** Contact point on body A */
        ri: CANNON.Vec3;
        /** Contact point on body B */
        rj: CANNON.Vec3;
    };
}

/**
 * Represents a collision event involving a vehicle.
 * Specialized version of CollisionEvent for vehicle-specific handling.
 */
export interface VehicleCollisionEvent {
    /** The vehicle body involved in the collision */
    body: CANNON.Body;
    /** Contact information */
    contact: {
        /** Gets the impact velocity along the contact normal */
        getImpactVelocityAlongNormal: () => number;
        /** Contact point on the vehicle */
        ri: CANNON.Vec3;
        /** Contact point on the other body */
        rj: CANNON.Vec3;
    };
}

/**
 * Buffer for storing and interpolating physics states.
 * Used for network synchronization and smooth movement.
 */
export interface StateBuffer {
    /** Array of recent physics states */
    states: PhysicsState[];
    /** Last processed simulation tick */
    lastProcessedTick: number;
    /** Timestamp of the last processed state */
    lastProcessedTimestamp: number;
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