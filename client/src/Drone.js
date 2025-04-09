import { Schema, type } from "@colyseus/schema";
import { Vehicle } from "./Vehicle.js";
import { MeshBuilder, Vector3, StandardMaterial, Color3, MultiMaterial, Color4 } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController.js';
import { ParticleSystem, Texture, Matrix } from '@babylonjs/core';

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

        // Create a box mesh for the drone body
        this.mesh = MeshBuilder.CreateBox("droneBody", {
            width: 1,
            height: 0.3,
            depth: 1,
            faceColors: [
                new Color4(0, 1, 1, 1),    // Right face (Cyan)
                new Color4(1, 0, 1, 1),    // Left face (Magenta)
                new Color4(0, 1, 0, 1),    // Top face (Green)
                new Color4(1, 1, 0, 1),    // Bottom face (Yellow)
                new Color4(1, 0, 0, 1),    // Front face (Red)
                new Color4(0, 0, 1, 1)     // Back face (Blue)
            ]
        }, this.scene);

        // Create materials for each side
        const frontMaterial = new StandardMaterial("frontMaterial", this.scene);
        frontMaterial.diffuseColor = new Color3(1, 0, 0); // Red for front
        frontMaterial.emissiveColor = new Color3(0.2, 0, 0);
        frontMaterial.backFaceCulling = false;

        const backMaterial = new StandardMaterial("backMaterial", this.scene);
        backMaterial.diffuseColor = new Color3(0, 0, 1); // Blue for back
        backMaterial.emissiveColor = new Color3(0, 0, 0.2);
        backMaterial.backFaceCulling = false;

        const topMaterial = new StandardMaterial("topMaterial", this.scene);
        topMaterial.diffuseColor = new Color3(0, 1, 0); // Green for top
        topMaterial.emissiveColor = new Color3(0, 0.2, 0);
        topMaterial.backFaceCulling = false;

        const bottomMaterial = new StandardMaterial("bottomMaterial", this.scene);
        bottomMaterial.diffuseColor = new Color3(1, 1, 0); // Yellow for bottom
        bottomMaterial.emissiveColor = new Color3(0.2, 0.2, 0);
        bottomMaterial.backFaceCulling = false;

        const leftMaterial = new StandardMaterial("leftMaterial", this.scene);
        leftMaterial.diffuseColor = new Color3(1, 0, 1); // Magenta for left
        leftMaterial.emissiveColor = new Color3(0.2, 0, 0.2);
        leftMaterial.backFaceCulling = false;

        const rightMaterial = new StandardMaterial("rightMaterial", this.scene);
        rightMaterial.diffuseColor = new Color3(0, 1, 1); // Cyan for right
        rightMaterial.emissiveColor = new Color3(0, 0.2, 0.2);
        rightMaterial.backFaceCulling = false;

        // Create a multi-material
        const multiMaterial = new MultiMaterial("droneMultiMaterial", this.scene);
        multiMaterial.subMaterials = [
            rightMaterial,    // Right face
            leftMaterial,     // Left face
            topMaterial,      // Top face
            bottomMaterial,   // Bottom face
            frontMaterial,    // Front face
            backMaterial      // Back face
        ];

        // Apply the multi-material to the mesh
        this.mesh.material = multiMaterial;

        // Create propellers
        const propSize = 0.2;
        const propPositions = [
            new Vector3(-0.5, 0, 0.5),   // Front left
            new Vector3(0.5, 0, 0.5),    // Front right
            new Vector3(-0.5, 0, -0.5),  // Back left
            new Vector3(0.5, 0, -0.5)    // Back right
        ];

        const propMaterial = new StandardMaterial("propMaterial", this.scene);
        propMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        propMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
        propMaterial.backFaceCulling = false;

        this.propellers = propPositions.map((pos, i) => {
            const prop = MeshBuilder.CreateCylinder(`propeller${i}`, {
                height: 0.05,
                diameter: propSize,
                tessellation: 8
            }, this.scene);
            prop.position = pos;
            prop.material = propMaterial;
            prop.parent = this.mesh;
            return prop;
        });

        // Setup particle systems for each propeller
        this.setupThrusterParticles(this.scene);

        // Add a small arrow to indicate front
        const arrow = MeshBuilder.CreateCylinder("frontArrow", {
            height: 0.3,
            diameter: 0.05,
            tessellation: 8
        }, this.scene);
        arrow.position = new Vector3(0, 0.2, -0.5);
        arrow.rotation.x = Math.PI / 2;
        arrow.material = frontMaterial;
        arrow.parent = this.mesh;

        // Rotate the mesh 180 degrees around Y axis so the front faces the camera
        this.mesh.rotation.y = Math.PI;

        // Set initial position and make sure it's visible
        this.mesh.position = new Vector3(0, 5, 0); // Start higher up
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;

        return this.mesh;
    }

    setupThrusterParticles(scene) {
        if (!this.mesh) {
            console.error('Cannot setup particles: mesh is null');
            return;
        }

        // Create emitter meshes for each thruster
        const emitterPositions = [
            new Vector3(-0.5, 0, 0.5),   // Front left
            new Vector3(0.5, 0, 0.5),    // Front right
            new Vector3(-0.5, 0, -0.5),  // Back left
            new Vector3(0.5, 0, -0.5)    // Back right
        ];

        // Create four particle systems for each rotor
        this.rotorThrusters = {
            frontLeft: new ParticleSystem("frontLeftThruster", 5000, scene),
            frontRight: new ParticleSystem("frontRightThruster", 5000, scene),
            backLeft: new ParticleSystem("backLeftThruster", 5000, scene),
            backRight: new ParticleSystem("backRightThruster", 5000, scene)
        };

        // Create emitter meshes and configure particle systems
        Object.entries(this.rotorThrusters).forEach(([name, thruster], index) => {
            try {
                // Create a small invisible mesh for the emitter
                const emitterMesh = MeshBuilder.CreateBox(`emitter_${name}`, {
                    size: 0.01
                }, scene);
                emitterMesh.position = emitterPositions[index];
                emitterMesh.parent = this.mesh;
                emitterMesh.isVisible = false;

                // Try to load texture, fallback to solid color if fails
                try {
                    thruster.particleTexture = new Texture("assets/textures/flare.png", scene);
                } catch (textureError) {
                    console.warn(`Failed to load texture for ${name}, using solid color:`, textureError);
                    thruster.particleTexture = null;
                }

                // Basic particle configuration
                thruster.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
                thruster.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
                thruster.color1 = new Color4(1, 1, 1, 1);
                thruster.color2 = new Color4(1, 1, 1, 1);
                thruster.colorDead = new Color4(1, 1, 1, 0);
                thruster.minSize = 0.025;
                thruster.maxSize = 0.1;
                thruster.minLifeTime = 0.033;
                thruster.maxLifeTime = 0.083;
                thruster.emitRate = 500;
                thruster.blendMode = ParticleSystem.BLENDMODE_STANDARD;
                thruster.gravity = new Vector3(0, -1, 0);
                thruster.direction1 = new Vector3(0, -1, 0);
                thruster.direction2 = new Vector3(0, -1, 0);
                thruster.minEmitPower = 3;
                thruster.maxEmitPower = 5;
                thruster.updateSpeed = 0.01;
                
                // Set the emitter to the dedicated emitter mesh
                thruster.emitter = emitterMesh;
                
                // Start the particle system
                thruster.start();
            } catch (error) {
                console.error(`Error setting up particle system ${name}:`, error);
            }
        });
    }

    updateParticles() {
        if (!this.rotorThrusters || !this.mesh) {
            return;
        }

        try {
            // Update particle direction based on vehicle orientation
            const down = new Vector3(0, -1, 0);
            if (this.mesh.rotationQuaternion) {
                this.mesh.rotationQuaternion.toRotationMatrix(Matrix.Temp[0]);
                Vector3.TransformNormalToRef(down, Matrix.Temp[0], down);
            }

            // Set direction for all thrusters
            Object.entries(this.rotorThrusters).forEach(([name, thruster]) => {
                thruster.direction1 = down;
                thruster.direction2 = down;
                thruster.isVisible = true;
            });

            // Adjust emission rate based on thrust
            if (this.physics) {
                const speed = this.physics.velocity.length();
                const normalizedSpeed = Math.min(speed / this.physics.maxSpeed, 1);
                const baseEmitRate = 250;
                const maxEmitRate = 500;
                const emitRate = baseEmitRate + (maxEmitRate - baseEmitRate) * normalizedSpeed;
                
                Object.entries(this.rotorThrusters).forEach(([name, thruster]) => {
                    thruster.emitRate = emitRate;
                });
            }
        } catch (error) {
            console.error('Error updating particles:', error);
        }
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
                this.physics.applyYaw(-3);
            }
            if (input.right) {
                this.physics.applyYaw(3);
            }
            if (input.up) {
                this.physics.applyLift(1);
            }
            if (input.down) {
                this.physics.applyLift(-1);
            }
            
            // Apply IJKL controls for pitch and roll
            if (input.pitchUp) {
                this.physics.applyPitch(3);
            }
            if (input.pitchDown) {
                this.physics.applyPitch(-3);
            }
            if (input.rollLeft) {
                this.physics.applyRoll(-3);
            }
            if (input.rollRight) {
                this.physics.applyRoll(3);
            }
            
            // Apply mouse-based rotation
            if (mouseDelta.x !== 0) {
                this.physics.applyYaw(mouseDelta.x * 0.3);
            }
            if (mouseDelta.y !== 0) {
                this.physics.applyPitch(mouseDelta.y * 0.3);
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