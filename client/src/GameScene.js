import { Scene, Vector3, HemisphericLight, ArcRotateCamera, MeshBuilder, StandardMaterial, Color3, TransformNode } from '@babylonjs/core';
import { Vehicle } from './Vehicle';
import { InputManager } from './InputManager';
import { CollisionManager } from './CollisionManager';
import { Drone } from './Drone';
import { Plane } from './Plane';

export class GameScene {
    constructor(engine) {
        this.scene = new Scene(engine);
        this.engine = engine;
        this.vehicles = new Map();
        this.flags = new Map();
        this.localPlayer = null;
        this.lastTime = performance.now();

        // Initialize managers first
        this.setupCollisionManager();
        this.setupInputManager();

        // Then set up the scene
        this.setupScene();
        this.setupLights();
        this.setupCamera();
        this.setupEnvironment();

        // Start the render loop
        this.scene.registerBeforeRender(() => this.update());
    }

    setupScene() {
        // Enable physics
        this.scene.gravity = new Vector3(0, -9.81, 0);
        this.scene.collisionsEnabled = true;
    }

    setupLights() {
        // Add ambient light
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;
    }

    setupCamera() {
        try {
            // Create a third-person camera
            this.camera = new ArcRotateCamera(
                "camera",
                -Math.PI / 2, // Alpha (horizontal rotation)
                Math.PI / 3,  // Beta (vertical rotation)
                10,           // Radius (distance from target)
                Vector3.Zero(),
                this.scene
            );

            // Remove mouse wheel input to prevent zooming
            this.camera.inputs.remove(this.camera.inputs.attached.mousewheel);
            
            // Attach camera to canvas
            this.camera.attachControl(this.engine.getRenderingCanvas(), true);
        } catch (error) {
            console.error('Camera setup error:', error);
        }
    }

    setupEnvironment() {
        // Create a larger ground plane
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        ground.material = groundMaterial;
        ground.position.y = 0;
        ground.checkCollisions = true;
        this.collisionManager.addEnvironmentMesh(ground);

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

    setupCollisionManager() {
        this.collisionManager = new CollisionManager(this.scene);
    }

    setupInputManager() {
        this.inputManager = new InputManager(this.engine.getRenderingCanvas());
    }

    setAsLocalPlayer(vehicle) {
        try {
            if (!vehicle || !vehicle.mesh) {
                console.error('Invalid vehicle for local player');
                return;
            }

            // Set vehicle as local player
            vehicle.isLocalPlayer = true;
            vehicle.inputManager = new InputManager(this.engine.getRenderingCanvas());
            
            // Set camera to follow vehicle
            this.camera.setTarget(vehicle.mesh);
            
            // Add smooth camera follow
            this.scene.registerBeforeRender(() => {
                if (vehicle.mesh) {
                    // Update camera position to follow vehicle
                    const targetPosition = vehicle.mesh.position.add(
                        new Vector3(0, 2, -5)
                    );
                    
                    // Smoothly interpolate camera position
                    this.camera.position = Vector3.Lerp(
                        this.camera.position,
                        targetPosition,
                        0.1 // Smoothing factor
                    );
                }
            });

            console.log('Vehicle set as local player:', {
                id: vehicle.id,
                type: vehicle.type,
                team: vehicle.team,
                position: vehicle.mesh.position,
                hasInputManager: !!vehicle.inputManager,
                hasCamera: !!this.camera
            });
        } catch (error) {
            console.error('Set as local player error:', error);
        }
    }

    createVehicle(type, team, isLocalPlayer = false) {
        console.log('Creating vehicle:', { type, team, isLocalPlayer });
        let vehicle;
        
        if (type === 'drone') {
            vehicle = new Drone(this.scene, type, team, this.engine.getRenderingCanvas());
        } else {
            vehicle = new Plane(this.scene, type, team, this.engine.getRenderingCanvas());
        }
        
        // Ensure the vehicle is properly initialized
        if (vehicle && !vehicle.scene) {
            vehicle.initialize(this.scene);
        }
        
        if (isLocalPlayer) {
            this.setAsLocalPlayer(vehicle);
        }
        
        this.vehicles.set(vehicle.id, vehicle);
        console.log('Vehicle added to scene:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team,
            position: vehicle.mesh?.position,
            hasInputManager: !!vehicle.inputManager,
            hasPhysics: !!vehicle.physics,
            hasScene: !!vehicle.scene,
            isVisible: vehicle.mesh?.isVisible
        });
        
        return vehicle;
    }

    createFlag(flagId, flagData) {
        const mesh = MeshBuilder.CreateBox(flagId, { width: 1, height: 2, depth: 1 }, this.scene);
        const material = new StandardMaterial(`${flagId}Material`, this.scene);
        material.diffuseColor = flagData.team === 0 ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
        mesh.material = material;
        mesh.position = new Vector3(flagData.x, flagData.y, flagData.z);
        
        this.flags.set(flagId, mesh);
    }

    updateVehicle(sessionId, vehicleData) {
        const vehicle = this.vehicles.get(sessionId);
        if (vehicle && vehicle.mesh) {
            vehicle.mesh.position = new Vector3(
                vehicleData.x,
                vehicleData.y,
                vehicleData.z
            );
            vehicle.mesh.rotation = new Vector3(
                vehicleData.rotationX,
                vehicleData.rotationY,
                vehicleData.rotationZ
            );
        }
    }

    updateFlag(flagId, flagData) {
        const flag = this.flags.get(flagId);
        if (flag) {
            flag.position = new Vector3(flagData.x, flagData.y, flagData.z);
            if (flagData.captured) {
                flag.material.diffuseColor = new Color3(0, 1, 0);
            }
        }
    }

    removeVehicle(sessionId) {
        const vehicle = this.vehicles.get(sessionId);
        if (vehicle) {
            this.collisionManager.removeVehicle(vehicle);
            if (vehicle.mesh) {
                vehicle.mesh.dispose();
            }
            this.vehicles.delete(sessionId);
        }
    }

    removeFlag(flagId) {
        const flag = this.flags.get(flagId);
        if (flag) {
            flag.dispose();
            this.flags.delete(flagId);
        }
    }

    update() {
        try {
            const currentTime = performance.now();
            const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30 FPS
            this.lastTime = currentTime;

            // Update all vehicles
            this.vehicles.forEach(vehicle => {
                if (vehicle.update) {
                    vehicle.update(deltaTime);
                }
            });

            // Update camera to follow local player
            if (this.localPlayer && this.localPlayer.mesh) {
                this.camera.setTarget(this.localPlayer.mesh);
            }
        } catch (error) {
            console.error('Game update error:', error);
        }
    }

    dispose() {
        // Clean up resources
        this.scene.dispose();
        this.inputManager.dispose();
    }
} 