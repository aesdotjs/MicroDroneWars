import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController.js';

export class Plane extends Vehicle {
    constructor(scene, type, team, canvas) {
        super(type, team, canvas);
        this.id = `plane_${Math.random().toString(36).substr(2, 9)}`;
        this.createMesh();
        this.initialize(scene);
        this.maxHealth = 100; // Less health than drones
        this.vehicleType = "plane";
        this.physics = new PhysicsController(this);
        console.log('Plane created with physics:', {
            id: this.id,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            hasPhysics: true
        });
    }

    createMesh() {
        // Create a more plane-like mesh
        this.mesh = MeshBuilder.CreateBox('plane', { 
            width: 2, 
            height: 0.2, 
            depth: 3 
        }, this.scene);
        
        // Create and apply material
        const material = new StandardMaterial('planeMaterial', this.scene);
        material.diffuseColor = this.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        this.mesh.material = material;
        
        // Set initial position and make sure it's visible
        this.mesh.position = new Vector3(0, 2, 0);
        this.mesh.isVisible = true;
        this.mesh.computeWorldMatrix(true);
        
        console.log('Plane mesh created:', {
            id: this.id,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            isVisible: this.mesh.isVisible
        });
    }
}

// Define schema types
type("number")(Plane.prototype, "maxSpeed");
type("number")(Plane.prototype, "acceleration");
type("number")(Plane.prototype, "turnRate");
type("number")(Plane.prototype, "maxHealth");
type("string")(Plane.prototype, "vehicleType"); 