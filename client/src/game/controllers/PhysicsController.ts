import { Vector3 } from 'babylonjs';
import { SpringSimulator } from '@shared/utils/SpringSimulator';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
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

    public update(deltaTime: number, input: PhysicsInput): void {
        // Ensure input is properly initialized
        const defaultInput: PhysicsInput = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            pitchUp: false,
            pitchDown: false,
            yawLeft: false,
            yawRight: false,
            rollLeft: false,
            rollRight: false,
            mouseDelta: { x: 0, y: 0 }
        };

        // Merge provided input with defaults
        const mergedInput = { ...defaultInput, ...input };

        // Update spring simulators
        this.aileronSimulator.simulate(deltaTime);
        this.elevatorSimulator.simulate(deltaTime);
        this.rudderSimulator.simulate(deltaTime);
        this.steeringSimulator.simulate(deltaTime);

        // Update physics controller
        this.controller.update(deltaTime, mergedInput);

        // Sync mesh with physics body
        if (this.vehicle.mesh) {
            const state = this.controller.getState();
            if (state) {
                this.vehicle.mesh.position.copyFrom(state.position);
                this.vehicle.mesh.rotationQuaternion = state.quaternion;
            }
        }
    }

    public getState(): PhysicsState | null {
        return this.controller.getState();
    }

    public setState(state: PhysicsState): void {
        this.controller.setState(state);
    }

    public dispose(): void {
        // Cleanup is handled by the physics world
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