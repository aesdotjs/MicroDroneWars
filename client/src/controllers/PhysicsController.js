import { Vector3, Quaternion } from '@babylonjs/core';
import * as CANNON from 'cannon';

// Shared physics world for all vehicles
const world = new CANNON.World();
world.gravity.set(0, -9.81, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 7;
world.defaultContactMaterial.friction = 0.5;

export class PhysicsController {
    constructor(vehicle) {
        this.vehicle = vehicle;
        
        // Base physics properties
        this.mass = 1.0;
        this.drag = 0.5;
        this.angularDrag = 0.2;
        this.gravity = 9.81;
        this.groundLevel = 1;
        this.maxAngularVelocity = 5; // Limit angular velocity

        // Get initial position from vehicle mesh
        const initialPosition = vehicle.mesh ? 
            new CANNON.Vec3(
                vehicle.mesh.position.x,
                vehicle.mesh.position.y,
                vehicle.mesh.position.z
            ) : new CANNON.Vec3(0, 2, 0);

        // Create vehicle body
        this.body = new CANNON.Body({
            mass: this.mass,
            position: initialPosition,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.15, 0.5)), // Drone dimensions
            material: new CANNON.Material('vehicleMaterial'),
            linearDamping: this.drag,
            angularDamping: this.angularDrag
        });

        // Add body to world
        world.addBody(this.body);

        // Vehicle-specific properties
        if (vehicle.vehicleType === 'drone') {
            this.maxSpeed = 5;
            this.maxAngularSpeed = 0.5;
            this.thrust = 20;
            this.lift = 15;
            this.torque = 1;
            this.hoverForce = this.gravity * this.mass;
            this.strafeForce = 8;
            this.isDescending = false;
        } else { // plane
            this.maxSpeed = 15;
            this.maxAngularSpeed = 1;
            this.thrust = 30;
            this.lift = 12;
            this.torque = 2;
            this.minSpeed = 3;
            this.bankAngle = 0.5;
        }
    }

    update(deltaTime) {
        try {
            // Limit angular velocity
            const angularVelocityMagnitude = this.body.angularVelocity.length();
            if (angularVelocityMagnitude > this.maxAngularVelocity) {
                const scale = this.maxAngularVelocity / angularVelocityMagnitude;
                this.body.angularVelocity.scale(scale, this.body.angularVelocity);
            }

            // Update Cannon.js world (only once per frame)
            world.step(Math.min(deltaTime, 1/60));

            // Sync Babylon.js mesh with Cannon.js body
            if (this.vehicle.mesh) {
                this.vehicle.mesh.position.set(
                    this.body.position.x,
                    this.body.position.y,
                    this.body.position.z
                );
                
                this.vehicle.mesh.rotationQuaternion = new Quaternion(
                    this.body.quaternion.x,
                    this.body.quaternion.y,
                    this.body.quaternion.z,
                    this.body.quaternion.w
                );
            }

            // Apply vehicle-specific physics
            if (this.vehicle.vehicleType === 'drone') {
                this.applyDronePhysics(deltaTime);
            } else {
                this.applyPlanePhysics(deltaTime);
            }
        } catch (error) {
            console.error('Physics update error:', error);
        }
    }

    applyDronePhysics(deltaTime) {
        try {
            const input = this.vehicle.inputManager?.keys || {};
            
            // Apply hover force only when not moving up/down
            if (!input.up && !input.down && !this.isDescending) {
                this.body.applyForce(new CANNON.Vec3(0, this.hoverForce, 0), this.body.position);
            }
            
            // Apply strafe force
            if (input.right || input.left) {
                const right = new CANNON.Vec3(1, 0, 0);
                this.body.vectorToWorldFrame(right, right);
                const strafeDirection = input.right ? 1 : -1;
                this.body.applyForce(right.scale(this.strafeForce * strafeDirection), this.body.position);
            }

            // Reset descending state
            if (!input.down) {
                this.isDescending = false;
            }
        } catch (error) {
            console.error('Drone physics error:', error);
        }
    }

    applyPlanePhysics(deltaTime) {
        try {
            const input = this.vehicle.inputManager?.keys || {};
            
            // Calculate forward speed
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(forward, forward);
            const forwardSpeed = this.body.velocity.dot(forward);

            // Apply lift based on forward speed
            const liftFactor = Math.max(0, forwardSpeed / this.maxSpeed);
            const liftForce = new CANNON.Vec3(0, this.lift * liftFactor, 0);
            this.body.applyForce(liftForce, this.body.position);

            // Apply banking effect during turns
            if (input.right || input.left) {
                const right = new CANNON.Vec3(1, 0, 0);
                this.body.vectorToWorldFrame(right, right);
                const bankDirection = input.right ? 1 : -1;
                const bankTorque = right.scale(this.bankAngle * bankDirection);
                this.body.applyTorque(bankTorque);
            }

            // Prevent stalling
            if (forwardSpeed < this.minSpeed) {
                this.body.applyForce(forward.scale(this.thrust * 0.5), this.body.position);
            }
        } catch (error) {
            console.error('Plane physics error:', error);
        }
    }

    applyThrust(amount) {
        try {
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(forward, forward);
            this.body.applyForce(forward.scale(amount * this.thrust), this.body.position);
        } catch (error) {
            console.error('Apply thrust error:', error);
        }
    }

    applyLift(amount) {
        try {
            const up = new CANNON.Vec3(0, 1, 0);
            this.body.vectorToWorldFrame(up, up);
            if (amount > 0) {
                this.body.applyForce(up.scale(amount * this.lift), this.body.position);
                this.isDescending = false;
            } else if (amount < 0) {
                this.body.applyForce(up.scale(amount * this.lift * 0.5), this.body.position);
                this.isDescending = true;
            }
        } catch (error) {
            console.error('Apply lift error:', error);
        }
    }

    applyYaw(amount) {
        try {
            const up = new CANNON.Vec3(0, 1, 0);
            this.body.vectorToWorldFrame(up, up);
            const torque = up.scale(amount * this.torque);
            this.body.angularVelocity.vadd(torque, this.body.angularVelocity);
        } catch (error) {
            console.error('Apply yaw error:', error);
        }
    }

    applyPitch(amount) {
        try {
            const right = new CANNON.Vec3(1, 0, 0);
            this.body.vectorToWorldFrame(right, right);
            const torque = right.scale(amount * this.torque);
            this.body.angularVelocity.vadd(torque, this.body.angularVelocity);
        } catch (error) {
            console.error('Apply pitch error:', error);
        }
    }

    applyRoll(amount) {
        try {
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(forward, forward);
            const torque = forward.scale(amount * this.torque);
            this.body.angularVelocity.vadd(torque, this.body.angularVelocity);
        } catch (error) {
            console.error('Apply roll error:', error);
        }
    }

    cleanup() {
        if (this.body) {
            world.removeBody(this.body);
        }
    }
} 