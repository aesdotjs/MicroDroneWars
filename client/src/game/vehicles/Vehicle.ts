import { Vector3, Quaternion, Mesh, Scene } from 'babylonjs';
import { InputManager } from '../InputManager';
import { PhysicsState, PhysicsInput } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';

export abstract class Vehicle {
    public id: string;
    public type: 'drone' | 'plane';
    public team: number;
    public mesh: Mesh | null = null;
    public isLocalPlayer: boolean = false;
    protected scene: Scene;
    protected canvas: HTMLCanvasElement;
    protected inputManager?: InputManager;
    protected physicsController?: BasePhysicsController;
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
    public collisionSphere!: { position: Vector3; radius: number };
    public health: number = 100;
    public maxHealth: number = 100;

    constructor(scene: Scene, type: 'drone' | 'plane', team: number, canvas: HTMLCanvasElement, inputManager?: InputManager, isLocalPlayer: boolean = false) {
        this.scene = scene;
        this.type = type;
        this.team = team;
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

    public setPhysicsController(controller: BasePhysicsController): void {
        this.physicsController = controller;
        // Set initial state from mesh if it exists
        if (this.mesh) {
            this.physicsController.setState({
                position: this.mesh.position,
                quaternion: this.mesh.rotationQuaternion || new Quaternion(),
                linearVelocity: new Vector3(0, 0, 0),
                angularVelocity: new Vector3(0, 0, 0),
                timestamp: performance.now(),
                tick: 0
            });
        }
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
        if (this.isLocalPlayer && this.inputManager) {
            this.input = this.inputManager.getInput();
        }
    }

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