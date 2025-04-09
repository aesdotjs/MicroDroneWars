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
        this.body = null;
        this.world = null;
        this.mass = 1.0;
        this.gravity = 9.81;
        this.drag = 0.8;
        this.angularDrag = 0.8;
        this.maxSpeed = 10;
        this.maxAngularSpeed = 0.2;
        this.maxAngularAcceleration = 0.05;
        this.angularDamping = 0.9;
        this.forceMultiplier = 0.005;

        // Debug logging
        this.lastLogTime = 0;
        this.logInterval = 0.24;

        // Quadrotor-specific properties
        this.maxThrottle = 10;
        this.minThrottle = 0;
        this.currentThrottle = 0;
        this.throttleSensitivity = 0.2;
        this.yawSensitivity = 0.5;
        this.pitchSensitivity = 0.2;
        this.rollSensitivity = 0.2;
        this.hoverForce = 0;
        this.turbulence = 0.05;
        this.climbPower = 1.0;
        this.deltaPower = 1.0;

        // Motor properties
        this.motorSpeed = {
            frontLeft: this.hoverForce,
            frontRight: this.hoverForce,
            backLeft: this.hoverForce,
            backRight: this.hoverForce
        };
        this.motorThrust = {
            frontLeft: 0,
            frontRight: 0,
            backLeft: 0,
            backRight: 0
        };
        this.motorMaxThrust = 5.0; // Lower max thrust
        this.motorMinThrust = 0;

        // Motor positions in local space
        this.motorPositions = {
            frontLeft: new CANNON.Vec3(-1.2, 0, 1.2),
            frontRight: new CANNON.Vec3(1.2, 0, 1.2),
            backLeft: new CANNON.Vec3(-1.2, 0, -1.2),
            backRight: new CANNON.Vec3(1.2, 0, -1.2)
        };

        // Aerodynamic properties
        this.airDensity = 1.225;
        this.propellerArea = 0.1;
        this.dragCoefficient = 0.5;
        this.liftCoefficient = 1.0;

        // Stability properties
        this.pitchStability = 0.02;
        this.rollStability = 0.02;
        this.yawStability = 0.02;

        // Mouse control properties
        this.mouseSensitivity = 0.0005;
        this.mouseDeadzone = 0.1;
        this.targetRotation = new CANNON.Vec3(0, 0, 0);
        this.rotationSmoothing = 0.1;

        // Add yaw control properties
        this.targetYawAngle = 0;
        this.currentYawAngle = 0;
        this.yawRotationSpeed = 0.1;
        this.yawDamping = 0.95;

        // Add pitch control properties
        this.targetPitchAngle = 0;
        this.pitchRotationSpeed = 0.1;
        this.pitchDamping = 0.95;

        // Add roll control properties
        this.targetRollAngle = 0;
        this.rollRotationSpeed = 0.1;
        this.rollDamping = 0.95;

        // Add helicopter-like control properties
        this.collective = 0.5; // Initial collective setting (0-1)
        this.cyclicSensitivity = 0.0005; // Mouse sensitivity for cyclic control
        this.collectiveSensitivity = 0.1; // Mouse wheel sensitivity for collective
        this.tailRotorSensitivity = 0.1; // Mouse button sensitivity for yaw
        this.maxCollective = 1.0;
        this.minCollective = 0.0;

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

        // Create ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            material: new CANNON.Material('groundMaterial')
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate to be horizontal
        world.addBody(groundBody);

        // Add contact material for ground-vehicle interaction
        const contactMaterial = new CANNON.ContactMaterial(
            groundBody.material,
            this.body.material,
            {
                friction: 0.5,
                restitution: 0.3
            }
        );
        world.addContactMaterial(contactMaterial);

        // Vehicle-specific properties
        if (vehicle.vehicleType === 'drone') {
            // Drone-specific properties
            this.thrust = 20;
            this.lift = 15;
            this.torque = 1;
            this.strafeForce = 8;
            this.isDescending = false;
            this.minHeight = 0.5; // Minimum height above ground
            
            // Control surfaces
            this.aileronEffectiveness = 0.5;
            this.elevatorEffectiveness = 0.5;
            this.rudderEffectiveness = 0.5;
        } else { // plane
            this.thrust = 30;
            this.lift = 12;
            this.torque = 2;
            this.minSpeed = 3;
            this.bankAngle = 0.5;
        }
    }

    update(deltaTime) {
        try {
            // Update Cannon.js world
            world.step(Math.min(deltaTime, 1/60));

            // Sync Babylon.js mesh with Cannon.js body
            if (this.vehicle.mesh) {
                // Update position
                this.vehicle.mesh.position.set(
                    this.body.position.x,
                    this.body.position.y,
                    this.body.position.z
                );
                
                // Update rotation using quaternion
                if (this.body.quaternion) {
                    this.vehicle.mesh.rotationQuaternion = new Quaternion(
                        this.body.quaternion.x,
                        this.body.quaternion.y,
                        this.body.quaternion.z,
                        this.body.quaternion.w
                    );
                }
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
            const mouse = this.vehicle.inputManager?.mouse || {};
            
            // Update collective based on mouse wheel
            if (mouse.wheelDelta) {
                this.collective += mouse.wheelDelta * this.collectiveSensitivity;
                this.collective = Math.max(this.minCollective, Math.min(this.maxCollective, this.collective));
            }

            // Apply main rotor thrust based on collective
            const mainRotorThrust = this.collective * this.thrust;
            const up = new CANNON.Vec3(0, 1, 0);
            this.body.vectorToWorldFrame(up, up);
            up.scale(mainRotorThrust, up);
            this.body.applyForce(up, this.body.position);

            // Apply mouse-based yaw and pitch
            if (mouse.deltaX || mouse.deltaY) {
                // Apply yaw from mouse horizontal movement
                const yawInput = -mouse.deltaX * this.mouseSensitivity;
                if (Math.abs(yawInput) > this.mouseDeadzone) {
                    this.applyYaw(yawInput);
                }

                // Apply pitch from mouse vertical movement
                const pitchInput = -mouse.deltaY * this.mouseSensitivity;
                if (Math.abs(pitchInput) > this.mouseDeadzone) {
                    this.applyPitch(pitchInput);
                }
            }

            // Apply keyboard controls
            if (input.up) {
                this.collective = Math.min(this.maxCollective, this.collective + deltaTime * 0.5);
            } else if (input.down) {
                this.collective = Math.max(this.minCollective, this.collective - deltaTime * 0.5);
            }

            // Apply pitch from keyboard (I/K)
            if (input.pitchUp) {
                this.applyPitch(1.0);
            } else if (input.pitchDown) {
                this.applyPitch(-1.0);
            }

            // Apply roll from keyboard (J/L)
            if (input.rollLeft) {
                this.applyRoll(-1.0);
            } else if (input.rollRight) {
                this.applyRoll(1.0);
            }

            // Apply yaw from keyboard (Q/D)
            if (input.left) {
                this.applyYaw(-1.0);
            } else if (input.right) {
                this.applyYaw(1.0);
            }

            // Apply forward/backward movement (Z/S)
            if (input.forward) {
                const forward = new CANNON.Vec3(0, 0, 1);
                this.body.vectorToWorldFrame(forward, forward);
                forward.scale(this.thrust * 0.5, forward);
                this.body.applyForce(forward, this.body.position);
            } else if (input.backward) {
                const backward = new CANNON.Vec3(0, 0, -1);
                this.body.vectorToWorldFrame(backward, backward);
                backward.scale(this.thrust * 0.5, backward);
                this.body.applyForce(backward, this.body.position);
            }

            // Apply stability forces
            this.applyStabilityForces();
        } catch (error) {
            console.error('Drone physics error:', error);
        }
    }

    applyStabilityForces() {
        try {
            // Calculate angular velocity components
            const angularVelocity = this.body.angularVelocity;
            
            // Apply reduced pitch stability
            const pitchTorque = new CANNON.Vec3(
                -angularVelocity.x * this.pitchStability * 0.1,
                0,
                0
            );
            this.body.applyImpulse(pitchTorque, this.body.position);
            
            // Apply reduced roll stability
            const rollTorque = new CANNON.Vec3(
                0,
                -angularVelocity.y * this.rollStability * 0.1,
                0
            );
            this.body.applyImpulse(rollTorque, this.body.position);
            
            // Apply reduced yaw stability
            const yawTorque = new CANNON.Vec3(
                0,
                0,
                -angularVelocity.z * this.yawStability * 0.1
            );
            this.body.applyImpulse(yawTorque, this.body.position);
        } catch (error) {
            console.error('Apply stability forces error:', error);
        }
    }

    applyThrust(amount) {
        try {
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(forward, forward);
            
            // Calculate thrust force with momentum
            const thrustForce = new CANNON.Vec3();
            thrustForce.copy(forward);
            thrustForce.scale(amount * this.thrust, thrustForce);
            
            const currentVelocity = this.body.velocity;
            const targetVelocity = new CANNON.Vec3();
            targetVelocity.copy(thrustForce);
            targetVelocity.scale(1/this.mass, targetVelocity);
            
            const velocityDiff = new CANNON.Vec3();
            velocityDiff.copy(targetVelocity);
            velocityDiff.vsub(currentVelocity, velocityDiff);
            
            const finalForce = new CANNON.Vec3();
            finalForce.copy(velocityDiff);
            finalForce.scale(this.mass, finalForce);
            
            this.body.applyForce(finalForce, this.body.position);
        } catch (error) {
            console.error('Apply thrust error:', error);
        }
    }

    applyLift(amount) {
        try {
            const up = new CANNON.Vec3(0, 1, 0);
            this.body.vectorToWorldFrame(up, up);
            
            if (amount > 0) {
                // Calculate lift force with momentum
                const liftForce = new CANNON.Vec3();
                liftForce.copy(up);
                liftForce.scale(amount * this.lift, liftForce);
                
                const currentVelocity = this.body.velocity;
                const targetVelocity = new CANNON.Vec3();
                targetVelocity.copy(liftForce);
                targetVelocity.scale(1/this.mass, targetVelocity);
                
                const velocityDiff = new CANNON.Vec3();
                velocityDiff.copy(targetVelocity);
                velocityDiff.vsub(currentVelocity, velocityDiff);
                
                const finalForce = new CANNON.Vec3();
                finalForce.copy(velocityDiff);
                finalForce.scale(this.mass, finalForce);
                
                this.body.applyForce(finalForce, this.body.position);
                this.isDescending = false;
            } else if (amount < 0) {
                // Apply reduced downward force
                const downForce = new CANNON.Vec3();
                downForce.copy(up);
                downForce.scale(amount * this.lift * 0.5, downForce);
                this.body.applyForce(downForce, this.body.position);
                this.isDescending = true;
            }
        } catch (error) {
            console.error('Apply lift error:', error);
        }
    }

    applyYaw(amount) {
        // Update target yaw angle based on input
        this.targetYawAngle += amount * this.yawRotationSpeed;
        
        // Get current rotation
        const currentRotation = new CANNON.Vec3();
        this.body.quaternion.toEuler(currentRotation);
        
        // Calculate yaw difference
        const yawDiff = this.targetYawAngle - currentRotation.y;
        
        // Calculate yaw force based on difference
        const yawForce = yawDiff * this.maxAngularSpeed * this.mass;
        
        // Get the right direction in world space
        const right = new CANNON.Vec3(1, 0, 0);
        this.body.vectorToWorldFrame(right, right);
        
        // Create a force vector in the right direction
        const force = new CANNON.Vec3();
        force.copy(right);
        force.scale(yawForce, force);
        
        // Apply the force at a point offset from the center of mass to create torque
        const offset = new CANNON.Vec3(0, 0, 1); // Offset in front of center of mass
        this.body.vectorToWorldFrame(offset, offset);
        
        // Apply the force at the offset point
        this.body.applyForce(force, offset);
        
        // Apply an equal and opposite force at the opposite point to maintain stability
        const oppositeOffset = new CANNON.Vec3(0, 0, -1);
        this.body.vectorToWorldFrame(oppositeOffset, oppositeOffset);
        const oppositeForce = new CANNON.Vec3();
        oppositeForce.copy(force);
        oppositeForce.scale(-1, oppositeForce);
        this.body.applyForce(oppositeForce, oppositeOffset);
        
        // Apply damping to prevent overshooting
        this.body.angularVelocity.y *= this.yawDamping;
    }

    applyPitch(amount) {
        // Update target pitch angle based on input
        this.targetPitchAngle += amount * this.pitchRotationSpeed;
        
        // Get current rotation
        const currentRotation = new CANNON.Vec3();
        this.body.quaternion.toEuler(currentRotation);
        
        // Calculate pitch difference
        const pitchDiff = this.targetPitchAngle - currentRotation.x;
        
        // Calculate pitch force based on difference
        const pitchForce = pitchDiff * this.maxAngularSpeed * this.mass;
        
        // Get the right direction in world space
        const right = new CANNON.Vec3(1, 0, 0);
        this.body.vectorToWorldFrame(right, right);
        
        // Create a force vector in the right direction
        const force = new CANNON.Vec3();
        force.copy(right);
        force.scale(pitchForce, force);
        
        // Apply the force at a point offset from the center of mass to create torque
        const offset = new CANNON.Vec3(0, 0, 1); // Offset in front of center of mass
        this.body.vectorToWorldFrame(offset, offset);
        
        // Apply the force at the offset point
        this.body.applyForce(force, offset);
        
        // Apply an equal and opposite force at the opposite point to maintain stability
        const oppositeOffset = new CANNON.Vec3(0, 0, -1);
        this.body.vectorToWorldFrame(oppositeOffset, oppositeOffset);
        const oppositeForce = new CANNON.Vec3();
        oppositeForce.copy(force);
        oppositeForce.scale(-1, oppositeForce);
        this.body.applyForce(oppositeForce, oppositeOffset);
        
        // Apply damping to prevent overshooting
        this.body.angularVelocity.x *= this.pitchDamping;
    }

    applyRoll(amount) {
        try {
            // Update target roll angle based on input
            this.targetRollAngle += amount * this.rollRotationSpeed;
            
            // Get current rotation
            const currentRotation = new CANNON.Vec3();
            this.body.quaternion.toEuler(currentRotation);
            
            // Calculate roll difference
            const rollDiff = this.targetRollAngle - currentRotation.z;
            
            // Calculate roll force based on difference
            const rollForce = rollDiff * this.maxAngularSpeed * this.mass;
            
            // Get the forward direction in world space
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(forward, forward);
            
            // Create a force vector in the forward direction
            const force = new CANNON.Vec3();
            force.copy(forward);
            force.scale(rollForce, force);
            
            // Apply the force at a point offset from the center of mass to create torque
            const offset = new CANNON.Vec3(1, 0, 0); // Offset to the right of center of mass
            this.body.vectorToWorldFrame(offset, offset);
            
            // Apply the force at the offset point
            this.body.applyForce(force, offset);
            
            // Apply an equal and opposite force at the opposite point to maintain stability
            const oppositeOffset = new CANNON.Vec3(-1, 0, 0);
            this.body.vectorToWorldFrame(oppositeOffset, oppositeOffset);
            const oppositeForce = new CANNON.Vec3();
            oppositeForce.copy(force);
            oppositeForce.scale(-1, oppositeForce);
            this.body.applyForce(oppositeForce, oppositeOffset);
            
            // Apply damping to prevent overshooting
            this.body.angularVelocity.z *= this.rollDamping;
        } catch (error) {
            console.error('Apply roll error:', error);
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
                const bankTorque = new CANNON.Vec3();
                bankTorque.copy(right);
                bankTorque.scale(this.bankAngle * bankDirection, bankTorque);
                this.body.applyImpulse(bankTorque, this.body.position);
            }

            // Prevent stalling
            if (forwardSpeed < this.minSpeed) {
                const thrustForce = new CANNON.Vec3();
                thrustForce.copy(forward);
                thrustForce.scale(this.thrust * 0.5, thrustForce);
                this.body.applyForce(thrustForce, this.body.position);
            }
        } catch (error) {
            console.error('Plane physics error:', error);
        }
    }

    cleanup() {
        if (this.body) {
            world.removeBody(this.body);
        }
    }
} 