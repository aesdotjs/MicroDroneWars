import { Scene, Vector3, HemisphericLight, ArcRotateCamera, MeshBuilder, StandardMaterial, Color3, TransformNode, UniversalCamera, Quaternion } from '@babylonjs/core';
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
            // Create a third-person camera with initial valid position
            this.camera = new ArcRotateCamera(
                "camera",
                -Math.PI / 2, // Alpha (horizontal rotation)
                Math.PI / 3,  // Beta (vertical rotation)
                10,           // Radius (distance from target)
                new Vector3(0, 0, 0), // Initial target position
                this.scene
            );

            // Set initial camera position
            this.camera.position = new Vector3(0, 5, -10);
            this.camera.target = new Vector3(0, 0, 0);

            // Remove mouse wheel input to prevent zooming
            this.camera.inputs.remove(this.camera.inputs.attached.mousewheel);
            
            // Disable camera rotation controls
            this.camera.inputs.remove(this.camera.inputs.attached.pointers);
            
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
        if (!vehicle || !vehicle.mesh) return;
        
        // Set vehicle as local player
        vehicle.isLocalPlayer = true;
        vehicle.inputManager = new InputManager(this.engine.getRenderingCanvas());
        
        // Ensure vehicle has valid position
        if (!vehicle.mesh.position) {
            vehicle.mesh.position = new Vector3(0, 0, 0);
        }
        
        // Set initial camera position and target
        this.camera.position = new Vector3(0, 5, -10);
        this.camera.target = vehicle.mesh.position;
        this.camera.radius = 10; // Set fixed distance from target
        this.camera.alpha = -Math.PI / 2; // Fixed horizontal angle
        this.camera.beta = Math.PI / 3; // Fixed vertical angle
        
        // Add smooth camera follow with yaw rotation
        this.scene.registerBeforeRender(() => {
            if (vehicle.mesh) {
                // Get vehicle's yaw rotation with NaN check
                let yaw = 0;
                if (vehicle.mesh.rotationQuaternion) {
                    const euler = vehicle.mesh.rotationQuaternion.toEulerAngles();
                    yaw = isNaN(euler.y) ? 0 : euler.y;
                } else {
                    yaw = isNaN(vehicle.mesh.rotation.y) ? 0 : vehicle.mesh.rotation.y;
                }

                // Ensure vehicle position is valid
                const vehiclePos = vehicle.mesh.position;
                if (isNaN(vehiclePos.x) || isNaN(vehiclePos.y) || isNaN(vehiclePos.z)) {
                    console.warn('Invalid vehicle position detected, using last valid position');
                    return; // Skip this frame if position is invalid
                }

                // Calculate camera position based on vehicle's yaw
                const cameraOffset = new Vector3(
                    Math.sin(yaw) * 10,  // X offset based on yaw
                    5,                  // Fixed height
                    Math.cos(yaw) * 10   // Z offset based on yaw
                );
                
                // Update camera position and target
                const newCameraPos = vehiclePos.add(cameraOffset);
                if (!isNaN(newCameraPos.x) && !isNaN(newCameraPos.y) && !isNaN(newCameraPos.z)) {
                    this.camera.position = newCameraPos;
                    this.camera.target = vehiclePos;
                }
            }
        });
        
        console.log('Vehicle set as local player:', {
            id: vehicle.id,
            type: vehicle.type,
            team: vehicle.team
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