import { Scene, Vector3, HemisphericLight, ArcRotateCamera, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { Vehicle } from './Vehicle';
import { InputManager } from './InputManager';
import { CollisionManager } from './CollisionManager';

export class GameScene {
    constructor(engine) {
        this.scene = new Scene(engine);
        this.engine = engine;
        this.vehicles = new Map();
        this.flags = new Map();
        this.localPlayer = null;
        this.lastTime = 0;

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
        // Create a camera that follows the player
        this.camera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), this.scene);
        this.camera.attachControl(this.engine.getRenderingCanvas(), true);
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 20;
        this.camera.alpha = Math.PI; // Start behind the vehicle
        this.camera.beta = Math.PI / 4; // Slightly above
        this.camera.radius = 10; // Distance from vehicle
    }

    setupEnvironment() {
        // Create a simple ground plane
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
        const groundMaterial = new StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        ground.material = groundMaterial;
        ground.checkCollisions = true;
        this.collisionManager.addEnvironmentMesh(ground);

        // Add some obstacles
        for (let i = 0; i < 5; i++) {
            const obstacle = MeshBuilder.CreateBox(`obstacle${i}`, { size: 5 }, this.scene);
            const obstacleMaterial = new StandardMaterial(`obstacleMaterial${i}`, this.scene);
            obstacleMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
            obstacle.material = obstacleMaterial;
            obstacle.position = new Vector3(
                Math.random() * 80 - 40,
                2.5,
                Math.random() * 80 - 40
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

    createVehicle(type, team, isLocalPlayer = false) {
        try {
            // Create vehicle mesh
            const mesh = this.createVehicleMesh(type, team);
            if (!mesh) {
                console.error('Failed to create vehicle mesh');
                return null;
            }

            // Create vehicle instance
            const vehicle = new Vehicle(this.scene, mesh, type, team);
            if (!vehicle) {
                console.error('Failed to create vehicle instance');
                return null;
            }

            // Set up local player controls if needed
            if (isLocalPlayer) {
                vehicle.isLocalPlayer = true;
                vehicle.inputManager = this.inputManager; // Use the scene's input manager
                this.localPlayer = vehicle;
                console.log('Local player vehicle created:', type, team);
            }

            // Add to vehicles map
            this.vehicles.set(mesh.uniqueId, vehicle);

            // Add to collision manager
            if (vehicle.mesh && vehicle.mesh.position) {
                this.collisionManager.addVehicle(vehicle);
                console.log('Vehicle added to collision manager:', type, team);
            } else {
                console.warn('Vehicle mesh not ready for collision manager:', type, team);
            }

            // Add to scene
            this.scene.addMesh(mesh);
            console.log('Vehicle added to scene:', type, team);

            return vehicle;
        } catch (error) {
            console.error('Error creating vehicle:', error);
            return null;
        }
    }

    createVehicleMesh(type, team) {
        try {
            const mesh = MeshBuilder.CreateBox(type, { size: 1 }, this.scene);
            if (!mesh) {
                console.error('Failed to create mesh for vehicle:', type);
                return null;
            }

            // Set initial position
            mesh.position = new Vector3(0, 2, 0);
            
            // Create and assign material
            const material = new StandardMaterial(`${type}Material`, this.scene);
            material.diffuseColor = team === 'red' ? new Color3(1, 0, 0) : new Color3(0, 0, 1);
            material.specularColor = new Color3(0.5, 0.5, 0.5);
            mesh.material = material;

            // Ensure mesh is properly initialized
            mesh.computeWorldMatrix(true);
            mesh.isVisible = true;

            return mesh;
        } catch (error) {
            console.error('Error creating vehicle mesh:', error);
            return null;
        }
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

    setupCameraFollow() {
        if (this.localPlayer && this.localPlayer.mesh) {
            this.camera.setTarget(this.localPlayer.mesh);
            this.camera.radius = 10;
            this.camera.alpha = Math.PI / 4;
            this.camera.beta = Math.PI / 3;
        }
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update all vehicles
        for (const [id, vehicle] of this.vehicles) {
            if (vehicle && vehicle.update) {
                vehicle.update(deltaTime);
            }
        }

        // Update camera to follow local player
        if (this.localPlayer && this.localPlayer.mesh) {
            // Get vehicle's forward direction
            const forward = this.localPlayer.mesh.getDirection(Vector3.Forward());
            
            // Calculate camera position behind the vehicle
            const cameraOffset = forward.scale(-10); // 10 units behind
            const cameraPosition = this.localPlayer.mesh.position.add(cameraOffset);
            
            // Update camera target and position
            this.camera.target = this.localPlayer.mesh.position;
            this.camera.position = cameraPosition;
            
            // Make camera look at vehicle
            this.camera.setTarget(this.localPlayer.mesh.position);
        }
    }

    dispose() {
        // Clean up resources
        this.scene.dispose();
        this.inputManager.dispose();
    }
} 