import * as CANNON from 'cannon';
import { VehiclePhysicsConfig, PhysicsInput } from './types';
import { BasePhysicsController } from './BasePhysicsController';
export declare class DronePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    private motorPositions;
    private motorThrust;
    private motorSpeed;
    private hoverForce;
    constructor(world: CANNON.World, config: VehiclePhysicsConfig);
    update(deltaTime: number, input: PhysicsInput): void;
}
