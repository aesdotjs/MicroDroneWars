import { Scene, Engine, Vector3, HemisphericLight, UniversalCamera, Color4, Quaternion, MeshBuilder, StandardMaterial, Color3, DirectionalLight, ShadowGenerator } from 'babylonjs';
import { Vehicle } from './vehicles/Vehicle';
import { Flag } from './Flag';
import { InputManager } from './InputManager';
import { Game } from './Game';
import { ClientPhysicsWorld } from './physics/ClientPhysicsWorld';
import * as CANNON from 'cannon';
import { CollisionManager } from './CollisionManager';
window.CANNON = CANNON;

export class GameScene {
    private scene: Scene;
    private engine: Engine;
    private camera!: UniversalCamera;
    private vehicles: Map<string, Vehicle> = new Map();
    private flags: Map<number, Flag> = new Map();
    private game: Game;
    private localPlayer: Vehicle | null = null;
    private lastTime: number = performance.now();
    private inputManager!: InputManager;
    private physicsWorld!: ClientPhysicsWorld;
    private collisionManager!: CollisionManager;
    private shadowGenerator!: ShadowGenerator;

    constructor(engine: Engine, game: Game) {
        console.log('GameScene constructor started');
        this.engine = engine;
        this.game = game;
        this.scene = new Scene(this.engine);
        
        // Set background color
        this.scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);
        
        console.log('Scene created:', this.scene);
        
        // Initialize managers first
        this.setupInputManager();
        this.setupPhysicsWorld();
        this.setupCollisionManager();
        
        this.setupLights();
        this.setupCamera();
        this.setupEnvironment();
        
        // Start the render loop
        console.log('Registering beforeRender callback...');
        this.scene.registerBeforeRender(() => {
            this.update();
        });
        console.log('GameScene initialization complete');
    }

    private setupInputManager(): void {
        const canvas = this.engine.getRenderingCanvas();
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }
        this.inputManager = new InputManager(canvas);
        console.log('InputManager initialized:', {
            hasCanvas: !!canvas,
            hasInputManager: !!this.inputManager
        });
    }

    private setupPhysicsWorld(): void {
        console.log('Setting up physics world...');
        this.physicsWorld = new ClientPhysicsWorld(this.engine, this.scene);
        console.log('Physics world created:', this.physicsWorld);
    }

    private setupCollisionManager(): void {
        this.collisionManager = new CollisionManager(this.scene);
        console.log('CollisionManager initialized:', {
            hasScene: !!this.scene,
            hasCollisionManager: !!this.collisionManager
        });
    }

    private setupLights(): void {
        // Main hemispheric light for ambient lighting
        const hemiLight = new HemisphericLight(
            "hemiLight",
            new Vector3(0, 1, 0),
            this.scene
        );
        hemiLight.intensity = 1.0;
        hemiLight.groundColor = new Color3(0.2, 0.2, 0.2); // Darker ground reflection
        
        // Directional light for shadows and directional lighting
        const dirLight = new DirectionalLight(
            "dirLight",
            new Vector3(-1, -2, -1),
            this.scene
        );
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.intensity = 0.7;
        
        // Enable shadows
        const shadowGenerator = new ShadowGenerator(1024, dirLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurScale = 2;
        shadowGenerator.setDarkness(0.2);
        
        // Store shadow generator for later use with meshes
        this.shadowGenerator = shadowGenerator;
    }

    private setupCamera(): void {
        try {
            console.log('Setting up camera...');
            // Create a third-person camera with initial valid position
            this.camera = new UniversalCamera("camera", new Vector3(0, 5, 10), this.scene);
            
            // Configure camera settings
            this.camera.minZ = 0.1;
            this.camera.speed = 0.5;
            this.camera.angularSensibility = 5000;
            this.camera.inertia = 0.9;
            this.camera.fov = 1.2;
            
            // Remove default inputs and disable camera controls
            this.camera.inputs.clear();
            this.camera.detachControl();
            
            console.log('Camera setup complete:', {
                position: this.camera.position,
                target: this.camera.target,
                fov: this.camera.fov
            });
        } catch (error) {
            console.error('Camera setup error:', error);
        }
    }

    public addVehicle(sessionId: string, vehicle: Vehicle): void {
        console.log('Adding vehicle:', sessionId);
        this.vehicles.set(sessionId, vehicle);
        
        // Create initial state from vehicle mesh
        const initialState = {
            position: vehicle.mesh?.position || new Vector3(0, 10, 0),
            quaternion: vehicle.mesh?.rotationQuaternion || new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            timestamp: performance.now(),
            tick: this.physicsWorld.getCurrentTick()
        };
        
        // Create physics controller for the vehicle
        const controller = this.physicsWorld.createVehicle(
            vehicle.id,
            vehicle.type === 'drone' ? 'drone' : 'plane',
            {
                vehicleType: vehicle.type,
                mass: vehicle.type === 'drone' ? 10 : 50,
                team: vehicle.team,
                drag: 0.8,
                angularDrag: 0.8,
                maxSpeed: 20,
                maxAngularSpeed: 0.2,
                maxAngularAcceleration: 0.05,
                angularDamping: 0.9,
                forceMultiplier: 0.005,
                thrust: vehicle.type === 'drone' ? 20 : 30,
                lift: vehicle.type === 'drone' ? 15 : 12,
                torque: vehicle.type === 'drone' ? 1 : 2,
                gravity: 9.81,
                fixedTimeStep: 1/60,
                maxSubSteps: 3
            },
            vehicle.mesh?.position || new Vector3(0, 10, 0),
            initialState
        );

        // Connect physics controller to vehicle
        vehicle.setPhysicsController(controller);
        
        // Add vehicle to shadow generator
        if (this.shadowGenerator && vehicle.mesh) {
            this.shadowGenerator.addShadowCaster(vehicle.mesh);
            // Also add child meshes (propellers, etc.) to shadow generator
            vehicle.mesh.getChildMeshes().forEach(mesh => {
                this.shadowGenerator.addShadowCaster(mesh);
            });
        }
        
        // Set up local player
        if (vehicle.isLocalPlayer) {
            this.setLocalPlayer(vehicle);
        }
        
        console.log('Vehicle added successfully:', {
            sessionId,
            type: vehicle.type,
            team: vehicle.team,
            isLocalPlayer: vehicle.isLocalPlayer,
            vehicleCount: this.vehicles.size,
            hasPhysicsController: !!controller
        });
    }

    public removeVehicle(id: string): void {
        const vehicle = this.vehicles.get(id);
        if (vehicle) {
            vehicle.dispose();
            this.vehicles.delete(id);
            
            // Reset local player if it was removed
            if (this.localPlayer === vehicle) {
                this.localPlayer = null;
            }
        }
    }

    public setLocalPlayer(vehicle: Vehicle): void {
        console.log('Setting vehicle as local player:', {
            id: vehicle.id,
            hasMesh: !!vehicle.mesh,
            meshPosition: vehicle.mesh?.position
        });

        this.localPlayer = vehicle;
        vehicle.isLocalPlayer = true;
        
        // Set up camera for local player
        if (vehicle.mesh) {
            const cameraPosition = vehicle.mesh.position.add(new Vector3(0, 5, -10));
            const cameraTarget = vehicle.mesh.position.add(new Vector3(0, 1, 0));
            
            console.log('Initial camera setup for local player:', {
                cameraPosition,
                cameraTarget
            });
            
            this.camera.position = cameraPosition;
            this.camera.setTarget(cameraTarget);
            this.camera.attachControl(this.engine.getRenderingCanvas(), true);
        }

        // Set local player ID in physics world using vehicle.id
        this.physicsWorld.setLocalPlayerId(vehicle.id);

        console.log('Vehicle set as local player:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team,
            hasInputManager: !!this.inputManager,
            hasCamera: !!this.camera
        });
    }

    private update(): void {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Get input from the scene's input manager
        const input = this.inputManager.getInput();
        
        // Add timestamp and tick to input
        input.timestamp = currentTime;
        input.tick = this.physicsWorld.getCurrentTick();
        
        // Update physics world with input
        this.physicsWorld.update(currentTime, deltaTime, input);
        
        // Always send input to server for local player to maintain consistent updates
        if (this.localPlayer?.id) {            
            // Send to server
            this.game.sendMovementUpdate(input);
        }
        
        // Update all vehicles' meshes with their physics states
        this.vehicles.forEach(vehicle => {
            const controller = this.physicsWorld.controllers.get(vehicle.id);
            if (controller) {
                const state = controller.getState();
                if (state) {
                    vehicle.updateState(state);
                }
            }
        });
        
        // Update camera to follow local player
        if (this.localPlayer && this.localPlayer.mesh && this.camera) {
            const position = this.localPlayer.mesh.position;
            const quaternion = this.localPlayer.mesh.rotationQuaternion || new Quaternion();
            
            // Get the forward vector from the quaternion
            const forward = new Vector3(0, 0, 1);
            const up = new Vector3(0, 1, 0);
            forward.rotateByQuaternionToRef(quaternion, forward);
            up.rotateByQuaternionToRef(quaternion, up);
            
            // Calculate camera position using spherical coordinates
            const distance = 10;
            const heightOffset = 5;
            
            // Get the vehicle's forward direction projected onto XZ plane
            const forwardFlat = new Vector3(forward.x, 0, forward.z).normalize();
            
            // Calculate pitch angle (clamped to prevent flip)
            const pitchAngle = Math.asin(forward.y);
            const clampedPitch = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, pitchAngle));
            
            // Calculate camera position
            const cameraPos = position.clone();
            cameraPos.addInPlace(new Vector3(
                -forwardFlat.x * distance * Math.cos(-clampedPitch),
                heightOffset + distance * Math.sin(-clampedPitch),
                -forwardFlat.z * distance * Math.cos(-clampedPitch)
            ));
            
            // Update camera
            this.camera.position = cameraPos;
            const targetPos = position.add(new Vector3(0, 2, 0));
            this.camera.setTarget(targetPos);
        }
    }

    public addFlag(team: number, flag: Flag): void {
        this.flags.set(team, flag);
    }

    public removeFlag(team: number): void {
        const flag = this.flags.get(team);
        if (flag) {
            this.flags.delete(team);
        }
    }

    public getFlag(team: number): Flag | undefined {
        return this.flags.get(team);
    }

    public render(): void {
            this.scene.render();
    }

    public dispose(): void {
        this.physicsWorld.cleanup();
        this.scene.dispose();
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getPhysicsWorld(): ClientPhysicsWorld {
        return this.physicsWorld;
    }

    private setupEnvironment(): void {
        // Get ground mesh from physics world
        const groundMesh = this.physicsWorld.getGroundMesh();
        if (groundMesh) {
            console.log('Using ground from physics world:', {
                size: { width: 200, height: 200 },
                position: groundMesh.position,
                hasMaterial: !!groundMesh.material
            });
            
            // Ensure ground receives shadows
            groundMesh.receiveShadows = true;
        } else {
            console.warn('No ground mesh found in physics world');
        }

        // Add some obstacles
        for (let i = 0; i < 10; i++) {
            const obstacle = MeshBuilder.CreateBox(`obstacle${i}`, { size: 5 }, this.scene);
            const obstacleMaterial = new StandardMaterial(`obstacleMaterial${i}`, this.scene);
            obstacleMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
            obstacleMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            obstacleMaterial.ambientColor = new Color3(0.3, 0.3, 0.3);
            obstacle.material = obstacleMaterial;
            obstacle.position = new Vector3(
                Math.random() * 180 - 90,
                2.5,
                Math.random() * 180 - 90
            );
            obstacle.checkCollisions = true;
            
            // Add obstacles to shadow generator
            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(obstacle);
            }
            
            this.collisionManager.addEnvironmentMesh(obstacle);
        }
    }

    public getInputManager(): InputManager {
        return this.inputManager;
    }
} 