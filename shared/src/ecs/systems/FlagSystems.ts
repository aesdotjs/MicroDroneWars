import { world as ecsWorld } from '../world';
import { GameEntity } from '../types';
import { Vector3 } from 'babylonjs';

const FLAG_CAPTURE_RADIUS = 5;
const FLAG_RETURN_RADIUS = 10;

/**
 * Flag system that handles flag capture and scoring
 */
export function createFlagSystem() {
    const flags = ecsWorld.with("flag", "position", "team");
    const vehicles = ecsWorld.with("drone", "plane", "position", "team");

    return {
        update: (dt: number) => {
            for (const flag of flags) {
                // Skip if flag is being carried
                if (flag.carriedBy) continue;

                // Check for flag capture
                for (const vehicle of vehicles) {
                    // Skip if vehicle is on the same team as the flag
                    if (vehicle.team === flag.team) continue;

                    // Check distance to flag
                    const distance = Vector3.Distance(
                        vehicle.position!,
                        flag.position!
                    );

                    // Capture flag if close enough
                    if (distance < FLAG_CAPTURE_RADIUS) {
                        flag.carriedBy = vehicle.id;
                        vehicle.hasFlag = true;
                        break;
                    }
                }
            }

            // Update carried flags
            for (const flag of flags) {
                if (flag.carriedBy) {
                    const carrier = ecsWorld.entities.find(e => e.id === flag.carriedBy);
                    if (carrier) {
                        // Update flag position to follow carrier
                        flag.position!.copyFrom(carrier.position!);

                        // Check if carrier is at their base
                        const basePos = new Vector3(
                            carrier.team === 0 ? -20 : 20,
                            0,
                            0
                        );
                        const distanceToBase = Vector3.Distance(
                            carrier.position!,
                            basePos
                        );

                        // Return flag if at base
                        if (distanceToBase < FLAG_RETURN_RADIUS) {
                            flag.carriedBy = undefined;
                            carrier.hasFlag = false;
                            flag.position!.copyFrom(basePos);
                            flag.atBase = true;
                        }
                    } else {
                        // Carrier no longer exists, return flag to base
                        flag.carriedBy = undefined;
                        flag.position!.set(
                            flag.team === 0 ? -20 : 20,
                            0,
                            0
                        );
                        flag.atBase = true;
                    }
                }
            }
        }
    };
} 