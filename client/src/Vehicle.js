import { Vector3, Quaternion, ParticleSystem, Color4, Texture } from '@babylonjs/core';
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
    }

    initialize(scene) {
        if (!this.mesh) {
            console.warn('Cannot initialize vehicle: mesh is null');
            return;
        }

        // Set initial position based on team
        const spawnPoint = this.getTeamSpawnPoint(this.team);
        this.mesh.position = new Vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.lastPosition.copyFrom(this.mesh.position);
        this.lastRotation.copyFrom(this.mesh.rotation);

        // Initialize physics
        this.physics = new PhysicsController(this);

        // Create thruster particles
        this.setupThrusterParticles(scene);
    }

    getTeamSpawnPoint(team) {
        return team === 0 
            ? { x: -20, y: 5, z: 0 }  // Team A spawn
            : { x: 20, y: 5, z: 0 };  // Team B spawn
    }

    setupThrusterParticles(scene) {
        if (!this.mesh) return;

        // Main thruster
        this.mainThruster = new ParticleSystem("thruster", 2000, scene);
        this.mainThruster.particleTexture = new Texture("assets/textures/flare.png", scene);
        this.mainThruster.emitter = this.mesh;
        this.mainThruster.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
        this.mainThruster.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
        this.mainThruster.color1 = new Color4(1, 0.5, 0, 1.0);
        this.mainThruster.color2 = new Color4(1, 0.5, 0, 1.0);
        this.mainThruster.colorDead = new Color4(0, 0, 0, 0.0);
        this.mainThruster.minSize = 0.1;
        this.mainThruster.maxSize = 0.5;
        this.mainThruster.minLifeTime = 0.1;
        this.mainThruster.maxLifeTime = 0.2;
        this.mainThruster.emitRate = 500;
        this.mainThruster.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        this.mainThruster.gravity = new Vector3(0, 0, 0);
        this.mainThruster.direction1 = new Vector3(0, 0, 1);
        this.mainThruster.direction2 = new Vector3(0, 0, 1);
        this.mainThruster.minEmitPower = 1;
        this.mainThruster.maxEmitPower = 2;
        this.mainThruster.updateSpeed = 0.01;
        this.mainThruster.start();
    }

    setAsLocalPlayer(inputManager) {
        this.isLocalPlayer = true;
        this.inputManager = inputManager;
        console.log('Vehicle set as local player:', { type: this.type, team: this.team, isLocalPlayer: this.isLocalPlayer });
    }

    updatePosition(position, rotation) {
        if (!this.isLocalPlayer) {
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

    updateParticles() {
        if (!this.mainThruster || !this.mesh) {
            return;
        }

        try {
            // Update thruster position to be at the back of the vehicle
            const backward = this.mesh.getDirection(Vector3.Forward()).scale(-1);
            const thrusterPosition = this.mesh.position.add(backward.scale(1.0));
            this.mainThruster.emitter = thrusterPosition;

            // Update particle direction based on vehicle orientation
            this.mainThruster.direction1 = backward;
            this.mainThruster.direction2 = backward;

            // Adjust emission rate based on thrust
            if (this.physics) {
                const speed = this.physics.velocity.length();
                const normalizedSpeed = Math.min(speed / this.physics.maxSpeed, 1);
                this.mainThruster.emitRate = 100 + 400 * normalizedSpeed;
            }
        } catch (error) {
            console.error('Error updating particles:', error);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isAlive = false;
        if (this.mainThruster) {
            this.mainThruster.dispose();
        }
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