import { Vector3, Quaternion } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, WeaponComponent, InputComponent, ProjectileType, EntityType, CollisionGroups, collisionMasks } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';

const TICKS_PER_SECOND = 60; // Assuming 60 ticks per second

/**
 * Weapon system that handles projectile creation and management
 */
export function createWeaponSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    isServer: boolean
) {
    const armedEntities = ecsWorld.with("vehicle", "transform");
    const bulletCounters = new Map<string, number>();
    return {
        update: (dt: number) => {
            const currentTick = physicsWorldSystem.getCurrentTick();
            for (const entity of armedEntities) {
                const vehicle = entity.vehicle!;
                if (!vehicle.weapons) continue;

                // Update weapon cooldowns and heat
                vehicle.weapons.forEach(weapon => {
                    // Calculate current fire rate based on heat
                    const heatAccumulator = weapon.heatAccumulator ?? 0;
                    const lastFireTick = weapon.lastFireTick ?? currentTick;
                    const heatFactor = 1 - heatAccumulator;
                    const currentFireRate = weapon.maxFireRate - (weapon.maxFireRate - weapon.minFireRate) * heatAccumulator;
                    const currentCooldownTicks = Math.ceil(TICKS_PER_SECOND / currentFireRate);

                    // Update cooldown state
                    if (weapon.isOnCooldown && currentTick - lastFireTick >= currentCooldownTicks) {
                        weapon.isOnCooldown = false;
                    }

                    // Update heat accumulator
                    if (heatAccumulator > 0) {
                        weapon.heatAccumulator = Math.max(0, heatAccumulator - weapon.heatDissipationRate * dt);
                    }
                });
            }
        },
        applyInput: (dt: number, entity: GameEntity, input: InputComponent) => {
            const vehicle = entity.vehicle!;
            const activeWeapon = vehicle.weapons[vehicle.activeWeaponIndex];
            const currentTick = physicsWorldSystem.getCurrentTick();

            // Handle weapon switching
            if (input.nextWeapon) {
                vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex + 1) % vehicle.weapons.length;
            }
            if (input.previousWeapon) {
                vehicle.activeWeaponIndex = (vehicle.activeWeaponIndex - 1 + vehicle.weapons.length) % vehicle.weapons.length;
            }
            if (input.weapon1) vehicle.activeWeaponIndex = 0;
            if (input.weapon2) vehicle.activeWeaponIndex = 1;
            if (input.weapon3) vehicle.activeWeaponIndex = 2;
            // Handle firing
            if (input.fire && (!isServer || input.projectileId) && activeWeapon && !activeWeapon.isOnCooldown) {
                // Calculate current fire rate and cooldown
                const heatAccumulator = activeWeapon!.heatAccumulator ?? 0;
                const lastFireTick = activeWeapon!.lastFireTick ?? currentTick;
                const currentFireRate = activeWeapon.maxFireRate - (activeWeapon.maxFireRate - activeWeapon.minFireRate) * heatAccumulator;
                const currentCooldownTicks = Math.ceil(TICKS_PER_SECOND / currentFireRate);
                if (currentTick - lastFireTick >= currentCooldownTicks) {
                    let projectileId: number;
                    if (isServer && input.projectileId) {
                        projectileId = input.projectileId;
                    } else {
                        const count = (bulletCounters.get(entity.id)||0) + 1;
                        bulletCounters.set(entity.id, count);
                        projectileId = count;
                    }
                    const aimPoint = new Vector3(input.aimPointX, input.aimPointY, input.aimPointZ);
                    const projectile = physicsWorldSystem.createProjectile(entity, activeWeapon, `${entity.id}_${projectileId}`, aimPoint);
                    // Add to ECS world
                    ecsWorld.add(projectile);
                    
                    // Update weapon state
                    activeWeapon.isOnCooldown = true;
                    activeWeapon.lastFireTick = currentTick;
                    
                    // Update heat accumulator
                    activeWeapon.heatAccumulator = Math.min(1, heatAccumulator + activeWeapon.heatPerShot);
                    return projectileId;
                }
            }
            return undefined;
        },
        isOnCooldown: (vehicle: GameEntity) => {
            if (!vehicle.vehicle) return false;
            const activeWeapon = vehicle.vehicle.weapons?.[vehicle.vehicle.activeWeaponIndex];
            if (!activeWeapon) return false;
            return activeWeapon.isOnCooldown ?? false;
        },
        // Helper function to convert seconds to ticks
        secondsToTicks: (seconds: number) => Math.ceil(seconds * TICKS_PER_SECOND)
    };
}