import { Engine, Scene, Vector3, Mesh, Quaternion, MeshBuilder, StandardMaterial, Color3 } from 'babylonjs';
import * as CANNON from 'cannon-es';
import type { Body as CannonBody } from 'cannon-es';
import { CollisionGroups, collisionMasks } from './CollisionGroups';
import { CollisionEvent, VehicleCollisionEvent, PhysicsState, PhysicsConfig } from './types';
import { CollisionManager, CollisionCallback, EnhancedCollisionEvent } from './CollisionManager';

let stepCount = 0;
let lastStepLog = performance.now();
/**
 * Manages the physics simulation world for the game.
 * Handles vehicle physics, collisions, and state synchronization between client and server.
 */
export class PhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private world: CANNON.World;
    private bodies: Map<string, CannonBody> = new Map();
    private groundBody!: CannonBody;
    private groundMesh!: Mesh;
    private collisionManager: CollisionManager;
    private currentTick: number = 0;

    /**
     * Creates a new PhysicsWorld instance.
     * @param engine - The Babylon.js engine instance
     * @param scene - The Babylon.js scene instance
     * @param config - Physics configuration including gravity and other settings
     */
    constructor(engine: Engine, scene: Scene, config: PhysicsConfig) {
        this.engine = engine;
        this.scene = scene;
        
        // Initialize physics engine
        this.initializePhysics();
        
        // Configure physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -config.gravity, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        // Create materials
        const groundMaterial = new CANNON.Material('groundMaterial');
        const vehicleMaterial = new CANNON.Material('vehicleMaterial');
        
        // Configure contact materials
        const groundVehicleContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            vehicleMaterial,
            {
                friction: 0.5,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(groundVehicleContactMaterial);

        // Configure vehicle vehicle contact material
        const vehicleVehicleContactMaterial = new CANNON.ContactMaterial(
            vehicleMaterial,
            vehicleMaterial,
            { friction: 0.5, restitution: 0.3 }
        );
        this.world.addContactMaterial(vehicleVehicleContactMaterial);

        // Create ground
        this.createGround(groundMaterial);
        
        // Initialize collision manager
        this.collisionManager = new CollisionManager(this.world, this.groundBody);
    }

    /**
     * Initializes the physics engine and enables physics in the scene.
     * Sets up gravity and collision detection.
     */
    private initializePhysics(): void {
        // Enable physics in the scene
        // this.scene.gravity = new Vector3(0, -9.81, 0);
        // this.scene.collisionsEnabled = true;
        
        // // Initialize CannonJS plugin
        // const plugin = new CannonJSPlugin(true, 10, CANNON);
        // this.scene.enablePhysics(this.scene.gravity, plugin);
        
        console.log('Physics initialized:', {
            hasPhysics: this.scene.isPhysicsEnabled(),
            gravity: this.scene.gravity,
            collisionsEnabled: this.scene.collisionsEnabled
        });
    }

    /**
     * Creates the ground plane for the physics world.
     * Sets up both the physics body and visual mesh.
     * @param groundMaterial - The physics material for the ground
     */
    private createGround(groundMaterial: CANNON.Material): void {
        // Create ground plane
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0,
            material: groundMaterial,
            collisionFilterGroup: CollisionGroups.Environment,
            collisionFilterMask: CollisionGroups.Drones | CollisionGroups.Planes,
            position: new CANNON.Vec3(0, 0, 0)
        });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(this.groundBody);

        console.log('Ground body created:', {
            collisionGroup: this.groundBody.collisionFilterGroup,
            collisionMask: this.groundBody.collisionFilterMask,
            position: this.groundBody.position,
            quaternion: this.groundBody.quaternion,
            shape: this.groundBody.shapes[0]?.type
        });

        // Create ground mesh if we have a scene
        if (this.scene) {
            this.groundMesh = MeshBuilder.CreateGround("ground", {
                width: 200,
                height: 200,
                subdivisions: 1
            }, this.scene);

            const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
            groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3); // Grey color
            groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            groundMaterial.specularPower = 64;
            groundMaterial.ambientColor = new Color3(0.3, 0.3, 0.3); // Add ambient color
            
            this.groundMesh.material = groundMaterial;
            this.groundMesh.position.y = 0;
            this.groundMesh.checkCollisions = true;
            this.groundMesh.receiveShadows = true;

            console.log('Ground mesh created:', {
                size: { width: 200, height: 200 },
                position: this.groundMesh.position,
                hasMaterial: !!this.groundMesh.material,
                hasPhysicsImpostor: !!this.groundMesh.physicsImpostor,
            });
        }
    }

    /**
     * Registers a callback for collision events for a specific body.
     * @param id - The ID of the body to register the callback for
     * @param callback - The function to call when a collision occurs
     */
    public registerCollisionCallback(id: string, callback: CollisionCallback): void {
        this.collisionManager.registerCollisionCallback(id, callback);
    }

    /**
     * Removes a collision callback for a specific body.
     * @param id - The ID of the body to remove the callback for
     * @param callback - The callback function to remove
     */
    public unregisterCollisionCallback(id: string, callback: CollisionCallback): void {
        this.collisionManager.unregisterCollisionCallback(id, callback);
    }

    /**
     * Registers a global callback for all collision events.
     * @param callback - The function to call when any collision occurs
     */
    public registerGlobalCollisionCallback(callback: CollisionCallback): void {
        this.collisionManager.registerGlobalCollisionCallback(callback);
    }

    /**
     * Removes a global collision callback.
     * @param callback - The global callback function to remove
     */
    public unregisterGlobalCollisionCallback(callback: CollisionCallback): void {
        this.collisionManager.unregisterGlobalCollisionCallback(callback);
    }

    /**
     * Gets the underlying CANNON.js physics world instance.
     * @returns The CANNON.js world instance
     */
    public getWorld(): CANNON.World {
        return this.world;
    }
    
    

    /**
     * Updates the physics simulation by one step.
     * @param fixedTimeStep - The fixed time step in seconds
     * @param deltaTime - The time step in seconds
     * @param maxSubsteps - Maximum number of substeps to take
     */
    public update(fixedTimeStep: number, deltaTime: number, maxSubsteps: number): void {
        this.world.step(fixedTimeStep, deltaTime, maxSubsteps);
        this.currentTick++;
    }

    /**
     * Gets the current simulation tick number.
     * @returns The current tick number
     */
    public getCurrentTick(): number {
        return this.currentTick;
    }

    /**
     * Sets the physics state of a vehicle.
     * @param id - The ID of the body to set the state for
     * @param state - The new physics state to apply
     */
    public setVehicleState(id: string, state: PhysicsState): void {
        const body = this.bodies.get(id);
        if (!body) return;

        body.position.set(state.position.x, state.position.y, state.position.z);
        body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        body.velocity.set(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
        body.angularVelocity.set(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
    }


    /**
     * Cleans up physics resources and removes all bodies.
     */
    public cleanup(): void {
        // Remove all bodies
        this.bodies.forEach(body => {
            this.world.removeBody(body);
        });
        this.bodies.clear();
        
        // Remove ground body
        this.world.removeBody(this.groundBody);

        // Dispose of ground mesh if we have a scene
        if (this.scene && this.groundMesh) {
            this.groundMesh.dispose();
        }

        // Clean up collision manager
        this.collisionManager.cleanup();
    }

    public getCollisionManager(): CollisionManager {
        return this.collisionManager;
    }

    /**
     * Gets the ground physics body.
     * @returns The ground CANNON.js body
     */
    public getGroundBody(): CANNON.Body {
        return this.groundBody;
    }

    /**
     * Gets the ground visual mesh.
     * @returns The ground Babylon.js mesh
     */
    public getGroundMesh(): any {
        return this.groundMesh;
    }

    /**
     * Sets the current simulation tick number.
     * @param tick - The tick number to set
     */
    public setCurrentTick(tick: number): void {
        this.currentTick = tick;
    }
} 