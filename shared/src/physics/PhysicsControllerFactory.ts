import * as CANNON from 'cannon-es';
import { VehiclePhysicsConfig } from './types';
import { BasePhysicsController } from './BasePhysicsController';
import { DronePhysicsController } from './DronePhysicsController';
import { PlanePhysicsController } from './PlanePhysicsController';
import { CollisionManager } from './CollisionManager';

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
     * @param id - Unique identifier for the vehicle
     * @param collisionManager - The collision manager instance
     * @returns A new physics controller instance
     * @throws Error if the vehicle type is unknown
     */
    public static createController(
        world: CANNON.World, 
        config: VehiclePhysicsConfig,
        id: string,
        collisionManager: CollisionManager
    ): BasePhysicsController {
        switch (config.vehicleType) {
            case 'drone':
                return new DronePhysicsController(world, config, id, collisionManager);
            case 'plane':
                return new PlanePhysicsController(world, config, id, collisionManager);
            default:
                throw new Error(`Unknown vehicle type: ${config.vehicleType}`);
        }
    }
} 