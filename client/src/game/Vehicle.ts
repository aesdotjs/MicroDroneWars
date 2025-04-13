import { Vector3, Quaternion, ArcRotateCamera, Mesh, Scene, StandardMaterial, Color3 } from 'babylonjs';
import { PhysicsController } from './controllers/PhysicsController';
import { InputManager } from './InputManager';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
import { ClientPhysicsWorld } from './physics/ClientPhysicsWorld';

export class Vehicle {
    public id!: string;
    public mesh!: Mesh;
    public scene: Scene;
    public physics!: PhysicsController;
    public inputManager!: InputManager;
    public isLocalPlayer: boolean;
    public type: string;
    public team: number;
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
        mouseDelta: { x: 0, y: 0 }
    };
    public collisionSphere!: { position: Vector3; radius: number };
    public health: number = 100;
    public maxHealth: number = 100;

    constructor(scene: Scene, type: string, team: number, canvas: HTMLCanvasElement, isLocalPlayer: boolean = false) {
        this.scene = scene;
        this.type = type;
        this.team = team;
        this.isLocalPlayer = isLocalPlayer;
    }

    public initialize(scene: Scene, physicsWorld: ClientPhysicsWorld, inputManager?: InputManager): void {
        // Initialize physics
        this.physics = new PhysicsController(this, physicsWorld);

        // Set input manager if provided
        if (inputManager) {
            this.inputManager = inputManager;
        }

        // Initialize collision sphere
        this.collisionSphere = {
            position: this.mesh.position,
            radius: 2.0
        };
    }

    public takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.onDestroyed();
        }
    }

    protected onDestroyed(): void {
        // Override in subclasses for specific destruction behavior
        this.dispose();
    }

    public update(deltaTime: number): void {
        if (this.inputManager) {
            this.input = this.inputManager.getInput();
            // Log only if there's any active input
            // if (Object.values(this.input).some(value => 
            //     value === true || 
            //     (typeof value === 'object' && value.x !== 0 && value.y !== 0)
            // )) {
            //     console.log('Vehicle Update - Input received:', {
            //         id: this.id,
            //         type: this.type,
            //         isLocalPlayer: this.isLocalPlayer,
            //         input: this.input,
            //         hasPhysics: !!this.physics,
            //         hasMesh: !!this.mesh
            //     });
            // }
        }
        
        if (this.physics) {
            this.physics.update(deltaTime, this.input);
        } else {
            console.warn('Vehicle Update - No physics controller available:', {
                id: this.id,
                type: this.type
            });
        }
    }

    public updatePosition(position: any, quaternion: any, velocity: any, interpolate: boolean = true): void {
        if (!this.mesh) return;

        if (interpolate) {
            // Implement smooth interpolation here if needed
            this.mesh.position = new Vector3(position.x, position.y, position.z);
            this.mesh.rotationQuaternion = new Quaternion(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
            );
        } else {
            // Direct update
            this.mesh.position.set(position.x, position.y, position.z);
            if (!this.mesh.rotationQuaternion) {
                this.mesh.rotationQuaternion = new Quaternion();
            }
            this.mesh.rotationQuaternion.set(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
            );
        }

        if (this.physics) {
            this.physics.setState({
                position: new Vector3(position.x, position.y, position.z),
                quaternion: new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
                linearVelocity: new Vector3(velocity.x, velocity.y, velocity.z),
                angularVelocity: new Vector3(0, 0, 0) // You might want to pass this from the server as well
            });
        }
    }

    public updateCamera(camera: ArcRotateCamera): void {
        if (!this.mesh) return;
        
        const cameraTarget = this.mesh.position.clone();
        cameraTarget.y += 1; // Offset camera target slightly above vehicle
        
        camera.setTarget(cameraTarget);
        
        // Set camera position relative to vehicle
        const cameraOffset = new Vector3(0, 2, -5);
        cameraOffset.rotateByQuaternionToRef(this.mesh.rotationQuaternion!, cameraOffset);
        camera.position.copyFrom(this.mesh.position).addInPlace(cameraOffset);
    }

    public updateState(state: PhysicsState): void {
        if (!state) return;

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

    public dispose(): void {
        if (this.physics) {
            this.physics.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (this.inputManager) {
            this.inputManager.cleanup();
        }
    }
} 