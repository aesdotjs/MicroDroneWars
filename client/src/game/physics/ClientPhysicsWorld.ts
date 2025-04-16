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
    /** Last processed physics tick */
    private lastProcessedTick: number = 0;
    /** Fixed time step for physics updates */
    private fixedTimeStep: number = 1/60;
    /** Accumulator for fixed time step updates */
    private accumulator: number = 0;
    /** Current network latency in milliseconds */
    private networkLatency: number = 0;
    /** Current server tick */
    private serverTick: number = 0;

    // New properties for improved networking
    private inputBuffer: PhysicsInput[] = [];
    private readonly INPUT_BUFFER_SIZE = 60; // 1 second at 60fps
    private readonly JITTER_BUFFER_TIME = 100; // ms
    private readonly MAX_EXTRAPOLATION_TIME = 250; // ms
    private lastServerStateTime: number = 0;
    private networkQuality: number = 1.0; // 0.0 to 1.0, higher is better
    private readonly NETWORK_QUALITY_SAMPLES = 10;
    private networkQualitySamples: number[] = [];

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
        this.controllers = new Map();
        this.stateBuffers = new Map();
        this.interpolationConfig = {
            delay: 100, // ms - for other players' interpolation
            maxBufferSize: 10,
            interpolationFactor: 0.2
        };
        
        // Initialize new properties
        this.inputBuffer = [];
        this.networkQualitySamples = [];
    }

    /**
     * Creates a new vehicle physics controller.
     * @param id - Unique identifier for the vehicle
     * @param type - Type of vehicle ('drone' or 'plane')
     * @param initialState - Optional initial physics state
     * @returns The created physics controller
     */
    createVehicle(id: string, type: 'drone' | 'plane', initialState?: PhysicsState): BasePhysicsController {
        console.log('Creating vehicle:', { id, initialState});
        let controller: BasePhysicsController;

        if (type === 'drone') {
            controller = new DronePhysicsController(this.physicsWorld.getWorld(), DroneSettings);
        } else {
            controller = new PlanePhysicsController(this.physicsWorld.getWorld(), PlaneSettings);
        }

        // Use provided initial state or create default one
        const state = initialState || {
            position: new Vector3(0, 10, 0), // This will be overridden by server state
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            tick: this.lastProcessedTick
        };

        // Set initial state
        controller.setState(state);

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

    /**
     * Updates physics simulation and handles state interpolation.
     * @param deltaTime - Time elapsed since last update in milliseconds
     * @param input - Current input state
     */
    public update(deltaTime: number): void {
        const startTime = performance.now();
        
        // Add frame time to accumulator (convert to seconds)
        this.accumulator += deltaTime / 1000;

        // Process fixed timestep updates with a maximum of 3 steps per frame
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < 3) {
            const physicsStartTime = performance.now();
            
            // Get input from input manager and add to buffer
            const input = this.game.getGameScene().getInputManager().getInput();
            this.addInput(input);
            
            // Get the most recent input from buffer
            const currentInput = this.inputBuffer.length > 0 
                ? this.inputBuffer[this.inputBuffer.length - 1]
                : input;
            
            // Scale mouse delta by fixed timestep to maintain consistent sensitivity
            if (currentInput.mouseDelta) {
                currentInput.mouseDelta.x *= this.fixedTimeStep;
                currentInput.mouseDelta.y *= this.fixedTimeStep;
            }

            currentInput.timestamp = performance.now();
            currentInput.tick = this.lastProcessedTick;

            // Step physics world
            this.physicsWorld.update(this.fixedTimeStep);

            // Update all vehicle controllers
            this.controllers.forEach((controller, id) => {
                if (id === this.localPlayerId) {
                    controller.update(this.fixedTimeStep, currentInput);
                    this.game.sendMovementUpdate(currentInput);
                } else {
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
                        mouseDelta: { x: 0, y: 0 },
                        tick: this.lastProcessedTick,
                        timestamp: performance.now()
                    };
                    controller.update(this.fixedTimeStep, defaultInput);
                }
            });

            this.lastProcessedTick++;
            this.accumulator -= this.fixedTimeStep;
            steps++;

            const physicsEndTime = performance.now();
            logPerformance('Physics Update', physicsEndTime - physicsStartTime);
        }

        // Log physics state differences
        this.controllers.forEach((controller, id) => {
            const state = controller.getState();
            if (state) {
                log(`Player ${id} Position`, `X: ${state.position.x.toFixed(2)}, Y: ${state.position.y.toFixed(2)}, Z: ${state.position.z.toFixed(2)}`);
                log(`Player ${id} Velocity`, `X: ${state.linearVelocity.x.toFixed(2)}, Y: ${state.linearVelocity.y.toFixed(2)}, Z: ${state.linearVelocity.z.toFixed(2)}`);
            }
        });

        // Clean up old states
        this.cleanupStateBuffers();

        // Correct tick drift if needed
        this.correctTickDrift();

        // Interpolate states
        this.interpolateStates();

        const endTime = performance.now();
        logPerformance('Total Physics Update', endTime - startTime);
    }

    /**
     * Adds a new physics state to the buffer for interpolation
     * or reconciles with the server state for local player
     * @param id - ID of the vehicle
     * @param state - The physics state to add
     */
    public addState(id: string, state: PhysicsState): void {
        const buffers = this.stateBuffers.get(id);
        if (buffers) {
            // Calculate jitter
            const now = performance.now();
            const jitter = Math.abs(now - this.lastServerStateTime - this.interpolationConfig.delay);
            this.lastServerStateTime = now;

            // Update network quality
            this.updateNetworkQuality(this.networkLatency, jitter);

            // If this is the local player, only use for reconciliation
            if (id === this.localPlayerId) {
                // Get current state for comparison
                const currentState = this.controllers.get(id)?.getState();
                if (currentState) {
                    // Validate state values
                    const isValidState = (state: PhysicsState) => {
                        return state && 
                               state.position && 
                               state.quaternion && 
                               state.linearVelocity && 
                               state.angularVelocity &&
                               !isNaN(state.position.x) && 
                               !isNaN(state.position.y) && 
                               !isNaN(state.position.z);
                    };

                    if (!isValidState(currentState) || !isValidState(state)) {
                        // If either state is invalid, use server state directly
                        this.controllers.get(id)?.setState(state);
                        return;
                    }

                    // Calculate position and velocity errors
                    const positionError = Vector3.Distance(currentState.position, state.position);
                    const currentVelocityMag = Vector3.Distance(currentState.linearVelocity, Vector3.Zero());
                    const serverVelocityMag = Vector3.Distance(state.linearVelocity, Vector3.Zero());
                    const velocityError = Math.abs(currentVelocityMag - serverVelocityMag);
                    
                    // Calculate rotation error (angle between quaternions)
                    const currentQuat = new Quaternion(
                        currentState.quaternion.x,
                        currentState.quaternion.y,
                        currentState.quaternion.z,
                        currentState.quaternion.w
                    );
                    const serverQuat = new Quaternion(
                        state.quaternion.x,
                        state.quaternion.y,
                        state.quaternion.z,
                        state.quaternion.w
                    );
                    
                    // Normalize quaternions to ensure valid dot product
                    currentQuat.normalize();
                    serverQuat.normalize();
                    
                    // Calculate angle between quaternions using dot product with safety checks
                    const dot = Math.min(1, Math.max(-1, Quaternion.Dot(currentQuat, serverQuat)));
                    const rotationError = Math.acos(dot) * (180 / Math.PI);
                    
                    // Ensure position and velocity errors are valid numbers
                    const positionErrorSafe = isNaN(positionError) ? 0 : positionError;
                    const velocityErrorSafe = isNaN(velocityError) ? 0 : velocityError;
                    const rotationErrorSafe = isNaN(rotationError) ? 0 : rotationError;
                    
                    // Log state differences
                    log(`Player ${id} Position Error`, `${positionErrorSafe.toFixed(2)}m`, positionErrorSafe > 1 ? 'warning' : 'info');
                    log(`Player ${id} Velocity Error`, `${velocityErrorSafe.toFixed(2)}m/s`, velocityErrorSafe > 0.5 ? 'warning' : 'info');
                    log(`Player ${id} Rotation Error`, `${rotationErrorSafe.toFixed(2)}°`, rotationErrorSafe > 5 ? 'warning' : 'info');
                    
                    // Log detailed reconciliation info
                    const tickDiff = Math.abs(this.serverTick - this.lastProcessedTick);
                    log(`Player ${id} Reconciliation`, {
                        positionError: positionErrorSafe,
                        velocityError: velocityErrorSafe,
                        rotationError: rotationErrorSafe,
                        tickDiff,
                        currentPosition: currentState.position,
                        serverPosition: state.position,
                        currentVelocity: currentState.linearVelocity,
                        serverVelocity: state.linearVelocity
                    }, 'info');

                    // Always reconcile, but scale the correction based on error magnitude
                    const tickFactor = Math.min(1.0, tickDiff / 10);
                    
                    // Calculate error-based factors with minimum values
                    const positionErrorFactor = Math.max(0.3, Math.min(1.0, positionErrorSafe / 1.2));
                    const velocityErrorFactor = Math.max(0.3, Math.min(1.0, velocityErrorSafe / 0.6));
                    const rotationErrorFactor = Math.max(0.2, Math.min(1.0, rotationErrorSafe / 6));
                    
                    // For movement shooters, we want to prioritize rotation accuracy
                    // and adjust position correction based on rotation error
                    const rotationAdjustedPositionFactor = positionErrorFactor * (1 - rotationErrorFactor * 0.2);
                    
                    // Calculate final interpolation factors with minimum values
                    const positionFactor = Math.max(0.2, Math.min(0.8, tickFactor * 0.6 * rotationAdjustedPositionFactor));
                    const velocityFactor = Math.max(0.2, Math.min(0.8, tickFactor * 0.6 * velocityErrorFactor));
                    const rotationFactor = Math.max(0.3, Math.min(0.95, tickFactor * 0.7 * rotationErrorFactor));
                    
                    // Log interpolation factors
                    log(`Player ${id} Interpolation Factors`, {
                        tickFactor,
                        positionErrorFactor,
                        velocityErrorFactor,
                        rotationErrorFactor,
                        rotationAdjustedPositionFactor,
                        positionFactor,
                        velocityFactor,
                        rotationFactor
                    }, 'info');
                        
                    // Smoothly correct all state properties
                    const correctedState: PhysicsState = {
                        position: Vector3.Lerp(currentState.position, state.position, positionFactor),
                        quaternion: Quaternion.Slerp(currentState.quaternion, state.quaternion, rotationFactor),
                        linearVelocity: Vector3.Lerp(currentState.linearVelocity, state.linearVelocity, velocityFactor),
                        angularVelocity: Vector3.Lerp(currentState.angularVelocity, state.angularVelocity, velocityFactor),
                    };
                    
                    // Log the correction being applied
                    log(`Player ${id} Correction Applied`, {
                        fromPosition: currentState.position,
                        toPosition: correctedState.position,
                        positionDelta: Vector3.Distance(currentState.position, correctedState.position),
                        fromVelocity: currentState.linearVelocity,
                        toVelocity: correctedState.linearVelocity,
                        velocityDelta: Vector3.Distance(currentState.linearVelocity, correctedState.linearVelocity),
                        rotationDelta: Math.acos(Math.min(1, Math.max(-1, Quaternion.Dot(currentState.quaternion, correctedState.quaternion)))) * (180 / Math.PI)
                    }, 'info');
                        
                    this.controllers.get(id)?.setState(correctedState);
                }
            } else {
                // For other players, add to buffer for interpolation
                const newBuffer: StateBuffer = {
                    state: state,
                    tick: this.serverTick,
                    timestamp: now
                };
                buffers.push(newBuffer);
                
                // Keep buffer size reasonable
                if (buffers.length > this.interpolationConfig.maxBufferSize) {
                    buffers.shift();
                }
            }
        }
    }

    /**
     * Interpolates between physics states for smooth movement.
     */
    private interpolateStates(): void {
        const targetTick = this.calculateInterpolationTick();
        
        this.stateBuffers.forEach((buffers, id) => {
            if (id === this.localPlayerId) return;
            if (buffers.length < 2) return;

            // Find the two states to interpolate between based on server tick
            let buffer1 = buffers[0];
            let buffer2 = buffers[1];
            let i = 1;

            while (i < buffers.length - 1 && buffer1.tick < targetTick) {
                buffer1 = buffers[i];
                buffer2 = buffers[i + 1];
                i++;
            }

            // Remove old states
            buffers.splice(0, i - 1);

            if (!buffer1 || !buffer2) return;

            // Calculate interpolation factor based on server tick difference
            const tickDiff = buffer2.tick - buffer1.tick;
            if (tickDiff === 0) return;

            const t = (targetTick - buffer1.tick) / tickDiff;
            const controller = this.controllers.get(id);
            if (controller) {
                const predictedState = this.predictState(buffer1.state, buffer2.state, t);
                controller.setState(predictedState);
            }
        });
    }

    // New method for velocity-based prediction
    private predictState(state1: PhysicsState, state2: PhysicsState, t: number): PhysicsState {
        return {
            position: Vector3.Lerp(state1.position, state2.position, t).add(
                state1.linearVelocity.scale((1-t) * this.fixedTimeStep)
            ),
            quaternion: Quaternion.Slerp(state1.quaternion, state2.quaternion, t),
            linearVelocity: Vector3.Lerp(state1.linearVelocity, state2.linearVelocity, t),
            angularVelocity: Vector3.Lerp(state1.angularVelocity, state2.angularVelocity, t)
        };
    }

    // New method for calculating interpolation tick
    private calculateInterpolationTick(): number {
        // Calculate how many ticks behind we want to be based on network conditions
        const ticksBehind = Math.ceil((this.interpolationConfig.delay + this.networkLatency) / (this.fixedTimeStep * 1000));
        
        // Use server tick as reference
        return Math.max(
            this.serverTick - ticksBehind,
            this.serverTick - Math.ceil(this.MAX_EXTRAPOLATION_TIME / (this.fixedTimeStep * 1000))
        );
    }

    /**
     * Cleans up resources when the physics world is disposed.
     */
    cleanup(): void {
        this.controllers.forEach(controller => {
            controller.cleanup();
        });
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
        return this.lastProcessedTick;
    }

    /**
     * Updates the network latency value.
     * @param latency - Current network latency in milliseconds
     */
    public updateNetworkLatency(latency: number): void {
        this.networkLatency = latency;
    }

    /**
     * Initializes the physics tick with the server's tick.
     * @param serverTick - Current server tick
     */
    public initializeTick(serverTick: number): void {
        if (this.lastProcessedTick === 0) {
            this.lastProcessedTick = serverTick;
            console.log('Initialized client tick with server tick:', {
                serverTick,
                lastProcessedTick: this.lastProcessedTick
            });
        }
    }

    /**
     * Updates the server tick value.
     * @param serverTick - Current server tick
     */
    public updateServerTick(serverTick: number): void {
        this.serverTick = serverTick;
    }

    // add input to buffer
    public addInput(input: PhysicsInput): void {        
        this.inputBuffer.push(input);
        if (this.inputBuffer.length > this.INPUT_BUFFER_SIZE) {
            this.inputBuffer.shift();
        }
    }

    // update network quality
    private updateNetworkQuality(latency: number, jitter: number): void {
        // Calculate quality score (0.0 to 1.0)
        const latencyScore = Math.max(0, 1 - (latency / 500)); // 500ms max latency
        const jitterScore = Math.max(0, 1 - (jitter / 100)); // 100ms max jitter
        const qualityScore = (latencyScore + jitterScore) / 2;

        // Add to samples
        this.networkQualitySamples.push(qualityScore);
        if (this.networkQualitySamples.length > this.NETWORK_QUALITY_SAMPLES) {
            this.networkQualitySamples.shift();
        }

        // Calculate average quality
        this.networkQuality = this.networkQualitySamples.reduce((a, b) => a + b, 0) / 
                            this.networkQualitySamples.length;

        // Adjust interpolation delay based on network quality
        this.interpolationConfig.delay = Math.max(30, Math.min(150, 
            50 + (1 - this.networkQuality) * 100));
    }

    // Update cleanupStateBuffers to use server tick
    private cleanupStateBuffers(): void {
        const maxTicksToKeep = Math.ceil(this.interpolationConfig.delay * 2 / (this.fixedTimeStep * 1000));
        
        this.stateBuffers.forEach((buffers, id) => {
            const validStates = buffers.filter(buffer => 
                this.serverTick - buffer.tick <= maxTicksToKeep
            );
            this.stateBuffers.set(id, validStates);
        });
    }

    // correct tick drift
    private correctTickDrift(): void {
        const tickDiff = this.serverTick - this.lastProcessedTick;
        if (Math.abs(tickDiff) > 10) { // Significant drift
            this.lastProcessedTick = this.serverTick - 2; // Leave room for interpolation
            console.log('Correcting tick drift:', tickDiff);
        }
    }
} 