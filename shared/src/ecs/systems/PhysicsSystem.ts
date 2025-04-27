import { createDroneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createPlaneSystem } from '@shared/ecs/systems/VehicleSystems';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystems';
import { GameEntity, InputComponent, VehicleType } from '@shared/ecs/types';
import { world as ecsWorld } from '@shared/ecs/world';
import { createIdleInput } from '@shared/ecs/utils/InputHelpers';
import type { World as CannonWorld } from 'cannon-es';

export function createPhysicsSystem(world: CannonWorld) {
    const droneSystem = createDroneSystem(world);
    const planeSystem = createPlaneSystem(world);
    const weaponSystem = createWeaponSystem(world);

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
            
            // Always update weapon system if entity has weapons
            if (entity.vehicle?.weapons) {
                weaponSystem.update(dt, entity, inputToApply);
            }
        },

        getDroneSystem: () => droneSystem,
        getPlaneSystem: () => planeSystem,
        getWeaponSystem: () => weaponSystem,

        cleanup: () => {
            // Add any cleanup logic if needed
        }
    };
} 