import { createDroneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createPlaneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
import { GameEntity, InputComponent, VehicleType } from '@shared/ecs/types';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
export function createPhysicsSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const droneSystem = createDroneSystem(physicsWorldSystem);
    const planeSystem = createPlaneSystem(physicsWorldSystem);

    return {
        update: (dt: number, entity: GameEntity, input?: InputComponent) => {
            // If no input provided, use idle input
            const inputToApply = input || createIdleInput(entity.tick!.tick);
            
            // Apply input to appropriate system based on vehicle type
            if (entity.vehicle?.vehicleType === VehicleType.Drone) {
                droneSystem.update(dt, entity, inputToApply);
            } else if (entity.vehicle?.vehicleType === VehicleType.Plane) {
                planeSystem.update(dt, entity, inputToApply);
            }
        },

        getDroneSystem: () => droneSystem,
        getPlaneSystem: () => planeSystem,

        cleanup: () => {
            // Add any cleanup logic if needed
        }
    };
} 