import { Engine, Scene, Vector3, Quaternion } from 'babylonjs';
import * as CANNON from 'cannon';
import { PhysicsState } from '../types';

export class PhysicsWorld {
    private engine: Engine;
    private scene: Scene;
    private world: CANNON.World;
    private bodies: Map<string, CANNON.Body> = new Map();

    constructor(engine: Engine) {
        this.engine = engine;
        this.scene = new Scene(engine);
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 7;
        this.world.defaultContactMaterial.friction = 0.5;

        // Create ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: new CANNON.Material('groundMaterial')
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
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
            material: new CANNON.Material('vehicleMaterial')
        });

        this.world.addBody(body);
        this.bodies.set(id, body);
        return body;
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
        // This will be implemented in the VehiclePhysics class
    }
} 