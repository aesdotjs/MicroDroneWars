import { GameEntity } from '@shared/ecs/types';
import { State, EntitySchema, WeaponSchema } from '../../schemas';
/**
 * Synchronizes ECS entities with Colyseus state
 */
export function createStateSyncSystem(state: State) {
    /**
     * Converts a GameEntity to an EntitySchema and updates the state
     */
    const syncEntityToState = (entity: GameEntity, entityState: EntitySchema) => {
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

        // Update tick data
        if (entity.tick) {
            entityState.tick.tick = entity.tick.tick;
            entityState.tick.timestamp = entity.tick.timestamp;
            entityState.tick.lastProcessedInputTimestamp = entity.tick.lastProcessedInputTimestamp || 0;
            entityState.tick.lastProcessedInputTick = entity.tick.lastProcessedInputTick || 0;
        }
    };

    return {
        addEntity: (entity: GameEntity) => {
            const entityState = new EntitySchema();
            entityState.id = entity.id;
            entityState.type = entity.type || "";
            syncEntityToState(entity, entityState);
            state.entities.set(entity.id, entityState);
        },

        removeEntity: (entity: GameEntity) => {
            state.entities.delete(entity.id);
        },
        
        update: (entities: GameEntity[]) => {
            // Sync all entities to state
            for (const entity of entities) {
                const entityState = state.entities.get(entity.id);
                if (!entityState) continue;
                syncEntityToState(entity, entityState);
            }
        }
    };
} 