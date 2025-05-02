import { world as ecsWorld } from '../world';
import { EntityType, GameEntity } from '../types';
import { Vector3 } from '@babylonjs/core';

const FLAG_CAPTURE_RADIUS = 5;
const FLAG_RETURN_RADIUS = 10;

/**
 * Flag system that handles flag capture and scoring
 */
export function createFlagSystem() {
    const flags = ecsWorld.with("gameState", "transform", "type").where(({type}) => type === EntityType.Flag);
    const vehicles = ecsWorld.with("vehicle", "transform", "gameState");

    return {
        update: (dt: number) => {
            for (const flag of flags) {
                // Skip if flag is being carried
                if (flag.gameState!.carriedBy) continue;

                // Check for flag capture
                for (const vehicle of vehicles) {
                    // Skip if vehicle is on the same team as the flag
                    if (vehicle.gameState!.team === flag.gameState!.team) continue;

                    // Check distance to flag
                    const distance = Vector3.Distance(
                        vehicle.transform!.position,
                        flag.transform!.position
                    );

                    // Capture flag if close enough
                    if (distance < FLAG_CAPTURE_RADIUS) {
                        flag.gameState!.carriedBy = vehicle.id;
                        vehicle.gameState!.hasFlag = true;
                        break;
                    }
                }
            }

            // Update carried flags
            for (const flag of flags) {
                if (flag.gameState?.carriedBy) {
                    const carrier = ecsWorld.entities.find(e => e.id === flag.gameState?.carriedBy);
                    if (carrier) {
                        // Update flag position to follow carrier
                        flag.transform!.position.copyFrom(carrier.transform!.position);

                        // Check if carrier is at their base
                        const basePos = new Vector3(
                            carrier.gameState!.team === 0 ? -20 : 20,
                            0,
                            0
                        );
                        const distanceToBase = Vector3.Distance(
                            carrier.transform!.position,
                            basePos
                        );

                        // Return flag if at base
                        if (distanceToBase < FLAG_RETURN_RADIUS) {
                            flag.gameState!.carriedBy = undefined;
                            carrier.gameState!.hasFlag = false;
                            flag.transform!.position.copyFrom(basePos);
                            flag.gameState!.atBase = true;
                        }
                    } else {
                        // Carrier no longer exists, return flag to base
                        flag.gameState!.carriedBy = undefined;
                        flag.transform!.position.set(
                            flag.gameState!.team === 0 ? -20 : 20,
                            0,
                            0
                        );
                        flag.gameState!.atBase = true;
                    }
                }
            }
        }
    };
} 