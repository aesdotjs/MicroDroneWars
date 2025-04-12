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
        this.lastRotationQuaternion = new Quaternion(0, 0, 0, 1);
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
        this.lastRotationQuaternion.copyFrom(this.mesh.rotationQuaternion || new Quaternion(0, 0, 0, 1));
        
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

    updatePosition(position, quaternion, velocity = null) {
        if (!this.isLocalPlayer && this.mesh) {
            // Smoothly interpolate position for remote players
            const targetPosition = new Vector3(position.x, position.y, position.z);
            this.mesh.position = Vector3.Lerp(
                this.mesh.position,
                targetPosition,
                this.positionLerpFactor
            );
            
            // Smoothly interpolate rotation for remote players using quaternion
            if (!this.mesh.rotationQuaternion) {
                this.mesh.rotationQuaternion = new Quaternion();
            }
            const targetQuaternion = new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            this.mesh.rotationQuaternion = Quaternion.Slerp(
                this.mesh.rotationQuaternion,
                targetQuaternion,
                this.rotationLerpFactor
            );
            
            // Update physics body if available
            if (this.physics && this.physics.body) {
                // Interpolate physics body position
                const currentBodyPos = new Vector3(
                    this.physics.body.position.x,
                    this.physics.body.position.y,
                    this.physics.body.position.z
                );
                const interpolatedBodyPos = Vector3.Lerp(
                    currentBodyPos,
                    targetPosition,
                    this.positionLerpFactor
                );
                this.physics.body.position.set(
                    interpolatedBodyPos.x,
                    interpolatedBodyPos.y,
                    interpolatedBodyPos.z
                );

                // Interpolate physics body rotation
                const currentBodyQuat = new Quaternion(
                    this.physics.body.quaternion.x,
                    this.physics.body.quaternion.y,
                    this.physics.body.quaternion.z,
                    this.physics.body.quaternion.w
                );
                const interpolatedBodyQuat = Quaternion.Slerp(
                    currentBodyQuat,
                    targetQuaternion,
                    this.rotationLerpFactor
                );
                this.physics.body.quaternion.set(
                    interpolatedBodyQuat.x,
                    interpolatedBodyQuat.y,
                    interpolatedBodyQuat.z,
                    interpolatedBodyQuat.w
                );

                // Interpolate velocity if provided
                if (velocity) {
                    const targetVelocity = new Vector3(velocity.x, velocity.y, velocity.z);
                    const currentVelocity = new Vector3(
                        this.physics.body.velocity.x,
                        this.physics.body.velocity.y,
                        this.physics.body.velocity.z
                    );
                    const interpolatedVelocity = Vector3.Lerp(
                        currentVelocity,
                        targetVelocity,
                        this.positionLerpFactor
                    );
                    this.physics.body.velocity.set(
                        interpolatedVelocity.x,
                        interpolatedVelocity.y,
                        interpolatedVelocity.z
                    );
                }
            }
            
            // Update last known position and rotation
            this.lastPosition.copyFrom(this.mesh.position);
            this.lastRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
        }
    }

    update(deltaTime) {
        if (!this.mesh || !this.isAlive || !this.inputManager || !this.physics) {
            return;
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
        this.lastRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
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