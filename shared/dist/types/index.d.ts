import { Vector3, Quaternion } from 'babylonjs';
export interface PhysicsState {
    position: Vector3;
    quaternion: Quaternion;
    linearVelocity: Vector3;
    angularVelocity: Vector3;
}
export interface VehicleConfig {
    mass: number;
    maxSpeed: number;
    acceleration: number;
    turnRate: number;
    maxHealth: number;
    vehicleType: 'drone' | 'plane';
}
export interface PhysicsInput {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    pitchUp: boolean;
    pitchDown: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    mouseX: number;
    mouseY: number;
}
