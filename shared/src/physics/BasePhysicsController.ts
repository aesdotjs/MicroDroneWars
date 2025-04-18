import * as CANNON from 'cannon-es';
import { Vector3, Quaternion, Matrix } from 'babylonjs';
import { PhysicsState, VehiclePhysicsConfig, PhysicsInput } from './types';
import { SpringSimulator } from '../utils/SpringSimulator';
import { CollisionGroups, collisionMasks } from './CollisionGroups';

/**
 * Base class for vehicle physics controllers.
 * Provides common physics functionality for both drones and planes.
 * Handles basic physics properties, collision detection, and common movement controls.
 */
export abstract class BasePhysicsController {
    /** The CANNON.js physics body for the vehicle */
    protected body: CANNON.Body;
    /** The CANNON.js physics world */
    protected world: CANNON.World;
    /** Configuration for the vehicle physics */
    protected config: VehiclePhysicsConfig;
    /** Simulator for spring-based movement smoothing */
    protected springSimulator: SpringSimulator;
    /** Simulator for aileron control surface movement */
    protected aileronSimulator: SpringSimulator;
    /** Simulator for elevator control surface movement */
    protected elevatorSimulator: SpringSimulator;
    /** Simulator for rudder control surface movement */
    protected rudderSimulator: SpringSimulator;
    /** Simulator for steering movement */
    protected steeringSimulator: SpringSimulator;
    /** Current engine power (0-1) */
    protected enginePower: number = 0;
    /** Maximum engine power */
    protected maxEnginePower: number = 1.0;
    /** Rate at which engine power can change */
    protected enginePowerChangeRate: number = 0.2;
    /** Last calculated drag value */
    protected lastDrag: number = 0;
    /** Current physics simulation tick */
    protected tick: number = 0;
    /** Current physics simulation timestamp */
    protected timestamp: number = 0;
    /** Last processed input timestamp */
    protected lastProcessedInputTimestamp: number = Date.now();
    /** Last processed input tick */
    protected lastProcessedInputTick: number = 0;

    /**
     * Creates a new BasePhysicsController instance.
     * Initializes physics body, collision filters, and spring simulators.
     * @param world - The CANNON.js physics world
     * @param config - Configuration for the vehicle physics
     */
    constructor(world: CANNON.World, config: VehiclePhysicsConfig) {
        this.world = world;
        this.config = config;
        
        // Get collision group and mask based on vehicle type
        const vehicleGroup = config.vehicleType === 'drone' ? CollisionGroups.Drones : CollisionGroups.Planes;
        const vehicleMask = collisionMasks[config.vehicleType === 'drone' ? 'Drone' : 'Plane'];
        
        // Initialize physics body with proper collision filters
        this.body = new CANNON.Body({
            mass: config.mass,
            material: new CANNON.Material('vehicleMaterial'),
            collisionFilterGroup: vehicleGroup,
            collisionFilterMask: vehicleMask,
            fixedRotation: false,
            linearDamping: config.vehicleType === 'drone' ? 0.1 : 0.5, // Lower damping for drones
            angularDamping: 0.5,
            type: CANNON.Body.DYNAMIC
        });

        // Add collision shape based on vehicle type
        if (config.vehicleType === 'drone') {
            // Drone shape - box with dimensions matching the drone mesh
            this.body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.5))); // Increased height for better stability
        } else {
            // Plane shape - box with dimensions matching the plane mesh
            this.body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.3, 0.5)));
        }
        
        // Add body to world
        this.world.addBody(this.body);
        
        // Initialize spring simulators
        this.springSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.aileronSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator(60, 0.1, 0.3);

        console.log('Physics body created:', {
            type: config.vehicleType,
            collisionGroup: vehicleGroup,
            collisionMask: vehicleMask,
            hasShape: this.body.shapes.length > 0,
            shapeType: this.body.shapes[0]?.type
        });
    }

    /**
     * Updates the vehicle physics based on input.
     * Must be implemented by derived classes.
     * @param deltaTime - Time elapsed since last update in seconds
     * @param input - Physics input from the player
     */
    abstract update(deltaTime: number, input: PhysicsInput): void;

    /**
     * Gets the current physics state of the vehicle.
     * @returns The current physics state or null if the body doesn't exist
     */
    getState(): PhysicsState | null {
        if (!this.body) return null;
        
        return {
            position: new Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            ),
            quaternion: new Quaternion(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            ),
            linearVelocity: new Vector3(
                this.body.velocity.x,
                this.body.velocity.y,
                this.body.velocity.z
            ),
            angularVelocity: new Vector3(
                this.body.angularVelocity.x,
                this.body.angularVelocity.y,
                this.body.angularVelocity.z
            ),
            tick: this.tick,
            timestamp: this.timestamp,
            lastProcessedInputTimestamp: this.lastProcessedInputTimestamp,
            lastProcessedInputTick: this.lastProcessedInputTick
        };
    }

    /**
     * Sets the physics state of the vehicle.
     * @param state - The new physics state to apply
     */
    setState(state: PhysicsState): void {
        if (!this.body) return;
        this.body.position.set(
            state.position.x,
            state.position.y,
            state.position.z
        );
        
        this.body.quaternion.set(
            state.quaternion.x,
            state.quaternion.y,
            state.quaternion.z,
            state.quaternion.w
        );
        
        this.body.velocity.set(
            state.linearVelocity.x,
            state.linearVelocity.y,
            state.linearVelocity.z
        );
        
        this.body.angularVelocity.set(
            state.angularVelocity.x,
            state.angularVelocity.y,
            state.angularVelocity.z
        );
        this.tick = state.tick;
        this.timestamp = state.timestamp;
        this.lastProcessedInputTimestamp = state.lastProcessedInputTimestamp || Date.now();
        this.lastProcessedInputTick = state.lastProcessedInputTick || this.tick;
    }

    /**
     * Cleans up physics resources.
     * Removes the body from the physics world.
     */
    cleanup(): void {
        if (this.body) {
            this.world.removeBody(this.body);
        }
    }

    /**
     * Updates the engine power based on input.
     * Only applies to planes, not drones.
     * @param input - Physics input from the player
     */
    protected updateEnginePower(input: PhysicsInput): void {
        // Only update engine power for planes, not drones
        if (this.config.vehicleType === 'plane') {
            if (!input) {
                this.enginePower = 0;
                return;
            }

            if (input.up) {
                this.enginePower = Math.min(this.enginePower + this.enginePowerChangeRate, this.maxEnginePower);
            } else if (input.down) {
                this.enginePower = Math.max(this.enginePower - this.enginePowerChangeRate, 0);
            }
        }
    }

    /**
     * Gets the orientation vectors of the vehicle in world space.
     * @returns Object containing forward, right, and up vectors
     */
    protected getOrientationVectors(): { forward: Vector3; right: Vector3; up: Vector3 } {
        // Initialize vectors in local space
        let forward = new Vector3(0, 0, 1);
        let right = new Vector3(1, 0, 0);
        let up = new Vector3(0, 1, 0);

        // Transform vectors to world space using body's quaternion
        const quaternion = this.body.quaternion;
        const rotationMatrix = Matrix.FromQuaternionToRef(
            new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
            new Matrix()
        );

        forward = Vector3.TransformCoordinates(forward, rotationMatrix);
        right = Vector3.TransformCoordinates(right, rotationMatrix);
        up = Vector3.TransformCoordinates(up, rotationMatrix);

        return { forward, right, up };
    }

    /**
     * Applies mouse control input to the vehicle's rotation.
     * @param input - Physics input from the player
     * @param right - Right vector of the vehicle
     * @param up - Up vector of the vehicle
     */
    protected applyMouseControl(input: PhysicsInput, right: Vector3, up: Vector3): void {
        if (input.mouseDelta) {
            if (input.mouseDelta.x !== 0) {
                const mouseXEffect = input.mouseDelta.x * 0.005;
                this.body.angularVelocity.x += up.x * mouseXEffect;
                this.body.angularVelocity.y += up.y * mouseXEffect;
                this.body.angularVelocity.z += up.z * mouseXEffect;
            }
            if (input.mouseDelta.y !== 0) {
                const mouseYEffect = input.mouseDelta.y * 0.005;
                this.body.angularVelocity.x += right.x * mouseYEffect;
                this.body.angularVelocity.y += right.y * mouseYEffect;
                this.body.angularVelocity.z += right.z * mouseYEffect;
            }
        }
    }

    /**
     * Applies angular damping to the vehicle's rotation.
     * @param damping - Damping factor (default: 0.97)
     */
    protected applyAngularDamping(damping: number = 0.97): void {
        this.body.angularVelocity.x *= damping;
        this.body.angularVelocity.y *= damping;
        this.body.angularVelocity.z *= damping;
    }

    /**
     * Gets the CANNON.js physics body of the vehicle.
     * @returns The physics body
     */
    getBody(): CANNON.Body {
        return this.body;
    }
} 