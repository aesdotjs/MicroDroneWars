import { Vector3, Quaternion } from '@babylonjs/core';

export class PhysicsController {
    constructor(vehicle) {
        this.vehicle = vehicle;
        
        // Base physics properties
        this.mass = 1.0;
        this.drag = 0.5;
        this.angularDrag = 0.2;
        this.gravity = 9.81;
        this.groundLevel = 1;

        // Vehicle-specific properties
        if (vehicle.vehicleType === 'drone') {
            this.maxSpeed = 5;
            this.maxAngularSpeed = 0.5;
            this.thrust = 20;
            this.lift = 15;
            this.torque = 1;
            this.hoverForce = 10;
            this.strafeForce = 8;
            this.isDescending = false;
        } else { // plane
            this.maxSpeed = 15;
            this.maxAngularSpeed = 1;
            this.thrust = 30;
            this.lift = 12;
            this.torque = 2;
            this.minSpeed = 3; // Minimum speed to maintain lift
            this.bankAngle = 0.5; // Maximum bank angle for turns
        }

        // State
        this.velocity = Vector3.Zero();
        this.angularVelocity = Vector3.Zero();
        this.acceleration = Vector3.Zero();
        this.angularAcceleration = Vector3.Zero();

        // Forces
        this.forces = Vector3.Zero();
        this.torques = Vector3.Zero();
    }

    update(deltaTime) {
        this.applyPhysics(deltaTime);
        this.updateVehicle(deltaTime);
        this.resetForces();
    }

    applyPhysics(deltaTime) {
        // Apply gravity
        this.addForce(new Vector3(0, -this.gravity * this.mass, 0));

        // Vehicle-specific physics
        if (this.vehicle.vehicleType === 'drone') {
            this.applyDronePhysics(deltaTime);
        } else {
            this.applyPlanePhysics(deltaTime);
        }

        // Apply forces to acceleration
        this.acceleration = this.forces.scale(1 / this.mass);

        // Update velocity
        this.velocity.addInPlace(this.acceleration.scale(deltaTime));

        // Apply drag
        const dragForce = this.velocity.scale(-this.drag);
        this.velocity.addInPlace(dragForce.scale(deltaTime));

        // Clamp velocity
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().scaleInPlace(this.maxSpeed);
        }

        // Apply torques to angular acceleration
        this.angularAcceleration = this.torques.scale(1 / this.mass);

        // Update angular velocity
        this.angularVelocity.addInPlace(this.angularAcceleration.scale(deltaTime));

        // Apply angular drag
        const angularDragForce = this.angularVelocity.scale(-this.angularDrag);
        this.angularVelocity.addInPlace(angularDragForce.scale(deltaTime));

        // Clamp angular velocity
        if (this.angularVelocity.length() > this.maxAngularSpeed) {
            this.angularVelocity.normalize().scaleInPlace(this.maxAngularSpeed);
        }
    }

    applyDronePhysics(deltaTime) {
        // Get input from vehicle's input manager
        const input = this.vehicle.inputManager?.keys || {};
        
        // Always apply hover force to counteract gravity unless actively descending
        if (!this.isDescending) {
            this.addForce(new Vector3(0, this.hoverForce, 0));
        }
        
        // Apply strafe force for lateral movement
        if (input.right || input.left) {
            const right = this.vehicle.mesh.getDirection(Vector3.Right());
            const strafeDirection = input.right ? 1 : -1;
            this.addForce(right.scale(this.strafeForce * strafeDirection));
        }

        // Reset descending state if down key is released
        if (!input.down) {
            this.isDescending = false;
        }
    }

    applyPlanePhysics(deltaTime) {
        // Calculate forward speed
        const forward = this.vehicle.mesh.getDirection(Vector3.Forward());
        const forwardSpeed = Vector3.Dot(this.velocity, forward);

        // Apply lift based on forward speed
        const liftFactor = Math.max(0, forwardSpeed / this.maxSpeed);
        const liftForce = new Vector3(0, this.lift * liftFactor, 0);
        this.addForce(liftForce);

        // Get input from vehicle's input manager
        const input = this.vehicle.inputManager?.keys || {};

        // Apply banking effect during turns
        if (input.right || input.left) {
            const right = this.vehicle.mesh.getDirection(Vector3.Right());
            const bankDirection = input.right ? 1 : -1;
            const bankTorque = right.scale(this.bankAngle * bankDirection);
            this.addTorque(bankTorque);
        }

        // Prevent stalling
        if (forwardSpeed < this.minSpeed) {
            const forwardForce = forward.scale(this.thrust * 0.5);
            this.addForce(forwardForce);
        }
    }

    updateVehicle(deltaTime) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot update vehicle: mesh is null');
            return;
        }

        try {
            // Update position
            const newPosition = this.vehicle.mesh.position.add(this.velocity.scale(deltaTime));
            
            // Ground collision
            if (newPosition.y < this.groundLevel) {
                newPosition.y = this.groundLevel;
                this.velocity.y = 0;
            }
            
            this.vehicle.mesh.position = newPosition;

            // Update rotation using quaternions for smooth rotation
            if (!this.vehicle.mesh.rotationQuaternion) {
                this.vehicle.mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(
                    this.vehicle.mesh.rotation.y,
                    this.vehicle.mesh.rotation.x,
                    this.vehicle.mesh.rotation.z
                );
            }

            // Create delta rotation quaternion
            const deltaRotation = Quaternion.RotationYawPitchRoll(
                this.angularVelocity.y * deltaTime,
                this.angularVelocity.x * deltaTime,
                this.angularVelocity.z * deltaTime
            );
            
            // Multiply quaternions to combine rotations
            this.vehicle.mesh.rotationQuaternion = this.vehicle.mesh.rotationQuaternion.multiply(deltaRotation);

            // Convert quaternion back to Euler angles for the mesh
            const euler = this.vehicle.mesh.rotationQuaternion.toEulerAngles();
            this.vehicle.mesh.rotation = euler;

            // Ensure mesh is visible and properly updated
            this.vehicle.mesh.isVisible = true;
            this.vehicle.mesh.computeWorldMatrix(true);
        } catch (error) {
            console.error('Error updating vehicle position/rotation:', error);
        }
    }

    addForce(force) {
        this.forces.addInPlace(force);
    }

    addTorque(torque) {
        this.torques.addInPlace(torque);
    }

    addForceAtPoint(force, point) {
        this.addForce(force);
        const torque = Vector3.Cross(point.subtract(this.vehicle.mesh.position), force);
        this.addTorque(torque);
    }

    resetForces() {
        this.forces = Vector3.Zero();
        this.torques = Vector3.Zero();
    }

    applyThrust(amount) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot apply thrust: vehicle mesh is null');
            return;
        }

        try {
            const forward = this.vehicle.mesh.getDirection(Vector3.Forward());
            this.addForce(forward.scale(amount * this.thrust));
        } catch (error) {
            console.error('Error applying thrust:', error);
        }
    }

    applyLift(amount) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot apply lift: vehicle mesh is null');
            return;
        }

        try {
            const up = this.vehicle.mesh.getDirection(Vector3.Up());
            if (amount > 0) {
                // Going up - apply lift force
                this.addForce(up.scale(amount * this.lift));
                this.isDescending = false;
            } else if (amount < 0) {
                // Going down - only apply force while key is pressed
                this.addForce(up.scale(amount * this.lift * 0.5)); // Reduced downward force
                this.isDescending = true;
            }
        } catch (error) {
            console.error('Error applying lift:', error);
        }
    }

    applyYaw(amount) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot apply yaw: vehicle mesh is null');
            return;
        }

        try {
            const up = this.vehicle.mesh.getDirection(Vector3.Up());
            this.addTorque(up.scale(amount * this.torque));
        } catch (error) {
            console.error('Error applying yaw:', error);
        }
    }

    applyPitch(amount) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot apply pitch: vehicle mesh is null');
            return;
        }

        try {
            const right = this.vehicle.mesh.getDirection(Vector3.Right());
            this.addTorque(right.scale(amount * this.torque));
        } catch (error) {
            console.error('Error applying pitch:', error);
        }
    }

    applyRoll(amount) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot apply roll: vehicle mesh is null');
            return;
        }

        try {
            const forward = this.vehicle.mesh.getDirection(Vector3.Forward());
            this.addTorque(forward.scale(amount * this.torque));
        } catch (error) {
            console.error('Error applying roll:', error);
        }
    }
} 