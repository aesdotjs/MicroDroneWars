import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '@shared/physics/PhysicsControllerFactory';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
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
    // private accumulator: number = 0;
    private readonly FIXED_TIME_STEP: number = 1/60;
    // private readonly MAX_SUBSTEPS: number = 3;
    // private readonly MAX_ACCUMULATED_TIME: number = this.FIXED_TIME_STEP * 3;
    // private readonly MIN_ACCUMULATED_TIME: number = 0.0001;
    private lastProcessedInputs: Map<string, number> = new Map();
    private inputBuffers: Map<string, PhysicsInput[]> = new Map();
    private readonly MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps

    /**
     * Creates a new ServerPhysicsWorld instance.
     * Initializes the physics engine and scene.
     */
    constructor() {
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
        this.inputBuffers.set(id, []);
        this.lastProcessedInputs.set(id, 0);
        
        const initialState = {
            position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            timestamp: Date.now(),
            tick: this.physicsWorld.getCurrentTick(),
            lastProcessedInputTick: 0,
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
     * Adds an input to the buffer for a specific vehicle
     */
    public addInput(id: string, input: PhysicsInput): void {
        const buffer = this.inputBuffers.get(id);
        if (buffer) {
            // if (input.tick <= 0 || isNaN(input.tick)) {
            //     input.tick = this.physicsWorld.getCurrentTick();
            // }
            buffer.push(input);
            // Keep buffer size reasonable
            while (buffer.length > this.MAX_INPUT_BUFFER_SIZE) {
                buffer.shift();
            }
        }
    }

    /**
     * Updates the physics simulation.
     * Processes fixed timestep updates and handles time accumulation.
     * @param deltaTime - Time elapsed since last update in seconds
     * @param state - Current game state to update
     */
    public update(deltaTime: number, state: State): void {
        // Add frame time to accumulator
        // this.accumulator += deltaTime;

        // // Prevent accumulator from growing too large
        // if (this.accumulator > this.MAX_ACCUMULATED_TIME) {
        //     this.accumulator = this.MAX_ACCUMULATED_TIME;
        // }

        // // Process fixed timestep updates
        // let steps = 0;
        // while (this.accumulator >= this.FIXED_TIME_STEP && steps < this.MAX_SUBSTEPS) {
        this.processFixedUpdate(state);
        //     this.accumulator -= this.FIXED_TIME_STEP;
        //     steps++;
        // }

        // // Reset accumulator if it gets too small
        // if (this.accumulator < this.MIN_ACCUMULATED_TIME) {
        //     this.accumulator = 0;
        // }
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
            const inputBuffer = this.inputBuffers.get(id);
            
            if (controller && inputBuffer) {
                // Get all unprocessed inputs
                const lastProcessedTick = this.lastProcessedInputs.get(id) || 0;
                const unprocessedInputs = inputBuffer.filter(input => input.tick > lastProcessedTick);
                
                // Process each input in order
                for (const input of unprocessedInputs) {
                    // Scale mouse delta by fixed timestep to maintain consistent sensitivity
                    // if (input.mouseDelta) {
                    //     input.mouseDelta.x *= this.FIXED_TIME_STEP;
                    //     input.mouseDelta.y *= this.FIXED_TIME_STEP;
                    // }
                    controller.update(this.FIXED_TIME_STEP, input);
                    this.lastProcessedInputs.set(id, input.tick);
                }
                
                // Clean up processed inputs
                const newBuffer = inputBuffer.filter(input => input.tick > lastProcessedTick);
                this.inputBuffers.set(id, newBuffer);

                // Update vehicle state in the game state
                const physicsState = controller.getState();
                if (physicsState) {
                    vehicle.positionX = physicsState.position.x;
                    vehicle.positionY = physicsState.position.y;
                    vehicle.positionZ = physicsState.position.z;
                    vehicle.quaternionX = physicsState.quaternion.x;
                    vehicle.quaternionY = physicsState.quaternion.y;
                    vehicle.quaternionZ = physicsState.quaternion.z;
                    vehicle.quaternionW = physicsState.quaternion.w;
                    vehicle.linearVelocityX = physicsState.linearVelocity.x;
                    vehicle.linearVelocityY = physicsState.linearVelocity.y;
                    vehicle.linearVelocityZ = physicsState.linearVelocity.z;
                    vehicle.angularVelocityX = physicsState.angularVelocity.x;
                    vehicle.angularVelocityY = physicsState.angularVelocity.y;
                    vehicle.angularVelocityZ = physicsState.angularVelocity.z;
                    vehicle.tick = this.physicsWorld.getCurrentTick();
                    vehicle.lastProcessedInputTick = this.lastProcessedInputs.get(id) || 0;
                }
            }
        });

        // Step physics world
        this.physicsWorld.update(this.FIXED_TIME_STEP, this.FIXED_TIME_STEP, 1);

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
            const state = controller.getState();
            if (state) {
                return {
                    ...state,
                    tick: this.physicsWorld.getCurrentTick(),
                    timestamp: Date.now()
                };
            }
        }
        return null;
    }

    /**
     * Gets the last processed input tick for a vehicle.
     */
    public getLastProcessedInputTick(id: string): number {
        return this.lastProcessedInputs.get(id) || 0;
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
            this.inputBuffers.delete(id);
            this.lastProcessedInputs.delete(id);
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
        this.controllers.forEach((controller) => {
            controller.cleanup();
        });
        this.controllers.clear();
        this.inputBuffers.clear();
        this.lastProcessedInputs.clear();
        this.scene.dispose();
        this.engine.dispose();
    }
} 