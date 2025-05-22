import { GameEntity, TransformBuffer } from '@shared/ecs/types';
import { State, EntitySchema, WeaponSchema, ImpactSchema, TransformSchema, GameStateSchema, VehicleSchema, ProjectileSchema, OwnerSchema, AssetSchema, TickSchema } from '@shared/schemas';
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
            entityState = new EntitySchema();
            entityState.id = entity.id;
            entityState.type = entity.type || "";
        }
        // Update transform data
        if (entity.transform) {
            if (!entityState.transform) {
                entityState.transform = new TransformSchema();
            }
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
            if (!entityState.gameState) {
                entityState.gameState = new GameStateSchema();
            }
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
            if (!entityState.vehicle) {
                entityState.vehicle = new VehicleSchema();
            }
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
                    newWeapon.minFireRate = weapon.minFireRate;
                    newWeapon.maxFireRate = weapon.maxFireRate;
                    newWeapon.heatPerShot = weapon.heatPerShot;
                    newWeapon.heatDissipationRate = weapon.heatDissipationRate;
                    newWeapon.projectileSpeed = weapon.projectileSpeed;
                    newWeapon.range = weapon.range;
                    entityState.vehicle.weapons.push(newWeapon);
                }
            }
            entityState.vehicle.activeWeaponIndex = entity.vehicle.activeWeaponIndex;
        }

        // Update projectile data
        if (entity.projectile) {
            if (!entityState.projectile) {
                entityState.projectile = new ProjectileSchema();
            }
            entityState.projectile.projectileType = entity.projectile.projectileType;
            entityState.projectile.damage = entity.projectile.damage;
            entityState.projectile.range = entity.projectile.range;
            entityState.projectile.distanceTraveled = entity.projectile.distanceTraveled;
            entityState.projectile.sourceId = entity.projectile.sourceId;
            entityState.projectile.speed = entity.transform?.velocity?.length() || 0;
            if (entity.projectile.impact) {
                if (!entityState.projectile.impact) {
                    entityState.projectile.impact = new ImpactSchema();
                }
                entityState.projectile.impact.targetId = entity.projectile.impact.targetId;
                entityState.projectile.impact.targetType = entity.projectile.impact.targetType;
                entityState.projectile.impact.positionX = entity.projectile.impact.position.x;
                entityState.projectile.impact.positionY = entity.projectile.impact.position.y;
                entityState.projectile.impact.positionZ = entity.projectile.impact.position.z;
                entityState.projectile.impact.normalX = entity.projectile.impact.normal.x;
                entityState.projectile.impact.normalY = entity.projectile.impact.normal.y;
                entityState.projectile.impact.normalZ = entity.projectile.impact.normal.z;
                entityState.projectile.impact.impactVelocity = entity.projectile.impact.impactVelocity;
            }
        }

        // Update Owner data
        if (entity.owner) {
            if (!entityState.owner) {
                entityState.owner = new OwnerSchema();
            }
            entityState.owner.id = entity.owner.id;
        }

        // Update asset data
        if (entity.asset) {
            if (!entityState.asset) {
                entityState.asset = new AssetSchema();
            }
            entityState.asset.assetPath = entity.asset.assetPath;
            entityState.asset.assetType = entity.asset.assetType;
            entityState.asset.scale = entity.asset.scale;
        }

        // Update tick data
        if (entity.tick) {
            if (!entityState.tick) {
                entityState.tick = new TickSchema();
            }
            entityState.tick.tick = physicsWorldSystem.getCurrentTick();
            entityState.tick.timestamp = Date.now();
            entityState.tick.lastProcessedInputTimestamp = inputSystem.inputProcessor.getLastProcessedInputTimestamp(entity.id) ?? Date.now();
            entityState.tick.lastProcessedInputTick = inputSystem.inputProcessor.getLastProcessedInputTick(entity.id) ?? physicsWorldSystem.getCurrentTick();
            entity.tick.tick = entityState.tick.tick;
            entity.tick.timestamp = entityState.tick.timestamp;
            entity.tick.lastProcessedInputTimestamp = entityState.tick.lastProcessedInputTimestamp;
            entity.tick.lastProcessedInputTick = entityState.tick.lastProcessedInputTick;
        }
        // 
        if (entity.transform && entity.tick && entity.owner && entity.vehicle) {
            const transformBuffer: TransformBuffer = {
                transform: {
                    position: entity.transform.position.clone(),
                    rotation: entity.transform.rotation.clone(),
                    velocity: entity.transform.velocity.clone(),
                    angularVelocity: entity.transform.angularVelocity.clone()
                },
                tick: {
                    timestamp: entity.tick.timestamp,
                    tick: entity.tick.tick
                }
            };
            inputSystem.addTransformBuffer(entity.owner.id, transformBuffer);
        }
        state.entities.set(entity.id, entityState);
    };

    return {
        addEntity: (entity: GameEntity) => {
            syncEntityToState(entity);
        },

        removeEntity: (entity: GameEntity) => {
            if (state.entities.has(entity.id)) {
                state.entities.delete(entity.id);
            }
        },
        
        update: () => {
            const entities = ecsWorld.entities;
            // Sync all entities to state
            for (const entity of entities) {
                syncEntityToState(entity);
            }
        },
    };
} 