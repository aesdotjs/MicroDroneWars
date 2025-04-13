import { Vector3, Quaternion } from 'babylonjs';

export interface PhysicsState {
    position: Vector3;
    quaternion: Quaternion;
    linearVelocity: Vector3;
    angularVelocity: Vector3;
    timestamp?: number;
}

export interface PhysicsConfig {
    mass: number;
    drag: number;
    angularDrag: number;
    maxSpeed: number;
    maxAngularSpeed: number;
    maxAngularAcceleration: number;
    angularDamping: number;
    forceMultiplier: number;
    vehicleType: 'drone' | 'plane';
    thrust: number;
    lift: number;
    torque: number;
    gravity: number;
}

export interface VehiclePhysicsConfig extends PhysicsConfig {
    minSpeed?: number;
    bankAngle?: number;
    wingArea?: number;
    strafeForce?: number;
    minHeight?: number;
}

export interface PhysicsInput {
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
    mouseDelta?: { x: number; y: number };
} 

export interface CollisionEvent {
    bodyA: CANNON.Body;
    bodyB: CANNON.Body;
    contact: {
        getImpactVelocityAlongNormal: () => number;
        getNormal: () => CANNON.Vec3;
        ri: CANNON.Vec3;
        rj: CANNON.Vec3;
    };
}

export interface VehicleCollisionEvent {
    body: CANNON.Body;
    contact: {
        getImpactVelocityAlongNormal: () => number;
        ri: CANNON.Vec3;
        rj: CANNON.Vec3;
    };
}