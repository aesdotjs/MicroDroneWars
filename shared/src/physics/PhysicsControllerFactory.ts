import * as CANNON from 'cannon';
import { VehiclePhysicsConfig } from './types';
import { BasePhysicsController } from './BasePhysicsController';
import { DronePhysicsController } from './DronePhysicsController';
import { PlanePhysicsController } from './PlanePhysicsController';

export class PhysicsControllerFactory {
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