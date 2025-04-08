import { Vector3, Ray } from '@babylonjs/core';

export class CollisionManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = new Set();
        this.environmentMeshes = new Set();
        this.collisionRadius = 2.0; // Default collision radius for vehicles
    }

    addVehicle(vehicle) {
        if (!vehicle || !vehicle.mesh) {
            console.warn('Attempted to add invalid vehicle to CollisionManager');
            return;
        }
        
        this.vehicles.add(vehicle);
        this.setupVehicleCollision(vehicle);
    }

    removeVehicle(vehicle) {
        if (!vehicle) return;
        this.vehicles.delete(vehicle);
    }

    addEnvironmentMesh(mesh) {
        if (!mesh) {
            console.warn('Attempted to add invalid environment mesh to CollisionManager');
            return;
        }
        this.environmentMeshes.add(mesh);
    }

    removeEnvironmentMesh(mesh) {
        if (!mesh) return;
        this.environmentMeshes.delete(mesh);
    }

    setupVehicleCollision(vehicle) {
        if (!vehicle || !vehicle.mesh) {
            console.warn('Attempted to setup collision for invalid vehicle');
            return;
        }

        // Create a collision mesh for the vehicle
        vehicle.mesh.checkCollisions = true;
        
        // Create a bounding sphere for collision detection
        vehicle.collisionSphere = {
            position: vehicle.mesh.position,
            radius: this.collisionRadius
        };
    }

    update(deltaTime) {
        try {
            // Check for collisions between vehicles
            this.checkVehicleCollisions();
            
            // Check for collisions between vehicles and environment
            this.checkEnvironmentCollisions();
        } catch (error) {
            console.error('Error in CollisionManager update:', error);
        }
    }

    checkVehicleCollisions() {
        const vehicles = Array.from(this.vehicles);
        
        for (let i = 0; i < vehicles.length; i++) {
            for (let j = i + 1; j < vehicles.length; j++) {
                const vehicle1 = vehicles[i];
                const vehicle2 = vehicles[j];
                
                if (!vehicle1?.mesh || !vehicle2?.mesh) continue;
                
                if (this.areSpheresColliding(
                    vehicle1.collisionSphere,
                    vehicle2.collisionSphere
                )) {
                    this.handleVehicleCollision(vehicle1, vehicle2);
                }
            }
        }
    }

    checkEnvironmentCollisions() {
        for (const vehicle of this.vehicles) {
            if (!vehicle?.mesh || !vehicle?.mesh.position) {
                console.warn('Skipping environment collision check for invalid vehicle');
                continue;
            }

            try {
                // Cast rays in multiple directions to detect environment collisions
                const directions = [
                    Vector3.Forward(),
                    Vector3.Backward(),
                    Vector3.Left(),
                    Vector3.Right(),
                    Vector3.Up(),
                    Vector3.Down()
                ];

                for (const direction of directions) {
                    const ray = new Ray(
                        vehicle.mesh.position,
                        direction,
                        this.collisionRadius
                    );

                    const hit = this.scene.pickWithRay(ray);
                    if (hit?.hit && this.environmentMeshes.has(hit.pickedMesh)) {
                        this.handleEnvironmentCollision(vehicle, hit);
                    }
                }
            } catch (error) {
                console.error('Error checking environment collisions:', error);
            }
        }
    }

    areSpheresColliding(sphere1, sphere2) {
        if (!sphere1?.position || !sphere2?.position) return false;
        
        const distance = Vector3.Distance(sphere1.position, sphere2.position);
        return distance < (sphere1.radius + sphere2.radius);
    }

    handleVehicleCollision(vehicle1, vehicle2) {
        if (!vehicle1?.mesh || !vehicle2?.mesh || !vehicle1?.physics || !vehicle2?.physics) {
            console.warn('Attempted to handle collision with invalid vehicles');
            return;
        }

        try {
            // Calculate collision normal
            const collisionNormal = vehicle2.mesh.position.subtract(vehicle1.mesh.position).normalize();
            
            // Calculate relative velocity
            const relativeVelocity = vehicle2.physics.velocity.subtract(vehicle1.physics.velocity);
            
            // Calculate impulse
            const impulse = 2 * Vector3.Dot(relativeVelocity, collisionNormal) / 2;
            
            // Apply collision response
            const response = collisionNormal.scale(impulse);
            vehicle1.physics.addForce(response);
            vehicle2.physics.addForce(response.scale(-1));
            
            // Apply damage
            const damage = Math.abs(impulse) * 10;
            vehicle1.takeDamage?.(damage);
            vehicle2.takeDamage?.(damage);

            // Add some random torque for visual effect
            const randomTorque = new Vector3(
                (Math.random() - 0.5) * impulse,
                (Math.random() - 0.5) * impulse,
                (Math.random() - 0.5) * impulse
            );
            vehicle1.physics.addTorque(randomTorque);
            vehicle2.physics.addTorque(randomTorque.scale(-1));
        } catch (error) {
            console.error('Error handling vehicle collision:', error);
        }
    }

    handleEnvironmentCollision(vehicle, hit) {
        if (!vehicle?.mesh || !vehicle?.physics || !hit?.getNormal) {
            console.warn('Attempted to handle environment collision with invalid parameters');
            return;
        }

        try {
            // Calculate collision normal
            const collisionNormal = hit.getNormal(true);
            if (!collisionNormal) return;
            
            // Calculate reflection vector
            const dot = Vector3.Dot(vehicle.physics.velocity, collisionNormal);
            const reflection = vehicle.physics.velocity.subtract(collisionNormal.scale(2 * dot));
            
            // Apply collision response with damping
            vehicle.physics.velocity = reflection.scale(0.5);
            
            // Apply damage based on impact velocity
            const impactSpeed = vehicle.physics.velocity.length();
            const damage = impactSpeed * 5;
            vehicle.takeDamage?.(damage);

            // Add some random torque for visual effect
            const randomTorque = new Vector3(
                (Math.random() - 0.5) * impactSpeed,
                (Math.random() - 0.5) * impactSpeed,
                (Math.random() - 0.5) * impactSpeed
            );
            vehicle.physics.addTorque(randomTorque);
        } catch (error) {
            console.error('Error handling environment collision:', error);
        }
    }
} 