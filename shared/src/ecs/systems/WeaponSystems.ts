import * as CANNON from 'cannon-es';
import { Vector3, Quaternion } from '@babylonjs/core';
import { world as ecsWorld } from '../world';
import { GameEntity, WeaponComponent, InputComponent, ProjectileType, EntityType, CollisionGroups, collisionMasks } from '../types';
import { createPhysicsWorldSystem } from './PhysicsWorldSystem';
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
                const now = Date.now();
                if (now - activeWeapon.lastFireTime >= activeWeapon.cooldown * 1000) {
                    // Create projectile
                    const projectileId = isServer ? `${entity.id}_${input.tick}` : `${entity.id}_${physicsWorldSystem.getCurrentTick()}`;
                    const projectile = physicsWorldSystem.createProjectile(entity, activeWeapon, projectileId);
                    // Add to ECS world
                    ecsWorld.add(projectile);
                    
                    // Update weapon state
                    activeWeapon.isOnCooldown = true;
                    activeWeapon.lastFireTime = now;
                }
            }

            // Update weapon cooldowns
            const now = Date.now();
            vehicle.weapons.forEach(weapon => {
                if (weapon.isOnCooldown && now - weapon.lastFireTime >= weapon.cooldown * 1000) {
                    weapon.isOnCooldown = false;
                }
            });
        }
    };
}

/**
 * Projectile system that updates projectile positions and handles lifetime
 */
export function createProjectileSystem(
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    const projectiles = ecsWorld.with("projectile", "transform");

    return {
        update: (dt: number) => {
            for (const entity of projectiles) {
                physicsWorldSystem.applyBodyTransform(entity, entity.physics!.body);
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