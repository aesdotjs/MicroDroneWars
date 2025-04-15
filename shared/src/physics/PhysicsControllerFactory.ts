import * as CANNON from 'cannon';
import { VehiclePhysicsConfig } from './types';
import { BasePhysicsController } from './BasePhysicsController';
import { DronePhysicsController } from './DronePhysicsController';
import { PlanePhysicsController } from './PlanePhysicsController';

/**
 * Factory class for creating physics controllers for different vehicle types.
 * Provides a centralized way to instantiate the appropriate physics controller
 * based on the vehicle configuration.
 */
export class PhysicsControllerFactory {
    /**
     * Creates a physics controller based on the vehicle type specified in the configuration.
     * @param world - The CANNON.js physics world instance
     * @param config - The vehicle physics configuration
     * @returns A new physics controller instance
     * @throws Error if the vehicle type is unknown
     */
    public static createController(world: CANNON.World, config: VehiclePhysicsConfig): BasePhysicsController {
        switch (config.vehicleType) {
            case 'drone':
                return new DronePhysicsController(world, config);
            case 'plane':
                return new PlanePhysicsController(world, config);
            default:
                throw new Error(`Unknown vehicle type: ${config.vehicleType}`);
        }
    }
} 