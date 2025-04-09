import { Scene, Vector3, HemisphericLight, ArcRotateCamera, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
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

    setLocalPlayer(vehicle) {
        this.localPlayer = vehicle;
        vehicle.setAsLocalPlayer(this.inputManager);
        console.log('Set as local player:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team,
            position: vehicle.mesh.position,
            hasInputManager: !!vehicle.inputManager
        });
    }

    createVehicle(type, team, isLocalPlayer = false) {
        console.log('Creating vehicle:', { type, team, isLocalPlayer });
        let vehicle;
        
        if (type === 'drone') {
            vehicle = new Drone(this.scene, type, team, this.engine.getRenderingCanvas());
        } else {
            vehicle = new Plane(this.scene, type, team, this.engine.getRenderingCanvas());
        }
        
        if (isLocalPlayer) {
            this.setLocalPlayer(vehicle);
        }
        
        this.vehicles.set(vehicle.id, vehicle);
        console.log('Vehicle added to scene:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team,
            position: vehicle.mesh.position,
            hasInputManager: !!vehicle.inputManager,
            hasPhysics: !!vehicle.physics
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

    setupCameraFollow() {
        if (this.localPlayer && this.localPlayer.mesh) {
            this.camera.setTarget(this.localPlayer.mesh);
            this.camera.radius = 10;
            this.camera.alpha = Math.PI / 4;
            this.camera.beta = Math.PI / 3;
        }
    }

    update() {
        // Update all vehicles
        this.vehicles.forEach(vehicle => {
            if (vehicle && vehicle.mesh) {
                vehicle.update();
            }
        });

        // Update camera to follow local player
        if (this.localPlayer && this.localPlayer.mesh) {
            this.camera.target = this.localPlayer.mesh.position;
            
            // Get the drone's forward vector
            const forward = this.localPlayer.mesh.forward;
            
            // Position camera behind the drone
            const cameraOffset = forward.scale(-10); // Negative scale to position behind
            const heightOffset = new Vector3(0, 5, 0); // Add some height
            
            // Set camera position
            this.camera.position = this.localPlayer.mesh.position.add(cameraOffset).add(heightOffset);
            
            // Make camera look at the drone
            this.camera.setTarget(this.localPlayer.mesh.position);
        }
    }

    dispose() {
        // Clean up resources
        this.scene.dispose();
        this.inputManager.dispose();
    }
} 