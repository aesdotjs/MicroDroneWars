import { Engine, Scene, Vector3, Quaternion } from '@babylonjs/core';
import * as CANNON from 'cannon';
import { PhysicsWorld } from '../../../shared/src/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '../../../shared/src/physics/PhysicsControllerFactory';
import { VehiclePhysicsConfig, PhysicsInput, PhysicsState } from '../../../shared/src/physics/types';

export class ServerPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    private controllers: Map<string, any> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private updateRate: number = 60; // Updates per second

    constructor() {
        // Create NullEngine for server-side physics
        this.engine = new Engine(null, true);
        this.scene = new Scene(this.engine);
        this.physicsWorld = new PhysicsWorld(this.engine);

        // Start the physics update loop
        this.startUpdateLoop();
    }

    private startUpdateLoop(): void {
        const updateInterval = 1000 / this.updateRate;
        this.updateInterval = setInterval(() => {
            this.update(1 / this.updateRate);
        }, updateInterval);
    }

    public createVehicle(id: string, config: VehiclePhysicsConfig): void {
        const controller = PhysicsControllerFactory.createController(
            this.physicsWorld.getWorld(),
            config
        );
        this.controllers.set(id, controller);
    }

    public update(deltaTime: number): void {
        // Update the physics world
        this.physicsWorld.update(deltaTime);

        // Update all vehicle controllers
        this.controllers.forEach((controller) => {
            controller.update(deltaTime);
        });
    }

    public applyInput(id: string, input: PhysicsInput): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.update(1 / this.updateRate, input);
        }
    }

    public getVehicleState(id: string): PhysicsState | null {
        const controller = this.controllers.get(id);
        if (controller) {
            return controller.getState();
        }
        return null;
    }

    public removeVehicle(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.cleanup();
            this.controllers.delete(id);
        }
    }

    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Clean up all controllers
        this.controllers.forEach((controller) => {
            controller.cleanup();
        });
        this.controllers.clear();

        // Dispose of Babylon.js resources
        this.scene.dispose();
        this.engine.dispose();
    }
} 