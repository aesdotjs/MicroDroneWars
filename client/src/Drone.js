import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController.js';

export class Drone extends Vehicle {
    constructor(scene, type, team, canvas) {
        super(type, team, canvas);
        this.scene = scene; // Store the scene reference
        this.id = `drone_${Math.random().toString(36).substr(2, 9)}`;
        this.maxHealth = 150; // More health than planes
        this.vehicleType = "drone";
        
        // Create mesh first
        this.createMesh();
        
        // Initialize physics after mesh is created
        this.physics = new PhysicsController(this);
        
        // Initialize vehicle last
        this.initialize(scene);
        
        console.log('Drone created:', {
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
            console.error('Cannot create drone mesh: scene is null');
            return;
        }

        // Create a more drone-like mesh
        this.mesh = MeshBuilder.CreateBox('drone', { 
            width: 1, 
            height: 0.3, 
            depth: 1 
        }, this.scene);
        
        // Create and apply material
        const material = new StandardMaterial('droneMaterial', this.scene);
        material.diffuseColor = this.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        material.specularColor = new Color3(0.5, 0.5, 0.5);
        material.emissiveColor = new Color3(0.2, 0.2, 0.2);
        this.mesh.material = material;
        
        // Set initial position and make sure it's visible
        this.mesh.position = new Vector3(0, 5, 0); // Start higher up
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;
        
        console.log('Drone mesh created:', {
            id: this.id,
            position: this.mesh.position.toString(),
            rotation: this.mesh.rotation.toString(),
            isVisible: this.mesh.isVisible,
            hasMaterial: !!this.mesh.material
        });
    }

    update(deltaTime = 1/60) {
        if (!this.mesh || !this.physics || !this.isAlive) return;
        
        // Process input and apply forces
        if (this.inputManager) {
            const input = this.inputManager.keys;
            const mouseDelta = this.inputManager.mouseDelta;
            
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
            
            // Apply IJKL controls for pitch and roll
            if (input.pitchUp) {
                this.physics.applyPitch(1);
            }
            if (input.pitchDown) {
                this.physics.applyPitch(-1);
            }
            if (input.rollLeft) {
                this.physics.applyRoll(-1);
            }
            if (input.rollRight) {
                this.physics.applyRoll(1);
            }
            
            // Apply mouse-based rotation
            if (mouseDelta.x !== 0) {
                this.physics.applyYaw(mouseDelta.x * 0.1);
            }
            if (mouseDelta.y !== 0) {
                this.physics.applyPitch(mouseDelta.y * 0.1);
            }
            
            // Reset mouse delta
            this.inputManager.resetMouseDelta();
        }
        
        // Update physics
        this.physics.update(deltaTime);
    }
}

// Define schema types
type("number")(Drone.prototype, "maxSpeed");
type("number")(Drone.prototype, "acceleration");
type("number")(Drone.prototype, "turnRate");
type("number")(Drone.prototype, "maxHealth");
type("string")(Drone.prototype, "vehicleType"); 