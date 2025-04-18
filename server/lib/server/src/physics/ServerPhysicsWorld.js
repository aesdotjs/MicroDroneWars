"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPhysicsWorld = void 0;
const PhysicsWorld_1 = require("@shared/physics/PhysicsWorld");
const PhysicsControllerFactory_1 = require("@shared/physics/PhysicsControllerFactory");
const babylonjs_1 = require("babylonjs");
const VehicleSettings_1 = require("@shared/physics/VehicleSettings");
let stepCount = 0;
let lastStepLog = performance.now();
let lastFire = performance.now();
/**
 * Handles server-side physics simulation for the game.
 * Manages vehicle physics controllers and updates game state based on physics calculations.
 */
class ServerPhysicsWorld {
    /**
     * Creates a new ServerPhysicsWorld instance.
     * Initializes the physics engine and scene.
     */
    constructor() {
        this.controllers = new Map();
        // private accumulator: number = 0;
        this.FIXED_TIME_STEP = 1 / 60;
        // private readonly MAX_SUBSTEPS: number = 3;
        // private readonly MAX_ACCUMULATED_TIME: number = this.FIXED_TIME_STEP * 3;
        // private readonly MIN_ACCUMULATED_TIME: number = 0.0001;
        this.lastProcessedInputTimestamps = new Map();
        this.lastProcessedInputTicks = new Map();
        this.inputBuffers = new Map();
        this.MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps
        /**
         * Processes a single fixed timestep update.
         * Handles vehicle inputs, physics simulation, and state updates.
         * @param state - Current game state to update
         */
        this.processFixedUpdate = (deltaTime, state) => {
            stepCount++;
            const now = performance.now();
            const realDt = now - lastFire;
            lastFire = now;
            const t0 = performance.now();
            // Process all vehicles' inputs
            state.vehicles.forEach((vehicle, id) => {
                var _a, _b;
                const controller = this.controllers.get(id);
                const inputBuffer = (_a = this.inputBuffers.get(id)) !== null && _a !== void 0 ? _a : [];
                const idleInput = {
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
                    let lastProcessedTick = (_b = this.lastProcessedInputTicks.get(id)) !== null && _b !== void 0 ? _b : 0;
                    // console.log(`[Server][processFixed] ${id}: lastProcessedTick=${lastProcessedTick}, buffer=[${inputBuffer.map(i=>i.tick).join(',')}]`);
                    const buffer = inputBuffer.sort((a, b) => a.tick - b.tick);
                    if (buffer.length > 0)
                        console.log(`[Server][processFixed] ${id}: lastProcessedTick=${lastProcessedTick}, buffer=[${inputBuffer.map(i => i.tick).join(',')}]`);
                    // // Process each input in order
                    let processedCount = 0;
                    for (const input of buffer) {
                        if (input.tick > lastProcessedTick) {
                            // Scale mouse delta by fixed timestep to maintain consistent sensitivity
                            if (input.mouseDelta) {
                                input.mouseDelta.x *= this.FIXED_TIME_STEP;
                                input.mouseDelta.y *= this.FIXED_TIME_STEP;
                            }
                            controller.update(this.FIXED_TIME_STEP, input);
                            lastProcessedTick = input.tick;
                        }
                        processedCount++;
                    }
                    // if no inputs, send idle input
                    if (processedCount === 0) {
                        controller.update(this.FIXED_TIME_STEP, idleInput);
                    }
                    this.lastProcessedInputTicks.set(id, lastProcessedTick);
                    this.lastProcessedInputTimestamps.set(id, Date.now());
                    buffer.splice(0, processedCount);
                    // const nextInput = unprocessedInputs.length > 0 ? unprocessedInputs.shift()! : idleInput;
                    // controller.update(this.FIXED_TIME_STEP, nextInput);
                    // this.lastProcessedInputTicks.set(id, nextInput.tick);
                    // this.lastProcessedInputTimestamps.set(id, nextInput.timestamp);
                    // this.inputBuffers.set(id, unprocessedInputs);
                    this.inputBuffers.set(id, buffer);
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
                        vehicle.timestamp = Date.now();
                        vehicle.lastProcessedInputTimestamp = this.lastProcessedInputTimestamps.get(id) || Date.now();
                        vehicle.lastProcessedInputTick = this.lastProcessedInputTicks.get(id) || this.physicsWorld.getCurrentTick();
                    }
                }
            });
            const t1 = performance.now();
            const cost = t1 - t0;
            const t2 = performance.now();
            // Step physics world
            this.physicsWorld.update(this.FIXED_TIME_STEP, this.FIXED_TIME_STEP, 1);
            const t3 = performance.now();
            const cost2 = t3 - t2;
            if (now - lastStepLog > 1000) {
                console.log(`[Server][SIM] ` +
                    `requested dt: ${deltaTime.toFixed(2)} ms, ` +
                    `actual dt: ${realDt.toFixed(2)} ms, ` +
                    `input cost: ${cost.toFixed(2)} ms, ` +
                    `update cost: ${cost2.toFixed(2)} ms, ` +
                    `ticks/sec: ${stepCount}`);
                stepCount = 0;
                lastStepLog = now;
            }
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
        };
        this.engine = new babylonjs_1.NullEngine();
        this.scene = new babylonjs_1.Scene(this.engine);
        this.physicsWorld = new PhysicsWorld_1.PhysicsWorld(this.engine, this.scene, {
            gravity: 9.81
        });
    }
    /**
     * Creates a new vehicle in the physics world.
     * @param id - Unique identifier for the vehicle
     * @param vehicle - Vehicle data to initialize the physics controller
     */
    createVehicle(id, vehicle) {
        const controller = PhysicsControllerFactory_1.PhysicsControllerFactory.createController(this.physicsWorld.getWorld(), vehicle.vehicleType === 'drone' ? VehicleSettings_1.DroneSettings : VehicleSettings_1.PlaneSettings);
        this.controllers.set(id, controller);
        this.inputBuffers.set(id, []);
        const lastProcessedInputTimestamp = vehicle.lastProcessedInputTimestamp || Date.now();
        this.lastProcessedInputTimestamps.set(id, lastProcessedInputTimestamp);
        this.lastProcessedInputTicks.set(id, vehicle.lastProcessedInputTick);
        const initialState = {
            position: new babylonjs_1.Vector3(vehicle.positionX, vehicle.positionY, vehicle.positionZ),
            quaternion: new babylonjs_1.Quaternion(0, 0, 0, 1),
            linearVelocity: new babylonjs_1.Vector3(0, 0, 0),
            angularVelocity: new babylonjs_1.Vector3(0, 0, 0),
            timestamp: Date.now(),
            tick: this.physicsWorld.getCurrentTick(),
            lastProcessedInputTimestamp: lastProcessedInputTimestamp,
            lastProcessedInputTick: this.lastProcessedInputTicks.get(id) || this.physicsWorld.getCurrentTick()
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
    addInput(id, input) {
        const buffer = this.inputBuffers.get(id);
        if (buffer) {
            // if (input.tick <= 0 || isNaN(input.tick)) {
            //     input.tick = this.physicsWorld.getCurrentTick();
            // }
            buffer.push(input);
            console.log(`[Server][addInput] for ${id}: tick=${input.tick} timestamp=${input.timestamp}`);
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
    update(deltaTime, state) {
        // Add frame time to accumulator
        // this.accumulator += deltaTime;
        // // Prevent accumulator from growing too large
        // if (this.accumulator > this.MAX_ACCUMULATED_TIME) {
        //     this.accumulator = this.MAX_ACCUMULATED_TIME;
        // }
        // // Process fixed timestep updates
        // let steps = 0;
        // while (this.accumulator >= this.FIXED_TIME_STEP && steps < this.MAX_SUBSTEPS) {
        this.processFixedUpdate(deltaTime, state);
        //     this.accumulator -= this.FIXED_TIME_STEP;
        //     steps++;
        // }
        // // Reset accumulator if it gets too small
        // if (this.accumulator < this.MIN_ACCUMULATED_TIME) {
        //     this.accumulator = 0;
        // }
    }
    /**
     * Gets the current physics state of a vehicle.
     * @param id - Unique identifier of the vehicle
     * @returns Current physics state of the vehicle or null if not found
     */
    getVehicleState(id) {
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
    getLastProcessedInputTimestamp(id) {
        return this.lastProcessedInputTimestamps.get(id) || Date.now();
    }
    /**
     * Gets the last processed input tick for a vehicle.
     */
    getLastProcessedInputTick(id) {
        return this.lastProcessedInputTicks.get(id) || this.physicsWorld.getCurrentTick();
    }
    /**
     * Removes a vehicle from the physics world.
     * @param id - Unique identifier of the vehicle to remove
     */
    removeVehicle(id) {
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
    getCurrentTick() {
        return this.physicsWorld.getCurrentTick();
    }
    /**
     * Cleans up all physics resources.
     * Disposes of controllers, scene, and engine.
     */
    dispose() {
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
exports.ServerPhysicsWorld = ServerPhysicsWorld;
