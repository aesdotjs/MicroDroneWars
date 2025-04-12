import * as CANNON from 'cannon';
import { VehiclePhysicsConfig } from './types';
import { BasePhysicsController } from './BasePhysicsController';
export declare class PhysicsControllerFactory {
    static createController(world: CANNON.World, config: VehiclePhysicsConfig): BasePhysicsController;
}
