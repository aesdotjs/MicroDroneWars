import { Vector3, Quaternion, Engine, Scene } from 'babylonjs';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig, StateBuffer, InterpolationConfig, PhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';
import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { CollisionEvent } from '@shared/physics/types';
import { DroneSettings, PlaneSettings } from '@shared/physics/VehicleSettings';
import { Game } from '../Game';
import { useGameDebug } from '@/composables/useGameDebug';
import * as CANNON from 'cannon-es';

const { log, logPerformance, clearVehicleLogs } = useGameDebug();
/**
 * Manages physics simulation on the client side.
 * Handles vehicle physics, state interpolation, and network synchronization.
 */
export class ClientPhysicsWorld {
    /** The Babylon.js engine */
    private engine: Engine;
    /** The Babylon.js scene */
    private scene: Scene;
    /** The game instance */
    private game: Game;
    /** The physics world instance */
    private physicsWorld: PhysicsWorld;
    /** Map of vehicle IDs to their physics controllers */
    public controllers: Map<string, BasePhysicsController>;
    /** Map of vehicle IDs to their state buffers for interpolation */
    private stateBuffers: Map<string, StateBuffer[]>;
    /** Configuration for state interpolation */
    private interpolationConfig: InterpolationConfig;
    /** ID of the local player's vehicle */
    private localPlayerId: string = '';
    /** Fixed time step for physics updates */
    private fixedTimeStep: number = 1/60;
    /** Current network latency in milliseconds */
    private networkLatency: number = 0;
    private physicsInterval: NodeJS.Timeout | null = null;

    // Update properties for improved networking
    private pendingInputs: PhysicsInput[] = []; // Renamed from inputBuffer for clarity
    private networkQuality: number = 1.0;
    private currentInterpolationDelay: number = 100; // Start with 100ms base delay
    private targetInterpolationDelay: number = 100;
    private readonly INTERPOLATION_DELAY_SMOOTHING = 0.1;
    private readonly MIN_INTERPOLATION_DELAY = 50; // Minimum delay in ms
    private readonly MAX_INTERPOLATION_DELAY = 200; // Maximum delay in ms
    private readonly QUALITY_TO_DELAY_FACTOR = 0.5; // How much quality affects delay
    private accumulatedTime: number = 0;
    private readonly RECONCILIATION_POSITION_THRESHOLD = 2.0; // Threshold for position reconciliation
    private readonly RECONCILIATION_ROTATION_THRESHOLD = Math.PI * (10/180); // Threshold for rotation reconciliation in radians
    private readonly RECONCILIATION_POSITION_SMOOTHING = 0.2; // Smoothing factor for corrections
    private readonly RECONCILIATION_ROTATION_SMOOTHING = 0.3; // Smoothing factor for corrections
    /**
     * Creates a new ClientPhysicsWorld instance.
     * @param engine - The Babylon.js engine
     * @param scene - The Babylon.js scene
     */
    constructor(engine: Engine, scene: Scene, game: Game) {
        this.engine = engine;
        this.scene = scene;
        this.game = game;
        this.physicsWorld = new PhysicsWorld(this.engine, this.scene, {
            gravity: 9.81,
        });
        // this.startPhysicsLoop();
        this.controllers = new Map();
        this.stateBuffers = new Map();
        this.interpolationConfig = {
            delay: 150, // Increased base delay
            maxBufferSize: 20, // Increased buffer size
            interpolationFactor: 0.2
        };
        
        // Initialize new properties
        this.pendingInputs = [];
    }

    /**
     * Creates a new vehicle physics controller.
     * @param id - Unique identifier for the vehicle
     * @param type - Type of vehicle ('drone' or 'plane')
     * @param initialState - Optional initial physics state
     * @returns The created physics controller
     */
    createVehicle(id: string, type: 'drone' | 'plane', initialState: PhysicsState): BasePhysicsController {
        console.log('Creating vehicle:', { id, initialState});
        let controller: BasePhysicsController;

        if (type === 'drone') {
            controller = new DronePhysicsController(this.physicsWorld.getWorld(), DroneSettings);
        } else {
            controller = new PlanePhysicsController(this.physicsWorld.getWorld(), PlaneSettings);
        }

        // Set initial state
        controller.setState(initialState);

        this.controllers.set(id, controller);
        this.stateBuffers.set(id, []);
        
        console.log('Vehicle created successfully:', { 
            id, 
            controller 
        });
        return controller;
    }

    /**
     * Removes a vehicle from physics simulation.
     * @param id - ID of the vehicle to remove
     */
    removeVehicle(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.cleanup();
            this.controllers.delete(id);
            this.stateBuffers.delete(id);
            clearVehicleLogs(id);
        }
    }

    // private startPhysicsLoop(): void {
    //     this.physicsInterval = setInterval(() => {
    //         this.step(this.engine.getDeltaTime() / 1000);
    //     }, 1000 / 60);
    // }

    public update(deltaTime: number): void {
        this.accumulatedTime += deltaTime;
        while (this.accumulatedTime >= this.fixedTimeStep) {
            this.step(this.fixedTimeStep);
            this.accumulatedTime -= this.fixedTimeStep;
        }
    }

    /**
     * Updates physics simulation and handles state interpolation.
     * @param deltaTime - Time elapsed since last update in milliseconds
     * @param input - Current input state
     */
    public step(deltaTime: number): void {
        const startTime = performance.now();
        this.physicsWorld.update(this.fixedTimeStep, this.fixedTimeStep, 1);
        // Get and process local input
        const isIdle = this.game.getGameScene().getInputManager().isIdle();
        const input = this.game.getGameScene().getInputManager().getInput();
        if (input) {
            // Scale mouse delta by fixed timestep
            // if (input.mouseDelta) {
            //     input.mouseDelta.x *= this.fixedTimeStep;
            //     input.mouseDelta.y *= this.fixedTimeStep;
            // }
            const finalInput: PhysicsInput = {
                ...input,
                timestamp: Date.now(),
                tick: this.physicsWorld.getCurrentTick()
            }
            // Update local player immediately
            const localController = this.controllers.get(this.localPlayerId);
            if (localController) {
                localController.update(this.fixedTimeStep, finalInput);
            }
            if (!isIdle) {
                this.game.sendMovementUpdate(finalInput);
                this.pendingInputs.push(finalInput);
                console.log(`[Client] [step] queuing and sending input=${finalInput.tick}`);
            }
            const MAX_PENDING_INPUTS = 60;
            if (this.pendingInputs.length > MAX_PENDING_INPUTS) {
                this.pendingInputs.splice(0, this.pendingInputs.length - MAX_PENDING_INPUTS);
            }
            
            // console.log(`[Client] pendingInputs.length before send: ${this.pendingInputs.length}`);
        }

        log('Tick', this.physicsWorld.getCurrentTick());

        const endTime = performance.now();
        logPerformance('Total Physics Update', endTime - startTime);
    }

    /**
     * Adds a new physics state to the buffer for interpolation
     * or reconciles with the server state for local player
     * @param id - ID of the vehicle
     * @param state - The physics state to add
     */
    public addVehicleState(id: string, state: PhysicsState): void {
        if (id === this.localPlayerId) {
            this.physicsWorld.setCurrentTick(state.tick);
            // Phase 2: Reconciliation for local player
            const controller = this.controllers.get(id);
            if (!controller) return;
            
            // Get current client state
            const clientState = controller.getState();
            if (!clientState) return;

            // Calculate position and rotation errors
            // const positionError = state.position.subtract(clientState.position).length();
            // const dot = Math.abs(Quaternion.Dot(clientState.quaternion, state.quaternion));
            // const rotationError = Math.acos(Math.min(1, dot));  // direct angle
            // if (currentState) {
                // Check if either error exceeds threshold
                // if (positionError > this.RECONCILIATION_POSITION_THRESHOLD) {
                
                // console.log("reconciling:", {
                //     posError: positionError.toFixed(3),
                //     lastProcessed: state.lastProcessedInputTimestamp,
                //     pending: this.pendingInputs.length
                // });

                // // Apply smooth corrections instead of hard snap
     
                //     const newPosition = Vector3.Lerp(
                //         currentState.position,
                //         state.position,
                //         this.RECONCILIATION_POSITION_SMOOTHING
                //     );

                //     // Update controller with smoothed state
                //     controller.setState({
                //         ...state,
                //         position: newPosition,
                //     });
                //     return;
                // }
                // if (rotationError > this.RECONCILIATION_ROTATION_THRESHOLD) {
                //     console.log("reconciling rotation:", {
                //         rotError: rotationError.toFixed(3),
                //         lastProcessed: state.lastProcessedInputTimestamp,
                //         pending: this.pendingInputs.length
                //     });
                //     const newQuaternion = Quaternion.Slerp(
                //         currentState.quaternion,
                //         state.quaternion,
                //         this.RECONCILIATION_ROTATION_SMOOTHING
                //     );
                //     controller.setState({
                //         ...state,
                //         quaternion: newQuaternion
                //     });
                //     return;
                // }
                // controller.setState(state);
            // }
            const lastProcessedInputTick = state.lastProcessedInputTick ?? state.tick;
            controller.setState(state);
            if (this.pendingInputs.length > 0) console.log(`[Client][addVehicleState] lastprocessedInputTick=${lastProcessedInputTick}, pending.ticks=${this.pendingInputs.map(i => i.tick).join(', ')}`);
            // Replay unprocessed inputs
            const pendingInputs = this.pendingInputs.filter(i => i.tick > lastProcessedInputTick);
            for (const input of pendingInputs) {
                controller.update(this.fixedTimeStep, input);
            }
            this.pendingInputs = pendingInputs;
        } else {
            // Phase 3: Buffer remote states for interpolation
            const buffers = this.stateBuffers.get(id);
            if (buffers) {
                buffers.push({
                    state: state,
                    timestamp: state.timestamp,
                    tick: state.tick
                });
                
                // Keep buffer size reasonable
                if (buffers.length > this.interpolationConfig.maxBufferSize) {
                    buffers.shift();
                }
            }
        }
    }

    public interpolateRemotes(): void {
        const now = Date.now() - this.networkLatency;
        const targetTime = now - this.currentInterpolationDelay;
        
        this.stateBuffers.forEach((buffer, id) => {
            if (id === this.localPlayerId || buffer.length < 2) return;
            
            // Find states bracketing target time
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].timestamp <= targetTime) {
                i++;
            }

            if (i >= buffer.length - 1) return;
            
            const a = buffer[i];
            const b = buffer[i + 1];
            const t = (targetTime - a.timestamp) / (b.timestamp - a.timestamp);
            
            const controller = this.controllers.get(id);
            if (controller) {
                controller.setState({
                    position: Vector3.Lerp(a.state.position, b.state.position, t),
                    quaternion: Quaternion.Slerp(a.state.quaternion, b.state.quaternion, t),
                    linearVelocity: Vector3.Lerp(a.state.linearVelocity, b.state.linearVelocity, t),
                    angularVelocity: Vector3.Lerp(a.state.angularVelocity, b.state.angularVelocity, t),
                    tick: b.state.tick,
                    timestamp: b.state.timestamp,
                    lastProcessedInputTimestamp: b.state.lastProcessedInputTimestamp,
                    lastProcessedInputTick: b.state.lastProcessedInputTick
                });
            }
            
            // Clean up old states
            if (i > 0) {
                buffer.splice(0, i);
            }
        });
    }


    /**
     * Initializes the tick value.
     * @param serverTick - The server tick value
     */
    public initializeTick(serverTick: number): void {
        this.physicsWorld.setCurrentTick(serverTick);
    }

    /**
     * Cleans up resources when the physics world is disposed.
     */
    cleanup(): void {
        this.controllers.forEach(controller => {
            controller.cleanup();
        });
        if (this.physicsInterval) {
            clearInterval(this.physicsInterval);
        }
        this.controllers.clear();
        this.stateBuffers.clear();
        this.physicsWorld.cleanup();
    }

    /**
     * Gets the ground body for collision detection.
     * @returns The ground physics body
     */
    public getGroundBody(): CANNON.Body | null {
        return this.physicsWorld.getGroundBody();
    }

    /**
     * Gets the ground mesh for rendering.
     * @returns The ground mesh
     */
    public getGroundMesh(): any {
        return this.physicsWorld.getGroundMesh();
    }

    /**
     * Registers a callback for collision events.
     * @param id - ID of the vehicle
     * @param callback - Function to call on collision
     */
    public registerCollisionCallback(id: string, callback: (event: CollisionEvent) => void): void {
        this.physicsWorld.registerCollisionCallback(id, callback);
    }

    /**
     * Unregisters a collision callback.
     * @param id - ID of the vehicle
     */
    public unregisterCollisionCallback(id: string): void {
        this.physicsWorld.unregisterCollisionCallback(id);
    }

    /**
     * Sets the ID of the local player's vehicle.
     * @param id - ID of the local player's vehicle
     */
    setLocalPlayerId(id: string): void {
        this.localPlayerId = id;
    }

    /**
     * Gets the ID of the local player's vehicle.
     * @returns ID of the local player's vehicle
     */
    getLocalPlayerId(): string {
        return this.localPlayerId;
    }

    /**
     * Gets the current physics tick.
     * @returns Current physics tick
     */
    public getCurrentTick(): number {
        return this.physicsWorld.getCurrentTick();
    }

    /**
     * Updates the network latency value.
     */
    public updateNetworkLatency(latency: number): void {
        this.networkLatency = latency;
        this.updateInterpolationDelay();
    }

    /**
     * Updates the network quality value.
     */
    public updateNetworkQuality(quality: number): void {
        this.networkQuality = quality;
        this.updateInterpolationDelay();
    }

    /**
     * Updates the network jitter value.
     */
    public updateNetworkJitter(jitter: number): void {
        // Adjust buffer size based on jitter
        const newBufferSize = Math.max(10, Math.min(30, 
            Math.ceil(20 + (jitter / 10))));
        if (newBufferSize !== this.interpolationConfig.maxBufferSize) {
            this.interpolationConfig.maxBufferSize = newBufferSize;
        }
    }

    private updateInterpolationDelay(): void {
        // Calculate base delay based on latency
        let baseDelay = this.networkLatency * 1.5; // 1.5x latency as base
        
        // Adjust based on network quality
        const qualityFactor = 1 - (this.networkQuality * this.QUALITY_TO_DELAY_FACTOR);
        baseDelay *= (1 + qualityFactor);
        
        // Clamp to reasonable range
        this.targetInterpolationDelay = Math.max(
            this.MIN_INTERPOLATION_DELAY,
            Math.min(this.MAX_INTERPOLATION_DELAY, baseDelay)
        );
        
        // Smooth transition to new delay
        this.currentInterpolationDelay += (this.targetInterpolationDelay - this.currentInterpolationDelay) * 
            this.INTERPOLATION_DELAY_SMOOTHING;
    }
} 