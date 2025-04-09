import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController.js';

export class Drone extends Vehicle {
    constructor(scene, type, team, canvas) {
        super(type, team, canvas);
        this.id = `drone_${Math.random().toString(36).substr(2, 9)}`;
        this.createMesh();
        this.initialize(scene);
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
        // Create a more drone-like mesh
        this.mesh = MeshBuilder.CreateBox('drone', { 
            width: 1, 
            height: 0.3, 
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
                this.physics.applyThrust(1);
            }
            if (input.backward) {
                this.physics.applyThrust(-1);
            }
            if (input.left) {
                this.physics.applyYaw(-1);
            }
            if (input.right) {
                this.physics.applyYaw(1);
            }
            if (input.up) {
                this.physics.applyLift(1);
            }
            if (input.down) {
                this.physics.applyLift(-1);
            }
        }
        
        // Update physics
        this.physics.update(1/60); // Assuming 60 FPS
    }
}

// Define schema types
type("number")(Drone.prototype, "maxSpeed");
type("number")(Drone.prototype, "acceleration");
type("number")(Drone.prototype, "turnRate");
type("number")(Drone.prototype, "maxHealth");
type("string")(Drone.prototype, "vehicleType"); 