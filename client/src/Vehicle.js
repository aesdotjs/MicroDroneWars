import { Vector3, Quaternion, ParticleSystem, Color4, Texture, Matrix } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController';
import { InputManager } from './InputManager';

export class Vehicle {
    constructor(type, team, canvas) {
        this.type = type;
        this.team = team;
        this.mesh = null;
        this.velocity = new Vector3(0, 0, 0);
        this.angularVelocity = new Vector3(0, 0, 0);
        this.health = 100;
        this.isAlive = true;
        this.inputManager = null; // Will be set by setAsLocalPlayer
        this.lastPosition = new Vector3(0, 0, 0);
        this.lastRotation = new Vector3(0, 0, 0);
        this.positionLerpFactor = 0.2;
        this.rotationLerpFactor = 0.2;
        this.vehicleType = type;
        this.scene = null; // Will be set by initialize
    }

    initialize(scene) {
        if (!scene) {
            console.error('Cannot initialize vehicle: scene is null');
            return;
        }
        
        this.scene = scene;
        if (!this.mesh) {
            console.warn('Cannot initialize vehicle: mesh is null');
            return;
        }

        // Set initial position based on team
        const spawnPoint = this.getTeamSpawnPoint(this.team);
        this.mesh.position = new Vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.lastPosition.copyFrom(this.mesh.position);
        this.lastRotation.copyFrom(this.mesh.rotation);
        
        console.log('Vehicle initialized:', {
            type: this.type,
            team: this.team,
            position: this.mesh.position.toString(),
            hasPhysics: !!this.physics,
            hasScene: !!this.scene,
            isVisible: this.mesh.isVisible
        });
    }

    getTeamSpawnPoint(team) {
        return team === 0 
            ? { x: -20, y: 10, z: 0 }  // Team A spawn, higher up
            : { x: 20, y: 10, z: 0 };  // Team B spawn, higher up
    }

    setAsLocalPlayer(inputManager) {
        this.isLocalPlayer = true;
        this.inputManager = inputManager;
        
        // Ensure the camera is following this vehicle
        if (this.scene && this.scene.activeCamera && this.mesh) {
            this.scene.activeCamera.setTarget(this.mesh);
            this.scene.activeCamera.radius = 10;
            this.scene.activeCamera.alpha = Math.PI; // Behind the vehicle
            this.scene.activeCamera.beta = Math.PI / 4; // Slightly above
        }
        
        console.log('Vehicle set as local player:', { 
            type: this.type, 
            team: this.team, 
            isLocalPlayer: this.isLocalPlayer,
            hasInputManager: !!this.inputManager,
            hasCamera: !!(this.scene && this.scene.activeCamera)
        });
    }

    updatePosition(position, rotation) {
        if (!this.isLocalPlayer && this.mesh) {
            // Smoothly interpolate position for remote players
            this.mesh.position = Vector3.Lerp(
                this.mesh.position,
                new Vector3(position.x, position.y, position.z),
                this.positionLerpFactor
            );
            
            // Smoothly interpolate rotation for remote players
            this.mesh.rotation = Vector3.Lerp(
                this.mesh.rotation,
                new Vector3(rotation.x, rotation.y, rotation.z),
                this.rotationLerpFactor
            );
            
            // Update last known position and rotation
            this.lastPosition.copyFrom(this.mesh.position);
            this.lastRotation.copyFrom(this.mesh.rotation);
        }
    }

    update(deltaTime) {
        if (!this.mesh || !this.isAlive || !this.inputManager || !this.physics) {
            return;
        }

        // Apply input forces
        const input = this.inputManager.keys;
        const mouseDelta = this.inputManager.mouseDelta;
        
        if (this.vehicleType === 'drone') {
            // Drone movement - omnidirectional
            if (input.forward) {
                this.physics.applyThrust(1);
            }
            if (input.backward) {
                this.physics.applyThrust(-1);
            }
            if (input.left) {
                this.physics.applyYaw(-1);
            }
            if (input.right) {
                this.physics.applyYaw(1);
            }
            if (input.up) {
                this.physics.applyLift(1);
            }
            if (input.down) {
                this.physics.applyLift(-1);
            }

            // Mouse-based rotation for precise control
            if (mouseDelta.x !== 0) {
                this.physics.applyYaw(mouseDelta.x * 0.1);
            }
            if (mouseDelta.y !== 0) {
                this.physics.applyPitch(mouseDelta.y * 0.1);
            }
        } else {
            // Plane movement - forward momentum required
            if (input.forward) {
                this.physics.applyThrust(1);
            }
            if (input.backward) {
                this.physics.applyThrust(-0.5); // Limited reverse thrust
            }
            
            // Banking turns
            if (input.left) {
                this.physics.applyRoll(-1);
                this.physics.applyYaw(-0.5);
            }
            if (input.right) {
                this.physics.applyRoll(1);
                this.physics.applyYaw(0.5);
            }
            
            // Limited vertical control
            if (input.up) {
                this.physics.applyPitch(-0.5);
            }
            if (input.down) {
                this.physics.applyPitch(0.5);
            }

            // Mouse-based banking and pitch
            if (mouseDelta.x !== 0) {
                this.physics.applyRoll(mouseDelta.x * 0.1);
                this.physics.applyYaw(mouseDelta.x * 0.05);
            }
            if (mouseDelta.y !== 0) {
                this.physics.applyPitch(mouseDelta.y * 0.1);
            }
        }

        // Update physics
        this.physics.update(deltaTime);

        // Reset mouse delta
        this.inputManager.resetMouseDelta();

        // Fire if needed
        if (this.inputManager.keys.fire) {
            this.fire();
        }

        // Update last known position
        this.lastPosition.copyFrom(this.mesh.position);
        this.lastRotation.copyFrom(this.mesh.rotation);
    }

    fire() {
        // Implement firing logic here
        console.log(`${this.type} from team ${this.team} fired!`);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isAlive = false;
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }

    cleanup() {
        if (this.inputManager) {
            this.inputManager.cleanup();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
} 