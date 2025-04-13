import { Vector3, Quaternion } from 'babylonjs';
import * as CANNON from 'cannon';
import { SpringSimulator } from '@shared/utils/SpringSimulator';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';
import { ClientPhysicsWorld } from '../physics/ClientPhysicsWorld';

export class PhysicsController {
    private physicsWorld: ClientPhysicsWorld;
    private controller: BasePhysicsController;
    private vehicle: any; // TODO: Type this properly
    private aileronSimulator: SpringSimulator;
    private elevatorSimulator: SpringSimulator;
    private rudderSimulator: SpringSimulator;
    private steeringSimulator: SpringSimulator;
    private enginePower: number = 0;
    private lastDrag: number = 0;

    constructor(vehicle: any, physicsWorld: ClientPhysicsWorld) {
        this.vehicle = vehicle;
        this.physicsWorld = physicsWorld;
        
        // Initialize spring simulators
        this.aileronSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.elevatorSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.rudderSimulator = new SpringSimulator(60, 0.1, 0.3);
        this.steeringSimulator = new SpringSimulator(60, 0.1, 0.3);

        // Create appropriate physics controller based on vehicle type
        const config: VehiclePhysicsConfig = {
            mass: 50.0,
            drag: 0.8,
            angularDrag: 0.8,
            maxSpeed: 20,
            maxAngularSpeed: 0.2,
            maxAngularAcceleration: 0.05,
            angularDamping: 0.9,
            forceMultiplier: 0.005,
            vehicleType: vehicle.vehicleType,
            thrust: vehicle.vehicleType === 'drone' ? 20 : 30,
            lift: vehicle.vehicleType === 'drone' ? 15 : 12,
            torque: vehicle.vehicleType === 'drone' ? 1 : 2,
            gravity: 9.81
        };

        // Get initial position from vehicle mesh
        const initialPosition = vehicle.mesh ? 
            new Vector3(
                vehicle.mesh.position.x,
                vehicle.mesh.position.y,
                vehicle.mesh.position.z
            ) : new Vector3(0, 2, 0);

        // Create controller through physics world
        this.controller = this.physicsWorld.createVehicle(
            vehicle.id,
            vehicle.vehicleType,
            config,
            initialPosition
        );
    }

    update(deltaTime: number): void {
        try {
            // Get input from vehicle's input manager
            const input: PhysicsInput = this.vehicle.inputManager?.getInput() || {
                up: false,
                down: false,
                left: false,
                right: false,
                pitchUp: false,
                pitchDown: false,
                rollLeft: false,
                rollRight: false,
                fire: false,
                zoom: false,
                mouseDelta: { x: 0, y: 0 }
            };

            // Update spring simulators
            this.aileronSimulator.simulate(deltaTime);
            this.elevatorSimulator.simulate(deltaTime);
            this.rudderSimulator.simulate(deltaTime);
            this.steeringSimulator.simulate(deltaTime);

            // Apply input to physics world
            this.physicsWorld.applyInput(this.vehicle.id, input);

            // Sync Babylon.js mesh with physics body
            if (this.vehicle.mesh) {
                const state = this.physicsWorld.getState(this.vehicle.id);
                if (state) {
                    // Update position
                    this.vehicle.mesh.position.set(
                        state.position.x,
                        state.position.y,
                        state.position.z
                    );
                    
                    // Update rotation using quaternion
                    if (!this.vehicle.mesh.rotationQuaternion) {
                        this.vehicle.mesh.rotationQuaternion = new Quaternion();
                    }
                    this.vehicle.mesh.rotationQuaternion = new Quaternion(
                        state.quaternion.x,
                        state.quaternion.y,
                        state.quaternion.z,
                        state.quaternion.w
                    );
                }
            }
        } catch (error) {
            console.error('Physics update error:', error);
        }
    }

    getState(): PhysicsState | null {
        return this.physicsWorld.getState(this.vehicle.id);
    }

    setState(state: PhysicsState): void {
        this.physicsWorld.addState(this.vehicle.id, state);
    }

    cleanup(): void {
        this.physicsWorld.removeVehicle(this.vehicle.id);
    }

    // Add getters for control surface positions
    getAileronPosition(): number {
        return this.aileronSimulator.getPosition();
    }

    getElevatorPosition(): number {
        return this.elevatorSimulator.getPosition();
    }

    getRudderPosition(): number {
        return this.rudderSimulator.getPosition();
    }

    getSteeringPosition(): number {
        return this.steeringSimulator.getPosition();
    }
} 