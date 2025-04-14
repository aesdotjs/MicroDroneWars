import { Engine, Scene, Vector3, Mesh, Quaternion, CannonJSPlugin, MeshBuilder, StandardMaterial, Color3 } from 'babylonjs';
import * as CANNON from 'cannon';
import { CollisionGroups, collisionMasks } from './CollisionGroups';
import { CollisionEvent, VehicleCollisionEvent, PhysicsState, PhysicsConfig } from './types';
import { PhysicsImpostor } from 'babylonjs';

export class PhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private world: CANNON.World;
    private bodies: Map<string, CANNON.Body> = new Map();
    private groundBody!: CANNON.Body;
    private groundMesh!: Mesh;
    private collisionCallbacks: Map<string, (event: CollisionEvent) => void> = new Map();
    private fixedTimeStep: number;
    private maxSubSteps: number;
    private currentTick: number = 0;
    private lastUpdateTime: number = 0;
    private accumulator: number = 0;

    constructor(engine: Engine, scene: Scene, config: PhysicsConfig) {
        this.engine = engine;
        this.scene = scene;
        this.fixedTimeStep = config.fixedTimeStep;
        this.maxSubSteps = config.maxSubSteps;
        
        // Initialize physics engine
        this.initializePhysics();
        
        // Configure physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -config.gravity, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
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

        // Create ground
        this.createGround(groundMaterial);
        
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

            // Add collision shape to mesh
            this.groundMesh.physicsImpostor = new PhysicsImpostor(
                this.groundMesh,
                PhysicsImpostor.BoxImpostor,
                { 
                    mass: 0, 
                    restitution: 0.3, 
                    friction: 0.5
                },
                this.scene
            );

            console.log('Ground mesh created:', {
                size: { width: 200, height: 200 },
                position: this.groundMesh.position,
                hasMaterial: !!this.groundMesh.material,
                hasPhysicsImpostor: !!this.groundMesh.physicsImpostor,
                physicsImpostorType: this.groundMesh.physicsImpostor?.type
            });
        }
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
            console.log('Ground collision:', {
                vehicleId: vehicleBody.id,
                impactVelocity,
                vehiclePosition: vehicleBody.position,
                groundPosition: this.groundBody.position,
                vehicleVelocity: vehicleBody.velocity,
                contactPoint: event.contact.ri
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

    public update(deltaTime: number): void {
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        // Add frame time to accumulator
        this.accumulator += frameTime;

        // Perform fixed timestep updates with a maximum of 3 steps per frame
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < 3) {
            this.world.step(this.fixedTimeStep);
            this.currentTick++;
            this.accumulator -= this.fixedTimeStep;
            steps++;
        }

        // If we have leftover time, carry it over to next frame
        if (this.accumulator > this.fixedTimeStep * 3) {
            this.accumulator = this.fixedTimeStep * 3;
        }
    }

    public getCurrentTick(): number {
        return this.currentTick;
    }

    public getState(id: string): PhysicsState | null {
        const body = this.bodies.get(id);
        if (!body) return null;

        return {
            position: new Vector3(body.position.x, body.position.y, body.position.z),
            quaternion: new Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
            linearVelocity: new Vector3(body.velocity.x, body.velocity.y, body.velocity.z),
            angularVelocity: new Vector3(body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z),
            timestamp: performance.now(),
            tick: this.currentTick
        };
    }

    public setState(id: string, state: PhysicsState): void {
        const body = this.bodies.get(id);
        if (!body) return;

        body.position.set(state.position.x, state.position.y, state.position.z);
        body.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
        body.velocity.set(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
        body.angularVelocity.set(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
    }

    public createVehicle(id: string, config: any): CANNON.Body {
        // Get spawn point based on team
        const spawnPoint = this.getTeamSpawnPoint(config.team);
        
        // Create vehicle body with proper collision filters
        const vehicleGroup = config.vehicleType === 'drone' ? CollisionGroups.Drones : CollisionGroups.Planes;
        const vehicleMask = collisionMasks[config.vehicleType === 'drone' ? 'Drone' : 'Plane'];
        
        console.log('Creating vehicle body:', {
            id,
            type: config.vehicleType,
            collisionGroup: vehicleGroup,
            collisionMask: vehicleMask,
            spawnPoint
        });

        const body = new CANNON.Body({
            mass: config.mass || 50,
            position: new CANNON.Vec3(spawnPoint.x, spawnPoint.y, spawnPoint.z),
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
        body.addEventListener('collide', (event: VehicleCollisionEvent) => {
            const impactVelocity = event.contact.getImpactVelocityAlongNormal();
            const isGroundCollision = event.body === this.groundBody;
            
            console.log(`Vehicle ${id} collision detected:`, {
                withBody: isGroundCollision ? 'ground' : 'other',
                impactVelocity,
                contactPoint: event.contact.ri,
                vehiclePosition: body.position,
                vehicleVelocity: body.velocity
            });

            if (isGroundCollision) {
                // Calculate collision normal from contact points
                const normal = new CANNON.Vec3();
                normal.copy(event.contact.ri);
                normal.normalize();
                
                // Calculate reflection vector
                const dot = body.velocity.dot(normal);
                const reflection = body.velocity.vsub(normal.scale(2 * dot));
                
                // Apply collision response with damping
                body.velocity.copy(reflection.scale(0.5));
                
                // Add some random torque for visual effect
                const randomTorque = new CANNON.Vec3(
                    (Math.random() - 0.5) * impactVelocity,
                    (Math.random() - 0.5) * impactVelocity,
                    (Math.random() - 0.5) * impactVelocity
                );
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

    private getTeamSpawnPoint(team: number): { x: number, y: number, z: number } {
        return team === 0 
            ? { x: -20, y: 10, z: 0 }  // Team A spawn, higher up
            : { x: 20, y: 10, z: 0 };  // Team B spawn, higher up
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
            angularVelocity: new Vector3(body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z),
            timestamp: performance.now(),
            tick: this.currentTick
        };
    }

    public cleanup(): void {
        // Remove all bodies
        this.bodies.forEach(body => {
            this.world.remove(body);
        });
        this.bodies.clear();
        
        // Remove ground body
        this.world.remove(this.groundBody);

        // Dispose of ground mesh if we have a scene
        if (this.scene && this.groundMesh) {
            this.groundMesh.dispose();
        }
    }

    public getGroundBody(): CANNON.Body {
        return this.groundBody;
    }

    public getGroundMesh(): any {
        return this.groundMesh;
    }
} 