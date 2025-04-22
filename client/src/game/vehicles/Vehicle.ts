import { Vector3, Quaternion, Mesh, Scene } from 'babylonjs';
import { InputManager } from '../InputManager';
import { PhysicsState, PhysicsInput, Projectile } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { Vehicle as VehicleSchema } from '../schemas';
import { WeaponEffects } from '../effects/WeaponEffects';

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
        fire: false,
        zoom: false,
        nextWeapon: false,
        previousWeapon: false,
        weapon1: false,
        weapon2: false,
        weapon3: false,
        mouseDelta: { x: 0, y: 0 },
        timestamp: Date.now(),
        tick: 0
    };
    /** Collision detection sphere for the vehicle */
    public collisionSphere!: { position: Vector3; radius: number };
    /** Current health points of the vehicle */
    public health: number = 100;
    /** Maximum health points of the vehicle */
    public maxHealth: number = 100;
    protected weaponEffects: WeaponEffects;

    /**
     * Creates a new Vehicle instance.
     * @param id - The unique identifier for the vehicle
     * @param scene - The Babylon.js scene to add the vehicle to
     * @param type - The type of vehicle ('drone' or 'plane')
     * @param vehicle - The vehicle schema containing initial state
     * @param inputManager - Optional input manager for controlling the vehicle
     * @param isLocalPlayer - Whether this vehicle is controlled by the local player
     */
    constructor(id: string, scene: Scene, type: 'drone' | 'plane', vehicle: VehicleSchema, inputManager?: InputManager, isLocalPlayer: boolean = false) {
        this.id = id;
        this.scene = scene;
        this.type = type;
        this.team = vehicle.team;
        this.inputManager = inputManager;
        this.isLocalPlayer = isLocalPlayer;
        this.id = id;

        // Initialize weapon effects
        this.weaponEffects = new WeaponEffects(scene);

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

        // Update weapon effects
        if (this.physicsController) {
            const projectiles = new Map<string, Vector3>();
            const weaponSystem = (this.physicsController as any).weaponSystem;
            if (weaponSystem) {
                // Get all active projectiles and their positions
                weaponSystem.getProjectiles().forEach((projectile: Projectile) => {
                    projectiles.set(projectile.id, projectile.position);
                });
            }
            this.weaponEffects.updateProjectiles(projectiles);
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
     * Creates a muzzle flash effect
     * @param position - Position of the muzzle flash
     * @param direction - Direction the weapon is facing
     */
    protected createMuzzleFlash(position: Vector3, direction: Vector3): void {
        this.weaponEffects.createMuzzleFlash(position, direction, this.id);
    }

    /**
     * Creates a projectile mesh
     * @param projectile - The projectile data
     */
    protected createProjectileMesh(projectile: Projectile): void {
        this.weaponEffects.createProjectileMesh(projectile);
    }

    /**
     * Cleans up resources when the vehicle is destroyed or removed.
     * Disposes of mesh, input manager, and physics controller.
     */
    public dispose(): void {
        // Clean up mesh
        if (this.mesh) {
            this.mesh.dispose();
        }

        // Clean up input manager
        if (this.inputManager) {
            this.inputManager.cleanup();
        }

        // Clean up physics controller
        if (this.physicsController) {
            this.physicsController.cleanup();
        }

        // Clean up weapon effects
        if (this.weaponEffects) {
            this.weaponEffects.cleanup();
        }

        // Reset state
        this.health = this.maxHealth;
        this.input = {
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
            fire: false,
            zoom: false,
            nextWeapon: false,
            previousWeapon: false,
            weapon1: false,
            weapon2: false,
            weapon3: false,
            mouseDelta: { x: 0, y: 0 },
            timestamp: Date.now(),
            tick: 0
        };
    }
} 