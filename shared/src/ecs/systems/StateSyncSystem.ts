import { GameEntity } from '../types';
import { State, EntitySchema, Weapon } from '../../types/schemas';
import { Vector3, Quaternion } from 'babylonjs';

/**
 * Synchronizes ECS entities with Colyseus state
 */
export function createStateSyncSystem(state: State) {
    return {
        update: (entities: GameEntity[]) => {
            // Sync all entities to state
            for (const entity of entities) {
                const entityState = state.entities.get(entity.id);
                if (!entityState) continue;

                // Update transform data
                if (entity.position) {
                    entityState.positionX = entity.position.x;
                    entityState.positionY = entity.position.y;
                    entityState.positionZ = entity.position.z;
                }
                if (entity.rotation) {
                    entityState.quaternionX = entity.rotation.x;
                    entityState.quaternionY = entity.rotation.y;
                    entityState.quaternionZ = entity.rotation.z;
                    entityState.quaternionW = entity.rotation.w;
                }
                if (entity.velocity) {
                    entityState.linearVelocityX = entity.velocity.x;
                    entityState.linearVelocityY = entity.velocity.y;
                    entityState.linearVelocityZ = entity.velocity.z;
                }
                if (entity.angularVelocity) {
                    entityState.angularVelocityX = entity.angularVelocity.x;
                    entityState.angularVelocityY = entity.angularVelocity.y;
                    entityState.angularVelocityZ = entity.angularVelocity.z;
                }

                // Update common state data
                if (entity.health !== undefined) entityState.health = entity.health;
                if (entity.maxHealth !== undefined) entityState.maxHealth = entity.maxHealth;
                if (entity.hasFlag !== undefined) entityState.hasFlag = entity.hasFlag;
                if (entity.carriedBy !== undefined) entityState.carriedBy = entity.carriedBy;
                if (entity.atBase !== undefined) entityState.atBase = entity.atBase;
                if (entity.team !== undefined) entityState.team = entity.team;

                // Update type-specific data
                if (entity.drone || entity.plane) {
                    entityState.type = entity.drone ? 'drone' : 'plane';
                    entityState.vehicleType = entity.drone ? 'drone' : 'plane';
                    if (entity.weapons) {
                        // Clear existing weapons
                        while (entityState.weapons.length > 0) {
                            entityState.weapons.pop();
                        }
                        // Add new weapons
                        for (const weapon of entity.weapons) {
                            const newWeapon = new Weapon();
                            newWeapon.id = weapon.id;
                            newWeapon.name = weapon.name;
                            newWeapon.projectileType = weapon.projectileType;
                            newWeapon.damage = weapon.damage;
                            newWeapon.fireRate = weapon.fireRate;
                            newWeapon.projectileSpeed = weapon.projectileSpeed;
                            newWeapon.cooldown = weapon.cooldown;
                            newWeapon.range = weapon.range;
                            newWeapon.isOnCooldown = weapon.isOnCooldown;
                            newWeapon.lastFireTime = weapon.lastFireTime;
                            entityState.weapons.push(newWeapon);
                        }
                    }
                    if (entity.activeWeaponIndex !== undefined) {
                        entityState.activeWeaponIndex = entity.activeWeaponIndex;
                    }
                }

                if (entity.projectile) {
                    entityState.type = 'projectile';
                    if (entity.damage !== undefined) entityState.damage = entity.damage;
                    if (entity.range !== undefined) entityState.range = entity.range;
                    if (entity.distanceTraveled !== undefined) entityState.distanceTraveled = entity.distanceTraveled;
                    if (entity.sourceId !== undefined) entityState.sourceId = entity.sourceId;
                }

                if (entity.flag) {
                    entityState.type = 'flag';
                }

                // Update timestamps and ticks
                if (entity.tick !== undefined) entityState.tick = entity.tick;
                if (entity.timestamp !== undefined) entityState.timestamp = entity.timestamp;
                if (entity.lastProcessedInputTimestamp !== undefined) entityState.lastProcessedInputTimestamp = entity.lastProcessedInputTimestamp;
                if (entity.lastProcessedInputTick !== undefined) entityState.lastProcessedInputTick = entity.lastProcessedInputTick;
            }
        }
    };
} 