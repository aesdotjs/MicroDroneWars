import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { PhysicsController } from './PhysicsController.js';

export class Drone extends Vehicle {
    constructor(scene, type, team, canvas) {
        super(scene, type, team, canvas);
        this.id = `drone_${Math.random().toString(36).substr(2, 9)}`;
        this.createMesh();
        this.initialize(scene);
        this.maxSpeed = 5; // Slower than planes
        this.acceleration = 0.2;
        this.turnRate = 0.05;
        this.maxHealth = 150; // More health than planes
        this.vehicleType = "drone";
        this.physics = new PhysicsController(this);
        console.log('Drone created with physics:', {
            id: this.id,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            hasPhysics: true
        });
    }

    createMesh() {
        // Create a box mesh for the drone
        this.mesh = MeshBuilder.CreateBox('drone', { 
            width: 1, 
            height: 0.5, 
            depth: 1 
        }, this.scene);
        
        // Create and apply material
        const material = new StandardMaterial('droneMaterial', this.scene);
        material.diffuseColor = this.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        this.mesh.material = material;
        
        // Set initial position and make sure it's visible
        this.mesh.position = new Vector3(0, 2, 0);
        this.mesh.isVisible = true;
        this.mesh.computeWorldMatrix(true);
        
        console.log('Drone mesh created:', {
            id: this.id,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            isVisible: this.mesh.isVisible
        });
    }

    update() {
        if (!this.mesh || !this.physics) return;
        
        // Process input and apply forces
        if (this.inputManager) {
            const input = this.inputManager.getInput();
            
            // Apply forces based on input
            if (input.forward) {
                this.physics.applyForce(new Vector3(0, 0, 1)); // Forward is positive Z
            }
            if (input.backward) {
                this.physics.applyForce(new Vector3(0, 0, -1)); // Backward is negative Z
            }
            if (input.left) {
                this.physics.applyForce(new Vector3(-1, 0, 0)); // Left is negative X
            }
            if (input.right) {
                this.physics.applyForce(new Vector3(1, 0, 0)); // Right is positive X
            }
            if (input.up) {
                this.physics.applyForce(new Vector3(0, 1, 0)); // Up is positive Y
            }
            if (input.down) {
                this.physics.applyForce(new Vector3(0, -1, 0)); // Down is negative Y
            }
        }
        
        // Update physics
        this.physics.update();
    }
}

// Define schema types
type("number")(Drone.prototype, "maxSpeed");
type("number")(Drone.prototype, "acceleration");
type("number")(Drone.prototype, "turnRate");
type("number")(Drone.prototype, "maxHealth");
type("string")(Drone.prototype, "vehicleType"); 