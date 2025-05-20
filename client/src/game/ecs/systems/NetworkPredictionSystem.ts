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
    const playerEntityQuery = ecsWorld.with("physics", "vehicle", "transform", "owner").where(({owner}) => owner?.isLocal);

    // State buffers for each entity
    const TransformBuffers = new Map<string, TransformBuffer[]>();
    let pendingInputs: InputComponent[] = [];

    // Network quality tracking
    let networkLatency = 0;
    let networkQuality = 1.0;
    let networkJitter = 0;
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
        // Assume you have these values from your network system:
        // networkLatency: measured RTT in ms
        // serverTickRate: e.g., 60 for 60Hz
        // networkJitter: measured jitter in ms

        const oneWayDelay = networkLatency / 2;
        const serverUpdateInterval = 1000 / 60
        const jitterBuffer = Math.max(10, networkJitter * 1.5); // 1.5x jitter as buffer

        // Calculate recommended delay
        let recommendedDelay = oneWayDelay + serverUpdateInterval + jitterBuffer;

        // Clamp to min/max
        const MIN_DELAY = serverUpdateInterval * 2; // at least 2 server ticks
        const MAX_DELAY = 250; // or whatever is tolerable

        recommendedDelay = Math.max(MIN_DELAY, Math.min(MAX_DELAY, recommendedDelay));

        // Smoothly adjust current delay
        currentInterpolationDelay += (recommendedDelay - currentInterpolationDelay) * 0.1;
    }

    /**
     * Interpolates remote entity states
     */
    function interpolateRemotes() {
        const playerEntity = playerEntityQuery.entities[0];
        const now = Date.now();
        const targetTime = now - currentInterpolationDelay;
    
        TransformBuffers.forEach((buffer, id) => {
            if (buffer.length < 2 || id === playerEntity?.id) return;
    
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;
    
            // Sort buffer by timestamp
            buffer.sort((a, b) => a.tick.timestamp - b.tick.timestamp);
    
            const firstTs = buffer[0].tick.timestamp;
            const lastTs = buffer[buffer.length - 1].tick.timestamp;
            const bufferWindow = lastTs - firstTs;
    
            // ⛔️ If we don't have enough buffer to interpolate, hold or hide
            if (bufferWindow < currentInterpolationDelay) {
                const lastState = buffer[buffer.length - 1];
                if (entity.type === EntityType.Projectile && entity.render?.mesh) {
                    entity.render.mesh.isVisible = false; // Optional: fade in when ready
                    effectSystem.setTrailVisible(entity.id, false);
                } else {
                    entity.transform.position.copyFrom(lastState.transform.position);
                    entity.transform.rotation.copyFrom(lastState.transform.rotation);
                    entity.transform.velocity.copyFrom(lastState.transform.velocity);
                    entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
                }
                return;
            } else {
                if (entity.type === EntityType.Projectile && entity.render?.mesh) {
                    entity.render.mesh.isVisible = true;
                    effectSystem.setTrailVisible(entity.id, true);
                }
            }
    
            // Find states surrounding target time
            let i = 0;
            while (i < buffer.length - 2 && buffer[i + 1].tick.timestamp <= targetTime) {
                i++;
            }
    
            // // If we're at the end, extrapolate
            // if (i >= buffer.length - 1) {
            //     const lastState = buffer[buffer.length - 1];
            //     const secondLastState = buffer[buffer.length - 2];
            //     const timeSinceLastUpdate = targetTime - lastState.tick.timestamp;
    
            //     if (timeSinceLastUpdate < 1000) {
            //         const dt = lastState.tick.timestamp - secondLastState.tick.timestamp;
            //         if (dt > 0) {
            //             const velocity = new Vector3(
            //                 (lastState.transform.position.x - secondLastState.transform.position.x) / dt,
            //                 (lastState.transform.position.y - secondLastState.transform.position.y) / dt,
            //                 (lastState.transform.position.z - secondLastState.transform.position.z) / dt
            //             );
    
            //             entity.transform.position.x = lastState.transform.position.x + velocity.x * timeSinceLastUpdate;
            //             entity.transform.position.y = lastState.transform.position.y + velocity.y * timeSinceLastUpdate;
            //             entity.transform.position.z = lastState.transform.position.z + velocity.z * timeSinceLastUpdate;
    
            //             entity.transform.rotation.copyFrom(lastState.transform.rotation);
            //             entity.transform.velocity.copyFrom(lastState.transform.velocity);
            //             entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
            //         }
            //     } else {
            //         entity.transform.position.copyFrom(lastState.transform.position);
            //         entity.transform.rotation.copyFrom(lastState.transform.rotation);
            //         entity.transform.velocity.copyFrom(lastState.transform.velocity);
            //         entity.transform.angularVelocity.copyFrom(lastState.transform.angularVelocity);
            //     }
            //     return;
            // }
    
            const a = buffer[i];
            const b = buffer[i + 1];
    
            // Identical timestamps
            if (b.tick.timestamp === a.tick.timestamp) {
                const chosen = (entity.type === EntityType.Projectile) ? b : a;
                entity.transform.position.copyFrom(chosen.transform.position);
                entity.transform.rotation.copyFrom(chosen.transform.rotation);
                entity.transform.velocity.copyFrom(chosen.transform.velocity);
                entity.transform.angularVelocity.copyFrom(chosen.transform.angularVelocity);
                return;
            }
    
            const t = (targetTime - a.tick.timestamp) / (b.tick.timestamp - a.tick.timestamp);
            const clampedT = Math.max(0, Math.min(1, t));
    
            // Interpolate position
            entity.transform.position.x = a.transform.position.x + (b.transform.position.x - a.transform.position.x) * clampedT;
            entity.transform.position.y = a.transform.position.y + (b.transform.position.y - a.transform.position.y) * clampedT;
            entity.transform.position.z = a.transform.position.z + (b.transform.position.z - a.transform.position.z) * clampedT;
    
            // Interpolate rotation
            const qa = new Quaternion(a.transform.rotation.x, a.transform.rotation.y, a.transform.rotation.z, a.transform.rotation.w);
            const qb = new Quaternion(b.transform.rotation.x, b.transform.rotation.y, b.transform.rotation.z, b.transform.rotation.w);
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
            networkJitter = jitter;
            updateInterpolationDelay();
        },

        /**
         * Adds a new physics state to the buffer for interpolation
         * or reconciles with the server state for local player
         */
        addEntityState: (id: string, state: TransformBuffer) => {
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;
            // Always save to buffer for all entity types
            if (!TransformBuffers.has(id)) {
                TransformBuffers.set(id, []);
            }
            const buffers = TransformBuffers.get(id)!;
            buffers.push(state);
            // Keep buffer size reasonable
            if (buffers.length > interpolationConfig.maxBufferSize) {
                buffers.shift();
            }
        },

        /**
         * Adds a new input to the pending inputs buffer
         */
        addInput: (dt: number, input: InputComponent, isIdle: boolean, currentTick: number) => {
            // const currentTick = physicsWorldSystem.getCurrentTick();
            const playerEntity = playerEntityQuery.entities[0];
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
                        const projectileEntity = ecsWorld.entities.find(e => e.id === `${playerEntity.id}_${projectileId}`);
                        if (projectileEntity) {
                            projectileEntity.render = { mesh: effectSystem.createProjectileMesh(projectileEntity) }
                        }
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

        update: (dt: number) => {
            const playerEntity = playerEntityQuery.entities[0];
                // Reconciliation for local player
            if (playerEntity && TransformBuffers.has(playerEntity.id)) {
                const buffer = TransformBuffers.get(playerEntity.id)!;
                if (buffer.length > 0) {
                    // Use the latest server state in the buffer
                    const state = buffer[buffer.length - 1];
                    physicsWorldSystem.setCurrentTick(state.tick.tick);
                    playerEntity.transform.position.copyFrom(state.transform.position);
                    playerEntity.transform.rotation.copyFrom(state.transform.rotation);
                    playerEntity.transform.velocity.copyFrom(state.transform.velocity);
                    playerEntity.transform.angularVelocity.copyFrom(state.transform.angularVelocity);
                    // Update physics body state
                    if (playerEntity.physics?.body) {
                        playerEntity.physics.body.setTranslation(
                            {
                                x: state.transform.position.x,
                                y: state.transform.position.y,
                                z: state.transform.position.z
                            },
                            true
                        );
                        playerEntity.physics.body.setRotation(
                            {
                                x: state.transform.rotation.x,
                                y: state.transform.rotation.y,
                                z: state.transform.rotation.z,
                                w: state.transform.rotation.w
                            },
                            true
                        );
                        playerEntity.physics.body.setLinvel(
                            {
                                x: state.transform.velocity.x,
                                y: state.transform.velocity.y,
                                z: state.transform.velocity.z
                            },
                            true
                        );
                        playerEntity.physics.body.setAngvel(
                            {
                                x: state.transform.angularVelocity.x,
                                y: state.transform.angularVelocity.y,
                                z: state.transform.angularVelocity.z
                            },
                            true
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
                        physicsSystem.applyInput(1/60, playerEntity, input);
                    }
                    pendingInputs = unprocessedInputs;
                    // empty player buffer
                    buffer.length = 0;
                }
            }
        },

        /**
         * Updates the system
         */
        updateRemotes: (dt: number) => {
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