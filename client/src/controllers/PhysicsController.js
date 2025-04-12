import { Vector3, Quaternion } from '@babylonjs/core';
import * as CANNON from 'cannon';
import { SpringSimulator } from '../utils/SpringSimulator.js';

// Shared physics world for all vehicles
const world = new CANNON.World();
world.gravity.set(0, -9.81, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 7;
world.defaultContactMaterial.friction = 0.5;

export class PhysicsController {
    constructor(vehicle) {
        console.log(vehicle);
        this.vehicle = vehicle;
        this.body = null;
        this.world = null;
        this.mass = 50.0;
        this.gravity = 9.81;
        this.drag = 0.8;
        this.angularDrag = 0.8;
        this.maxSpeed = 20;
        this.maxAngularSpeed = 0.2;
        this.maxAngularAcceleration = 0.05;
        this.angularDamping = 0.9;
        this.forceMultiplier = 0.005;

        // Spring simulators for smooth control
        this.aileronSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator(60, 0.1, 0.3);

        // Engine power and control
        this.enginePower = 0;
        this.maxEnginePower = 1.0;
        this.enginePowerChangeRate = 0.2;
        this.minEnginePower = 0;

        // Control surfaces
        this.aileronEffectiveness = 0.5;
        this.elevatorEffectiveness = 0.5;
        this.rudderEffectiveness = 0.5;
        this.partsRotationAmount = 0.5;

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
        this.hoverForce = 9.81; // Gravity compensation
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
        this.mouseSensitivity = 0.0001;
        this.mouseDeadzone = 0.1;
        this.targetRotation = new CANNON.Vec3(0, 0, 0);
        this.rotationSmoothing = 0.1;

        // Add yaw control properties
        this.targetYawAngle = 0;
        this.currentYawAngle = 0;
        this.yawRotationSpeed = 0.2;
        this.yawDamping = 0.5;
        this.maxYawSpeed = 1.2;
        this.yawAcceleration = 0.1;

        // Add pitch control properties
        this.targetPitchAngle = 0;
        this.pitchRotationSpeed = 0.2;
        this.pitchDamping = 0.5;
        this.maxPitchSpeed = 1.2;
        this.pitchAcceleration = 0.1;

        // Add roll control properties
        this.targetRollAngle = 0;
        this.rollRotationSpeed = 0.2;
        this.rollDamping = 0.5;
        this.maxRollSpeed = 1.2;
        this.rollAcceleration = 0.1;

        // Add helicopter-like control properties
        this.collective = 0.5; // Initial collective setting (0-1)
        this.collectiveSensitivity = 0.1;
        this.cyclicSensitivity = 0.2;
        this.tailRotorSensitivity = 0.2;
        this.maxCollective = 1.0;
        this.minCollective = 0.0;

        // Vehicle-specific properties
        if (vehicle.vehicleType === 'drone') {
            // Drone-specific properties
            this.thrust = 20;
            this.lift = 15;
            this.torque = 1;
            this.strafeForce = 8;
            this.isDescending = false;
            this.minHeight = 0.5; // Minimum height above ground
            this.motorMaxThrust = 5.0;
            this.motorMinThrust = 0;

            // Motor positions in local space
            this.motorPositions = {
                frontLeft: new CANNON.Vec3(-1.2, 0, 1.2),
                frontRight: new CANNON.Vec3(1.2, 0, 1.2),
                backLeft: new CANNON.Vec3(-1.2, 0, -1.2),
                backRight: new CANNON.Vec3(1.2, 0, -1.2)
            };
        } else { // plane
            this.thrust = 30;
            this.lift = 12;
            this.torque = 2;
            this.minSpeed = 3;
            this.bankAngle = 0.5;
            this.wingArea = 10;
        }

        // Initialize angular velocities
        this.angularVelocity = new CANNON.Vec3(0, 0, 0);

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
        
        // Initialize quaternion based on vehicle type
        if (vehicle.vehicleType === 'plane') {
            // Initialize with nose pointing forward, wings level
            this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
            // Also initialize the vehicle's rotationQuaternion
            this.vehicle.rotationQuaternion = Quaternion.RotationAxis(new Vector3(0, 1, 0), 0);
        }

        // Initialize velocity and angular velocity
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.lastDrag = 0;

        this.body.type = this.vehicle.isLocalPlayer ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC;

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
    }

    update(deltaTime) {
        try {
            // Update Cannon.js world
            world.step(Math.min(deltaTime, 1/60));

            // Update spring simulators
            this.aileronSimulator.simulate(deltaTime);
            this.elevatorSimulator.simulate(deltaTime);
            this.rudderSimulator.simulate(deltaTime);
            this.steeringSimulator.simulate(deltaTime);

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
                    // Ensure quaternion is valid
                    if (isNaN(this.body.quaternion.x) || isNaN(this.body.quaternion.y) || 
                        isNaN(this.body.quaternion.z) || isNaN(this.body.quaternion.w)) {
                        // Reset to identity quaternion if invalid
                        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
                    }
                    
                    // Create Babylon.js quaternion from Cannon.js quaternion
                    if (!this.vehicle.mesh.rotationQuaternion) {
                        this.vehicle.mesh.rotationQuaternion = new Quaternion();
                    }
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
            const mouse = this.vehicle.inputManager?.mouseDelta || { x: 0, y: 0 };
            
            // Get orientation vectors
            const quat = this.body.quaternion;
            const right = new CANNON.Vec3(1, 0, 0);
            const up = new CANNON.Vec3(0, 1, 0);
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(right, right);
            this.body.vectorToWorldFrame(up, up);
            this.body.vectorToWorldFrame(forward, forward);

            // Calculate velocity and speed
            const velocity = new CANNON.Vec3().copy(this.body.velocity);
            const speed = velocity.length();

            // Update engine power
            if (this.vehicle.inputManager) {
                if (this.enginePower < this.maxEnginePower) {
                    this.enginePower += deltaTime * this.enginePowerChangeRate;
                }
            } else {
                if (this.enginePower > 0) {
                    this.enginePower -= deltaTime * 0.06;
                }
            }

            // Vertical stabilization with gravity compensation
            const gravity = world.gravity;
            let gravityCompensation = new CANNON.Vec3(-gravity.x, -gravity.y, -gravity.z).length();
            gravityCompensation *= deltaTime;
            gravityCompensation *= 0.98;
            
            // Calculate dot product for gravity compensation
            const globalUp = new CANNON.Vec3(0, 1, 0);
            const dot = globalUp.dot(up);
            gravityCompensation *= Math.sqrt(Math.max(0, Math.min(dot, 1)));

            // Vertical damping
            const vertDamping = new CANNON.Vec3(0, this.body.velocity.y, 0).scale(-0.01);
            const vertStab = up.clone();
            vertStab.scale(gravityCompensation, vertStab);
            vertStab.vadd(vertDamping, vertStab);
            vertStab.scale(this.enginePower, vertStab);

            this.body.velocity.x += vertStab.x;
            this.body.velocity.y += vertStab.y;
            this.body.velocity.z += vertStab.z;

            // Positional damping
            this.body.velocity.x *= 0.995;
            this.body.velocity.z *= 0.995;

            // Apply main thrust (Z key)
            if (input.up) {
                this.body.velocity.x += up.x * 0.15 * this.enginePower;
                this.body.velocity.y += up.y * 0.15 * this.enginePower;
                this.body.velocity.z += up.z * 0.15 * this.enginePower;
            } else if (input.down) {  // S key
                this.body.velocity.x -= up.x * 0.15 * this.enginePower;
                this.body.velocity.y -= up.y * 0.15 * this.enginePower;
                this.body.velocity.z -= up.z * 0.15 * this.enginePower;
            }

            // Apply pitch control (I/K keys)
            if (input.pitchUp) {
                this.body.angularVelocity.x += right.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y += right.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z += right.z * 0.07 * this.enginePower;
            } else if (input.pitchDown) {
                this.body.angularVelocity.x -= right.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y -= right.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z -= right.z * 0.07 * this.enginePower;
            }

            // Apply roll control (J/L keys)
            if (input.rollLeft) {
                this.body.angularVelocity.x += forward.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y += forward.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z += forward.z * 0.07 * this.enginePower;
            } else if (input.rollRight) {
                this.body.angularVelocity.x -= forward.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y -= forward.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z -= forward.z * 0.07 * this.enginePower;
            }

            // Apply yaw control (Q/D keys)
            if (input.left) {
                this.body.angularVelocity.x -= up.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y -= up.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z -= up.z * 0.07 * this.enginePower;
            } else if (input.right) {
                this.body.angularVelocity.x += up.x * 0.07 * this.enginePower;
                this.body.angularVelocity.y += up.y * 0.07 * this.enginePower;
                this.body.angularVelocity.z += up.z * 0.07 * this.enginePower;
            }


            if (mouse.x !== 0) {
                const mouseXEffect = mouse.x * 0.005;
                this.body.angularVelocity.x += up.x * mouseXEffect;
                this.body.angularVelocity.y += up.y * mouseXEffect;
                this.body.angularVelocity.z += up.z * mouseXEffect;
            }
            if (mouse.y !== 0) {
                const mouseYEffect = mouse.y * 0.005;
                this.body.angularVelocity.x += right.x * mouseYEffect;
                this.body.angularVelocity.y += right.y * mouseYEffect;
                this.body.angularVelocity.z += right.z * mouseYEffect;
            }
            // Reset mouse delta after using it
            this.vehicle.inputManager?.resetMouseDelta();

            // Rotation stabilization
            // if (this.vehicle.isLocalPlayer) {
            //     const rotStabVelocity = new CANNON.Quaternion();
            //     rotStabVelocity.setFromVectors(up, globalUp);
            //     rotStabVelocity.x *= 0.3;
            //     rotStabVelocity.y *= 0.3;
            //     rotStabVelocity.z *= 0.3;
            //     rotStabVelocity.w *= 0.3;
                
            //     // Convert quaternion to Euler angles
            //     const rotStabEuler = new CANNON.Vec3();
            //     const euler = new CANNON.Vec3();
            //     rotStabVelocity.toEuler(euler);
            //     rotStabEuler.copy(euler);
                
            //     this.body.angularVelocity.x += rotStabEuler.x * this.enginePower;
            //     this.body.angularVelocity.y += rotStabEuler.y * this.enginePower;
            //     this.body.angularVelocity.z += rotStabEuler.z * this.enginePower;
            // }

            // Angular damping
            this.body.angularVelocity.x *= 0.97;
            this.body.angularVelocity.y *= 0.97;
            this.body.angularVelocity.z *= 0.97;

        } catch (error) {
            console.error('Drone physics error:', error);
        }
    }

    applyPlanePhysics(deltaTime) {
        try {
            const input = this.vehicle.inputManager?.keys || {};
            const mouse = this.vehicle.inputManager?.mouseDelta || { x: 0, y: 0 };
            
            // Get orientation vectors
            const quat = this.body.quaternion;
            const right = new CANNON.Vec3(1, 0, 0);
            const up = new CANNON.Vec3(0, 1, 0);
            const forward = new CANNON.Vec3(0, 0, 1);
            this.body.vectorToWorldFrame(right, right);
            this.body.vectorToWorldFrame(up, up);
            this.body.vectorToWorldFrame(forward, forward);
            
            // Calculate velocity and speed with safety checks
            const velocity = new CANNON.Vec3().copy(this.body.velocity);
            
            // Ensure velocity is valid
            if (isNaN(velocity.x) || isNaN(velocity.y) || isNaN(velocity.z)) {
                console.warn('Invalid velocity detected, resetting to zero');
                velocity.set(0, 0, 0);
                this.body.velocity.set(0, 0, 0);
            }
            
            const velLength1 = velocity.length();
            const currentSpeed = velocity.dot(forward);

            // Update engine power
            if (input.up) { // Z key for throttle
                if (this.enginePower < this.maxEnginePower) {
                    this.enginePower += deltaTime * this.enginePowerChangeRate;
                }
            } else if (input.down) { // S key for brake
                if (this.enginePower > 0) {
                    this.enginePower -= deltaTime * 0.06;
                }
            }

            // Flight mode influence based on speed
            let flightModeInfluence = currentSpeed / 10;
            flightModeInfluence = Math.min(Math.max(flightModeInfluence, 0), 1);

            // Mass adjustment based on speed
            let lowerMassInfluence = currentSpeed / 10;
            lowerMassInfluence = Math.min(Math.max(lowerMassInfluence, 0), 1);
            this.body.mass = 50 * (1 - (lowerMassInfluence * 0.6));

            // Rotation stabilization
            let lookVelocity = velocity.clone();
            const velLength = lookVelocity.length();
            
            // Only apply rotation stabilization if we have sufficient velocity
            if (velLength > 0.1) {  // Add minimum velocity threshold
                lookVelocity.scale(1/velLength); // Safe normalization
                
                // Calculate rotation difference between forward and look velocity
                const rotStabVelocity = new CANNON.Quaternion();
                const axis = new CANNON.Vec3();
                const dot = forward.dot(lookVelocity);
                
                // Clamp dot product to valid range
                const clampedDot = Math.max(-1, Math.min(1, dot));
                const angle = Math.acos(clampedDot);
                
                if (angle > 0.001) {
                    axis.cross(forward, lookVelocity);
                    const axisLength = axis.length();
                    
                    if (axisLength > 0.001) {  // Make sure we have a valid axis
                        axis.normalize();
                        rotStabVelocity.setFromAxisAngle(axis, angle);
                        
                        // Scale the rotation
                        rotStabVelocity.x *= 0.3;
                        rotStabVelocity.y *= 0.3;
                        rotStabVelocity.z *= 0.3;
                        rotStabVelocity.w *= 0.3;
                        
                        // Convert quaternion to euler angles
                        const rotStabEuler = new CANNON.Vec3();
                        const euler = new CANNON.Vec3();
                        rotStabVelocity.toEuler(euler);
                        rotStabEuler.copy(euler);
                        
                        let rotStabInfluence = Math.min(Math.max(velLength1 - 1, 0), 0.1);
                        let loopFix = (input.up && currentSpeed > 0 ? 0 : 1);
                        
                        this.body.angularVelocity.x += rotStabEuler.x * rotStabInfluence * loopFix;
                        this.body.angularVelocity.y += rotStabEuler.y * rotStabInfluence;
                        this.body.angularVelocity.z += rotStabEuler.z * rotStabInfluence * loopFix;
                    }
                }
            } else {
                // When velocity is low, use a simpler stabilization
                const globalUp = new CANNON.Vec3(0, 1, 0);
                const dot = globalUp.dot(up);
                
                if (Math.abs(dot) < 0.99) { // If not already aligned with up
                    const rotStabVelocity = new CANNON.Quaternion();
                    rotStabVelocity.setFromVectors(up, globalUp);
                    rotStabVelocity.x *= 0.1;
                    rotStabVelocity.y *= 0.1;
                    rotStabVelocity.z *= 0.1;
                    rotStabVelocity.w *= 0.1;
                    
                    // Convert quaternion to euler angles
                    const rotStabEuler = new CANNON.Vec3();
                    const euler = new CANNON.Vec3();
                    rotStabVelocity.toEuler(euler);
                    rotStabEuler.copy(euler);
                    
                    this.body.angularVelocity.x += rotStabEuler.x * 0.1;
                    this.body.angularVelocity.y += rotStabEuler.y * 0.1;
                    this.body.angularVelocity.z += rotStabEuler.z * 0.1;
                }
            }

            // Apply pitch control (I/K keys)
            if (input.pitchUp) {
                this.body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * this.enginePower;
            } else if (input.pitchDown) {
                this.body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * this.enginePower;
            }

            // Apply yaw control (Q/D keys)
            if (input.left) {
                this.body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * this.enginePower;
            } else if (input.right) {
                this.body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * this.enginePower;
            }

            // Apply roll control (J/L keys)
            if (input.rollLeft) {
                this.body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * this.enginePower;
            } else if (input.rollRight) {
                this.body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * this.enginePower;
                this.body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * this.enginePower;
            }


            if (mouse.x !== 0) {
                const mouseXEffect = mouse.x * 0.005;
                this.body.angularVelocity.x += up.x * mouseXEffect;
                this.body.angularVelocity.y += up.y * mouseXEffect;
                this.body.angularVelocity.z += up.z * mouseXEffect;
            }
            if (mouse.y !== 0) {
                const mouseYEffect = mouse.y * 0.005;
                this.body.angularVelocity.x += right.x * mouseYEffect;
                this.body.angularVelocity.y += right.y * mouseYEffect;
                this.body.angularVelocity.z += right.z * mouseYEffect;
            }

            // Reset mouse delta after using it
            this.vehicle.inputManager?.resetMouseDelta();

            // Thrust
            let speedModifier = 0.02;
            if (input.up && !input.down) {
                speedModifier = 0.06;
            } else if (!input.up && input.down) {
                speedModifier = -0.05;
            }

            // Ensure position is valid before applying forces
            if (isNaN(this.body.position.x) || isNaN(this.body.position.y) || isNaN(this.body.position.z)) {
                console.warn('Invalid body position detected, resetting to mesh position');
                this.body.position.set(
                    this.vehicle.mesh.position.x,
                    this.vehicle.mesh.position.y,
                    this.vehicle.mesh.position.z
                );
            }

            this.body.velocity.x += (velLength1 * this.lastDrag + speedModifier) * forward.x * this.enginePower;
            this.body.velocity.y += (velLength1 * this.lastDrag + speedModifier) * forward.y * this.enginePower;
            this.body.velocity.z += (velLength1 * this.lastDrag + speedModifier) * forward.z * this.enginePower;

            // Drag
            let velLength2 = this.body.velocity.length();
            const drag = Math.pow(velLength2, 1) * 0.003 * this.enginePower;
            this.body.velocity.x -= this.body.velocity.x * drag;
            this.body.velocity.y -= this.body.velocity.y * drag;
            this.body.velocity.z -= this.body.velocity.z * drag;
            this.lastDrag = drag;

            // Lift
            let lift = Math.pow(velLength2, 1) * 0.005 * this.enginePower;
            lift = Math.min(Math.max(lift, 0), 0.05);
            this.body.velocity.x += up.x * lift;
            this.body.velocity.y += up.y * lift;
            this.body.velocity.z += up.z * lift;

            // Angular damping
            this.body.angularVelocity.x = this.body.angularVelocity.x * (1 - 0.02 * flightModeInfluence);
            this.body.angularVelocity.y = this.body.angularVelocity.y * (1 - 0.02 * flightModeInfluence);
            this.body.angularVelocity.z = this.body.angularVelocity.z * (1 - 0.02 * flightModeInfluence);

            // Add damping to prevent continuous rotation
            const mouseDamping = 0.95;
            this.body.angularVelocity.x *= mouseDamping;
            this.body.angularVelocity.y *= mouseDamping;
            this.body.angularVelocity.z *= mouseDamping;

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