import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, WeaponComponent, InputComponent, ProjectileType, EntityType, CollisionGroups, collisionMasks } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';

const TICKS_PER_SECOND = 60; // Assuming 60 ticks per second

/**
 * Weapon system that handles projectile creation and management
 */
export function createWeaponSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const armedEntities = ecsWorld.with("vehicle", "transform");

    return {
        update: (dt: number, entity: GameEntity, input: InputComponent, isServer: boolean) => {
            const vehicle = entity.vehicle!;
            const activeWeapon = vehicle.weapons[vehicle.activeWeaponIndex];
            const currentTick = physicsWorldSystem.getCurrentTick();

            // Update weapon cooldowns and heat
            vehicle.weapons.forEach(weapon => {
                // Calculate current fire rate based on heat
                const heatFactor = 1 - weapon.heatAccumulator;
                const currentFireRate = weapon.minFireRate + (weapon.maxFireRate - weapon.minFireRate) * heatFactor;
                const currentCooldownTicks = Math.ceil(TICKS_PER_SECOND / currentFireRate);

                // Update cooldown state
                if (weapon.isOnCooldown && currentTick - weapon.lastFireTick >= currentCooldownTicks) {
                    weapon.isOnCooldown = false;
                }

                // Update heat accumulator
                if (weapon.heatAccumulator > 0) {
                    weapon.heatAccumulator = Math.max(0, weapon.heatAccumulator - weapon.heatDissipationRate * dt);
                }
            });

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
            if (input.fire && activeWeapon && !activeWeapon.isOnCooldown) {
                // Calculate current fire rate and cooldown
                const heatFactor = 1 - activeWeapon.heatAccumulator;
                const currentFireRate = activeWeapon.minFireRate + (activeWeapon.maxFireRate - activeWeapon.minFireRate) * heatFactor;
                const currentCooldownTicks = Math.ceil(TICKS_PER_SECOND / currentFireRate);

                if (currentTick - activeWeapon.lastFireTick >= currentCooldownTicks) {
                    // Create projectile
                    const projectileId = isServer ? `${entity.id}_${input.tick}` : `${entity.id}_${currentTick}`;
                    const projectile = physicsWorldSystem.createProjectile(entity, activeWeapon, projectileId);
                    
                    // Add to ECS world
                    ecsWorld.add(projectile);
                    
                    // Update weapon state
                    activeWeapon.isOnCooldown = true;
                    activeWeapon.lastFireTick = currentTick;
                    
                    // Update heat accumulator
                    activeWeapon.heatAccumulator = Math.min(1, activeWeapon.heatAccumulator + activeWeapon.heatPerShot);
                }
            }
        },
        isOnCooldown: (vehicle: GameEntity) => {
            if (!vehicle.vehicle) return false;
            const activeWeapon = vehicle.vehicle.weapons?.[vehicle.vehicle.activeWeaponIndex];
            if (!activeWeapon) return false;
            return activeWeapon.isOnCooldown;
        },
        // Helper function to convert seconds to ticks
        secondsToTicks: (seconds: number) => Math.ceil(seconds * TICKS_PER_SECOND)
    };
}

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {

    return {
        update: (dt: number) => {
            const projectiles = ecsWorld.with("projectile", "transform");
            for (const entity of projectiles) {
                if (entity.physics?.body) {
                    physicsWorldSystem.applyBodyTransform(entity, entity.physics.body);
                }
                // Update distance traveled
                const distance = entity.transform!.velocity.length() * dt;
                entity.projectile!.distanceTraveled += distance;
                // Remove if exceeded range
                if (entity.projectile!.distanceTraveled >= entity.projectile!.range) {
                    ecsWorld.remove(entity);
                }
            }
        }
    };
} 