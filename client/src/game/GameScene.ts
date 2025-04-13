import { Scene, Engine, Vector3, HemisphericLight, CannonJSPlugin, MeshBuilder, StandardMaterial, Color3, Mesh, UniversalCamera, Color4, Quaternion, PhysicsImpostor } from 'babylonjs';
import { Vehicle } from './Vehicle';
import { Flag } from './Flag';
import { InputManager } from './InputManager';
import { Game } from './Game';
import { ClientPhysicsWorld } from './physics/ClientPhysicsWorld';
import * as CANNON from 'cannon';
window.CANNON = CANNON;

export class GameScene {
    private scene: Scene;
    private engine: Engine;
    private camera!: UniversalCamera;
    private vehicles: Map<string, Vehicle> = new Map();
    private flags: Map<number, Flag> = new Map();
    private ground!: Mesh;
    private game: Game;
    private localPlayer: Vehicle | null = null;
    private lastTime: number = performance.now();
    private inputManager!: InputManager;
    private physicsWorld!: ClientPhysicsWorld;
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
        
        // Then set up the scene
        this.setupScene();
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

    private setupScene(): void {
        console.log('Setting up scene...');
        // Scene setup without physics initialization
        console.log('Scene setup complete');
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

    private setupEnvironment(): void {
        console.log('Setting up environment...');
        // Create a larger ground plane
        this.ground = MeshBuilder.CreateGround(
            "ground",
            { width: 460, height: 460 },
            this.scene
        );
        console.log('Ground created:', this.ground);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        this.ground.material = groundMaterial;
        this.ground.position.y = 0;
        this.ground.checkCollisions = true;
        this.ground.receiveShadows = true;
        
        // Add physics properties to ground
        this.ground.physicsImpostor = new PhysicsImpostor(
            this.ground,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.9, friction: 0.5 },
            this.scene
        );
        
        console.log('Ground setup complete with physics:', {
            hasPhysicsImpostor: !!this.ground.physicsImpostor,
            position: this.ground.position,
            size: { width: 460, height: 460 }
        });

        // Create wall material
        const wallMaterial = new StandardMaterial("wallMaterial", this.scene);
        wallMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
        wallMaterial.alpha = 0.5;

        // Create boundary walls
        const wallTop = MeshBuilder.CreateBox("wallTop", { width: 460, height: 20, depth: 10 }, this.scene);
        wallTop.material = wallMaterial;
        const wallBottom = wallTop.clone("wallBottom");
        const wallLeft = wallTop.clone("wallLeft");
        const wallRight = wallTop.clone("wallRight");

        // Position walls
        wallTop.position.z = 230;
        wallBottom.position.z = -230;
        wallLeft.rotation.y = Math.PI / 2;
        wallLeft.position.x = 230;
        wallRight.rotation.y = Math.PI / 2;
        wallRight.position.x = -230;

        // Setup walls with physics and collisions
        [wallTop, wallBottom, wallLeft, wallRight].forEach(wall => {
            wall.checkCollisions = true;
            wall.receiveShadows = true;
            
            // Add physics impostor to walls
            wall.physicsImpostor = new PhysicsImpostor(
                wall,
                PhysicsImpostor.BoxImpostor,
                { mass: 0, restitution: 0.9, friction: 0.5 },
                this.scene
            );
        });

        // Add obstacles with more variety
        for (let i = 0; i < 15; i++) {
            const size = 3 + Math.random() * 7; // Random size between 3 and 10
            const obstacle = MeshBuilder.CreateBox(`obstacle${i}`, { size }, this.scene);
            const obstacleMaterial = new StandardMaterial(`obstacleMaterial${i}`, this.scene);
            obstacleMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
            obstacleMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
            obstacle.material = obstacleMaterial;
            
            // Position obstacles within bounds
            obstacle.position = new Vector3(
                Math.random() * 400 - 200,
                size / 2,
                Math.random() * 400 - 200
            );
            
            obstacle.checkCollisions = true;
            obstacle.receiveShadows = true;
            
            // Add physics impostor to obstacles
            obstacle.physicsImpostor = new PhysicsImpostor(
                obstacle,
                PhysicsImpostor.BoxImpostor,
                { mass: 0, restitution: 0.9, friction: 0.5 },
                this.scene
            );
        }

        // Add some ramps and platforms
        for (let i = 0; i < 5; i++) {
            const ramp = MeshBuilder.CreateBox(`ramp${i}`, { 
                width: 20, 
                height: 5, 
                depth: 40 
            }, this.scene);
            const rampMaterial = new StandardMaterial(`rampMaterial${i}`, this.scene);
            rampMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
            ramp.material = rampMaterial;
            
            ramp.position = new Vector3(
                Math.random() * 300 - 150,
                2.5,
                Math.random() * 300 - 150
            );
            
            // Random rotation for ramps
            ramp.rotation.x = Math.random() * Math.PI / 4;
            ramp.rotation.z = Math.random() * Math.PI / 4;
            
            ramp.checkCollisions = true;
            ramp.receiveShadows = true;
            
            // Add physics impostor to ramps
            ramp.physicsImpostor = new PhysicsImpostor(
                ramp,
                PhysicsImpostor.BoxImpostor,
                { mass: 0, restitution: 0.9, friction: 0.5 },
                this.scene
            );
        }
        
        // Verify physics setup
        console.log('Environment physics setup complete:', {
            groundHasPhysics: !!this.ground.physicsImpostor,
            sceneHasPhysics: this.scene.isPhysicsEnabled(),
            gravity: this.scene.gravity
        });
    }

    public addVehicle(sessionId: string, vehicle: Vehicle): void {
        console.log('Adding vehicle:', sessionId);
        this.vehicles.set(sessionId, vehicle);
        
        // Initialize vehicle with physics world
        vehicle.initialize(this.scene, this.physicsWorld);
        
        // Set up local player
        if (vehicle.isLocalPlayer) {
            this.setAsLocalPlayer(vehicle);
        }
        
        console.log('Vehicle added successfully:', {
            sessionId,
            type: vehicle.type,
            team: vehicle.team,
            isLocalPlayer: vehicle.isLocalPlayer,
            vehicleCount: this.vehicles.size
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
        
        // Update physics world
        this.physicsWorld.update(deltaTime, {
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
        });
        
        // Update all vehicles
        this.vehicles.forEach(vehicle => {
            vehicle.update(deltaTime);
            
            // Update server with local player movement
            if (vehicle.isLocalPlayer && this.game) {
                this.game.sendMovementUpdate(vehicle);
            }
        });
        
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
                    input: this.localPlayer.input,
                    isLocalPlayer: this.localPlayer.isLocalPlayer,
                    groundY: this.ground.position.y,
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
} 