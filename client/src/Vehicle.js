import { Vector3, Quaternion, ParticleSystem, Color4, Texture } from '@babylonjs/core';
import { PhysicsController } from './controllers/PhysicsController';

export class Vehicle {
    constructor(scene, mesh, type, team) {
        this.scene = scene;
        this.mesh = mesh;
        this.type = type;
        this.team = team;
        this.health = 100;
        this.maxHealth = 100;
        this.isLocalPlayer = false;
        this.inputManager = null;
        this.isInitialized = false;

        // Initialize physics and particles only if mesh is valid
        if (this.mesh) {
            this.initialize();
        } else {
            console.warn('Vehicle created with null mesh, initialization deferred');
        }
    }

    initialize() {
        if (this.isInitialized) return;
        
        if (!this.mesh) {
            console.error('Cannot initialize vehicle: mesh is null');
            return;
        }

        try {
            // Initialize physics
            this.physics = new PhysicsController(this);

            // Create thruster particles
            this.setupThrusterParticles();

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing vehicle:', error);
        }
    }

    setupThrusterParticles() {
        if (!this.mesh) {
            console.warn('Cannot setup thruster particles: mesh is null');
            return;
        }

        try {
            // Main thruster
            this.mainThruster = new ParticleSystem("thruster", 2000, this.scene);
            this.mainThruster.particleTexture = new Texture("assets/textures/flare.png", this.scene);
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
        } catch (error) {
            console.error('Error setting up thruster particles:', error);
        }
    }

    setAsLocalPlayer(inputManager) {
        this.isLocalPlayer = true;
        this.inputManager = inputManager;
    }

    update(deltaTime) {
        if (!this.isInitialized) {
            this.initialize();
            return;
        }

        if (this.isLocalPlayer && this.inputManager) {
            this.handleInput(deltaTime);
        }

        // Update physics
        if (this.physics) {
            this.physics.update(deltaTime);
        }

        // Update particle effects
        this.updateParticles();
    }

    handleInput(deltaTime) {
        const { keys } = this.inputManager;

        // Forward/backward thrust
        if (keys.forward) {
            this.physics.applyThrust(1.0);
        } else if (keys.backward) {
            this.physics.applyThrust(-0.5);
        }

        // Vertical movement
        if (keys.up) {
            this.physics.applyLift(1.0);
        } else if (keys.down) {
            this.physics.applyLift(-1.0);
        }

        // Roll
        if (keys.rollLeft) {
            this.physics.applyRoll(-1.0);
        } else if (keys.rollRight) {
            this.physics.applyRoll(1.0);
        }

        // Mouse look
        if (this.inputManager.mouseDeltaX !== 0 || this.inputManager.mouseDeltaY !== 0) {
            this.physics.applyYaw(this.inputManager.mouseDeltaX * 0.001);
            this.physics.applyPitch(-this.inputManager.mouseDeltaY * 0.001);
            this.inputManager.resetMouseDelta();
        }
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
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.mainThruster) {
            this.mainThruster.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
} 