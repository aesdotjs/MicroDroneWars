import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3, Quaternion } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController.js';

export class Plane extends Vehicle {
    constructor(scene, type, team, canvas) {
        super(type, team, canvas);
        this.scene = scene;
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

    createMesh() {
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
            width: 0.1,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.leftWing.position = new Vector3(-0.95, 0, 0);
        this.leftWing.rotation.y = Math.PI / 2;
        this.leftWing.material = wingMaterial;
        this.leftWing.parent = this.mesh;

        // Right wing
        this.rightWing = MeshBuilder.CreateBox('rightWing', {
            width: 0.1,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.rightWing.position = new Vector3(0.95, 0, 0);
        this.rightWing.rotation.y = Math.PI / 2;
        this.rightWing.material = wingMaterial;
        this.rightWing.parent = this.mesh;

        // Tail
        this.tail = MeshBuilder.CreateBox('tail', {
            width: 0.1,
            height: 0.1,
            depth: 0.5
        }, this.scene);
        this.tail.position = new Vector3(0, 0, 1);
        this.tail.material = wingMaterial;
        this.tail.parent = this.mesh;

        // Set initial position before physics
        this.mesh.position = new Vector3(0, 5, 0);

        // Make sure it's visible
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;

        return this.mesh;
    }

    update(deltaTime = 1/60) {
        if (!this.mesh || !this.physics || !this.isAlive) return;
        
        // Update physics
        this.physics.update(deltaTime);

        // Update control surfaces
        if (this.leftWing && this.rightWing && this.tail) {
            const rollAmount = this.physics.aileronSimulator.position;
            const pitchAmount = this.physics.elevatorSimulator.position;
            const yawAmount = this.physics.rudderSimulator.position;

            // Update wing angles for roll
            this.leftWing.rotation.z = rollAmount;
            this.rightWing.rotation.z = -rollAmount;

            // Update tail angle for pitch
            this.tail.rotation.x = pitchAmount;

            // Update tail angle for yaw
            this.tail.rotation.y = yawAmount;
        }
    }
}

// Define schema types
type("number")(Plane.prototype, "maxSpeed");
type("number")(Plane.prototype, "acceleration");
type("number")(Plane.prototype, "turnRate");
type("number")(Plane.prototype, "maxHealth");
type("string")(Plane.prototype, "vehicleType"); 