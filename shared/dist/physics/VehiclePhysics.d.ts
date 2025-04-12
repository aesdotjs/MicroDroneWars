import * as CANNON from 'cannon';
import { PhysicsInput, VehicleConfig } from '../types';
export declare class VehiclePhysics {
    private body;
    private config;
    private enginePower;
    private maxEnginePower;
    private enginePowerChangeRate;
    constructor(body: CANNON.Body, config: VehicleConfig);
    update(deltaTime: number, input: PhysicsInput): void;
    private applyDronePhysics;
    private applyPlanePhysics;
}
