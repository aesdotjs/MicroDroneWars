import { Vector3, Quaternion, ArcRotateCamera, Mesh, Scene, StandardMaterial, Color3 } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController';
import { InputManager } from './InputManager';
import { PhysicsState } from '@shared/physics/types';

export class Vehicle {
    public id!: string;
    public mesh!: Mesh;
    public scene: Scene;
    public physics!: PhysicsController;
    public inputManager!: InputManager;
    public isLocalPlayer: boolean;
    public type: string;
    public team: number;

    constructor(scene: Scene, type: string, team: number, canvas: HTMLCanvasElement, isLocalPlayer: boolean = false) {
        this.scene = scene;
        this.type = type;
        this.team = team;
        this.isLocalPlayer = isLocalPlayer;
        
        if (isLocalPlayer) {
            this.inputManager = new InputManager(canvas);
        }
    }

    public initialize(scene: Scene): void {
        // Create basic mesh for the vehicle
        this.mesh = Mesh.CreateBox("vehicle", 1, scene);
        
        // Set up material based on team
        const material = new StandardMaterial("vehicleMaterial", scene);
        material.diffuseColor = this.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        this.mesh.material = material;

        // Initialize physics
        this.physics = new PhysicsController(this);
    }

    public update(deltaTime: number): void {
        if (this.physics) {
            this.physics.update(deltaTime);
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
            this.physics.cleanup();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (this.inputManager) {
            this.inputManager.cleanup();
        }
    }
} 