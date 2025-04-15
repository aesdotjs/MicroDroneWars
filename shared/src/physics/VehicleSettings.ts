import { VehiclePhysicsConfig } from "./types";

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

