import { Engine, Scene, Vector3, Quaternion, CannonJSPlugin } from 'babylonjs';
import * as CANNON from 'cannon';
import { PhysicsState } from '../types';
import { CollisionGroups, collisionMasks } from './CollisionGroups';

interface CollisionEvent {
    bodyA: CANNON.Body;
    bodyB: CANNON.Body;
    contact: {
        getImpactVelocityAlongNormal: () => number;
        getNormal: () => CANNON.Vec3;
    };
}

interface VehicleCollisionEvent {
    contact: {
        getImpactVelocityAlongNormal: () => number;
    };
}

export class PhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private world: CANNON.World;
    private bodies: Map<string, CANNON.Body> = new Map();
    private groundBody: CANNON.Body;
    private collisionCallbacks: Map<string, (event: CollisionEvent) => void> = new Map();

    constructor(engine: Engine, scene: Scene) {
        this.engine = engine;
        this.scene = scene;
        
        // Initialize physics engine
        this.initializePhysics();
        
        // Configure physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 7;
        
        // Create materials
        const groundMaterial = new CANNON.Material('groundMaterial');
        const vehicleMaterial = new CANNON.Material('vehicleMaterial');
        
        // Configure contact materials
        const groundVehicleContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            vehicleMaterial,
            {
                friction: 0.5,
                restitution: 0.7
            }
        );
        this.world.addContactMaterial(groundVehicleContactMaterial);
        this.world.defaultContactMaterial.friction = 0.5;
        this.world.defaultContactMaterial.restitution = 0.7;

        // Create ground plane
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0,
            material: groundMaterial,
            collisionFilterGroup: CollisionGroups.Environment,
            collisionFilterMask: CollisionGroups.Drones | CollisionGroups.Planes
        });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(this.groundBody);

        // Add collision event listeners
        this.world.addEventListener('beginContact', (event: CollisionEvent) => {
            this.handleCollision(event);
        });
    }

    private initializePhysics(): void {
        // Enable physics in the scene
        this.scene.gravity = new Vector3(0, -9.81, 0);
        this.scene.collisionsEnabled = true;
        
        // Initialize CannonJS plugin
        const plugin = new CannonJSPlugin(true, 10, CANNON);
        this.scene.enablePhysics(this.scene.gravity, plugin);
        
        console.log('Physics initialized:', {
            hasPhysics: this.scene.isPhysicsEnabled(),
            gravity: this.scene.gravity,
            collisionsEnabled: this.scene.collisionsEnabled
        });
    }

    private handleCollision(event: CollisionEvent): void {
        const bodyA = event.bodyA;
        const bodyB = event.bodyB;
        
        // Check if either body is the ground
        const isGroundCollision = bodyA === this.groundBody || bodyB === this.groundBody;
        const vehicleBody = isGroundCollision ? 
            (bodyA === this.groundBody ? bodyB : bodyA) : 
            null;

        if (isGroundCollision && vehicleBody) {
            const impactVelocity = event.contact.getImpactVelocityAlongNormal();
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
        } else {
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

    public registerCollisionCallback(id: string, callback: (event: CollisionEvent) => void): void {
        this.collisionCallbacks.set(id, callback);
    }

    public unregisterCollisionCallback(id: string): void {
        this.collisionCallbacks.delete(id);
    }

    public getWorld(): CANNON.World {
        return this.world;
    }

    public update(deltaTime: number) {
        this.world.step(Math.min(deltaTime, 1/60));
    }

    public createVehicle(id: string, config: any): CANNON.Body {
        const body = new CANNON.Body({
            mass: config.mass || 50,
            position: new CANNON.Vec3(0, 2, 0),
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.15, 0.5)),
            material: new CANNON.Material('vehicleMaterial'),
            collisionFilterGroup: config.vehicleType === 'drone' ? CollisionGroups.Drones : CollisionGroups.Planes,
            collisionFilterMask: collisionMasks[config.vehicleType === 'drone' ? 'Drone' : 'Plane']
        });

        // Add collision event listeners for this vehicle
        body.addEventListener('collide', (event: VehicleCollisionEvent) => {
            this.handleVehicleCollision(id, event);
        });

        this.world.addBody(body);
        this.bodies.set(id, body);
        return body;
    }

    private handleVehicleCollision(id: string, event: VehicleCollisionEvent): void {
        const body = this.bodies.get(id);
        if (!body) return;

        const impactVelocity = event.contact.getImpactVelocityAlongNormal();
        if (Math.abs(impactVelocity) > 5) {
            // TODO: Emit collision event to game logic
            console.log(`Vehicle ${id} collision with velocity: ${impactVelocity}`);
        }
    }

    public getVehicleState(id: string): PhysicsState | null {
        const body = this.bodies.get(id);
        if (!body) return null;

        return {
            position: new Vector3(body.position.x, body.position.y, body.position.z),
            quaternion: new Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
            linearVelocity: new Vector3(body.velocity.x, body.velocity.y, body.velocity.z),
            angularVelocity: new Vector3(body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z)
        };
    }

    public applyInput(id: string, input: any) {
        const body = this.bodies.get(id);
        if (!body) return;

        // Apply forces based on input
        const force = new CANNON.Vec3(
            input.forward ? 10 : input.backward ? -10 : 0,
            0,
            input.left ? -10 : input.right ? 10 : 0
        );
        
        // Apply force at the center of mass
        body.applyForce(force, body.position);
    }

    public cleanup(): void {
        // Remove all bodies
        this.bodies.forEach(body => {
            this.world.remove(body);
        });
        this.bodies.clear();
        
        // Remove ground body
        this.world.remove(this.groundBody);
    }
} 