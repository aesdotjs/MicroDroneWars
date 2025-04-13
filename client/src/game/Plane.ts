import { Vehicle } from "./Vehicle";
import { MeshBuilder, Vector3, StandardMaterial, Color3, MultiMaterial, Color4, Quaternion, Scene, Mesh, ParticleSystem, Texture, Matrix } from 'babylonjs';
import { PhysicsController } from './controllers/PhysicsController';
import { ClientPhysicsWorld } from './physics/ClientPhysicsWorld';

export class Plane extends Vehicle {
    public maxSpeed: number = 8;
    public acceleration: number = 0.15;
    public turnRate: number = 0.03;
    public maxHealth: number = 200;
    public vehicleType: string = "plane";
    private leftWing!: Mesh;
    private rightWing!: Mesh;
    private tail!: Mesh;
    private engineThrusters!: {
        left: ParticleSystem;
        right: ParticleSystem;
    };

    constructor(scene: Scene, type: string, team: number, canvas: HTMLCanvasElement, isLocalPlayer: boolean = false) {
        super(scene, type, team, canvas, isLocalPlayer);
        this.id = `plane_${Math.random().toString(36).substr(2, 9)}`;
        this.maxHealth = 200;
        this.health = 200;
        
        // Create mesh first
        this.createMesh();
    }

    public initialize(scene: Scene, physicsWorld: ClientPhysicsWorld): void {
        super.initialize(scene, physicsWorld);
        
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
            bodyMaterial,    // Right face
            bodyMaterial,    // Left face
            bodyMaterial,    // Top face
            bodyMaterial,    // Bottom face
            frontMaterial,   // Front face
            backMaterial     // Back face
        ];

        // Apply the multi-material to the mesh
        this.mesh.material = multiMaterial;
        
        // Create wings
        const wingMaterial = new StandardMaterial('wingMaterial', this.scene);
        wingMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        wingMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
        wingMaterial.backFaceCulling = false;

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