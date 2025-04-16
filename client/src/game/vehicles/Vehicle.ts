import { Vector3, Quaternion, Mesh, Scene } from 'babylonjs';
import { InputManager } from '../InputManager';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { Vehicle as VehicleSchema } from '../schemas/Vehicle';

/**
 * Base class for all vehicles in the game.
 * Provides common functionality for physics, input handling, and state management.
 * Extended by specific vehicle types like Drone and Plane.
 */
export abstract class Vehicle {
    /** Unique identifier for the vehicle */
    public id: string;
    /** Type of vehicle ('drone' or 'plane') */
    public type: 'drone' | 'plane';
    /** Team number the vehicle belongs to */
    public team: number;
    /** The 3D mesh representing the vehicle */
    public mesh: Mesh | null = null;
    /** Whether this vehicle is controlled by the local player */
    public isLocalPlayer: boolean = false;
    /** The Babylon.js scene containing the vehicle */
    protected scene: Scene;
    /** The HTML canvas element for rendering */
    protected canvas: HTMLCanvasElement;
    /** Optional input manager for controlling the vehicle */
    protected inputManager?: InputManager;
    /** Physics controller for handling vehicle physics */
    protected physicsController?: BasePhysicsController;
    /** Current input state for the vehicle */
    public input: PhysicsInput = {
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
        timestamp: performance.now(),
        tick: 0
    };
    /** Collision detection sphere for the vehicle */
    public collisionSphere!: { position: Vector3; radius: number };
    /** Current health points of the vehicle */
    public health: number = 100;
    /** Maximum health points of the vehicle */
    public maxHealth: number = 100;

    /**
     * Creates a new Vehicle instance.
     * @param scene - The Babylon.js scene to add the vehicle to
     * @param type - The type of vehicle ('drone' or 'plane')
     * @param vehicle - The vehicle schema containing initial state
     * @param canvas - The HTML canvas element
     * @param inputManager - Optional input manager for controlling the vehicle
     * @param isLocalPlayer - Whether this vehicle is controlled by the local player
     */
    constructor(scene: Scene, type: 'drone' | 'plane', vehicle: VehicleSchema, canvas: HTMLCanvasElement, inputManager?: InputManager, isLocalPlayer: boolean = false) {
        this.scene = scene;
        this.type = type;
        this.team = vehicle.team;
        this.canvas = canvas;
        this.inputManager = inputManager;
        this.isLocalPlayer = isLocalPlayer;
        this.id = `${type}_${Math.random().toString(36).substr(2, 9)}`;

        // Initialize collision sphere
        this.collisionSphere = {
            position: new Vector3(0, 0, 0),
            radius: 2.0
        };
    }

    /**
     * Sets the physics controller for the vehicle.
     * @param controller - The physics controller to use
     */
    public setPhysicsController(controller: BasePhysicsController): void {
        this.physicsController = controller;
        // Set initial state from mesh if it exists
        if (this.mesh) {
            this.physicsController.setState({
                position: this.mesh.position,
                quaternion: this.mesh.rotationQuaternion || new Quaternion(),
                linearVelocity: new Vector3(0, 0, 0),
                angularVelocity: new Vector3(0, 0, 0),
            });
        }
    }

    /**
     * Applies damage to the vehicle.
     * @param amount - Amount of damage to apply
     */
    public takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.onDestroyed();
        }
    }

    /**
     * Called when the vehicle is destroyed.
     * Can be overridden by subclasses for specific destruction behavior.
     */
    protected onDestroyed(): void {
        // Override in subclasses for specific destruction behavior
        this.dispose();
    }

    /**
     * Updates the vehicle's state.
     * @param deltaTime - Time elapsed since last update in seconds
     */
    public update(deltaTime: number): void {
        if (this.isLocalPlayer && this.inputManager) {
            this.input = this.inputManager.getInput();
        }
    }

    /**
     * Updates the vehicle's state based on physics simulation.
     * @param state - The physics state to apply
     */
    public updateState(state: PhysicsState): void {
        if (!this.mesh) return;

        // Update position
        this.mesh.position = new Vector3(
            state.position.x,
            state.position.y,
            state.position.z
        );

        // Update rotation
        this.mesh.rotationQuaternion = new Quaternion(
            state.quaternion.x,
            state.quaternion.y,
            state.quaternion.z,
            state.quaternion.w
        );
    }

    /**
     * Cleans up resources when the vehicle is destroyed or removed.
     * Disposes of mesh, input manager, and physics controller.
     */
    public dispose(): void {
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (this.inputManager) {
            this.inputManager.cleanup();
        }
        if (this.physicsController) {
            this.physicsController.cleanup();
        }
    }
} 