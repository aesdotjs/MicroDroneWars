import { createDroneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createPlaneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
import { GameEntity, InputComponent, VehicleType } from '@shared/ecs/types';
export function createPhysicsSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const droneSystem = createDroneSystem(physicsWorldSystem);
    const planeSystem = createPlaneSystem(physicsWorldSystem);

    return {
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            // Apply input to appropriate system based on vehicle type
            if (entity.vehicle?.vehicleType === VehicleType.Drone) {
                droneSystem.applyInput(dt, entity, input);
            } else if (entity.vehicle?.vehicleType === VehicleType.Plane) {
                planeSystem.applyInput(dt, entity, input);
            }
        },
        update: (dt: number) => {
            droneSystem.update(dt);
            planeSystem.update(dt);
        },

        getDroneSystem: () => droneSystem,
        getPlaneSystem: () => planeSystem,

        cleanup: () => {
            // Add any cleanup logic if needed
        }
    };
} 