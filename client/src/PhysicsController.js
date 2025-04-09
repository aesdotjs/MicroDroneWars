import { Vector3 } from '@babylonjs/core';

export class PhysicsController {
    constructor(vehicle) {
        this.vehicle = vehicle;
        this.velocity = new Vector3(0, 0, 0);
        this.angularVelocity = new Vector3(0, 0, 0);
        this.mass = 1.0;
        this.drag = 0.5;
        this.angularDrag = 0.5;
        this.maxSpeed = 0.5;
        this.maxAngularSpeed = 0.2;
        this.forceMultiplier = 0.01;
    }

    applyForce(force) {
        // Apply force to velocity with reduced multiplier
        this.velocity.addInPlace(force.scale(this.forceMultiplier / this.mass));
        
        // Apply drag
        this.velocity.scaleInPlace(1 - this.drag);
        
        // Clamp velocity to max speed
        const speed = this.velocity.length();
        if (speed > this.maxSpeed) {
            this.velocity.scaleInPlace(this.maxSpeed / speed);
        }
    }

    applyTorque(torque) {
        // Apply torque to angular velocity with reduced multiplier
        this.angularVelocity.addInPlace(torque.scale(this.forceMultiplier / this.mass));
        
        // Apply angular drag
        this.angularVelocity.scaleInPlace(1 - this.angularDrag);
        
        // Clamp angular velocity to max speed
        const speed = this.angularVelocity.length();
        if (speed > this.maxAngularSpeed) {
            this.angularVelocity.scaleInPlace(this.maxAngularSpeed / speed);
        }
    }

    update() {
        if (!this.vehicle.mesh) return;

        // Update position based on velocity
        this.vehicle.mesh.position.addInPlace(this.velocity);
        
        // Update rotation based on angular velocity
        this.vehicle.mesh.rotation.addInPlace(this.angularVelocity);
        
        // Ensure the mesh's world matrix is updated
        this.vehicle.mesh.computeWorldMatrix(true);
    }

    reset() {
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
    }
} 