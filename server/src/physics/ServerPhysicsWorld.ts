import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { PhysicsControllerFactory } from '@shared/physics/PhysicsControllerFactory';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
import { Engine, Scene, NullEngine, Vector3, Quaternion } from 'babylonjs';
import { State, Vehicle } from '../schemas';
import { DroneSettings, PlaneSettings } from '@shared/physics/VehicleSettings';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';

/**
 * Handles server-side physics simulation for the game.
 * Manages vehicle physics controllers and updates game state based on physics calculations.
 */
export class ServerPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    private controllers: Map<string, BasePhysicsController> = new Map();
    // private accumulator: number = 0;
    private readonly FIXED_TIME_STEP: number = 1/60;
    // private readonly MAX_SUBSTEPS: number = 3;
    // private readonly MAX_ACCUMULATED_TIME: number = this.FIXED_TIME_STEP * 3;
    // private readonly MIN_ACCUMULATED_TIME: number = 0.0001;
    private lastProcessedInputTimestamps: Map<string, number> = new Map();
    private lastProcessedInputTicks: Map<string, number> = new Map();
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
            vehicle.vehicleType === 'drone' ? DroneSettings : PlaneSettings,
            id,
            this.physicsWorld.getCollisionManager()
        );
        this.controllers.set(id, controller);
        this.inputBuffers.set(id, []);
        const lastProcessedInputTimestamp = Date.now();
        this.lastProcessedInputTimestamps.set(id, lastProcessedInputTimestamp);
        this.lastProcessedInputTicks.set(id, this.physicsWorld.getCurrentTick());
        const initialState = {
            position: new Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            timestamp: Date.now(),
            tick: this.physicsWorld.getCurrentTick(),
            lastProcessedInputTimestamp: lastProcessedInputTimestamp,
            lastProcessedInputTick: this.physicsWorld.getCurrentTick()
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
            buffer.push(input);
            // console.log(`[Server] [addInput] inputtick=${input.tick} buffer.ticks=${buffer.map(i => i.tick).join(', ')}`)
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
        // Step physics world
        this.physicsWorld.update(this.FIXED_TIME_STEP, this.FIXED_TIME_STEP, 1);
        // Process all vehicles' inputs
        state.vehicles.forEach((vehicle, id) => {
            const controller = this.controllers.get(id);
            const inputBuffer = this.inputBuffers.get(id) ?? [];
            const idleInput: PhysicsInput = {
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
                mouseDelta: {
                    x: 0,
                    y: 0
                },
                            
                tick: this.physicsWorld.getCurrentTick(),
                timestamp: Date.now(),
            };
            
            if (controller) {
                // Get all unprocessed inputs
                let lastProcessedTick = this.lastProcessedInputTicks.get(id) ?? 0;
                const buffer = inputBuffer.sort((a, b) => a.tick - b.tick);
                // // Process each input in order
                let processedCount = 0;
                for (const input of buffer) {
                    if (input.tick > lastProcessedTick) {
                        controller.update(this.FIXED_TIME_STEP, input);
                        // console.log(`[Server] [update] processed input tick=${input.tick} lastProcessedTick=${lastProcessedTick}`)
                        lastProcessedTick = input.tick;
                    }
                    processedCount++;
                }    
                // if no inputs, send idle input
                if (processedCount === 0) {
                    controller.update(this.FIXED_TIME_STEP, idleInput);
                } else {
                    this.lastProcessedInputTicks.set(id, lastProcessedTick);
                    this.lastProcessedInputTimestamps.set(id, Date.now());
                }           

                buffer.splice(0, processedCount);

                // const nextInput = unprocessedInputs.length > 0 ? unprocessedInputs.shift()! : idleInput;
                // controller.update(this.FIXED_TIME_STEP, nextInput);
                // this.lastProcessedInputTicks.set(id, nextInput.tick);
                // this.lastProcessedInputTimestamps.set(id, nextInput.timestamp);
                
                // this.inputBuffers.set(id, unprocessedInputs);
                this.inputBuffers.set(id, buffer);
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
                    vehicle.timestamp = Date.now();
                    vehicle.lastProcessedInputTimestamp = this.lastProcessedInputTimestamps.get(id) ?? Date.now();
                    vehicle.lastProcessedInputTick = this.lastProcessedInputTicks.get(id) ?? this.physicsWorld.getCurrentTick();
                }
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
    public getLastProcessedInputTimestamp(id: string): number {
        return this.lastProcessedInputTimestamps.get(id) || Date.now();
    }

    /**
     * Gets the last processed input tick for a vehicle.
     */
    public getLastProcessedInputTick(id: string): number {
        return this.lastProcessedInputTicks.get(id) || this.physicsWorld.getCurrentTick();
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
            this.lastProcessedInputTimestamps.delete(id);
            this.lastProcessedInputTicks.delete(id);
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
        this.lastProcessedInputTimestamps.clear();
        this.lastProcessedInputTicks.clear();
        this.scene.dispose();
        this.engine.dispose();
    }
} 