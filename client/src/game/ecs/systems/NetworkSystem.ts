import { Room } from 'colyseus.js';
import { State, EntitySchema, WeaponSchema } from '@shared/schemas';
import { world as ecsWorld } from '@shared/ecs/world';
import { Vector3, Quaternion, Scene } from '@babylonjs/core';
import { GameEntity, TransformBuffer, EntityType, VehicleType, ProjectileType } from '@shared/ecs/types';
import * as Colyseus from 'colyseus.js';
import { createPhysicsWorldSystem } from '@shared/ecs/systems';
import { createNetworkPredictionSystem } from './NetworkPredictionSystem';
import { createClientInputSystem } from './ClientInputSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
import { useGameDebug } from '@/composables/useGameDebug';
import { createWeaponSystem } from '@shared/ecs/systems/WeaponSystem';

/**
* Creates a system that handles network state updates and converts them to ECS entities
*/
export function createNetworkSystem(
    room: Room<State>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    inputSystem: ReturnType<typeof createClientInputSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>
) {
    console.log('Creating network system...');
    const $ = Colyseus.getStateCallbacks(room);
    
    // Debug mode flag
    let debugMode = false;
    
    const networkPredictionSystem = createNetworkPredictionSystem(
        physicsSystem,
        physicsWorldSystem,
        weaponSystem,
        room
    );
    
    // Network quality tracking
    let networkLatency = 0;
    let networkQuality = 1.0;
    let networkJitter = 0;
    const qualitySamples: number[] = [];
    const QUALITY_SAMPLES = 20;
    const MIN_LATENCY = 5;
    const LATENCY_SMOOTHING = 0.1;
    
    const { log } = useGameDebug();
    
    // Handle network quality measurements
    room.onMessage("pong", (data: { clientTime: number, serverTime: number, latency: number }) => {
        const now = Date.now();
        const rtt = now - data.clientTime;
        // Use the server-provided latency if available, otherwise calculate it
        const oneWayLatency = Math.max(MIN_LATENCY, data.latency || rtt / 2);
        const jitter = Math.abs(rtt/2 - oneWayLatency);
        
        // Update network stats with smoothing
        networkLatency = networkLatency === 0 
            ? oneWayLatency 
            : LATENCY_SMOOTHING * oneWayLatency + (1 - LATENCY_SMOOTHING) * networkLatency;
        
        networkJitter = networkJitter === 0
            ? jitter
            : LATENCY_SMOOTHING * jitter + (1 - LATENCY_SMOOTHING) * networkJitter;
        
        // Update network quality
        const latencyScore = Math.max(0, 1 - (oneWayLatency / 500));
        const jitterScore = Math.max(0, 1 - (jitter / 100));
        const qualityScore = (latencyScore + jitterScore) / 2;
        
        qualitySamples.push(qualityScore);
        if (qualitySamples.length > QUALITY_SAMPLES) {
            qualitySamples.shift();
        }
        
        networkQuality = qualitySamples.reduce((a, b) => a + b, 0) / qualitySamples.length;

        // Update network prediction system with new stats
        networkPredictionSystem.updateNetworkStats(networkLatency, networkQuality, networkJitter);

        log('Network Stats', {
            rtt,
            oneWayLatency,
            jitter,
            quality: networkQuality,
            latencyScore,
            jitterScore
        });
    });
    
    // Handle entity updates
    $(room.state).entities.onAdd((entity: EntitySchema, id: string) => {
        
        // Create base entity with required components
        const newEntity: GameEntity = {
            id,
            type: entity.type as EntityType,
            transform: {
                position: new Vector3(entity.transform.positionX, entity.transform.positionY, entity.transform.positionZ),
                rotation: new Quaternion(entity.transform.quaternionX, entity.transform.quaternionY, entity.transform.quaternionZ, entity.transform.quaternionW),
                velocity: new Vector3(entity.transform.linearVelocityX, entity.transform.linearVelocityY, entity.transform.linearVelocityZ),
                angularVelocity: new Vector3(entity.transform.angularVelocityX, entity.transform.angularVelocityY, entity.transform.angularVelocityZ)
            },
            tick: {
                tick: entity.tick.tick,
                timestamp: entity.tick.timestamp,
                lastProcessedInputTimestamp: entity.tick.lastProcessedInputTimestamp,
                lastProcessedInputTick: entity.tick.lastProcessedInputTick
            },
            owner: {
                id: entity.owner.id,
                isLocal: room.sessionId === entity.owner.id
            }
        };

        // Add game state component if present
        if (entity.gameState) {
            newEntity.gameState = {
                health: entity.gameState.health,
                maxHealth: entity.gameState.maxHealth,
                team: entity.gameState.team,
                hasFlag: entity.gameState.hasFlag,
                carryingFlag: entity.gameState.carryingFlag,
                carriedBy: entity.gameState.carriedBy,
                atBase: entity.gameState.atBase
            };
        }

        // Add type-specific components
        switch (entity.type) {
            case EntityType.Vehicle:
                if (entity.vehicle) {
                    newEntity.vehicle = {
                        vehicleType: entity.vehicle.vehicleType as VehicleType,
                        weapons: Array.from(entity.vehicle.weapons).map(w => ({
                            id: w.id,
                            name: w.name,
                            projectileType: w.projectileType as ProjectileType,
                            damage: w.damage,
                            minFireRate: w.minFireRate,
                            maxFireRate: w.maxFireRate,
                            heatPerShot: w.heatPerShot,
                            heatDissipationRate: w.heatDissipationRate,
                            projectileSpeed: w.projectileSpeed,
                            range: w.range,
                            isOnCooldown: false,
                            lastFireTick: 0,
                            heatAccumulator: 0
                        })),
                        activeWeaponIndex: entity.vehicle.activeWeaponIndex
                    };
                }
                break;

            case EntityType.Projectile:
                if (entity.projectile) {
                    newEntity.projectile = {
                        projectileType: entity.projectile.projectileType as ProjectileType,
                        damage: entity.projectile.damage,
                        range: entity.projectile.range,
                        distanceTraveled: entity.projectile.distanceTraveled,
                        sourceId: entity.projectile.sourceId,
                        speed: entity.projectile.speed
                    };
                }
                break;
        }

        // Add asset component if present
        if (entity.asset?.assetPath) {
            newEntity.asset = {
                isLoaded: false,
                assetPath: entity.asset.assetPath,
                assetType: entity.asset.assetType,
                scale: entity.asset.scale
            };
        }
        // don't add entity to ECS world entity already exists (projectile)
        if (!ecsWorld.entities.find(e => e.id === entity.id)) {
            // Add entity to ECS world
            ecsWorld.add(newEntity);
        } else { // Entity already exists in ECS world (most likely a projectile)
            const gameEntity = ecsWorld.entities.find(e => e.id === id);
            if (gameEntity) {
                // if (gameEntity.transform) {
                //     const transformBuffer: TransformBuffer = {
                //         transform: {
                //             position: gameEntity.transform!.position,
                //             rotation: gameEntity.transform!.rotation,
                //             velocity: gameEntity.transform!.velocity,
                //             angularVelocity: gameEntity.transform!.angularVelocity
                //         },
                //         tick: {
                //             tick: gameEntity.tick!.tick,
                //             timestamp: gameEntity.tick!.timestamp,
                //             lastProcessedInputTimestamp: gameEntity.tick!.lastProcessedInputTimestamp,
                //             lastProcessedInputTick: gameEntity.tick!.lastProcessedInputTick
                //         }
                //     };
                //     networkPredictionSystem.addEntityState(id, transformBuffer);
                // }
                if (newEntity.vehicle) {
                    gameEntity.vehicle!.weapons = newEntity.vehicle!.weapons;
                    gameEntity.vehicle!.activeWeaponIndex = newEntity.vehicle!.activeWeaponIndex;
                }
                if (newEntity.gameState) {
                    gameEntity.gameState!.health = newEntity.gameState!.health;
                    gameEntity.gameState!.maxHealth = newEntity.gameState!.maxHealth;
                    gameEntity.gameState!.team = newEntity.gameState!.team;
                    gameEntity.gameState!.hasFlag = newEntity.gameState!.hasFlag;
                    
                }
                if (newEntity.tick) {
                    gameEntity.tick!.tick = newEntity.tick!.tick;
                    gameEntity.tick!.timestamp = newEntity.tick!.timestamp;
                    gameEntity.tick!.lastProcessedInputTimestamp = newEntity.tick!.lastProcessedInputTimestamp;
                    gameEntity.tick!.lastProcessedInputTick = newEntity.tick!.lastProcessedInputTick;
                }
                if (newEntity.owner) {
                    gameEntity.owner!.id = newEntity.owner!.id;
                    gameEntity.owner!.isLocal = room.sessionId === newEntity.owner!.id;
                }
                if (newEntity.asset) {
                    gameEntity.asset!.assetPath = newEntity.asset!.assetPath;
                    gameEntity.asset!.assetType = newEntity.asset!.assetType;
                    gameEntity.asset!.scale = newEntity.asset!.scale;
                }
                if (newEntity.projectile) {
                    gameEntity.projectile!.damage = newEntity.projectile!.damage;
                    gameEntity.projectile!.range = newEntity.projectile!.range;
                    gameEntity.projectile!.distanceTraveled = newEntity.projectile!.distanceTraveled;
                    gameEntity.projectile!.sourceId = newEntity.projectile!.sourceId;
                    gameEntity.projectile!.speed = newEntity.projectile!.speed;
                }
                if (gameEntity.physics?.body) {
                    physicsWorldSystem.removeBody(gameEntity.id);
                    delete gameEntity.physics;
                }
                ecsWorld.reindex(gameEntity);
            }
        }
        const gameEntity = ecsWorld.entities.find(e => e.id === id);

        // Set up state change handlers
        // Transform changes
        $(entity.transform).onChange(() => {
            if(!gameEntity) return;
            const transformBuffer: TransformBuffer = {
                transform: {
                    position: new Vector3(entity.transform.positionX, entity.transform.positionY, entity.transform.positionZ),
                    rotation: new Quaternion(entity.transform.quaternionX, entity.transform.quaternionY, entity.transform.quaternionZ, entity.transform.quaternionW),
                    velocity: new Vector3(entity.transform.linearVelocityX, entity.transform.linearVelocityY, entity.transform.linearVelocityZ),
                    angularVelocity: new Vector3(entity.transform.angularVelocityX, entity.transform.angularVelocityY, entity.transform.angularVelocityZ)
                },
                tick: {
                    tick: entity.tick.tick,
                    timestamp: entity.tick.timestamp,
                    lastProcessedInputTimestamp: entity.tick.lastProcessedInputTimestamp,
                    lastProcessedInputTick: entity.tick.lastProcessedInputTick
                }
            };

            // Store server transform for debug visualization
            if (debugMode) {
                gameEntity.serverTransform = {
                    position: new Vector3(entity.transform.positionX, entity.transform.positionY, entity.transform.positionZ),
                    rotation: new Quaternion(entity.transform.quaternionX, entity.transform.quaternionY, entity.transform.quaternionZ, entity.transform.quaternionW),
                    velocity: new Vector3(entity.transform.linearVelocityX, entity.transform.linearVelocityY, entity.transform.linearVelocityZ),
                    angularVelocity: new Vector3(entity.transform.angularVelocityX, entity.transform.angularVelocityY, entity.transform.angularVelocityZ)
                };
            }
            if (entity?.tick?.tick !== physicsWorldSystem.getCurrentTick()) {
                physicsWorldSystem.setCurrentTick(entity.tick.tick);
            }
            networkPredictionSystem.addEntityState(id, transformBuffer);    
            ecsWorld.reindex(gameEntity);
        });

        // Game state changes
        $(entity.gameState).onChange(() => {
            if(!gameEntity) return;
            gameEntity.gameState!.health = entity.gameState.health;
            gameEntity.gameState!.maxHealth = entity.gameState.maxHealth;
            gameEntity.gameState!.hasFlag = entity.gameState.hasFlag;
            gameEntity.gameState!.carryingFlag = entity.gameState.carryingFlag;
            gameEntity.gameState!.carriedBy = entity.gameState.carriedBy;
            gameEntity.gameState!.atBase = entity.gameState.atBase;
            gameEntity.gameState!.team = entity.gameState.team;
            ecsWorld.reindex(gameEntity);
        });

        // Tick changes
        $(entity.tick).onChange(() => {
            if(!gameEntity) return;
            gameEntity.tick!.tick = entity.tick.tick;
            gameEntity.tick!.timestamp = entity.tick.timestamp;
            gameEntity.tick!.lastProcessedInputTimestamp = entity.tick.lastProcessedInputTimestamp;
            gameEntity.tick!.lastProcessedInputTick = entity.tick.lastProcessedInputTick;
            // ecsWorld.reindex(gameEntity);
        });

        // Owner changes
        $(entity.owner).onChange(() => {
            if (!gameEntity || !entity.owner.id) return;
            gameEntity.owner!.id = entity.owner.id;
            gameEntity.owner!.isLocal = room.sessionId === entity.owner.id;
            ecsWorld.reindex(gameEntity);
        });

        // Asset changes
        $(entity.asset).onChange(() => {
            if (!gameEntity || !entity.asset.assetPath) return;
            gameEntity.asset!.assetPath = entity.asset.assetPath;
            gameEntity.asset!.assetType = entity.asset.assetType;
            gameEntity.asset!.scale = entity.asset.scale;
            ecsWorld.reindex(gameEntity);
        });

        // Vehicle changes
        if (entity.type === EntityType.Vehicle) {
            // Weapon changes
            $(entity.vehicle).onChange(() => {
                if (!gameEntity) return;

                gameEntity.vehicle!.vehicleType = entity.vehicle.vehicleType as VehicleType;
                gameEntity.vehicle!.activeWeaponIndex = entity.vehicle.activeWeaponIndex;
                $(entity.vehicle).weapons.onChange((weapon: WeaponSchema, index: number) => {
                    if (!weapon?.name) return;
                    gameEntity.vehicle!.weapons[index] = {
                        id: index.toString(),
                        name: weapon.name,
                        projectileType: weapon.projectileType as ProjectileType,
                        damage: weapon.damage,
                        minFireRate: weapon.minFireRate,
                        maxFireRate: weapon.maxFireRate,
                        heatPerShot: weapon.heatPerShot,
                        heatDissipationRate: weapon.heatDissipationRate,
                        projectileSpeed: weapon.projectileSpeed,
                        range: weapon.range,
                    }
                    ecsWorld.reindex(gameEntity);
                });
                ecsWorld.reindex(gameEntity);
            });
        }

        // Projectile changes
        if (entity.type === EntityType.Projectile) {
            $(entity.projectile).onChange(() => {
                if (!gameEntity) return;
                gameEntity.projectile!.damage = entity.projectile.damage;
                gameEntity.projectile!.range = entity.projectile.range;
                gameEntity.projectile!.distanceTraveled = entity.projectile.distanceTraveled;
                gameEntity.projectile!.sourceId = entity.projectile.sourceId;
                gameEntity.projectile!.speed = entity.projectile.speed;
                ecsWorld.reindex(gameEntity);
            });
        }
    });
    
    
    $(room.state).entities.onRemove((_entity: EntitySchema, id: string) => {
        const entity = ecsWorld.entities.find(e => e.id === id);
        if (entity) {
            ecsWorld.remove(entity);
        }
    });

    $(room.state).listen("serverTick", (serverTick: number) => {
        physicsWorldSystem.setCurrentTick(serverTick);
    });

    console.log('Network system created');
    
    return {
        networkPredictionSystem,
        getNetworkStats: () => ({
            latency: networkLatency,
            quality: networkQuality,
            jitter: networkJitter
        }),
        sendPing: () => {
            room.send("ping", Date.now());
        },
        update: (dt: number) => {
            const isIdle = inputSystem.isIdle();
            const input = inputSystem.getInput();
            networkPredictionSystem.addInput(dt, input, isIdle, physicsWorldSystem.getCurrentTick());
        },
        cleanup: () => {
            networkPredictionSystem.cleanup();
        },
        // Add debug mode controls
        setDebugMode: (enabled: boolean) => {
            debugMode = enabled;
            // Clear server transforms when disabling debug mode
            if (!enabled) {
                ecsWorld.entities.forEach(entity => {
                    delete entity.serverTransform;
                });
            }
        },
        getDebugMode: () => debugMode
    };
} 