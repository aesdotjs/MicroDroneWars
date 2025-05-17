import { Room } from 'colyseus.js';
import { State, EntitySchema, WeaponSchema, TransformSchema, GameStateSchema, TickSchema, OwnerSchema, AssetSchema, VehicleSchema, ProjectileSchema } from '@shared/schemas';
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
import { createSceneSystem } from './SceneSystem';
/**
* Creates a system that handles network state updates and converts them to ECS entities
*/
export function createNetworkSystem(
    room: Room<State>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    inputSystem: ReturnType<typeof createClientInputSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>,
    sceneSystem: ReturnType<typeof createSceneSystem>
) {
    console.log('Creating network system...');
    const $ = Colyseus.getStateCallbacks(room);
    
    // Debug mode flag
    let debugMode = false;
    
    const networkPredictionSystem = createNetworkPredictionSystem(
        physicsSystem,
        physicsWorldSystem,
        weaponSystem,
        sceneSystem,
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
        };

        if (entity.transform) {
            newEntity.transform = {
                position: new Vector3(entity.transform.positionX, entity.transform.positionY, entity.transform.positionZ),
                rotation: new Quaternion(entity.transform.quaternionX, entity.transform.quaternionY, entity.transform.quaternionZ, entity.transform.quaternionW),
                velocity: new Vector3(entity.transform.linearVelocityX, entity.transform.linearVelocityY, entity.transform.linearVelocityZ),
                angularVelocity: new Vector3(entity.transform.angularVelocityX, entity.transform.angularVelocityY, entity.transform.angularVelocityZ)
            }
        }

        if (entity.tick) {
            newEntity.tick = {
                tick: entity.tick.tick,
                timestamp: entity.tick.timestamp,
                lastProcessedInputTimestamp: entity.tick.lastProcessedInputTimestamp,
                lastProcessedInputTick: entity.tick.lastProcessedInputTick
            }
        }

        if (entity.owner) {
            newEntity.owner = {
                id: entity.owner.id,
                isLocal: room.sessionId === entity.owner.id
            }
        }

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
                    // muzzle flash is spawned in applyInput for client prediction and here for network
                    if (entity.projectile?.sourceId !== room.sessionId) {
                        const vehicle = ecsWorld.entities.find(e => e.id === entity.projectile?.sourceId);
                        if (vehicle) {
                            sceneSystem.getEffectSystem().createMuzzleFlash(vehicle, parseInt(entity.id.split('_').pop() || '0'));
                        }
                    }
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
                    if (newEntity.projectile.impact) {
                        gameEntity.projectile!.impact = {
                            position: newEntity.projectile.impact.position,
                            normal: newEntity.projectile.impact.normal,
                            impactVelocity: newEntity.projectile.impact.impactVelocity,
                            targetId: newEntity.projectile.impact.targetId,
                            targetType: newEntity.projectile.impact.targetType
                        }
                    }
                }
                if (gameEntity.physics?.body) {
                    physicsWorldSystem.removeBody(gameEntity.id);
                    delete gameEntity.physics;
                }
                ecsWorld.reindex(gameEntity);
            }
        }
        const gameEntity = ecsWorld.entities.find(e => e.id === id);

        $(entity).listen("transform", (transform: TransformSchema | undefined) => {
            if(!gameEntity || !transform) return;
            $(transform).onChange(() => {
                const transformBuffer: TransformBuffer = {
                    transform: {
                        position: new Vector3(entity.transform!.positionX, entity.transform!.positionY, entity.transform!.positionZ),
                        rotation: new Quaternion(entity.transform!.quaternionX, entity.transform!.quaternionY, entity.transform!.quaternionZ, entity.transform!.quaternionW),
                        velocity: new Vector3(entity.transform!.linearVelocityX, entity.transform!.linearVelocityY, entity.transform!.linearVelocityZ),
                        angularVelocity: new Vector3(entity.transform!.angularVelocityX, entity.transform!.angularVelocityY, entity.transform!.angularVelocityZ)
                    },
                    tick: {
                        tick: entity.tick!.tick,
                        timestamp: entity.tick!.timestamp,
                        lastProcessedInputTimestamp: entity.tick!.lastProcessedInputTimestamp,
                        lastProcessedInputTick: entity.tick!.lastProcessedInputTick
                    }
                };

                // Store server transform for debug visualization
                if (debugMode) {
                    gameEntity.serverTransform = {
                        position: new Vector3(entity.transform!.positionX, entity.transform!.positionY, entity.transform!.positionZ),
                        rotation: new Quaternion(entity.transform!.quaternionX, entity.transform!.quaternionY, entity.transform!.quaternionZ, entity.transform!.quaternionW),
                        velocity: new Vector3(entity.transform!.linearVelocityX, entity.transform!.linearVelocityY, entity.transform!.linearVelocityZ),
                        angularVelocity: new Vector3(entity.transform!.angularVelocityX, entity.transform!.angularVelocityY, entity.transform!.angularVelocityZ)
                    };
                }
                if (entity?.tick?.tick !== physicsWorldSystem.getCurrentTick()) {
                    physicsWorldSystem.setCurrentTick(entity.tick!.tick);
                }
                networkPredictionSystem.addEntityState(id, transformBuffer);    
            });
            ecsWorld.reindex(gameEntity);
        });

        $(entity).listen("gameState", (gameState: GameStateSchema | undefined) => {
            if(!gameEntity || !gameState) return;
            $(gameState).onChange(() => {
                gameEntity.gameState!.health = gameState!.health;
                gameEntity.gameState!.maxHealth = gameState!.maxHealth;
                gameEntity.gameState!.hasFlag = gameState!.hasFlag;
                gameEntity.gameState!.carryingFlag = gameState!.carryingFlag;
                gameEntity.gameState!.carriedBy = gameState!.carriedBy;
                gameEntity.gameState!.atBase = gameState!.atBase;
                gameEntity.gameState!.team = gameState!.team;
            });
            ecsWorld.reindex(gameEntity);
        });

        $(entity).listen("tick", (tick: TickSchema | undefined) => {
            if(!gameEntity || !tick) return;
            $(tick).onChange(() => {
                gameEntity.tick!.tick = tick!.tick;
                gameEntity.tick!.timestamp = tick!.timestamp;
                gameEntity.tick!.lastProcessedInputTimestamp = tick!.lastProcessedInputTimestamp;
                gameEntity.tick!.lastProcessedInputTick = tick!.lastProcessedInputTick;
            });
            ecsWorld.reindex(gameEntity);
        });
        

        $(entity).listen("owner", (owner: OwnerSchema | undefined) => {
            if(!gameEntity || !owner) return;
            $(owner).onChange(() => {
                gameEntity.owner!.id = owner!.id;
                gameEntity.owner!.isLocal = room.sessionId === owner!.id;
            });
            ecsWorld.reindex(gameEntity);
        });

        // Asset changes
        $(entity).listen("asset", (asset: AssetSchema | undefined) => {
            if(!gameEntity || !asset) return;
            $(asset).onChange(() => {
                gameEntity.asset!.assetPath = asset!.assetPath;
                gameEntity.asset!.assetType = asset!.assetType;
                gameEntity.asset!.scale = asset!.scale;
            });
            ecsWorld.reindex(gameEntity);
        });

        // Vehicle changes
        $(entity).listen("vehicle", (vehicle: VehicleSchema | undefined) => {
            if(!gameEntity || !vehicle) return;
            $(vehicle).onChange(() => {
                gameEntity.vehicle!.vehicleType = vehicle!.vehicleType as VehicleType;
                gameEntity.vehicle!.activeWeaponIndex = vehicle!.activeWeaponIndex;
                if (vehicle?.weapons) {
                    $(vehicle).weapons.onChange((weapon: WeaponSchema, index: number) => {
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
                    });
                }
            });
            ecsWorld.reindex(gameEntity);
        });

        // Projectile changes
        // if (entity.projectile) {
        //     $(entity.projectile).onChange(() => {
        //         if (!gameEntity) return;
        //         gameEntity.projectile!.damage = entity.projectile!.damage;
        //         gameEntity.projectile!.range = entity.projectile!.range;
        //         gameEntity.projectile!.distanceTraveled = entity.projectile!.distanceTraveled;
        //         gameEntity.projectile!.sourceId = entity.projectile!.sourceId;
        //         gameEntity.projectile!.speed = entity.projectile!.speed;
        //         if (entity.projectile?.impact) {
        //             gameEntity.projectile!.impact = {
        //                 position: new Vector3(entity.projectile!.impact!.positionX, entity.projectile!.impact!.positionY, entity.projectile!.impact!.positionZ),
        //                 normal: new Vector3(entity.projectile!.impact!.normalX, entity.projectile!.impact!.normalY, entity.projectile!.impact!.normalZ),
        //                 impactVelocity: entity.projectile!.impact!.impactVelocity,
        //                 targetId: entity.projectile!.impact!.targetId,
        //                 targetType: entity.projectile!.impact!.targetType
        //             }
        //         }
        //         ecsWorld.reindex(gameEntity);
        //     });
        // }
        $(entity).listen("projectile", (projectile: ProjectileSchema | undefined) => {
            if(!gameEntity || !projectile) return;
            $(projectile).onChange(() => {
                gameEntity.projectile!.damage = projectile!.damage;
                gameEntity.projectile!.range = projectile!.range;
                gameEntity.projectile!.distanceTraveled = projectile!.distanceTraveled;
                gameEntity.projectile!.sourceId = projectile!.sourceId;
                gameEntity.projectile!.speed = projectile!.speed;
                if (projectile?.impact) {
                    console.log('projectile impact', projectile.impact);
                    gameEntity.projectile!.impact = {
                        position: new Vector3(projectile.impact.positionX, projectile.impact.positionY, projectile.impact.positionZ),
                        normal: new Vector3(projectile.impact.normalX, projectile.impact.normalY, projectile.impact.normalZ),
                        impactVelocity: projectile.impact.impactVelocity,
                        targetId: projectile.impact.targetId,
                        targetType: projectile.impact.targetType
                    }
                }
            });
            ecsWorld.reindex(gameEntity);
        });
        log('entities count', ecsWorld.entities.length);
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