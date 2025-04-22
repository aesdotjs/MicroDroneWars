import { Vehicle } from "./Vehicle";
import { MeshBuilder, Vector3, StandardMaterial, Color3, MultiMaterial, Color4, Quaternion, Scene, Mesh, ParticleSystem, Texture, Matrix } from 'babylonjs';
import { InputManager } from '../InputManager';
import { Vehicle as VehicleSchema } from '../schemas';

/**
 * Represents a drone vehicle in the game.
 * Handles drone-specific physics, rendering, and particle effects.
 * Extends the base Vehicle class with drone-specific functionality.
 */
export class Drone extends Vehicle {
    /** Maximum speed of the drone in m/s */
    public maxSpeed: number = 5;
    /** Acceleration rate of the drone in m/s² */
    public acceleration: number = 0.2;
    /** Turn rate of the drone in rad/s */
    public turnRate: number = 0.05;
    /** Maximum health points of the drone */
    public maxHealth: number = 150;
    /** Type identifier for the vehicle */
    public vehicleType: string = "drone";
    /** Array of propeller meshes */
    private propellers: Mesh[] = [];
    /** Particle systems for thruster effects */
    private rotorThrusters!: {
        frontLeft: ParticleSystem;
        frontRight: ParticleSystem;
        backLeft: ParticleSystem;
        backRight: ParticleSystem;
    };

    /**
     * Creates a new Drone instance.
     * @param scene - The Babylon.js scene to add the drone to
     * @param type - The type of vehicle ('drone' or 'plane')
     * @param vehicle - The vehicle schema containing initial state
     * @param inputManager - Optional input manager for controlling the drone
     * @param isLocalPlayer - Whether this drone is controlled by the local player
     */
    constructor(id: string, scene: Scene, type: 'drone' | 'plane', vehicle: VehicleSchema,  inputManager?: InputManager, isLocalPlayer: boolean = false) {
        super(id, scene, type, vehicle, inputManager, isLocalPlayer);
        this.maxHealth = 150;
        this.health = 150;
        
        // Create mesh first
        this.createMesh();
        
        console.log('Drone created:', {
            id: this.id,
            position: this.mesh?.position.toString(),
            rotation: this.mesh?.rotation.toString(),
            hasScene: !!this.scene,
            isVisible: this.mesh?.isVisible
        });
    }

    /**
     * Creates the 3D mesh for the drone.
     * Sets up the main body, propellers, and materials.
     * @throws Error if scene is not available
     */
    private createMesh(): void {
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
        frontMaterial.diffuseColor = new Color3(1, 0, 0);
        frontMaterial.emissiveColor = new Color3(0.2, 0, 0);
        frontMaterial.backFaceCulling = false;

        const backMaterial = new StandardMaterial("backMaterial", this.scene);
        backMaterial.diffuseColor = new Color3(0, 0, 1);
        backMaterial.emissiveColor = new Color3(0, 0, 0.2);
        backMaterial.backFaceCulling = false;

        const topMaterial = new StandardMaterial("topMaterial", this.scene);
        topMaterial.diffuseColor = new Color3(0, 1, 0);
        topMaterial.emissiveColor = new Color3(0, 0.2, 0);
        topMaterial.backFaceCulling = false;

        const bottomMaterial = new StandardMaterial("bottomMaterial", this.scene);
        bottomMaterial.diffuseColor = new Color3(1, 1, 0);
        bottomMaterial.emissiveColor = new Color3(0.2, 0.2, 0);
        bottomMaterial.backFaceCulling = false;

        const leftMaterial = new StandardMaterial("leftMaterial", this.scene);
        leftMaterial.diffuseColor = new Color3(1, 0, 1);
        leftMaterial.emissiveColor = new Color3(0.2, 0, 0.2);
        leftMaterial.backFaceCulling = false;

        const rightMaterial = new StandardMaterial("rightMaterial", this.scene);
        rightMaterial.diffuseColor = new Color3(0, 1, 1);
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
        arrow.position = new Vector3(0, 0.2, 0.5);
        arrow.rotation.x = Math.PI / 2;
        arrow.material = frontMaterial;
        arrow.parent = this.mesh;

        // Set initial position and make sure it's visible
        this.mesh.position = new Vector3(0, 10, 0);
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;
        this.mesh.receiveShadows = true;

        // Make all child meshes cast shadows
        this.propellers.forEach(prop => {
            prop.receiveShadows = true;
        });

        // Initialize rotation quaternion
        this.mesh.rotationQuaternion = new Quaternion();
    }

    /**
     * Sets up particle systems for thruster effects.
     * Creates particle emitters for each propeller.
     * @param scene - The Babylon.js scene to add the particles to
     * @throws Error if mesh is not available
     */
    private setupThrusterParticles(scene: Scene): void {
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
                    thruster.particleTexture = new Texture("/assets/textures/flare.png", scene);
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

    /**
     * Updates particle effects based on vehicle movement.
     * Adjusts particle direction and emission rate based on input.
     */
    private updateParticles(): void {
        if (!this.rotorThrusters || !this.mesh) {
            return;
        }

        try {
            // Update particle direction based on vehicle orientation
            const down = new Vector3(0, -1, 0);
            if (this.mesh.rotationQuaternion) {
                const rotationMatrix = new Matrix();
                this.mesh.rotationQuaternion.toRotationMatrix(rotationMatrix);
                Vector3.TransformNormalToRef(down, rotationMatrix, down);
            }

            // Set direction for all thrusters
            Object.entries(this.rotorThrusters).forEach(([name, thruster]) => {
                thruster.direction1 = down;
                thruster.direction2 = down;
                thruster.start();
            });

            // Adjust emission rate based on input
            const input = this.inputManager?.getInput() || {
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

            // Calculate thrust based on input
            const thrust = (input.forward ? 1 : 0) + (input.up ? 1 : 0);
            const baseEmitRate = 250;
            const maxEmitRate = 500;
            const emitRate = baseEmitRate + (maxEmitRate - baseEmitRate) * thrust;
            
            Object.entries(this.rotorThrusters).forEach(([name, thruster]) => {
                thruster.emitRate = emitRate;
            });
        } catch (error) {
            console.error('Error updating particles:', error);
        }
    }

    /**
     * Updates the drone's state.
     * Handles particle effects and physics updates.
     * @param deltaTime - Time elapsed since last update in seconds
     */
    public update(deltaTime: number = 1/60): void {
        if (!this.mesh) return;
        
        // Update particle effects
        this.updateParticles();
    }

    /**
     * Cleans up resources when the drone is destroyed or removed.
     * Disposes of particle systems, propellers, and other meshes.
     */
    public override dispose(): void {
        // Clean up particle systems
        if (this.rotorThrusters) {
            Object.values(this.rotorThrusters).forEach(thruster => {
                thruster.dispose();
            });
        }

        // Clean up propellers
        if (this.propellers) {
            this.propellers.forEach(prop => {
                prop.dispose();
            });
        }

        // Call parent dispose
        super.dispose();
    }
}