import { Vector3, Quaternion } from '@babylonjs/core';
import * as CANNON from 'cannon';
import { PhysicsState, PhysicsInput, VehiclePhysicsConfig } from '@shared/physics/types';
import { BasePhysicsController } from '@shared/physics/BasePhysicsController';
import { DronePhysicsController } from '@shared/physics/DronePhysicsController';
import { PlanePhysicsController } from '@shared/physics/PlanePhysicsController';

export class ClientPhysicsWorld {
    private world: CANNON.World;
    private controllers: Map<string, BasePhysicsController>;
    private stateBuffer: Map<string, PhysicsState[]>;
    private interpolationDelay: number;
    private lastUpdateTime: number;

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 7;
        this.world.defaultContactMaterial.friction = 0.5;

        this.controllers = new Map();
        this.stateBuffer = new Map();
        this.interpolationDelay = 100; // ms
        this.lastUpdateTime = performance.now();
    }

    createVehicle(id: string, type: 'drone' | 'plane', config: VehiclePhysicsConfig, initialPosition: Vector3): BasePhysicsController {
        let controller: BasePhysicsController;

        if (type === 'drone') {
            controller = new DronePhysicsController(this.world, config);
        } else {
            controller = new PlanePhysicsController(this.world, config);
        }

        // Set initial state
        controller.setState({
            position: new Vector3(initialPosition.x, initialPosition.y, initialPosition.z),
            quaternion: new Quaternion(0, 0, 0, 1),
            linearVelocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0)
        });

        this.controllers.set(id, controller);
        this.stateBuffer.set(id, []);
        return controller;
    }

    removeVehicle(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.cleanup();
            this.controllers.delete(id);
            this.stateBuffer.delete(id);
        }
    }

    update(deltaTime: number, input: PhysicsInput): void {
        // Step physics world
        this.world.step(Math.min(deltaTime, 1/60));

        // Update all controllers
        this.controllers.forEach(controller => {
            controller.update(deltaTime, input);
        });

        // Interpolate states
        this.interpolateStates();
    }

    applyInput(id: string, input: PhysicsInput): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.update(1/60, input);
        }
    }

    addState(id: string, state: PhysicsState): void {
        const buffer = this.stateBuffer.get(id);
        if (buffer) {
            buffer.push({
                ...state,
                timestamp: performance.now()
            });

            // Keep buffer size reasonable
            if (buffer.length > 10) {
                buffer.shift();
            }
        }
    }

    getState(id: string): PhysicsState | null {
        const controller = this.controllers.get(id);
        if (!controller) return null;

        return controller.getState();
    }

    private interpolateStates(): void {
        const currentTime = performance.now();
        const targetTime = currentTime - this.interpolationDelay;

        this.stateBuffer.forEach((buffer, id) => {
            if (buffer.length < 2) return;

            // Find the two states to interpolate between
            let state1 = buffer[0];
            let state2 = buffer[1];
            let i = 1;

            while (i < buffer.length - 1 && buffer[i]?.timestamp && (buffer[i].timestamp || 0) < targetTime) {
                state1 = buffer[i];
                state2 = buffer[i + 1];
                i++;
            }

            // Remove old states
            buffer.splice(0, i - 1);

            if (!state1?.timestamp || !state2?.timestamp) return;

            // Calculate interpolation factor
            const t = (targetTime - state1.timestamp) / (state2.timestamp - state1.timestamp);
            const controller = this.controllers.get(id);
            if (controller) {
                // Interpolate position
                const position = new Vector3(
                    state1.position.x + (state2.position.x - state1.position.x) * t,
                    state1.position.y + (state2.position.y - state1.position.y) * t,
                    state1.position.z + (state2.position.z - state1.position.z) * t
                );

                // Interpolate quaternion
                const quaternion = Quaternion.Slerp(
                    new Quaternion(state1.quaternion.x, state1.quaternion.y, state1.quaternion.z, state1.quaternion.w),
                    new Quaternion(state2.quaternion.x, state2.quaternion.y, state2.quaternion.z, state2.quaternion.w),
                    t
                );

                // Interpolate velocities
                const linearVelocity = new Vector3(
                    state1.linearVelocity.x + (state2.linearVelocity.x - state1.linearVelocity.x) * t,
                    state1.linearVelocity.y + (state2.linearVelocity.y - state1.linearVelocity.y) * t,
                    state1.linearVelocity.z + (state2.linearVelocity.z - state1.linearVelocity.z) * t
                );

                const angularVelocity = new Vector3(
                    state1.angularVelocity.x + (state2.angularVelocity.x - state1.angularVelocity.x) * t,
                    state1.angularVelocity.y + (state2.angularVelocity.y - state1.angularVelocity.y) * t,
                    state1.angularVelocity.z + (state2.angularVelocity.z - state1.angularVelocity.z) * t
                );

                // Apply interpolated state
                controller.setState({
                    position,
                    quaternion,
                    linearVelocity,
                    angularVelocity
                });
            }
        });
    }

    cleanup(): void {
        this.controllers.forEach(controller => {
            controller.cleanup();
        });
        this.controllers.clear();
        this.stateBuffer.clear();
    }
} 