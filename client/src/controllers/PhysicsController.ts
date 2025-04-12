import { Vector3, Quaternion } from '@babylonjs/core';
import * as CANNON from 'cannon';
import { SpringSimulator } from '@shared/utils/SpringSimulator';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';

export class PhysicsController {
    private world: CANNON.World;
    private controller: BasePhysicsController;
    private vehicle: any; // TODO: Type this properly
    private aileronSimulator: SpringSimulator;
    private elevatorSimulator: SpringSimulator;
    private rudderSimulator: SpringSimulator;
    private steeringSimulator: SpringSimulator;
    private enginePower: number = 0;
    private lastDrag: number = 0;

    constructor(vehicle: any) {
        this.vehicle = vehicle;
        
        // Initialize physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 7;
        this.world.defaultContactMaterial.friction = 0.5;

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

        if (vehicle.vehicleType === 'drone') {
            this.controller = new DronePhysicsController(this.world, config);
        } else {
            this.controller = new PlanePhysicsController(this.world, config);
        }

        // Get initial position from vehicle mesh
        const initialPosition = vehicle.mesh ? 
            new Vector3(
                vehicle.mesh.position.x,
                vehicle.mesh.position.y,
                vehicle.mesh.position.z
            ) : new Vector3(0, 2, 0);

        // Set initial state
        this.controller.setState({
            position: initialPosition,
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0)
        });

        // Create ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: new CANNON.Material('groundMaterial')
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);

        // Add contact material for ground-vehicle interaction
        const contactMaterial = new CANNON.ContactMaterial(
            groundBody.material,
            this.controller.getBody().material,
            {
                friction: 0.5,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(contactMaterial);
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

            // Update physics world
            this.world.step(Math.min(deltaTime, 1/60));

            // Update spring simulators
            this.aileronSimulator.simulate(deltaTime);
            this.elevatorSimulator.simulate(deltaTime);
            this.rudderSimulator.simulate(deltaTime);
            this.steeringSimulator.simulate(deltaTime);

            // Update physics controller
            this.controller.update(deltaTime, input);

            // Sync Babylon.js mesh with physics body
            if (this.vehicle.mesh) {
                const state = this.controller.getState();
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
        return this.controller.getState();
    }

    setState(state: PhysicsState): void {
        this.controller.setState(state);
    }

    cleanup(): void {
        if (this.controller) {
            this.controller.cleanup();
        }
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