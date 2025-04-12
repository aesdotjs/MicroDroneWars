import { Vector3, Quaternion } from '@babylonjs/core';
export interface PhysicsState {
    position: Vector3;
    quaternion: Quaternion;
    linearVelocity: Vector3;
    angularVelocity: Vector3;
    timestamp?: number;
}
export interface PhysicsConfig {
    mass: number;
    gravity: number;
    drag: number;
    angularDrag: number;
    maxSpeed: number;
    maxAngularSpeed: number;
    maxAngularAcceleration: number;
    angularDamping: number;
    forceMultiplier: number;
}
export interface VehiclePhysicsConfig extends PhysicsConfig {
    vehicleType: 'drone' | 'plane';
    thrust: number;
    lift: number;
    torque: number;
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
    mouseDelta?: {
        x: number;
        y: number;
    };
}
