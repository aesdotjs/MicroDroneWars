import { world as ecsWorld } from '@shared/ecs/world';
import { InputComponent, TransformBuffer, InterpolationConfig } from '@shared/ecs/types';
import { Vector3, Quaternion } from 'babylonjs';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
/**
 * Creates a system that handles network prediction, reconciliation, and interpolation
 */
export function createNetworkPredictionSystem(
    physicsSystem:  ReturnType<typeof createPhysicsSystem>
) {
    // Configuration
    const interpolationConfig: InterpolationConfig = {
        delay: 150,
        maxBufferSize: 20,
        interpolationFactor: 0.2
    };

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
            if (buffer.length < 2) return;
            
            // Find states bracketing target time
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].tick.timestamp <= targetTime) {
                i++;
            }

            if (i >= buffer.length - 1) return;
            
            const a = buffer[i];
            const b = buffer[i + 1];
            const t = (targetTime - a.tick.timestamp) / (b.tick.timestamp - a.tick.timestamp);
            
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity || !entity.transform) return;

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
                // Get current client state
                const clientState = {
                    position: entity.transform.position.clone(),
                    quaternion: entity.transform.rotation.clone()
                };

                const serverState = {
                    position: new Vector3(state.transform.position.x, state.transform.position.y, state.transform.position.z),
                    quaternion: new Quaternion(
                        state.transform.rotation.x,
                        state.transform.rotation.y,
                        state.transform.rotation.z,
                        state.transform.rotation.w
                    )
                };

                // Calculate position and rotation errors
                const positionError = serverState.position.subtract(clientState.position).length();
                const dot = Math.abs(Quaternion.Dot(clientState.quaternion, serverState.quaternion));
                const rotationError = Math.acos(Math.min(1, dot));

                // If errors are significant, reconcile
                if (positionError > RECONCILIATION_POSITION_THRESHOLD ||
                    rotationError > RECONCILIATION_ROTATION_THRESHOLD) {
                    
                    // Smoothly correct position
                    entity.transform.position.x += (serverState.position.x - clientState.position.x) * RECONCILIATION_POSITION_SMOOTHING;
                    entity.transform.position.y += (serverState.position.y - clientState.position.y) * RECONCILIATION_POSITION_SMOOTHING;
                    entity.transform.position.z += (serverState.position.z - clientState.position.z) * RECONCILIATION_POSITION_SMOOTHING;

                    // Smoothly correct rotation
                    const correction = Quaternion.Slerp(
                        clientState.quaternion,
                        serverState.quaternion,
                        RECONCILIATION_ROTATION_SMOOTHING
                    );
                    entity.transform.rotation.x = correction.x;
                    entity.transform.rotation.y = correction.y;
                    entity.transform.rotation.z = correction.z;
                    entity.transform.rotation.w = correction.w;
                }

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
        addInput: (id: string, input: InputComponent) => {
            if (!pendingInputs.has(id)) {
                pendingInputs.set(id, []);
            }

            const inputs = pendingInputs.get(id)!;
            inputs.push(input);

            // Keep buffer size reasonable
            if (inputs.length > MAX_PENDING_INPUTS) {
                inputs.splice(0, inputs.length - MAX_PENDING_INPUTS);
            }

            // Apply input immediately to local player
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (entity && entity.owner?.isLocal) {
                // If no input provided, use idle input
                const inputToApply = input || createIdleInput(entity.tick!.tick);
                physicsSystem.update(1/60, entity, inputToApply);
            }
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