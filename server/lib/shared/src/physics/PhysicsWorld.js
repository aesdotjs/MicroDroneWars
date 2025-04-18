"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsWorld = void 0;
const babylonjs_1 = require("babylonjs");
const CANNON = __importStar(require("cannon-es"));
const CollisionGroups_1 = require("./CollisionGroups");
let stepCount = 0;
let lastStepLog = performance.now();
/**
 * Manages the physics simulation world for the game.
 * Handles vehicle physics, collisions, and state synchronization between client and server.
 */
class PhysicsWorld {
    /**
     * Creates a new PhysicsWorld instance.
     * @param engine - The Babylon.js engine instance
     * @param scene - The Babylon.js scene instance
     * @param config - Physics configuration including gravity and other settings
     */
    constructor(engine, scene, config) {
        this.bodies = new Map();
        this.collisionCallbacks = new Map();
        this.currentTick = 0;
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
        const groundVehicleContactMaterial = new CANNON.ContactMaterial(groundMaterial, vehicleMaterial, {
            friction: 0.5,
            restitution: 0.3
        });
        this.world.addContactMaterial(groundVehicleContactMaterial);
        // Create ground
        this.createGround(groundMaterial);
        // Add collision event listeners
        this.world.addEventListener('beginContact', (event) => {
            this.handleCollision(event);
        });
    }
    /**
     * Initializes the physics engine and enables physics in the scene.
     * Sets up gravity and collision detection.
     */
    initializePhysics() {
        // Enable physics in the scene
        // this.scene.gravity = new Vector3(0, -9.81, 0);
        this.scene.collisionsEnabled = true;
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
    createGround(groundMaterial) {
        var _a;
        // Create ground plane
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0,
            material: groundMaterial,
            collisionFilterGroup: CollisionGroups_1.CollisionGroups.Environment,
            collisionFilterMask: CollisionGroups_1.CollisionGroups.Drones | CollisionGroups_1.CollisionGroups.Planes,
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
            shape: (_a = this.groundBody.shapes[0]) === null || _a === void 0 ? void 0 : _a.type
        });
        // Create ground mesh if we have a scene
        if (this.scene) {
            this.groundMesh = babylonjs_1.MeshBuilder.CreateGround("ground", {
                width: 200,
                height: 200,
                subdivisions: 1
            }, this.scene);
            const groundMaterial = new babylonjs_1.StandardMaterial("groundMaterial", this.scene);
            groundMaterial.diffuseColor = new babylonjs_1.Color3(0.3, 0.3, 0.3); // Grey color
            groundMaterial.specularColor = new babylonjs_1.Color3(0.1, 0.1, 0.1);
            groundMaterial.specularPower = 64;
            groundMaterial.ambientColor = new babylonjs_1.Color3(0.3, 0.3, 0.3); // Add ambient color
            this.groundMesh.material = groundMaterial;
            this.groundMesh.position.y = 0;
            this.groundMesh.checkCollisions = true;
            this.groundMesh.receiveShadows = true;
            // // Add collision shape to mesh
            // this.groundMesh.physicsImpostor = new PhysicsImpostor(
            //     this.groundMesh,
            //     PhysicsImpostor.BoxImpostor,
            //     { 
            //         mass: 0, 
            //         restitution: 0.3, 
            //         friction: 0.5
            //     },
            //     this.scene
            // );
            console.log('Ground mesh created:', {
                size: { width: 200, height: 200 },
                position: this.groundMesh.position,
                hasMaterial: !!this.groundMesh.material,
                hasPhysicsImpostor: !!this.groundMesh.physicsImpostor,
            });
        }
    }
    /**
     * Handles collision events between physics bodies.
     * Processes ground collisions and vehicle-vehicle collisions.
     * @param event - The collision event data
     */
    handleCollision(event) {
        var _a;
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        // Check if either body is the ground
        const isGroundCollision = bodyA === this.groundBody || bodyB === this.groundBody;
        const vehicleBody = isGroundCollision ?
            (bodyA === this.groundBody ? bodyB : bodyA) :
            null;
        console.log('Collision event:', event);
        if (isGroundCollision && vehicleBody) {
            const impactVelocity = (_a = event.target.contacts[0]) === null || _a === void 0 ? void 0 : _a.getImpactVelocityAlongNormal();
            console.log('Ground collision:', {
                vehicleId: vehicleBody.id,
                impactVelocity,
                vehiclePosition: vehicleBody.position,
                groundPosition: this.groundBody.position,
                vehicleVelocity: vehicleBody.velocity,
                contactPoint: event.target.contacts[0].ri
            });
            // Apply bounce and friction
            if (Math.abs(impactVelocity) > 5) {
                // Find the vehicle ID for this body
                for (const [id, body] of this.bodies.entries()) {
                    if (body === vehicleBody) {
                        const callback = this.collisionCallbacks.get(id);
                        if (callback) {
                            callback(event);
                        }
                        break;
                    }
                }
            }
        }
        else {
            // Handle vehicle-vehicle collisions
            for (const [id, body] of this.bodies.entries()) {
                if (body === bodyA || body === bodyB) {
                    const callback = this.collisionCallbacks.get(id);
                    if (callback) {
                        callback(event);
                    }
                }
            }
        }
    }
    /**
     * Registers a callback function for collision events for a specific body.
     * @param id - The ID of the body to register the callback for
     * @param callback - The function to call when a collision occurs
     */
    registerCollisionCallback(id, callback) {
        this.collisionCallbacks.set(id, callback);
    }
    /**
     * Removes a collision callback for a specific body.
     * @param id - The ID of the body to remove the callback for
     */
    unregisterCollisionCallback(id) {
        this.collisionCallbacks.delete(id);
    }
    /**
     * Gets the underlying CANNON.js physics world instance.
     * @returns The CANNON.js world instance
     */
    getWorld() {
        return this.world;
    }
    /**
     * Updates the physics simulation by one step.
     * @param deltaTime - The time step in seconds
     */
    update(fixedTimeStep, deltaTime, maxSubsteps) {
        const t0 = performance.now();
        this.world.step(fixedTimeStep, deltaTime, maxSubsteps);
        const t1 = performance.now();
        const cost = t1 - t0;
        this.currentTick++;
        stepCount++;
        const now = performance.now();
        if (now - lastStepLog > 1000) {
            console.log(`[Physics] Step count: ${stepCount} cost: ${cost.toFixed(2)} ms`);
            stepCount = 0;
            lastStepLog = now;
        }
    }
    /**
     * Gets the current simulation tick number.
     * @returns The current tick number
     */
    getCurrentTick() {
        return this.currentTick;
    }
    /**
     * Sets the physics state of a vehicle.
     * @param id - The ID of the body to set the state for
     * @param state - The new physics state to apply
     */
    setVehicleState(id, state) {
        const body = this.bodies.get(id);
        if (!body)
            return;
        body.position.set(state.position.x, state.position.y, state.position.z);
        body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        body.velocity.set(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
        body.angularVelocity.set(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
    }
    /**
     * Creates a new vehicle physics body.
     * @param id - The unique identifier for the vehicle
     * @param config - Configuration for the vehicle including type and physics properties
     * @returns The created CANNON.js body
     */
    createVehicle(id, config) {
        // Create vehicle body with proper collision filters
        const vehicleGroup = config.vehicleType === 'drone' ? CollisionGroups_1.CollisionGroups.Drones : CollisionGroups_1.CollisionGroups.Planes;
        const vehicleMask = CollisionGroups_1.collisionMasks[config.vehicleType === 'drone' ? 'Drone' : 'Plane'];
        console.log('Creating vehicle body:', {
            id,
            type: config.vehicleType,
            collisionGroup: vehicleGroup,
            collisionMask: vehicleMask,
            spawnPoint: { x: 0, y: 10, z: 0 }
        });
        const body = new CANNON.Body({
            mass: config.mass || 50,
            position: new CANNON.Vec3(0, 10, 0),
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.15, 0.5)),
            material: new CANNON.Material('vehicleMaterial'),
            collisionFilterGroup: vehicleGroup,
            collisionFilterMask: vehicleMask,
            fixedRotation: false,
            linearDamping: 0.5,
            angularDamping: 0.5,
            type: CANNON.Body.DYNAMIC
        });
        // Add collision event listeners for this vehicle
        body.addEventListener('collide', (event) => {
            const impactVelocity = event.target.contacts[0].getImpactVelocityAlongNormal();
            const isGroundCollision = event.body === this.groundBody;
            console.log(`Vehicle ${id} collision detected:`, {
                withBody: isGroundCollision ? 'ground' : 'other',
                impactVelocity,
                contactPoint: event.target.contacts[0].ri,
                vehiclePosition: body.position,
                vehicleVelocity: body.velocity
            });
            if (isGroundCollision) {
                // Calculate collision normal from contact points
                const normal = new CANNON.Vec3();
                normal.set(event.target.contacts[0].ri.x, event.target.contacts[0].ri.y, event.target.contacts[0].ri.z);
                normal.normalize();
                // Calculate reflection vector
                const dot = body.velocity.dot(normal);
                const reflection = body.velocity.vsub(normal.scale(2 * dot));
                // Apply collision response with damping
                body.velocity.copy(reflection.scale(0.5));
                // Add some random torque for visual effect
                const randomTorque = new CANNON.Vec3((Math.random() - 0.5) * impactVelocity, (Math.random() - 0.5) * impactVelocity, (Math.random() - 0.5) * impactVelocity);
                body.angularVelocity.vadd(randomTorque, body.angularVelocity);
            }
        });
        this.world.addBody(body);
        this.bodies.set(id, body);
        console.log('Vehicle body added to world:', {
            id,
            position: body.position,
            collisionGroup: body.collisionFilterGroup,
            collisionMask: body.collisionFilterMask,
            hasCollisionListener: true
        });
        return body;
    }
    /**
     * Handles vehicle-specific collision events.
     * @param id - The ID of the vehicle involved in the collision
     * @param event - The collision event data
     */
    handleVehicleCollision(id, event) {
        const body = this.bodies.get(id);
        if (!body)
            return;
        const impactVelocity = event.target.contacts[0].getImpactVelocityAlongNormal();
        if (Math.abs(impactVelocity) > 5) {
            // TODO: Emit collision event to game logic
            console.log(`Vehicle ${id} collision with velocity: ${impactVelocity}`);
        }
    }
    /**
     * Cleans up physics resources and removes all bodies.
     */
    cleanup() {
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
    }
    /**
     * Gets the ground physics body.
     * @returns The ground CANNON.js body
     */
    getGroundBody() {
        return this.groundBody;
    }
    /**
     * Gets the ground visual mesh.
     * @returns The ground Babylon.js mesh
     */
    getGroundMesh() {
        return this.groundMesh;
    }
    /**
     * Sets the current simulation tick number.
     * @param tick - The tick number to set
     */
    setCurrentTick(tick) {
        this.currentTick = tick;
    }
}
exports.PhysicsWorld = PhysicsWorld;
