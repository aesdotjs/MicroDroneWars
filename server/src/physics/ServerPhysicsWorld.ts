import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '@shared/physics/PhysicsControllerFactory';
import { VehiclePhysicsConfig, PhysicsInput, PhysicsState } from '@shared/physics/types';
import { Engine, Scene, NullEngine } from 'babylonjs';
import { State } from '../schemas';

export class ServerPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    private controllers: Map<string, any> = new Map();
    private accumulator: number = 0;
    private fixedTimeStep: number = 1/60;

    constructor() {
        // Create NullEngine for server-side physics
        this.engine = new NullEngine();

        this.scene = new Scene(this.engine);
        this.physicsWorld = new PhysicsWorld(this.engine, this.scene, {
            fixedTimeStep: this.fixedTimeStep,
            maxSubSteps: 3,
            gravity: 9.81,
            mass: 50,
            drag: 0.8,
            angularDrag: 0.8,
            maxSpeed: 20,
            maxAngularSpeed: 0.2,
            maxAngularAcceleration: 0.05,
            angularDamping: 0.9,
            forceMultiplier: 0.005,
            vehicleType: 'drone', // Default type, will be overridden by vehicle config
            thrust: 20,
            lift: 15,
            torque: 1
        });
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

    public update(time: number, deltaTime: number, state: State): void {

        // Add frame time to accumulator (convert to seconds)
        this.accumulator += deltaTime;

        // Process fixed timestep updates with a maximum of 3 steps per frame
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < 3) {
            this.processFixedUpdate(state);
            this.accumulator -= this.fixedTimeStep;
            steps++;
        }

        // If we have leftover time, carry it over to next frame
        if (this.accumulator > this.fixedTimeStep * 3) {
            this.accumulator = this.fixedTimeStep * 3;
        }
    }

    private processFixedUpdate = (state: State) => {
        state.vehicles.forEach((vehicle, id) => {
            const controller = this.controllers.get(id);
            if (controller) {
                // Get the next input from the queue, or use default input if queue is empty
                const input = vehicle.inputQueue.shift() || {
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
                    mouseDelta: { x: 0, y: 0 }
                };
                controller.update(this.fixedTimeStep, input);
            }
        });
        this.physicsWorld.update(this.fixedTimeStep);
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