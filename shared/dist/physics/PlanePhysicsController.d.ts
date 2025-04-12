import * as CANNON from 'cannon';
import { VehiclePhysicsConfig, PhysicsInput } from './types';
import { BasePhysicsController } from './BasePhysicsController';
export declare class PlanePhysicsController extends BasePhysicsController {
    protected config: VehiclePhysicsConfig;
    private lastDrag;
    protected enginePower: number;
    constructor(world: CANNON.World, config: VehiclePhysicsConfig);
    update(deltaTime: number, input: PhysicsInput): void;
}
