import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '@shared/physics/PhysicsControllerFactory';
import { PhysicsState } from '@shared/physics/types';
import { Engine, Scene, NullEngine, Vector3, Quaternion } from 'babylonjs';
import { State, Vehicle } from '../schemas';
import { DroneSettings, PlaneSettings } from '@shared/physics/VehicleSettings';

/**
 * Handles server-side physics simulation for the game.
 * Manages vehicle physics controllers and updates game state based on physics calculations.
 */
export class ServerPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    private controllers: Map<string, any> = new Map();
    private accumulator: number = 0;
    private fixedTimeStep: number = 1/60;

    /**
     * Creates a new ServerPhysicsWorld instance.
     * Initializes the physics engine and scene.
     */
    constructor() {
        // Create NullEngine for server-side physics
        this.engine = new NullEngine();

        this.scene = new Scene(this.engine);
        this.physicsWorld = new PhysicsWorld(this.engine, this.scene, {
            gravity: 9.81
        });
    }

    /**
     * Creates a new vehicle in the physics world.
     * @param id - Unique identifier for the vehicle
     * @param vehicle - Vehicle data to initialize the physics controller
     */
    public createVehicle(id: string, vehicle: Vehicle): void {
        const controller = PhysicsControllerFactory.createController(
            this.physicsWorld.getWorld(),
            vehicle.vehicleType === 'drone' ? DroneSettings : PlaneSettings
        );
        this.controllers.set(id, controller);
        
        // Set initial state to match client
        const initialState = {
            position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            timestamp: performance.now(),
            tick: this.physicsWorld.getCurrentTick()
        };
        console.log('Server: Initial state:', initialState);
        controller.setState(initialState);
        
        // Log initial vehicle creation only
        console.log('Server: Vehicle created:', {
            id,
            vehicle,
            initialState
        });
    }

    /**
     * Updates the physics simulation.
     * Processes fixed timestep updates and handles time accumulation.
     * @param deltaTime - Time elapsed since last update in seconds
     * @param state - Current game state to update
     */
    public update(deltaTime: number, state: State): void {

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

        // Reset accumulator if it gets too small to prevent drift
        if (this.accumulator < 0.0001) {
            this.accumulator = 0;
        }
    }

    /**
     * Processes a single fixed timestep update.
     * Handles vehicle inputs, physics simulation, and state updates.
     * @param state - Current game state to update
     */
    private processFixedUpdate = (state: State) => {
        // Process all vehicles' inputs
        state.vehicles.forEach((vehicle, id) => {
            const controller = this.controllers.get(id);
            if (controller) {
                // Get the next input from the queue that matches our current tick
                let input = null;
                let queueIndex = -1;
                
                // Find the input that matches our current tick
                for (let i = 0; i < vehicle.inputQueue.length; i++) {
                    if (vehicle.inputQueue[i].tick === this.physicsWorld.getCurrentTick()) {
                        input = vehicle.inputQueue[i];
                        queueIndex = i;
                        break;
                    }
                }

                // If no matching input found, use the most recent input
                if (!input && vehicle.inputQueue.length > 0) {
                    // Find the most recent input that's not too old
                    for (let i = vehicle.inputQueue.length - 1; i >= 0; i--) {
                        if (vehicle.inputQueue[i].tick >= this.physicsWorld.getCurrentTick() - 10) {
                            input = vehicle.inputQueue[i];
                            queueIndex = i;
                            break;
                        }
                    }
                }

                // If still no input, use default input but with correct tick
                if (!input) {
                    input = {
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
                        mouseDelta: { x: 0, y: 0 },
                        tick: this.physicsWorld.getCurrentTick(),
                        timestamp: performance.now()
                    };
                }

                // Remove processed inputs up to the one we're using
                if (queueIndex >= 0) {
                    vehicle.inputQueue.splice(0, queueIndex + 1);
                }

                controller.update(this.fixedTimeStep, input);
            }
        });

        // Step physics world
        this.physicsWorld.update(this.fixedTimeStep);

        // Update vehicle states from physics
        state.vehicles.forEach((vehicle, sessionId) => {
            const state = this.getVehicleState(sessionId);
            if (state) {
                vehicle.positionX = state.position.x;
                vehicle.positionY = state.position.y;
                vehicle.positionZ = state.position.z;
                vehicle.quaternionX = state.quaternion.x;
                vehicle.quaternionY = state.quaternion.y;
                vehicle.quaternionZ = state.quaternion.z;
                vehicle.quaternionW = state.quaternion.w;
                vehicle.linearVelocityX = state.linearVelocity.x;
                vehicle.linearVelocityY = state.linearVelocity.y;
                vehicle.linearVelocityZ = state.linearVelocity.z;
                vehicle.angularVelocityX = state.angularVelocity.x;
                vehicle.angularVelocityY = state.angularVelocity.y;
                vehicle.angularVelocityZ = state.angularVelocity.z;
            }
        });

        // Update flag positions if carried
        state.flags.forEach(flag => {
            if (flag.carriedBy) {
                const carrier = state.vehicles.get(flag.carriedBy);
                if (carrier) {
                    flag.x = carrier.positionX;
                    flag.y = carrier.positionY;
                    flag.z = carrier.positionZ;
                }
            }
        });
    }

    /**
     * Gets the current physics state of a vehicle.
     * @param id - Unique identifier of the vehicle
     * @returns Current physics state of the vehicle or null if not found
     */
    public getVehicleState(id: string): PhysicsState | null {
        const controller = this.controllers.get(id);
        if (controller) {
            return controller.getState();
        }
        return null;
    }

    /**
     * Removes a vehicle from the physics world.
     * @param id - Unique identifier of the vehicle to remove
     */
    public removeVehicle(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.cleanup();
            this.controllers.delete(id);
        }
    }

    /**
     * Gets the current physics simulation tick.
     * @returns Current simulation tick number
     */
    public getCurrentTick(): number {
        return this.physicsWorld.getCurrentTick();
    }

    /**
     * Cleans up all physics resources.
     * Disposes of controllers, scene, and engine.
     */
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