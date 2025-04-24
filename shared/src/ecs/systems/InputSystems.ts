import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { PhysicsInput } from '../../physics/types';

const MAX_INPUT_BUFFER_SIZE = 60; // 1 second worth of inputs at 60fps

export function createInputSystem() {
    const inputBuffers = new Map<string, PhysicsInput[]>();
    const lastProcessedInputTicks = new Map<string, number>();

    return {
        addInput: (id: string, input: PhysicsInput) => {
            const buffer = inputBuffers.get(id) || [];
            buffer.push(input);
            
            // Keep buffer size reasonable
            while (buffer.length > MAX_INPUT_BUFFER_SIZE) {
                buffer.shift();
            }
            
            inputBuffers.set(id, buffer);
        },

        update: (dt: number) => {
            const entities = ecsWorld.with("input", "body");
            
            for (const entity of entities) {
                const buffer = inputBuffers.get(entity.id) || [];
                let lastProcessedTick = lastProcessedInputTicks.get(entity.id) || 0;
                
                // Sort inputs by tick
                const sortedInputs = buffer.sort((a, b) => a.tick - b.tick);
                
                // Process each input in order
                let processedCount = 0;
                for (const input of sortedInputs) {
                    if (input.tick > lastProcessedTick) {
                        entity.input = input;
                        lastProcessedTick = input.tick;
                        processedCount++;
                    }
                }
                
                // Update last processed tick
                if (processedCount > 0) {
                    lastProcessedInputTicks.set(entity.id, lastProcessedTick);
                }
                
                // Remove processed inputs
                buffer.splice(0, processedCount);
                inputBuffers.set(entity.id, buffer);
            }
        },

        getLastProcessedInputTick: (id: string): number => {
            return lastProcessedInputTicks.get(id) || 0;
        },

        cleanup: (id: string) => {
            inputBuffers.delete(id);
            lastProcessedInputTicks.delete(id);
        }
    };
} 