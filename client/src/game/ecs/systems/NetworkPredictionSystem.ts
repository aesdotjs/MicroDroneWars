import { world as ecsWorld } from '@shared/ecs/world';
import { InputComponent, TransformBuffer, InterpolationConfig } from '@shared/ecs/types';
import { Vector3, Quaternion } from '@babylonjs/core';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { Room } from 'colyseus.js';
import { State } from '@shared/schemas';

/**
 * Creates a system that handles network prediction, reconciliation, and interpolation
 */
export function createNetworkPredictionSystem(
    physicsSystem:  ReturnType<typeof createPhysicsSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    room: Room<State>
) {
    // Configuration
    const interpolationConfig: InterpolationConfig = {
        delay: 150,
        maxBufferSize: 20,
        interpolationFactor: 0.2
    };

    const localPlayerEntityId = ecsWorld.with("owner").where(({owner}) => owner?.isLocal).entities[0]?.id;

    // State buffers for each entity
    const TransformBuffers = new Map<string, TransformBuffer[]>();
    const pendingInputs = new Map<string, InputComponent[]>();
    const lastProcessedInputTicks = new Map<string, number>();
    const lastProcessedInputTimestamps = new Map<string, number>();

    // Network quality tracking
    let networkLatency = 0;
    let networkQuality = 1.0;
    let currentInterpolationDelay = 100;
    let targetInterpolationDelay = 100;

    // Constants
    const INTERPOLATION_DELAY_SMOOTHING = 0.1;
    const MIN_INTERPOLATION_DELAY = 50;
    const MAX_INTERPOLATION_DELAY = 200;
    const QUALITY_TO_DELAY_FACTOR = 0.5;
    const RECONCILIATION_POSITION_THRESHOLD = 2.0;
    const RECONCILIATION_ROTATION_THRESHOLD = Math.PI * (10/180);
    const RECONCILIATION_POSITION_SMOOTHING = 0.2;
    const RECONCILIATION_ROTATION_SMOOTHING = 0.3;
    const MAX_PENDING_INPUTS = 60;

    /**
     * Updates the interpolation delay based on network quality
     */
    function updateInterpolationDelay() {
        // Calculate base delay based on latency
        let baseDelay = networkLatency * 1.5;
        
        // Adjust delay based on network quality
        const qualityFactor = 1.0 - (networkQuality * QUALITY_TO_DELAY_FACTOR);
        baseDelay *= (1.0 + qualityFactor);
        
        // Smoothly update target delay
        targetInterpolationDelay = Math.max(
            MIN_INTERPOLATION_DELAY,
            Math.min(MAX_INTERPOLATION_DELAY, baseDelay)
        );
        
        // Smoothly adjust current delay
        currentInterpolationDelay += (targetInterpolationDelay - currentInterpolationDelay) * INTERPOLATION_DELAY_SMOOTHING;
    }

    /**
     * Interpolates remote entity states
     */
    function interpolateRemotes() {
        const now = Date.now() - networkLatency;
        const targetTime = now - currentInterpolationDelay;
        TransformBuffers.forEach((buffer, id) => {
            if (buffer.length < 1 || id === localPlayerEntityId) return;
            
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;

            // If we only have one state, use it directly
            if (buffer.length === 1) {
                const state = buffer[0];
                entity.transform.position.copyFrom(state.transform.position);
                entity.transform.rotation.copyFrom(state.transform.rotation);
                entity.transform.velocity.copyFrom(state.transform.velocity);
                entity.transform.angularVelocity.copyFrom(state.transform.angularVelocity);
                return;
            }

            // Find states bracketing target time
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].tick.timestamp <= targetTime) {
                i++;
            }

            // If we're at the end of the buffer, extrapolate from the last two states
            if (i >= buffer.length - 1) {
                const lastState = buffer[buffer.length - 1];
                const secondLastState = buffer[buffer.length - 2];
                const timeSinceLastUpdate = targetTime - lastState.tick.timestamp;
                
                // Only extrapolate if the time gap is reasonable (e.g., less than 1 second)
                if (timeSinceLastUpdate < 1000) {
                    // Calculate velocity from last two states
                    const dt = lastState.tick.timestamp - secondLastState.tick.timestamp;
                    if (dt > 0) {
                        const velocity = new Vector3(
                            (lastState.transform.position.x - secondLastState.transform.position.x) / dt,
                            (lastState.transform.position.y - secondLastState.transform.position.y) / dt,
                            (lastState.transform.position.z - secondLastState.transform.position.z) / dt
                        );
                        
                        // Extrapolate position
                        entity.transform.position.x = lastState.transform.position.x + velocity.x * timeSinceLastUpdate;
                        entity.transform.position.y = lastState.transform.position.y + velocity.y * timeSinceLastUpdate;
                        entity.transform.position.z = lastState.transform.position.z + velocity.z * timeSinceLastUpdate;
                        
                        // Keep last known rotation and velocities
                        entity.transform.rotation.copyFrom(lastState.transform.rotation);
                        entity.transform.velocity.copyFrom(lastState.transform.velocity);
                        entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
                    }
                } else {
                    // If gap is too large, just use the last known state
                    entity.transform.position.copyFrom(lastState.transform.position);
                    entity.transform.rotation.copyFrom(lastState.transform.rotation);
                    entity.transform.velocity.copyFrom(lastState.transform.velocity);
                    entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
                }
                return;
            }
            
            const a = buffer[i];
            const b = buffer[i + 1];
            const t = (targetTime - a.tick.timestamp) / (b.tick.timestamp - a.tick.timestamp);
            
            // Interpolate position
            entity.transform.position.x = a.transform.position.x + (b.transform.position.x - a.transform.position.x) * t;
            entity.transform.position.y = a.transform.position.y + (b.transform.position.y - a.transform.position.y) * t;
            entity.transform.position.z = a.transform.position.z + (b.transform.position.z - a.transform.position.z) * t;

            // Interpolate rotation
            const qa = new Quaternion(
                a.transform.rotation.x,
                a.transform.rotation.y,
                a.transform.rotation.z,
                a.transform.rotation.w
            );
            const qb = new Quaternion(
                b.transform.rotation.x,
                b.transform.rotation.y,
                b.transform.rotation.z,
                b.transform.rotation.w
            );
            const q = Quaternion.Slerp(qa, qb, t);
            entity.transform.rotation.x = q.x;
            entity.transform.rotation.y = q.y;
            entity.transform.rotation.z = q.z;
            entity.transform.rotation.w = q.w;

            // Interpolate velocities
            entity.transform.velocity.x = a.transform.velocity.x + (b.transform.velocity.x - a.transform.velocity.x) * t;
            entity.transform.velocity.y = a.transform.velocity.y + (b.transform.velocity.y - a.transform.velocity.y) * t;
            entity.transform.velocity.z = a.transform.velocity.z + (b.transform.velocity.z - a.transform.velocity.z) * t;

            entity.transform.angularVelocity.x = a.transform.angularVelocity.x + (b.transform.angularVelocity.x - a.transform.angularVelocity.x) * t;
            entity.transform.angularVelocity.y = a.transform.angularVelocity.y + (b.transform.angularVelocity.y - a.transform.angularVelocity.y) * t;
            entity.transform.angularVelocity.z = a.transform.angularVelocity.z + (b.transform.angularVelocity.z - a.transform.angularVelocity.z) * t;
        });
    }

    return {
        /**
         * Updates network quality metrics
         */
        updateNetworkStats: (latency: number, quality: number, jitter: number) => {
            networkLatency = latency;
            networkQuality = quality;
            updateInterpolationDelay();
        },

        /**
         * Adds a new physics state to the buffer for interpolation
         * or reconciles with the server state for local player
         */
        addEntityState: (id: string, state: TransformBuffer) => {
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;

            // Initialize buffers if needed
            if (!TransformBuffers.has(id)) {
                TransformBuffers.set(id, []);
            }
            if (!pendingInputs.has(id)) {
                pendingInputs.set(id, []);
            }
            if (!lastProcessedInputTicks.has(id)) {
                lastProcessedInputTicks.set(id, 0);
            }
            if (!lastProcessedInputTimestamps.has(id)) {
                lastProcessedInputTimestamps.set(id, 0);
            }

            const buffers = TransformBuffers.get(id)!;
            const isLocalPlayer = entity.owner?.isLocal;
            
            if (isLocalPlayer) {
                physicsWorldSystem.setCurrentTick(state.tick.tick);
                // // Get current client state
                // const clientState = {
                //     position: entity.transform.position.clone(),
                //     quaternion: entity.transform.rotation.clone()
                // };

                // const serverState = {
                //     position: new Vector3(state.transform.position.x, state.transform.position.y, state.transform.position.z),
                //     quaternion: new Quaternion(
                //         state.transform.rotation.x,
                //         state.transform.rotation.y,
                //         state.transform.rotation.z,
                //         state.transform.rotation.w
                //     )
                // };

                // // Calculate position and rotation errors
                // const positionError = serverState.position.subtract(clientState.position).length();
                // const dot = Math.abs(Quaternion.Dot(clientState.quaternion, serverState.quaternion));
                // const rotationError = Math.acos(Math.min(1, dot));

                // // If errors are significant, reconcile
                // if (positionError > RECONCILIATION_POSITION_THRESHOLD ||
                //     rotationError > RECONCILIATION_ROTATION_THRESHOLD) {
                    
                //     // Smoothly correct position
                //     entity.transform.position.x += (serverState.position.x - clientState.position.x) * RECONCILIATION_POSITION_SMOOTHING;
                //     entity.transform.position.y += (serverState.position.y - clientState.position.y) * RECONCILIATION_POSITION_SMOOTHING;
                //     entity.transform.position.z += (serverState.position.z - clientState.position.z) * RECONCILIATION_POSITION_SMOOTHING;

                //     // Smoothly correct rotation
                //     const correction = Quaternion.Slerp(
                //         clientState.quaternion,
                //         serverState.quaternion,
                //         RECONCILIATION_ROTATION_SMOOTHING
                //     );
                //     entity.transform.rotation.x = correction.x;
                //     entity.transform.rotation.y = correction.y;
                //     entity.transform.rotation.z = correction.z;
                //     entity.transform.rotation.w = correction.w;
                // }
                entity.transform.position.copyFrom(state.transform.position);
                entity.transform.rotation.copyFrom(state.transform.rotation);
                entity.transform.velocity.copyFrom(state.transform.velocity);
                entity.transform.angularVelocity.copyFrom(state.transform.angularVelocity);
                entity.physics?.body.position.set(
                    state.transform.position.x,
                    state.transform.position.y,
                    state.transform.position.z
                );
                entity.physics?.body.quaternion.set(
                    state.transform.rotation.x,
                    state.transform.rotation.y,
                    state.transform.rotation.z,
                    state.transform.rotation.w
                );
                entity.physics?.body.velocity.set(
                    state.transform.velocity.x,
                    state.transform.velocity.y,
                    state.transform.velocity.z
                );
                entity.physics?.body.angularVelocity.set(
                    state.transform.angularVelocity.x,
                    state.transform.angularVelocity.y,
                    state.transform.angularVelocity.z
                );                

                // Replay unprocessed inputs
                const lastProcessedInputTick = state.tick.lastProcessedInputTick ?? state.tick.tick;
                const unprocessedInputs = pendingInputs.get(id)!.filter((input: InputComponent) => input.tick > lastProcessedInputTick);
                for (const input of unprocessedInputs) {
                    // Apply input to entity
                    physicsSystem.update(1/60, entity, input);
                }
                pendingInputs.set(id, unprocessedInputs);
            } else {
                // Buffer remote states for interpolation
                buffers.push(state);
                // Keep buffer size reasonable
                if (buffers.length > interpolationConfig.maxBufferSize) {
                    buffers.shift();
                }
            }
        },

        /**
         * Adds a new input to the pending inputs buffer
         */
        addInput: (dt: number, id: string, input: InputComponent, isIdle: boolean) => {
            if (!pendingInputs.has(id)) {
                pendingInputs.set(id, []);
            }

            const inputs = pendingInputs.get(id)!;
            const currentTick = physicsWorldSystem.getCurrentTick();

            // Skip if we've already processed this tick
            if (currentTick === lastProcessedInputTicks.get(id)) {
                return;
            }

            // Create final input with timestamp and tick
            const finalInput: InputComponent = {
                ...input,
                timestamp: Date.now(),
                tick: currentTick
            };

            // Update local player immediately
            const entity = ecsWorld.with("physics", "vehicle", "transform", "owner").where(({owner}) => owner?.isLocal).entities[0];
            if (entity) {
                physicsSystem.update(dt, entity, finalInput);
            }

            // Only send and store non-idle inputs
            if (!isIdle) {
                room.send("command", finalInput);
                inputs.push(finalInput);
                lastProcessedInputTicks.set(id, currentTick);
            }

            // Keep buffer size reasonable
            if (inputs.length > MAX_PENDING_INPUTS) {
                inputs.splice(0, inputs.length - MAX_PENDING_INPUTS);
            }
        },

        sendCommand: (input: InputComponent) => {
            room.send("command", input);
        },

        /**
         * Updates the system
         */
        update: () => {
            // Update interpolation delay based on network quality
            updateInterpolationDelay();

            // Interpolate remote entities
            interpolateRemotes();
        },

        /**
         * Cleans up resources
         */
        cleanup: () => {
            TransformBuffers.clear();
            pendingInputs.clear();
            lastProcessedInputTicks.clear();
            lastProcessedInputTimestamps.clear();
        }
    };
}