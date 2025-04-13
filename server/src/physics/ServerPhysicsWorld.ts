import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '@shared/physics/PhysicsControllerFactory';
import { VehiclePhysicsConfig, PhysicsInput, PhysicsState } from '@shared/physics/types';
import { Engine, Scene, NullEngine } from 'babylonjs';
export class ServerPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    private controllers: Map<string, any> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private updateRate: number = 60; // Updates per second

    constructor() {
        // Create NullEngine for server-side physics
        this.engine = new NullEngine();

        this.scene = new Scene(this.engine);
        this.physicsWorld = new PhysicsWorld(this.engine, this.scene);

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
        
        // Log initial vehicle creation only
        console.log('Server: Vehicle created:', {
            id,
            type: config.vehicleType
        });
    }

    public update(deltaTime: number): void {
        // Update the physics world
        this.physicsWorld.update(deltaTime);

        // Update all vehicle controllers with default input
        const defaultInput: PhysicsInput = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            pitchUp: false,
            pitchDown: false,
            yawLeft: false,
            yawRight: false,
            rollLeft: false,
            rollRight: false,
            mouseDelta: { x: 0, y: 0 }
        };

        // Update all vehicle controllers without logging
        this.controllers.forEach((controller) => {
            controller.update(deltaTime, defaultInput);
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