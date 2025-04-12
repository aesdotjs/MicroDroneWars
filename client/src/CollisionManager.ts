import { Scene, Vector3, Ray, AbstractMesh } from '@babylonjs/core';

interface Vehicle {
    mesh: AbstractMesh;
    physics: {
        velocity: Vector3;
        addForce: (force: Vector3) => void;
        addTorque: (torque: Vector3) => void;
    };
    takeDamage?: (damage: number) => void;
    collisionSphere: {
        position: Vector3;
        radius: number;
    };
}

export class CollisionManager {
    private scene: Scene;
    private vehicles: Set<Vehicle>;
    private environmentMeshes: Set<AbstractMesh>;
    private collisionRadius: number;

    constructor(scene: Scene) {
        this.scene = scene;
        this.vehicles = new Set();
        this.environmentMeshes = new Set();
        this.collisionRadius = 2.0;
    }

    addVehicle(vehicle: Vehicle): void {
        if (!vehicle || !vehicle.mesh) {
            console.warn('Attempted to add invalid vehicle to CollisionManager');
            return;
        }
        
        this.vehicles.add(vehicle);
        this.setupVehicleCollision(vehicle);
    }

    removeVehicle(vehicle: Vehicle): void {
        if (!vehicle) return;
        this.vehicles.delete(vehicle);
    }

    addEnvironmentMesh(mesh: AbstractMesh): void {
        if (!mesh) {
            console.warn('Attempted to add invalid environment mesh to CollisionManager');
            return;
        }
        this.environmentMeshes.add(mesh);
    }

    removeEnvironmentMesh(mesh: AbstractMesh): void {
        if (!mesh) return;
        this.environmentMeshes.delete(mesh);
    }

    private setupVehicleCollision(vehicle: Vehicle): void {
        if (!vehicle || !vehicle.mesh) {
            console.warn('Attempted to setup collision for invalid vehicle');
            return;
        }

        vehicle.mesh.checkCollisions = true;
        
        vehicle.collisionSphere = {
            position: vehicle.mesh.position,
            radius: this.collisionRadius
        };
    }

    update(deltaTime: number): void {
        try {
            this.checkVehicleCollisions();
            this.checkEnvironmentCollisions();
        } catch (error) {
            console.error('Error in CollisionManager update:', error);
        }
    }

    private checkVehicleCollisions(): void {
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

    private checkEnvironmentCollisions(): void {
        for (const vehicle of this.vehicles) {
            if (!vehicle?.mesh || !vehicle?.mesh.position) {
                console.warn('Skipping environment collision check for invalid vehicle');
                continue;
            }

            try {
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
                    if (hit?.hit && hit.pickedMesh && this.environmentMeshes.has(hit.pickedMesh)) {
                        this.handleEnvironmentCollision(vehicle, hit);
                    }
                }
            } catch (error) {
                console.error('Error checking environment collisions:', error);
            }
        }
    }

    private areSpheresColliding(sphere1: { position: Vector3; radius: number }, sphere2: { position: Vector3; radius: number }): boolean {
        if (!sphere1?.position || !sphere2?.position) return false;
        
        const distance = Vector3.Distance(sphere1.position, sphere2.position);
        return distance < (sphere1.radius + sphere2.radius);
    }

    private handleVehicleCollision(vehicle1: Vehicle, vehicle2: Vehicle): void {
        if (!vehicle1?.mesh || !vehicle2?.mesh || !vehicle1?.physics || !vehicle2?.physics) {
            console.warn('Attempted to handle collision with invalid vehicles');
            return;
        }

        try {
            const collisionNormal = vehicle2.mesh.position.subtract(vehicle1.mesh.position).normalize();
            const relativeVelocity = vehicle2.physics.velocity.subtract(vehicle1.physics.velocity);
            const impulse = 2 * Vector3.Dot(relativeVelocity, collisionNormal) / 2;
            
            const response = collisionNormal.scale(impulse);
            vehicle1.physics.addForce(response);
            vehicle2.physics.addForce(response.scale(-1));
            
            const damage = Math.abs(impulse) * 10;
            vehicle1.takeDamage?.(damage);
            vehicle2.takeDamage?.(damage);

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

    private handleEnvironmentCollision(vehicle: Vehicle, hit: { getNormal: (useWorldCoordinates?: boolean) => Vector3 | null }): void {
        if (!vehicle?.mesh || !vehicle?.physics || !hit?.getNormal) {
            console.warn('Attempted to handle environment collision with invalid parameters');
            return;
        }

        try {
            const collisionNormal = hit.getNormal(true);
            if (!collisionNormal) return;
            
            const dot = Vector3.Dot(vehicle.physics.velocity, collisionNormal);
            const reflection = vehicle.physics.velocity.subtract(collisionNormal.scale(2 * dot));
            
            vehicle.physics.velocity = reflection.scale(0.5);
            
            const impactSpeed = vehicle.physics.velocity.length();
            const damage = impactSpeed * 5;
            vehicle.takeDamage?.(damage);

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