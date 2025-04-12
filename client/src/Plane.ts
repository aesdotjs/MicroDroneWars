import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle";
import { MeshBuilder, Vector3, StandardMaterial, Color3, Quaternion, Scene, Mesh } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController';

export class Plane extends Vehicle {
    public maxSpeed: number;
    public acceleration: number;
    public turnRate: number;
    public maxHealth: number;
    public vehicleType: string;
    private leftWing: Mesh;
    private rightWing: Mesh;
    private tail: Mesh;

    constructor(scene: Scene, type: string, team: number, canvas: HTMLCanvasElement, isLocalPlayer: boolean = false) {
        super(scene, type, team, canvas, isLocalPlayer);
        this.id = `plane_${Math.random().toString(36).substr(2, 9)}`;
        this.maxHealth = 100;
        this.vehicleType = "plane";
        
        // Create mesh first
        this.createMesh();
        
        // Initialize physics after position is set
        this.physics = new PhysicsController(this);
        
        // Initialize vehicle
        this.initialize(scene);
        
        console.log('Plane created:', {
            id: this.id,
            position: this.mesh?.position.toString(),
            rotation: this.mesh?.rotation.toString(),
            hasPhysics: !!this.physics,
            hasScene: !!this.scene,
            isVisible: this.mesh?.isVisible
        });
    }

    private createMesh(): void {
        if (!this.scene) {
            console.error('Cannot create plane mesh: scene is null');
            return;
        }

        // Create a more plane-like mesh
        this.mesh = MeshBuilder.CreateBox('plane', { 
            width: 0.3, 
            height: 0.3, 
            depth: 1 
        }, this.scene);
        
        // Create and apply material
        const material = new StandardMaterial('planeMaterial', this.scene);
        material.diffuseColor = this.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        material.emissiveColor = this.team === 0 ? new Color3(0.2, 0, 0) : new Color3(0, 0, 0.2);
        this.mesh.material = material;
        
        // Create wings
        const wingMaterial = new StandardMaterial('wingMaterial', this.scene);
        wingMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        wingMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);

        // Left wing
        this.leftWing = MeshBuilder.CreateBox('leftWing', {
            width: 0.3,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.leftWing.position = new Vector3(-0.90, 0, 0);
        this.leftWing.rotation.y = Math.PI / 2;
        this.leftWing.material = wingMaterial;
        this.leftWing.parent = this.mesh;

        // Right wing
        this.rightWing = MeshBuilder.CreateBox('rightWing', {
            width: 0.3,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.rightWing.position = new Vector3(0.90, 0, 0);
        this.rightWing.rotation.y = Math.PI / 2;
        this.rightWing.material = wingMaterial;
        this.rightWing.parent = this.mesh;

        // Tail
        this.tail = MeshBuilder.CreateBox('tail', {
            width: 0.1,
            height: 0.1,
            depth: 0.5
        }, this.scene);
        this.tail.position = new Vector3(0, 0, -1);
        this.tail.material = wingMaterial;
        this.tail.parent = this.mesh;

        // Set initial position before physics
        this.mesh.position = new Vector3(0, 50, 0);

        // Initialize rotation quaternion
        this.mesh.rotationQuaternion = new Quaternion();

        // Make sure it's visible
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;
    }

    public update(deltaTime: number = 1/60): void {
        if (!this.mesh || !this.physics) return;
        
        // Update physics
        this.physics.update(deltaTime);

        // Update control surfaces
        if (this.leftWing && this.rightWing && this.tail) {
            const rollAmount = this.physics.getAileronPosition();
            const pitchAmount = this.physics.getElevatorPosition();
            const yawAmount = this.physics.getRudderPosition();

            // Update wing angles for roll
            this.leftWing.rotation.z = rollAmount;
            this.rightWing.rotation.z = -rollAmount;
            
            // Update tail angle for pitch
            this.tail.rotation.x = pitchAmount;

            // Update tail angle for yaw
            this.tail.rotation.y = yawAmount;
        }
    }

    public override dispose(): void {
        // Clean up control surfaces
        if (this.leftWing) {
            this.leftWing.dispose();
        }
        if (this.rightWing) {
            this.rightWing.dispose();
        }
        if (this.tail) {
            this.tail.dispose();
        }

        // Call parent dispose
        super.dispose();
    }
}

// Define schema types for Colyseus
type("number")(Plane.prototype, "maxSpeed");
type("number")(Plane.prototype, "acceleration");
type("number")(Plane.prototype, "turnRate");
type("number")(Plane.prototype, "maxHealth");
type("string")(Plane.prototype, "vehicleType"); 