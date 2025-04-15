import { VehiclePhysicsConfig } from "./types";

export const DroneSettings: VehiclePhysicsConfig = {
    vehicleType: 'drone',
    mass: 10,
    drag: 0.8,
    angularDrag: 0.8,
    maxSpeed: 20,
    maxAngularSpeed: 0.2,
    maxAngularAcceleration: 0.05,
    angularDamping: 0.9,
    forceMultiplier: 0.005,
    thrust: 20,
    lift: 15,
    torque: 1,
};

export const PlaneSettings: VehiclePhysicsConfig = {
    vehicleType: 'plane',
    mass: 50,
    drag: 0.8,
    angularDrag: 0.8,
    maxSpeed: 20,
    maxAngularSpeed: 0.2,
    maxAngularAcceleration: 0.05,
    angularDamping: 0.9,
    forceMultiplier: 0.005,
    thrust: 30,
    lift: 12,
    torque: 2,
};

