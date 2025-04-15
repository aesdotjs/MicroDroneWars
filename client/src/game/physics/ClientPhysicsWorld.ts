import { Vector3, Quaternion, Engine, Scene } from 'babylonjs';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig, StateBuffer, InterpolationConfig, PhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';
import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { CollisionEvent } from '@shared/physics/types';
import { DroneSettings, PlaneSettings } from '@shared/physics/VehicleSettings';

export class ClientPhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private physicsWorld: PhysicsWorld;
    public controllers: Map<string, BasePhysicsController>;
    private stateBuffers: Map<string, StateBuffer>;
    private interpolationConfig: InterpolationConfig;
    private localPlayerId: string = '';
    private lastProcessedTick: number = 0;
    private fixedTimeStep: number = 1/60;
    private accumulator: number = 0;
    private networkLatency: number = 0;
    private serverTick: number = 0;

    constructor(engine: Engine, scene: Scene) {
        this.engine = engine;
        this.scene = scene;
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
    }

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
            timestamp: performance.now(),
            tick: this.lastProcessedTick
        };

        // Set initial state
        controller.setState(state);

        this.controllers.set(id, controller);
        this.stateBuffers.set(id, {
            states: [],
            lastProcessedTick: 0,
            lastProcessedTimestamp: 0
        });
        
        console.log('Vehicle created successfully:', { 
            id, 
            controller 
        });
        return controller;
    }

    removeVehicle(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.cleanup();
            this.controllers.delete(id);
            this.stateBuffers.delete(id);
        }
    }

    public update(deltaTime: number, input: PhysicsInput): void {
        // Add frame time to accumulator (convert to seconds)
        this.accumulator += deltaTime / 1000;

        // Process fixed timestep updates with a maximum of 3 steps per frame
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < 3) {
            // Set input tick to match current physics tick
            input.tick = this.lastProcessedTick;
            this.processFixedUpdate(input);
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

        // Interpolate states
        this.interpolateStates();
    }

    private processFixedUpdate(input: PhysicsInput): void {
        // Step physics world
        this.physicsWorld.update(this.fixedTimeStep);

        // Update all vehicle controllers
        this.controllers.forEach((controller, id) => {
            if (id === this.localPlayerId) {
                // For local player, use current input directly
                controller.update(this.fixedTimeStep, input);
            } else {
                // Remote players - use default input
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
    }

    public addState(id: string, state: PhysicsState): void {
        const buffer = this.stateBuffers.get(id);
        if (buffer) {
            // If this is the local player, reconcile the state
            if (id === this.localPlayerId) {
                // Calculate the tick we should be comparing against based on actual network latency
                const latencyTicks = Math.ceil(this.networkLatency / (this.fixedTimeStep * 1000));
                const targetTick = this.serverTick - latencyTicks;

                // If we're too far ahead of the server, slow down
                if (this.lastProcessedTick > this.serverTick + 5) {
                    // Skip a few ticks to let the server catch up
                    this.lastProcessedTick = this.serverTick + 5;
                    if (this.lastProcessedTick % 60 === 0) {
                        console.log('Slowing down client to let server catch up:', {
                            oldTick: this.lastProcessedTick + 5,
                            newTick: this.lastProcessedTick,
                            serverTick: this.serverTick
                        });
                    }
                }

                // If we're too far behind the server, speed up
                if (this.lastProcessedTick < this.serverTick - latencyTicks - 5) {
                    // Jump ahead a few ticks to catch up
                    this.lastProcessedTick = this.serverTick - latencyTicks;
                    if (this.lastProcessedTick % 60 === 0) {
                        console.log('Speeding up client to catch up to server:', {
                            oldTick: this.lastProcessedTick - latencyTicks,
                            newTick: this.lastProcessedTick,
                            serverTick: this.serverTick
                        });
                    }
                }

                // Always reconcile if we have a large error, regardless of tick mismatch
                const currentState = this.controllers.get(id)?.getState();
                if (currentState) {
                    const positionError = Vector3.Distance(currentState.position, state.position);

                    // Adjust error thresholds based on network latency
                    const positionThreshold = Math.max(1.0, this.networkLatency * 0.01);

                    // If error is significant, reconcile regardless of tick
                    if (positionError > positionThreshold) {
                        this.reconcileState(id, state, targetTick);
                    } else if (Math.abs(this.lastProcessedTick - targetTick) <= 5) {
                        // If error is small and ticks are close, reconcile
                        this.reconcileState(id, state, targetTick);
                    } else {
                        console.log('Skipping reconciliation - tick mismatch:', {
                            currentTick: this.lastProcessedTick,
                            targetTick,
                            serverTick: this.serverTick,
                            networkLatency: this.networkLatency,
                            positionError
                        });
                    }
                }
            } else {
                // For remote players, add to buffer for interpolation
                buffer.states.push(state);
                // Keep buffer size reasonable
                if (buffer.states.length > this.interpolationConfig.maxBufferSize) {
                    buffer.states.shift();
                }
            }
        }
    }

    private interpolateStates(): void {
        const currentTime = performance.now();
        const targetTime = currentTime - this.interpolationConfig.delay;

        this.stateBuffers.forEach((buffer, id) => {
            if (id === this.localPlayerId) return; // Skip local player

            const states = buffer.states;
            if (states.length < 2) return;

            // Find the two states to interpolate between
            let state1 = states[0];
            let state2 = states[1];
            let i = 1;

            while (i < states.length - 1 && states[i].timestamp < targetTime) {
                state1 = states[i];
                state2 = states[i + 1];
                i++;
            }

            // Remove old states
            states.splice(0, i - 1);

            if (!state1 || !state2) return;

            // Calculate interpolation factor
            const t = (targetTime - state1.timestamp) / (state2.timestamp - state1.timestamp);
            const controller = this.controllers.get(id);
            if (controller) {
                // Interpolate position
                const position = new Vector3(
                    state1.position.x + (state2.position.x - state1.position.x) * t,
                    state1.position.y + (state2.position.y - state1.position.y) * t,
                    state1.position.z + (state2.position.z - state1.position.z) * t
                );

                // Interpolate quaternion
                const quaternion = Quaternion.Slerp(
                    new Quaternion(state1.quaternion.x, state1.quaternion.y, state1.quaternion.z, state1.quaternion.w),
                    new Quaternion(state2.quaternion.x, state2.quaternion.y, state2.quaternion.z, state2.quaternion.w),
                    t
                );

                // Interpolate velocities
                const linearVelocity = new Vector3(
                    state1.linearVelocity.x + (state2.linearVelocity.x - state1.linearVelocity.x) * t,
                    state1.linearVelocity.y + (state2.linearVelocity.y - state1.linearVelocity.y) * t,
                    state1.linearVelocity.z + (state2.linearVelocity.z - state1.linearVelocity.z) * t
                );

                const angularVelocity = new Vector3(
                    state1.angularVelocity.x + (state2.angularVelocity.x - state1.angularVelocity.x) * t,
                    state1.angularVelocity.y + (state2.angularVelocity.y - state1.angularVelocity.y) * t,
                    state1.angularVelocity.z + (state2.angularVelocity.z - state1.angularVelocity.z) * t
                );

                // Apply interpolated state
                controller.setState({
                    position,
                    quaternion,
                    linearVelocity,
                    angularVelocity,
                    timestamp: currentTime,
                });
            }
        });
    }

    private reconcileState(id: string, serverState: PhysicsState, targetTick: number): void {
        if (id !== this.localPlayerId) return;

        const controller = this.controllers.get(id);
        if (!controller) return;

        // Calculate position error
        const currentState = controller.getState();
        if (!currentState) return;

        const positionError = Vector3.Distance(currentState.position, serverState.position);

        // Adjust error thresholds based on network latency and add minimum error requirements
        const minPositionError = 1.0;
        const positionThreshold = Math.max(3.0, this.networkLatency * 0.03);

        // Only check position error for triggering reconciliation
        if (positionError > positionThreshold && positionError > minPositionError) {
            
            console.log('Reconciling state due to position error:', JSON.stringify({
                positionError,
                positionThreshold,
                minPositionError,
                currentState: currentState.position,
                serverState: serverState.position,
                currentTick: this.lastProcessedTick,
                serverTick: this.serverTick,
                targetTick,
                networkLatency: this.networkLatency
            }));
        
            // Calculate interpolation factors
            const positionFactor = Math.min(0.2, (positionError / positionThreshold) * 0.03);
            const velocityFactor = Math.min(0.15, 0.15 * (this.networkLatency / 200));
            const rotationFactor = 0.2; // Fixed rotation correction factor
            
            // Smoothly correct all state properties
            const correctedState: PhysicsState = {
                position: Vector3.Lerp(currentState.position, serverState.position, positionFactor),
                quaternion: Quaternion.Slerp(currentState.quaternion, serverState.quaternion, rotationFactor),
                linearVelocity: Vector3.Lerp(currentState.linearVelocity, serverState.linearVelocity, velocityFactor),
                angularVelocity: Vector3.Lerp(currentState.angularVelocity, serverState.angularVelocity, velocityFactor),
                timestamp: performance.now()
            };
            controller.setState(correctedState);
        }
    }

    cleanup(): void {
        this.controllers.forEach(controller => {
            controller.cleanup();
        });
        this.controllers.clear();
        this.stateBuffers.clear();
    }

    public getGroundBody(): CANNON.Body | null {
        return this.physicsWorld.getGroundBody();
    }

    public getGroundMesh(): any {
        return this.physicsWorld.getGroundMesh();
    }

    public registerCollisionCallback(id: string, callback: (event: CollisionEvent) => void): void {
        this.physicsWorld.registerCollisionCallback(id, callback);
    }

    public unregisterCollisionCallback(id: string): void {
        this.physicsWorld.unregisterCollisionCallback(id);
    }

    setLocalPlayerId(id: string): void {
        this.localPlayerId = id;
    }

    getLocalPlayerId(): string {
        return this.localPlayerId;
    }

    public getCurrentTick(): number {
        return this.lastProcessedTick;
    }

    // Add method to update network latency
    public updateNetworkLatency(latency: number): void {
        this.networkLatency = latency;
    }

    public initializeTick(serverTick: number): void {
        if (this.lastProcessedTick === 0) {
            this.lastProcessedTick = serverTick;
            console.log('Initialized client tick with server tick:', {
                serverTick,
                lastProcessedTick: this.lastProcessedTick
            });
        }
    }

    public updateServerTick(serverTick: number): void {
        this.serverTick = serverTick;
    }
} 