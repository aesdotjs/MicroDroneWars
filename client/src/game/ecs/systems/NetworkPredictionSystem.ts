import { world as ecsWorld } from '@shared/ecs/world';
import { GameEntity } from '@shared/ecs/types';
import { PhysicsState, PhysicsInput, StateBuffer, InterpolationConfig } from '@shared/ecs/types';
import { Vector3, Quaternion } from 'babylonjs';
import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { EntitySchema } from '../../schemas/EntitySchema';

/**
 * Creates a system that handles network prediction, reconciliation, and interpolation
 */
export function createNetworkPredictionSystem(room: Room<State>) {
    // Configuration
    const interpolationConfig: InterpolationConfig = {
        delay: 150,
        maxBufferSize: 20,
        interpolationFactor: 0.2
    };

    // State buffers for each entity
    const stateBuffers = new Map<string, StateBuffer[]>();
    const pendingInputs = new Map<string, PhysicsInput[]>();
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
        
        stateBuffers.forEach((buffer, id) => {
            if (buffer.length < 2) return;
            
            // Find states bracketing target time
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].timestamp <= targetTime) {
                i++;
            }

            if (i >= buffer.length - 1) return;
            
            const a = buffer[i];
            const b = buffer[i + 1];
            const t = (targetTime - a.timestamp) / (b.timestamp - a.timestamp);
            
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity) return;

            // Interpolate position
            entity.position!.x = a.state.position.x + (b.state.position.x - a.state.position.x) * t;
            entity.position!.y = a.state.position.y + (b.state.position.y - a.state.position.y) * t;
            entity.position!.z = a.state.position.z + (b.state.position.z - a.state.position.z) * t;

            // Interpolate rotation
            const qa = new Quaternion(
                a.state.quaternion.x,
                a.state.quaternion.y,
                a.state.quaternion.z,
                a.state.quaternion.w
            );
            const qb = new Quaternion(
                b.state.quaternion.x,
                b.state.quaternion.y,
                b.state.quaternion.z,
                b.state.quaternion.w
            );
            const q = Quaternion.Slerp(qa, qb, t);
            entity.rotation!.x = q.x;
            entity.rotation!.y = q.y;
            entity.rotation!.z = q.z;
            entity.rotation!.w = q.w;

            // Interpolate velocities
            if (entity.velocity) {
                entity.velocity.x = a.state.linearVelocity.x + (b.state.linearVelocity.x - a.state.linearVelocity.x) * t;
                entity.velocity.y = a.state.linearVelocity.y + (b.state.linearVelocity.y - a.state.linearVelocity.y) * t;
                entity.velocity.z = a.state.linearVelocity.z + (b.state.linearVelocity.z - a.state.linearVelocity.z) * t;
            }

            if (entity.angularVelocity) {
                entity.angularVelocity.x = a.state.angularVelocity.x + (b.state.angularVelocity.x - a.state.angularVelocity.x) * t;
                entity.angularVelocity.y = a.state.angularVelocity.y + (b.state.angularVelocity.y - a.state.angularVelocity.y) * t;
                entity.angularVelocity.z = a.state.angularVelocity.z + (b.state.angularVelocity.z - a.state.angularVelocity.z) * t;
            }
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
        addEntityState: (id: string, state: PhysicsState) => {
            const entity = ecsWorld.entities.find(e => e.id === id);
            if (!entity) return;

            // Initialize buffers if needed
            if (!stateBuffers.has(id)) {
                stateBuffers.set(id, []);
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

            const buffers = stateBuffers.get(id)!;
            const isLocalPlayer = entity.drone || entity.plane;

            if (isLocalPlayer) {
                // Get current client state
                const clientState = {
                    position: entity.position!.clone(),
                    quaternion: entity.rotation!.clone()
                };

                const serverState = {
                    position: new Vector3(state.position.x, state.position.y, state.position.z),
                    quaternion: new Quaternion(
                        state.quaternion.x,
                        state.quaternion.y,
                        state.quaternion.z,
                        state.quaternion.w
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
                    entity.position!.x += (serverState.position.x - clientState.position.x) * RECONCILIATION_POSITION_SMOOTHING;
                    entity.position!.y += (serverState.position.y - clientState.position.y) * RECONCILIATION_POSITION_SMOOTHING;
                    entity.position!.z += (serverState.position.z - clientState.position.z) * RECONCILIATION_POSITION_SMOOTHING;

                    // Smoothly correct rotation
                    const correction = Quaternion.Slerp(
                        clientState.quaternion,
                        serverState.quaternion,
                        RECONCILIATION_ROTATION_SMOOTHING
                    );
                    entity.rotation!.x = correction.x;
                    entity.rotation!.y = correction.y;
                    entity.rotation!.z = correction.z;
                    entity.rotation!.w = correction.w;
                }

                // Replay unprocessed inputs
                const lastProcessedInputTick = state.lastProcessedInputTick ?? state.tick;
                const unprocessedInputs = pendingInputs.get(id)!.filter((input: PhysicsInput) => input.tick > lastProcessedInputTick);
                for (const input of unprocessedInputs) {
                    // Apply input to entity
                    applyInputToEntity(entity, input);
                }
                pendingInputs.set(id, unprocessedInputs);
            } else {
                // Buffer remote states for interpolation
                buffers.push({
                    state: state,
                    timestamp: state.timestamp,
                    tick: state.tick
                });
                
                // Keep buffer size reasonable
                if (buffers.length > interpolationConfig.maxBufferSize) {
                    buffers.shift();
                }
            }
        },

        /**
         * Adds a new input to the pending inputs buffer
         */
        addInput: (id: string, input: PhysicsInput) => {
            if (!pendingInputs.has(id)) {
                pendingInputs.set(id, []);
            }

            const inputs = pendingInputs.get(id)!;
            inputs.push(input);

            // Keep buffer size reasonable
            if (inputs.length > MAX_PENDING_INPUTS) {
                inputs.splice(0, inputs.length - MAX_PENDING_INPUTS);
            }
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
            stateBuffers.clear();
            pendingInputs.clear();
            lastProcessedInputTicks.clear();
            lastProcessedInputTimestamps.clear();
        }
    };
}

/**
 * Applies a physics input to an entity
 */
function applyInputToEntity(entity: GameEntity, input: PhysicsInput) {
    // Apply input to entity's physics state
    if (entity.velocity) {
        // Calculate velocity based on input controls
        const speed = 10; // Base speed
        entity.velocity.x = (input.right ? speed : 0) - (input.left ? speed : 0);
        entity.velocity.y = (input.up ? speed : 0) - (input.down ? speed : 0);
        entity.velocity.z = (input.forward ? speed : 0) - (input.backward ? speed : 0);
    }

    if (entity.angularVelocity) {
        // Calculate angular velocity based on input controls
        const rotationSpeed = 2; // Base rotation speed
        entity.angularVelocity.x = (input.pitchDown ? rotationSpeed : 0) - (input.pitchUp ? rotationSpeed : 0);
        entity.angularVelocity.y = (input.yawRight ? rotationSpeed : 0) - (input.yawLeft ? rotationSpeed : 0);
        entity.angularVelocity.z = (input.rollRight ? rotationSpeed : 0) - (input.rollLeft ? rotationSpeed : 0);
    }
} 