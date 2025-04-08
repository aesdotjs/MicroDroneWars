import { Vector3, Quaternion } from '@babylonjs/core';

export class PhysicsController {
    constructor(vehicle) {
        this.vehicle = vehicle;
        
        // Physics properties
        this.mass = 1.0;
        this.drag = 0.1;
        this.angularDrag = 0.05;
        this.maxSpeed = 20;
        this.maxAngularSpeed = 2;
        this.thrust = 20;
        this.lift = 15;
        this.torque = 5;

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

    updateVehicle(deltaTime) {
        if (!this.vehicle?.mesh) {
            console.warn('Cannot update vehicle: mesh is null');
            return;
        }

        try {
            // Update position
            this.vehicle.mesh.position.addInPlace(this.velocity.scale(deltaTime));

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
            this.addForce(up.scale(amount * this.lift));
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