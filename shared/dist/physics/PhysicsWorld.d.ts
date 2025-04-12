import { Engine } from '@babylonjs/core';
import * as CANNON from 'cannon';
import { PhysicsState } from '../types';
export declare class PhysicsWorld {
    private engine;
    private scene;
    private world;
    private bodies;
    constructor(engine: Engine);
    getWorld(): CANNON.World;
    update(deltaTime: number): void;
    createVehicle(id: string, config: any): CANNON.Body;
    getVehicleState(id: string): PhysicsState | null;
    applyInput(id: string, input: any): void;
}
