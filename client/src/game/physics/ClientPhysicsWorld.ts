import { Vector3, Quaternion, Engine, Scene } from 'babylonjs';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig, StateBuffer, InterpolationConfig, PhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';
import { PhysicsWorld } from '@shared/physics/PhysicsWorld';
import { CollisionEvent } from '@shared/physics/types';

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
    private lastUpdateTime: number = 0;

    constructor(engine: Engine, scene: Scene) {
        this.engine = engine;
        this.scene = scene;
        this.physicsWorld = new PhysicsWorld(this.engine, this.scene, {
            fixedTimeStep: 1/60,
            mass: 1,
            drag: 0.1,
            angularDrag: 0.1,
            maxSpeed: 100,
            maxAngularSpeed: 10,
            maxAngularAcceleration: 0.05,
            angularDamping: 0.1,
            forceMultiplier: 0.005,
            gravity: 9.81,
            vehicleType: 'drone',
            thrust: 20,
            lift: 10,
            torque: 5,
            maxSubSteps: 3
        });
        this.controllers = new Map();
        this.stateBuffers = new Map();
        this.interpolationConfig = {
            delay: 100, // ms
            maxBufferSize: 10,
            interpolationFactor: 0.2
        };
    }

    createVehicle(id: string, type: 'drone' | 'plane', config: VehiclePhysicsConfig, initialPosition: Vector3, initialState?: PhysicsState): BasePhysicsController {
        console.log('Creating vehicle:', { id, type, initialPosition });
        let controller: BasePhysicsController;

        if (type === 'drone') {
            controller = new DronePhysicsController(this.physicsWorld.getWorld(), config);
        } else {
            controller = new PlanePhysicsController(this.physicsWorld.getWorld(), config);
        }

        // Use provided initial state or create default one
        const state = initialState || {
            position: initialPosition,
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
            type, 
            initialPosition: state.position,
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

    public update(time: number, deltaTime: number, input: PhysicsInput): void {
        this.lastUpdateTime = time;

        // Add frame time to accumulator (convert to seconds)
        this.accumulator += deltaTime;

        // Process fixed timestep updates with a maximum of 3 steps per frame
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < 3) {
            this.processFixedUpdate(input);
            this.accumulator -= this.fixedTimeStep;
            steps++;
        }

        // If we have leftover time, carry it over to next frame
        if (this.accumulator > this.fixedTimeStep * 3) {
            this.accumulator = this.fixedTimeStep * 3;
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
            buffer.states.push(state);
            // Keep buffer size reasonable
            if (buffer.states.length > this.interpolationConfig.maxBufferSize) {
                buffer.states.shift();
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
                    tick: state2.tick
                });
            }
        });
    }

    public reconcileState(id: string, serverState: PhysicsState): void {
        if (id !== this.localPlayerId) return;

        const controller = this.controllers.get(id);
        if (!controller) return;

        // Calculate position error
        const currentState = controller.getState();
        if (!currentState) return;

        const positionError = Vector3.Distance(currentState.position, serverState.position);
        const rotationError = this.calculateQuaternionAngle(
            new Quaternion(currentState.quaternion.x, currentState.quaternion.y, currentState.quaternion.z, currentState.quaternion.w),
            new Quaternion(serverState.quaternion.x, serverState.quaternion.y, serverState.quaternion.z, serverState.quaternion.w)
        );

        // Only reconcile if error is significant
        if (positionError > 2.0 || rotationError > 1.0) {
            console.log('Reconciling state due to large error:', {
                positionError,
                rotationError,
                currentPosition: currentState.position,
                serverPosition: serverState.position
            });
            
            // Smoothly correct the state with a stronger correction factor
            const correctedState: PhysicsState = {
                position: Vector3.Lerp(currentState.position, serverState.position, 0.5),
                quaternion: Quaternion.Slerp(
                    new Quaternion(currentState.quaternion.x, currentState.quaternion.y, currentState.quaternion.z, currentState.quaternion.w),
                    new Quaternion(serverState.quaternion.x, serverState.quaternion.y, serverState.quaternion.z, serverState.quaternion.w),
                    0.5
                ),
                linearVelocity: Vector3.Lerp(currentState.linearVelocity, serverState.linearVelocity, 0.5),
                angularVelocity: Vector3.Lerp(currentState.angularVelocity, serverState.angularVelocity, 0.5),
                timestamp: performance.now(),
                tick: serverState.tick
            };
            controller.setState(correctedState);
        }
    }

    private calculateQuaternionAngle(q1: Quaternion, q2: Quaternion): number {
        const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        return Math.acos(2 * dot * dot - 1);
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
} 