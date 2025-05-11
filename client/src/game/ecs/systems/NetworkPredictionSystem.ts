import { world as ecsWorld } from '@shared/ecs/world';
import { InputComponent, TransformBuffer, InterpolationConfig, EntityType } from '@shared/ecs/types';
import { Vector3, Quaternion } from '@babylonjs/core';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { Room } from 'colyseus.js';
import { State } from '@shared/schemas';
import { useGameDebug } from '@/composables/useGameDebug';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystem';
import { createSceneSystem } from './SceneSystem';
const { log } = useGameDebug();

/**
 * Creates a system that handles network prediction, reconciliation, and interpolation
 */
export function createNetworkPredictionSystem(
    physicsSystem:  ReturnType<typeof createPhysicsSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>,
    sceneSystem: ReturnType<typeof createSceneSystem>,
    room: Room<State>
) {
    // Configuration
    const interpolationConfig: InterpolationConfig = {
        delay: 150,
        maxBufferSize: 20,
        interpolationFactor: 0.2
    };

    const effectSystem = sceneSystem.getEffectSystem();

    // State buffers for each entity
    const TransformBuffers = new Map<string, TransformBuffer[]>();
    let pendingInputs: InputComponent[] = [];

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
    const HEARTBEAT_INTERVAL = 60; // Send heartbeat every 60 ticks
    let lastHeartbeatTick = 0;

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
        log('Current Interpolation Delay', currentInterpolationDelay);
    }

    /**
     * Interpolates remote entity states
     */
    function interpolateRemotes() {
        const now = Date.now();
        const targetTime = now - currentInterpolationDelay;
        const playerEntity = ecsWorld.with("physics", "vehicle", "transform", "owner").where(({owner}) => owner?.isLocal).entities[0];
        TransformBuffers.forEach((buffer, id) => {
            if (buffer.length < 2 || id === playerEntity?.id) return;
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;
            // Sort buffer by timestamp to ensure correct order
            buffer.sort((a, b) => a.tick.timestamp - b.tick.timestamp);

            // Find states bracketing target time
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].tick.timestamp <= targetTime) {
                i++;
            }

            // If we're at the end of the buffer, extrapolate
            if (i >= buffer.length - 1) {
                const lastState = buffer[buffer.length - 1];
                const secondLastState = buffer[buffer.length - 2];
                const timeSinceLastUpdate = targetTime - lastState.tick.timestamp;
                
                // Only extrapolate if the time gap is reasonable
                if (timeSinceLastUpdate < 1000) {
                    const dt = lastState.tick.timestamp - secondLastState.tick.timestamp;
                    if (dt > 0) {
                        // Calculate velocity from last two states
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
                    // If gap is too large, use the last known state
                    entity.transform.position.copyFrom(lastState.transform.position);
                    entity.transform.rotation.copyFrom(lastState.transform.rotation);
                    entity.transform.velocity.copyFrom(lastState.transform.velocity);
                    entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
                }
                return;
            }

            // Interpolate between two states
            const a = buffer[i];
            const b = buffer[i + 1];
            
            // Handle identical timestamps
            if (b.tick.timestamp === a.tick.timestamp) {
                // For projectiles, use the newer state
                if (entity.type === EntityType.Projectile) {
                    entity.transform.position.copyFrom(b.transform.position);
                    entity.transform.rotation.copyFrom(b.transform.rotation);
                    entity.transform.velocity.copyFrom(b.transform.velocity);
                    entity.transform.angularVelocity.copyFrom(b.transform.angularVelocity);
                    return;
                }
                // For other entities, use the older state
                entity.transform.position.copyFrom(a.transform.position);
                entity.transform.rotation.copyFrom(a.transform.rotation);
                entity.transform.velocity.copyFrom(a.transform.velocity);
                entity.transform.angularVelocity.copyFrom(a.transform.angularVelocity);
                return;
            }


            const t = (targetTime - a.tick.timestamp) / (b.tick.timestamp - a.tick.timestamp);
            
            // Clamp interpolation factor
            const clampedT = Math.max(0, Math.min(1, t));
            
            // Interpolate position
            entity.transform.position.x = a.transform.position.x + (b.transform.position.x - a.transform.position.x) * clampedT;
            entity.transform.position.y = a.transform.position.y + (b.transform.position.y - a.transform.position.y) * clampedT;
            entity.transform.position.z = a.transform.position.z + (b.transform.position.z - a.transform.position.z) * clampedT;

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
            const q = Quaternion.Slerp(qa, qb, clampedT);
            entity.transform.rotation.x = q.x;
            entity.transform.rotation.y = q.y;
            entity.transform.rotation.z = q.z;
            entity.transform.rotation.w = q.w;

            // Interpolate velocities
            entity.transform.velocity.x = a.transform.velocity.x + (b.transform.velocity.x - a.transform.velocity.x) * clampedT;
            entity.transform.velocity.y = a.transform.velocity.y + (b.transform.velocity.y - a.transform.velocity.y) * clampedT;
            entity.transform.velocity.z = a.transform.velocity.z + (b.transform.velocity.z - a.transform.velocity.z) * clampedT;

            entity.transform.angularVelocity.x = a.transform.angularVelocity.x + (b.transform.angularVelocity.x - a.transform.angularVelocity.x) * clampedT;
            entity.transform.angularVelocity.y = a.transform.angularVelocity.y + (b.transform.angularVelocity.y - a.transform.angularVelocity.y) * clampedT;
            entity.transform.angularVelocity.z = a.transform.angularVelocity.z + (b.transform.angularVelocity.z - a.transform.angularVelocity.z) * clampedT;
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
            const isLocalPlayer = entity.owner?.isLocal;
            if (isLocalPlayer) {
                log('Server State Tick', state.tick.tick);
                log('Last Processed Input Tick', state.tick.lastProcessedInputTick ?? state.tick.tick);
                log('Pending Inputs', pendingInputs.length);
            }

            // Initialize buffers if needed
            if (!TransformBuffers.has(id)) {
                TransformBuffers.set(id, []);
            }

            const buffers = TransformBuffers.get(id)!;

            // if (isLocalPlayer && entity.type === EntityType.Vehicle) {
            //     return;
            // }
            
            if (isLocalPlayer && (entity.type === EntityType.Vehicle)) {
                // physicsWorldSystem.setCurrentTick(state.tick.tick);
                entity.transform.position.copyFrom(state.transform.position);
                entity.transform.rotation.copyFrom(state.transform.rotation);
                entity.transform.velocity.copyFrom(state.transform.velocity);
                entity.transform.angularVelocity.copyFrom(state.transform.angularVelocity);
                
                // Update physics body state
                if (entity.physics?.body) {
                    entity.physics.body.position.set(
                        state.transform.position.x,
                        state.transform.position.y,
                        state.transform.position.z
                    );
                    entity.physics.body.quaternion.set(
                        state.transform.rotation.x,
                        state.transform.rotation.y,
                        state.transform.rotation.z,
                        state.transform.rotation.w
                    );
                    entity.physics.body.velocity.set(
                        state.transform.velocity.x,
                        state.transform.velocity.y,
                        state.transform.velocity.z
                    );
                    entity.physics.body.angularVelocity.set(
                        state.transform.angularVelocity.x,
                        state.transform.angularVelocity.y,
                        state.transform.angularVelocity.z
                    );
                }
                // Replay unprocessed inputs
                const lastProcessedInputTick = state.tick.lastProcessedInputTick ?? state.tick.tick;
                const unprocessedInputs = pendingInputs.filter((input: InputComponent) => input.tick > lastProcessedInputTick);

                log('Replaying Inputs', {
                    count: unprocessedInputs.length,
                    from: lastProcessedInputTick,
                    to: unprocessedInputs.length > 0 ? Math.max(...unprocessedInputs.map(i => i.tick)) : lastProcessedInputTick
                });
                for (const input of unprocessedInputs) {
                    physicsSystem.applyInput(1/60, entity, input);
                }
                physicsWorldSystem.applyBodyTransform(entity);
                pendingInputs = unprocessedInputs;
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
        addInput: (dt: number, input: InputComponent, isIdle: boolean, currentTick: number) => {
            // const currentTick = physicsWorldSystem.getCurrentTick();
            const playerEntity = ecsWorld.with("physics", "vehicle", "transform", "owner").where(({owner}) => owner?.isLocal).entities[0];
            // Create final input
            const finalInput: InputComponent = {
                ...input,
                // timestamp: Date.now(),
                // tick: currentTick
            };

            log('Input Added', {
                tick: currentTick,
                inputTick: input.tick,
                isIdle,
                pendingCount: pendingInputs.length
            });

            // Update local player immediately
            let projectileId: number | undefined;
            if (playerEntity) {
                const aimPoint = sceneSystem.getAimPoint();
                finalInput.aimPointX = aimPoint.x;
                finalInput.aimPointY = aimPoint.y;
                finalInput.aimPointZ = aimPoint.z;
                physicsSystem.applyInput(dt, playerEntity, finalInput);
                // Always update weapon system if entity has weapons
                if (playerEntity.vehicle?.weapons) {
                    projectileId = weaponSystem.applyInput(dt, playerEntity, finalInput);
                    if (projectileId) {
                        effectSystem.createMuzzleFlash(playerEntity, projectileId);
                    }
                }
            }
            // Only send and store non-idle inputs
            if (!isIdle) {
                if (projectileId) {
                    finalInput.projectileId = projectileId;
                }
                room.send("command", finalInput);
                pendingInputs.push(finalInput);
            }

            // Keep buffer size reasonable
            if (pendingInputs.length > MAX_PENDING_INPUTS) {
                pendingInputs.splice(0, pendingInputs.length - MAX_PENDING_INPUTS);
            }
        },

        sendCommand: (input: InputComponent) => {
            room.send("command", input);
        },

        /**
         * Updates the system
         */
        update: (dt: number) => {
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
            pendingInputs = [];
        }
    };
}