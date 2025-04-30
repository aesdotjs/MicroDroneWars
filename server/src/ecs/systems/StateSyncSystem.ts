import { GameEntity } from '@shared/ecs/types';
import { State, EntitySchema, WeaponSchema } from '@shared/schemas';
import { world as ecsWorld } from "@shared/ecs/world";
import { createPhysicsWorldSystem } from '@shared/ecs/systems/PhysicsWorldSystem';
import { createInputSystem } from './InputSystems';
/**
 * Synchronizes ECS entities with Colyseus state
 */
export function createStateSyncSystem(
    state: State,
    inputSystem: ReturnType<typeof createInputSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>
) {
    /**
     * Converts a GameEntity to an EntitySchema and updates the state
     */
    const syncEntityToState = (entity: GameEntity) => {
        let entityState = state.entities.get(entity.id)
        if (!entityState) {
            console.log(`Creating entity state for:`, entity.id);
            entityState = new EntitySchema();
            entityState.id = entity.id;
            entityState.type = entity.type || "";
        }
        // Update transform data
        if (entity.transform) {
            if (entity.transform.position) {
                entityState.transform.positionX = entity.transform.position.x;
                entityState.transform.positionY = entity.transform.position.y;
                entityState.transform.positionZ = entity.transform.position.z;
            }
            if (entity.transform.rotation) {
                entityState.transform.quaternionX = entity.transform.rotation.x;
                entityState.transform.quaternionY = entity.transform.rotation.y;
                entityState.transform.quaternionZ = entity.transform.rotation.z;
                entityState.transform.quaternionW = entity.transform.rotation.w;
            }
            if (entity.transform.velocity) {
                entityState.transform.linearVelocityX = entity.transform.velocity.x;
                entityState.transform.linearVelocityY = entity.transform.velocity.y;
                entityState.transform.linearVelocityZ = entity.transform.velocity.z;
            }
            if (entity.transform.angularVelocity) {
                entityState.transform.angularVelocityX = entity.transform.angularVelocity.x;
                entityState.transform.angularVelocityY = entity.transform.angularVelocity.y;
                entityState.transform.angularVelocityZ = entity.transform.angularVelocity.z;
            }
        }

        // Update game state data
        if (entity.gameState) {
            entityState.gameState.health = entity.gameState.health;
            entityState.gameState.maxHealth = entity.gameState.maxHealth;
            entityState.gameState.team = entity.gameState.team;
            entityState.gameState.hasFlag = entity.gameState.hasFlag;
            entityState.gameState.carryingFlag = entity.gameState.carryingFlag;
            entityState.gameState.carriedBy = entity.gameState.carriedBy || "";
            entityState.gameState.atBase = entity.gameState.atBase;
        }

        // Update vehicle data
        if (entity.vehicle) {
            entityState.vehicle.vehicleType = entity.vehicle.vehicleType;
            if (entity.vehicle.weapons) {
                // Clear existing weapons
                while (entityState.vehicle.weapons.length > 0) {
                    entityState.vehicle.weapons.pop();
                }
                // Add new weapons
                for (const weapon of entity.vehicle.weapons) {
                    const newWeapon = new WeaponSchema();
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
                    entityState.vehicle.weapons.push(newWeapon);
                }
            }
            entityState.vehicle.activeWeaponIndex = entity.vehicle.activeWeaponIndex;
        }

        // Update projectile data
        if (entity.projectile) {
            entityState.projectile.damage = entity.projectile.damage;
            entityState.projectile.range = entity.projectile.range;
            entityState.projectile.distanceTraveled = entity.projectile.distanceTraveled;
            entityState.projectile.sourceId = entity.projectile.sourceId;
        }

        // Update Owner data
        if (entity.owner) {
            entityState.owner.id = entity.owner.id;
        }

        // Update asset data
        if (entity.asset) {
            entityState.asset.assetPath = entity.asset.assetPath;
            entityState.asset.assetType = entity.asset.assetType;
            entityState.asset.scale = entity.asset.scale;
        }

        // Update tick data
        if (entity.tick) {
            entityState.tick.tick = physicsWorldSystem.getCurrentTick();
            entityState.tick.timestamp = Date.now();
            entityState.tick.lastProcessedInputTimestamp = inputSystem.inputProcessor.getLastProcessedInputTimestamp(entity.id) ?? Date.now();
            entityState.tick.lastProcessedInputTick = inputSystem.inputProcessor.getLastProcessedInputTick(entity.id) ?? physicsWorldSystem.getCurrentTick();
            entity.tick.tick = entityState.tick.tick;
            entity.tick.timestamp = entityState.tick.timestamp;
            entity.tick.lastProcessedInputTimestamp = entityState.tick.lastProcessedInputTimestamp;
            entity.tick.lastProcessedInputTick = entityState.tick.lastProcessedInputTick;
        }
        state.entities.set(entity.id, entityState);
    };

    return {
        addEntity: (entity: GameEntity) => {
            syncEntityToState(entity);
        },

        removeEntity: (entity: GameEntity) => {
            console.log(`Removing entity:`, entity.id, state.entities.get(entity.id));
            state.entities.delete(entity.id);
        },
        
        update: () => {
            const entities = ecsWorld.entities;
            // Sync all entities to state
            for (const entity of entities) {
                syncEntityToState(entity);
            }
        }
    };
} 