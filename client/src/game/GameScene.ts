import { Scene, Engine, Vector3, HemisphericLight, UniversalCamera, Color4, Quaternion, MeshBuilder, StandardMaterial, Color3 } from 'babylonjs';
import { Vehicle } from './Vehicle';
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
    private lastDebugTime: number = 0;
    private debugInterval: number = 500; // 500ms between debug logs

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
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            this.scene
        );
        light.intensity = 0.7;
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
            
            // Remove default inputs
            this.camera.inputs.clear();
            
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
        
        // Initialize vehicle with physics world and input manager
        vehicle.initialize(this.scene, this.physicsWorld, this.inputManager);
        
        // Set up local player
        if (vehicle.isLocalPlayer) {
            this.setAsLocalPlayer(vehicle);
        }
        
        console.log('Vehicle added successfully:', {
            sessionId,
            type: vehicle.type,
            team: vehicle.team,
            isLocalPlayer: vehicle.isLocalPlayer,
            vehicleCount: this.vehicles.size,
            hasInputManager: !!vehicle.inputManager
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

    private setAsLocalPlayer(vehicle: Vehicle): void {
        console.log('Setting vehicle as local player:', {
            id: vehicle.id,
            hasMesh: !!vehicle.mesh,
            meshPosition: vehicle.mesh?.position
        });
        
        this.localPlayer = vehicle;
        vehicle.isLocalPlayer = true;
        
        if (!vehicle.inputManager && this.inputManager) {
            vehicle.inputManager = this.inputManager;
        }
        
        // Update camera position to follow local player
        if (this.camera && vehicle.mesh) {
            const position = vehicle.mesh.position;
            this.camera.position = new Vector3(position.x, position.y + 5, position.z + 10);
            this.camera.setTarget(position);
            
            console.log('Initial camera setup for local player:', {
                cameraPosition: this.camera.position,
                cameraTarget: this.camera.target
            });
        }
        
        console.log('Vehicle set as local player:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team,
            hasInputManager: !!vehicle.inputManager,
            hasCamera: !!this.camera
        });
    }

    private update(): void {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Get input from the scene's input manager
        const input = this.inputManager.getInput();
        
        // Update all vehicles
        this.vehicles.forEach(vehicle => {
            vehicle.update(deltaTime);
        });

        // Only update physics world if there's active input
        if (Object.values(input).some(value => 
            value === true || 
            (typeof value === 'object' && value.x !== 0 && value.y !== 0)
        )) {
            // console.log('GameScene Update - Updating physics world with input:', input);
            this.physicsWorld.update(deltaTime, input);
            this.game.sendMovementUpdate(input);
        }
        
        // Update camera to follow local player
        if (this.localPlayer && this.localPlayer.mesh && this.camera) {
            const position = this.localPlayer.mesh.position;
            const targetPos = new Vector3(position.x, position.y + 3, position.z);
            
            // Get the orientation
            const quaternion = this.localPlayer.mesh.rotationQuaternion || new Quaternion(0, 0, 0, 1);
            
            // Calculate offset based on vehicle orientation
            const offset = new Vector3(0, 5, -10);
            const rotatedOffset = offset.rotateByQuaternionToRef(quaternion, new Vector3());
            
            // Set camera position and target
            this.camera.position = position.add(rotatedOffset);
            this.camera.setTarget(targetPos);

            // Throttled debug logging
            if (currentTime - this.lastDebugTime > this.debugInterval) {
                console.log('Vehicle Debug:', {
                    position: position,
                    rotation: quaternion,
                    hasPhysics: !!this.localPlayer.physics,
                    physicsState: this.localPlayer.physics?.getState(),
                    input: input,
                    isLocalPlayer: this.localPlayer.isLocalPlayer,
                    groundSize: { width: 460, height: 460 }
                });
                this.lastDebugTime = currentTime;
            }
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
        } else {
            console.warn('No ground mesh found in physics world');
        }

        // Add some obstacles
        for (let i = 0; i < 10; i++) {
            const obstacle = MeshBuilder.CreateBox(`obstacle${i}`, { size: 5 }, this.scene);
            const obstacleMaterial = new StandardMaterial(`obstacleMaterial${i}`, this.scene);
            obstacleMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
            obstacle.material = obstacleMaterial;
            obstacle.position = new Vector3(
                Math.random() * 180 - 90,
                2.5,
                Math.random() * 180 - 90
            );
            obstacle.checkCollisions = true;
            this.collisionManager.addEnvironmentMesh(obstacle);
        }
    }
} 