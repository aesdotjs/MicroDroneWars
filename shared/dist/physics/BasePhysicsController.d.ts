import * as CANNON from 'cannon';
import { Vector3 } from 'babylonjs';
import { PhysicsState, PhysicsConfig, PhysicsInput } from './types';
import { SpringSimulator } from '../utils/SpringSimulator';
export declare abstract class BasePhysicsController {
    protected body: CANNON.Body;
    protected world: CANNON.World;
    protected config: PhysicsConfig;
    protected springSimulator: SpringSimulator;
    protected aileronSimulator: SpringSimulator;
    protected elevatorSimulator: SpringSimulator;
    protected rudderSimulator: SpringSimulator;
    protected steeringSimulator: SpringSimulator;
    protected enginePower: number;
    constructor(world: CANNON.World, config: PhysicsConfig);
    abstract update(deltaTime: number, input: PhysicsInput): void;
    getState(): PhysicsState | null;
    setState(state: PhysicsState): void;
    cleanup(): void;
    protected updateEnginePower(input: PhysicsInput): void;
    protected getOrientationVectors(): {
        forward: Vector3;
        right: Vector3;
        up: Vector3;
    };
    getBody(): CANNON.Body;
}
