import { Vehicle } from "./Vehicle";
import { MeshBuilder, Vector3, StandardMaterial, Color3, MultiMaterial, Color4, Quaternion, Scene, Mesh, ParticleSystem } from 'babylonjs';
import { InputManager } from '../InputManager';
import { Vehicle as VehicleSchema } from '../schemas/Vehicle';

/**
 * Represents a plane vehicle in the game.
 * Handles plane-specific physics, rendering, and control surface animations.
 * Extends the base Vehicle class with plane-specific functionality.
 */
export class Plane extends Vehicle {
    /** Maximum speed of the plane in m/s */
    public maxSpeed: number = 8;
    /** Acceleration rate of the plane in m/s² */
    public acceleration: number = 0.15;
    /** Turn rate of the plane in rad/s */
    public turnRate: number = 0.03;
    /** Maximum health points of the plane */
    public maxHealth: number = 200;
    /** Type identifier for the vehicle */
    public vehicleType: string = "plane";
    /** Left wing mesh */
    private leftWing!: Mesh;
    /** Right wing mesh */
    private rightWing!: Mesh;
    /** Tail mesh */
    private tail!: Mesh;
    /** Particle systems for engine thruster effects */
    private engineThrusters!: {
        left: ParticleSystem;
        right: ParticleSystem;
    };

    /**
     * Creates a new Plane instance.
     * @param id - The unique identifier for the plane
     * @param scene - The Babylon.js scene to add the plane to
     * @param type - The type of vehicle ('drone' or 'plane')
     * @param vehicle - The vehicle schema containing initial state
     * @param inputManager - Optional input manager for controlling the plane
     * @param isLocalPlayer - Whether this plane is controlled by the local player
     */
    constructor(id: string, scene: Scene, type: 'drone' | 'plane', vehicle: VehicleSchema, inputManager?: InputManager, isLocalPlayer: boolean = false) {
        super(id, scene, type, vehicle, inputManager, isLocalPlayer);
        this.maxHealth = 200;
        this.health = 200;
        
        // Create mesh first
        this.createMesh();
        
        console.log('Plane created:', {
            id: this.id,
            position: this.mesh?.position.toString(),
            rotation: this.mesh?.rotation.toString(),
            hasScene: !!this.scene,
            isVisible: this.mesh?.isVisible
        });
    }

    /**
     * Creates the 3D mesh for the plane.
     * Sets up the main fuselage, wings, tail, and materials.
     * @throws Error if scene is not available
     */
    private createMesh(): void {
        if (!this.scene) {
            console.error('Cannot create plane mesh: scene is null');
            return;
        }

        // Create main fuselage with multi-colored faces
        this.mesh = MeshBuilder.CreateBox('plane', { 
            width: 0.3, 
            height: 0.3, 
            depth: 1,
            faceColors: [
                new Color4(0.5, 0.5, 0.5, 1),    // Right face
                new Color4(0.5, 0.5, 0.5, 1),    // Left face
                new Color4(0.5, 0.5, 0.5, 1),    // Top face
                new Color4(0.5, 0.5, 0.5, 1),    // Bottom face
                new Color4(1, 0, 0, 1),          // Front face (Red)
                new Color4(0, 0, 1, 1)           // Back face (Blue)
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

        const bodyMaterial = new StandardMaterial("bodyMaterial", this.scene);
        bodyMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        bodyMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
        bodyMaterial.backFaceCulling = false;

        // Create a multi-material
        const multiMaterial = new MultiMaterial("planeMultiMaterial", this.scene);
        multiMaterial.subMaterials = [
            bodyMaterial, // Right
            bodyMaterial, // Left
            bodyMaterial, // Top
            bodyMaterial, // Bottom
            frontMaterial, // Front
            backMaterial  // Back
        ];

        this.mesh.material = multiMaterial;

        // Create wings
        const wingMaterial = new StandardMaterial("wingMaterial", this.scene);
        wingMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        wingMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);

        // Left wing
        this.leftWing = MeshBuilder.CreateBox("leftWing", {
            width: 0.3,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.leftWing.position = new Vector3(-0.90, 0, 0);
        this.leftWing.rotation.y = Math.PI / 2;
        this.leftWing.material = wingMaterial;
        this.leftWing.parent = this.mesh;

        // Right wing
        this.rightWing = MeshBuilder.CreateBox("rightWing", {
            width: 0.3,
            height: 0.1,
            depth: 1.5
        }, this.scene);
        this.rightWing.position = new Vector3(0.90, 0, 0);
        this.rightWing.rotation.y = Math.PI / 2;
        this.rightWing.material = wingMaterial;
        this.rightWing.parent = this.mesh;

        // Tail
        this.tail = MeshBuilder.CreateBox("tail", {
            width: 0.1,
            height: 0.1,
            depth: 0.5
        }, this.scene);
        this.tail.position = new Vector3(0, 0, -1);
        this.tail.material = wingMaterial;
        this.tail.parent = this.mesh;

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
        this.mesh.position = new Vector3(0, 50, 0);
        this.mesh.isVisible = true;
        this.mesh.checkCollisions = true;

        // Initialize rotation quaternion
        this.mesh.rotationQuaternion = new Quaternion();
    }

    /**
     * Updates the plane's state.
     * Handles control surface animations based on input.
     * @param deltaTime - Time elapsed since last update in seconds
     */
    public update(deltaTime: number = 1/60): void {
        if (!this.mesh) return;
        
        // Update control surfaces based on input
        if (this.leftWing && this.rightWing && this.tail) {
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

            // Calculate control surface positions based on input
            const rollAmount = (input.rollLeft ? 1 : 0) - (input.rollRight ? 1 : 0);
            const pitchAmount = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
            const yawAmount = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);

            // Update wing angles for roll
            this.leftWing.rotation.z = rollAmount * 0.5;
            this.rightWing.rotation.z = -rollAmount * 0.5;
            
            // Update tail angle for pitch
            this.tail.rotation.x = pitchAmount * 0.5;

            // Update tail angle for yaw
            this.tail.rotation.y = yawAmount * 0.5;
        }
    }

    /**
     * Cleans up resources when the plane is destroyed or removed.
     * Disposes of control surfaces and other meshes.
     */
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