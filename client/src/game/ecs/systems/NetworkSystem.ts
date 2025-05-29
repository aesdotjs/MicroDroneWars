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
import { createProjectileSystem } from './ProjectileSystem';
/**
* Creates a system that handles network state updates and converts them to ECS entities
*/
export function createNetworkSystem(
    room: Room<State>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    inputSystem: ReturnType<typeof createClientInputSystem>,
    weaponSystem: ReturnType<typeof createWeaponSystem>,
    projectileSystem: ReturnType<typeof createProjectileSystem>,
    sceneSystem: ReturnType<typeof createSceneSystem>,
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
    let smoothedRTT = 0;
    const QUALITY_SAMPLES = 20;
    const MIN_LATENCY = 5;
    const LATENCY_SMOOTHING = 0.9;
    
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
        smoothedRTT = LATENCY_SMOOTHING * rtt + (1 - LATENCY_SMOOTHING) * smoothedRTT;
        // Update network prediction system with new stats
        networkPredictionSystem.updateNetworkStats(networkLatency, networkQuality, networkJitter);
        
        log('Network Stats', {
            rtt,
            oneWayLatency,
            latency: data.latency,
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
                    if (entity.owner?.id !== room.sessionId) {
                        console.log('projectile sourceId', entity.projectile?.sourceId);
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
        } 
        // else { // Entity already exists in ECS world (most likely a projectile)
        //     const gameEntity = ecsWorld.entities.find(e => e.id === id);
        //     if (gameEntity && gameEntity.projectile && gameEntity.projectile.isFake) {
        //         // // already impacted in simulation, just ignore the rest and wait for removal
        //         // if (gameEntity.projectile?.impact) {
        //         //     return;
        //         // }
        //         if (newEntity.gameState) {
        //             gameEntity.gameState!.health = newEntity.gameState!.health;
        //             gameEntity.gameState!.maxHealth = newEntity.gameState!.maxHealth;
        //             gameEntity.gameState!.team = newEntity.gameState!.team;
        //             gameEntity.gameState!.hasFlag = newEntity.gameState!.hasFlag;
                    
        //         }
        //         if (newEntity.tick) {
        //             gameEntity.tick!.tick = newEntity.tick!.tick;
        //             gameEntity.tick!.timestamp = newEntity.tick!.timestamp;
        //             gameEntity.tick!.lastProcessedInputTimestamp = newEntity.tick!.lastProcessedInputTimestamp;
        //             gameEntity.tick!.lastProcessedInputTick = newEntity.tick!.lastProcessedInputTick;
        //         }
        //         if (newEntity.owner) {
        //             gameEntity.owner!.id = newEntity.owner!.id;
        //             gameEntity.owner!.isLocal = room.sessionId === newEntity.owner!.id;
        //         }
        //         if (newEntity.asset) {
        //             gameEntity.asset!.assetPath = newEntity.asset!.assetPath;
        //             gameEntity.asset!.assetType = newEntity.asset!.assetType;
        //             gameEntity.asset!.scale = newEntity.asset!.scale;
        //         }
        //         if (newEntity.projectile) {
        //             gameEntity.projectile!.damage = newEntity.projectile!.damage;
        //             gameEntity.projectile!.range = newEntity.projectile!.range;
        //             gameEntity.projectile!.distanceTraveled = newEntity.projectile!.distanceTraveled;
        //             gameEntity.projectile!.sourceId = newEntity.projectile!.sourceId;
        //             gameEntity.projectile!.speed = newEntity.projectile!.speed;
        //             if (newEntity.projectile.impact) {
        //                 gameEntity.projectile!.impact = {
        //                     position: newEntity.projectile.impact.position,
        //                     normal: newEntity.projectile.impact.normal,
        //                     impactVelocity: newEntity.projectile.impact.impactVelocity,
        //                     targetId: newEntity.projectile.impact.targetId,
        //                     targetType: newEntity.projectile.impact.targetType
        //                 }
        //             }
        //         }
        //         if (gameEntity.physics?.body) {
        //             physicsWorldSystem.removeBody(gameEntity.id);
        //             delete gameEntity.physics;
        //         }
        //         if (gameEntity.transform && gameEntity.tick) {
        //             // const transformBuffer: TransformBuffer = {
        //             //     transform: {
        //             //         position: gameEntity.transform.position,
        //             //         rotation: gameEntity.transform.rotation,
        //             //         velocity: gameEntity.transform.velocity,
        //             //         angularVelocity: gameEntity.transform.angularVelocity
        //             //     },
        //             //     tick: {
        //             //         tick: gameEntity.tick.tick,
        //             //         timestamp: gameEntity.tick.timestamp,
        //             //         lastProcessedInputTimestamp: gameEntity.tick.lastProcessedInputTimestamp,
        //             //         lastProcessedInputTick: gameEntity.tick.lastProcessedInputTick
        //             //     }
        //             // };
        //             // add the last predicted transform to the network prediction system
        //             // networkPredictionSystem.addEntityState(id, transformBuffer);
        //             const deltaTime = (Date.now() - gameEntity.tick!.timestamp) / 1000;
        //             // const deltaTime = networkPredictionSystem.getCurrentInterpolationDelay() / 1000;
        //             // const deltaTime = smoothedRTT / 1000;
        //             gameEntity.projectile!.isFake = false;
        //             const clientPos = gameEntity.transform.position.clone();
        //             const serverPos = new Vector3(entity.transform!.positionX, entity.transform!.positionY, entity.transform!.positionZ);
        //             console.log('serverPos1', serverPos);
        //             const serverVelocity = new Vector3(entity.transform!.linearVelocityX, entity.transform!.linearVelocityY, entity.transform!.linearVelocityZ);
        //             gameEntity.transform.position = serverPos;
        //             gameEntity.transform.velocity = serverVelocity;
        //             gameEntity.transform.rotation = new Quaternion(entity.transform!.quaternionX, entity.transform!.quaternionY, entity.transform!.quaternionZ, entity.transform!.quaternionW);
        //             gameEntity.transform.angularVelocity = new Vector3(entity.transform!.angularVelocityX, entity.transform!.angularVelocityY, entity.transform!.angularVelocityZ); 
        //             projectileSystem.tickProjectile(gameEntity, deltaTime);
        //             const bakedServerPos = gameEntity.transform.position.clone();
        //             // Create a new vector instead of modifying serverPos in place
        //             // serverPos.addInPlace(serverVelocity.scale(deltaTime));
        //             gameEntity.projectile!.correctionOffset = bakedServerPos.subtract(clientPos);

        //             // Add rotation correction
        //             const serverRot = new Quaternion(
        //                 entity.transform!.quaternionX,
        //                 entity.transform!.quaternionY,
        //                 entity.transform!.quaternionZ,
        //                 entity.transform!.quaternionW
        //             );
        //             const clientRot = gameEntity.transform.rotation;
        //             // Calculate the rotation difference (server * inverse(client))
        //             gameEntity.projectile!.rotationCorrectionOffset = serverRot.multiply(clientRot.invert());
        //         }
        //     }
        // }
        const gameEntity = ecsWorld.entities.find(e => e.id === id);

        $(entity).listen("transform", (transform: TransformSchema | undefined) => {
            if(!gameEntity || !transform) return;
            const needReindex = !gameEntity.transform;
            $(transform).onChange(() => {
                if (gameEntity.transform && gameEntity.type === EntityType.Projectile) {
                    if (gameEntity.projectile?.isFake) {
                        gameEntity.projectile!.isFake = false;
                        if (gameEntity.physics?.body) {
                            physicsWorldSystem.removeBody(gameEntity.id);
                            delete gameEntity.physics;
                        }
                    }
                    const serverPos = new Vector3(
                        transform.positionX,
                        transform.positionY,
                        transform.positionZ
                    );
                    const serverVelocity = new Vector3(
                        transform.linearVelocityX,
                        transform.linearVelocityY,
                        transform.linearVelocityZ
                    );
                    const serverRot = new Quaternion(
                        transform.quaternionX,
                        transform.quaternionY,
                        transform.quaternionZ,
                        transform.quaternionW
                    );
                    const clientPos = gameEntity.transform.position.clone();
                    const deltaTime = (Date.now() - gameEntity.tick!.timestamp) / 1000;
                    gameEntity.transform.position.copyFrom(serverPos);
                    gameEntity.transform.velocity.copyFrom(serverVelocity);
                    gameEntity.transform.rotation.copyFrom(serverRot);
                    gameEntity.transform.angularVelocity = new Vector3(transform.angularVelocityX, transform.angularVelocityY, transform.angularVelocityZ);
                    projectileSystem.tickProjectile(gameEntity, deltaTime);
                    const bakedServerPos = gameEntity.transform.position.clone();
                    gameEntity.transform.position.copyFrom(clientPos);
                    const delta = bakedServerPos.subtract(clientPos);

                    // alors en gros, cette fonction arrive hors loop, donc ca doit bugger 
                    // avec l'interpolation des projectils, pas sur
                    
                    // Position correction
                    if (gameEntity.projectile!.correctionOffset) {
                        gameEntity.projectile!.correctionOffset.addInPlace(delta);
                    } else {
                        gameEntity.projectile!.correctionOffset = delta;
                    }

                    // Rotation correction
                    const clientRot = gameEntity.transform.rotation;
                    const rotDelta = serverRot.multiply(clientRot.invert());
                    if (gameEntity.projectile!.rotationCorrectionOffset) {
                        // Combine with existing rotation correction
                        gameEntity.projectile!.rotationCorrectionOffset = rotDelta.multiply(gameEntity.projectile!.rotationCorrectionOffset);
                    } else {
                        gameEntity.projectile!.rotationCorrectionOffset = rotDelta;
                    }
                    return;
                }
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
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });

        $(entity).listen("gameState", (gameState: GameStateSchema | undefined) => {
            if(!gameEntity || !gameState) return;
            const needReindex = !gameEntity.gameState;
            $(gameState).onChange(() => {
                gameEntity.gameState!.health = gameState!.health;
                gameEntity.gameState!.maxHealth = gameState!.maxHealth;
                gameEntity.gameState!.hasFlag = gameState!.hasFlag;
                gameEntity.gameState!.carryingFlag = gameState!.carryingFlag;
                gameEntity.gameState!.carriedBy = gameState!.carriedBy;
                gameEntity.gameState!.atBase = gameState!.atBase;
                gameEntity.gameState!.team = gameState!.team;
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });

        $(entity).listen("tick", (tick: TickSchema | undefined) => {
            if(!gameEntity || !tick) return;
            const needReindex = !gameEntity.tick;
            $(tick).onChange(() => {
                gameEntity.tick!.tick = tick!.tick;
                gameEntity.tick!.timestamp = tick!.timestamp;
                gameEntity.tick!.lastProcessedInputTimestamp = tick!.lastProcessedInputTimestamp;
                gameEntity.tick!.lastProcessedInputTick = tick!.lastProcessedInputTick;
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });
        

        $(entity).listen("owner", (owner: OwnerSchema | undefined) => {
            if(!gameEntity || !owner) return;
            const needReindex = !gameEntity.owner;
            $(owner).onChange(() => {
                gameEntity.owner!.id = owner!.id;
                gameEntity.owner!.isLocal = room.sessionId === owner!.id;
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });

        // Asset changes
        $(entity).listen("asset", (asset: AssetSchema | undefined) => {
            if(!gameEntity || !asset) return;
            const needReindex = !gameEntity.asset;
            $(asset).onChange(() => {
                gameEntity.asset!.assetPath = asset!.assetPath;
                gameEntity.asset!.assetType = asset!.assetType;
                gameEntity.asset!.scale = asset!.scale;
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });

        // Vehicle changes
        $(entity).listen("vehicle", (vehicle: VehicleSchema | undefined) => {
            if(!gameEntity || !vehicle) return;
            const needReindex = !gameEntity.vehicle;
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
                            range: weapon.range
                        }
                    });
                }
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });
        $(entity).listen("projectile", (projectile: ProjectileSchema | undefined) => {
            if(!gameEntity || !projectile) return;
            const needReindex = !gameEntity.projectile;
            $(projectile).onChange(() => {
                gameEntity.projectile!.damage = projectile!.damage;
                gameEntity.projectile!.range = projectile!.range;
                gameEntity.projectile!.distanceTraveled = projectile!.distanceTraveled;
                gameEntity.projectile!.sourceId = projectile!.sourceId;
                gameEntity.projectile!.speed = projectile!.speed;
                if (projectile?.impact) {
                    gameEntity.projectile!.impact = {
                        position: new Vector3(projectile.impact.positionX, projectile.impact.positionY, projectile.impact.positionZ),
                        normal: new Vector3(projectile.impact.normalX, projectile.impact.normalY, projectile.impact.normalZ),
                        impactVelocity: projectile.impact.impactVelocity,
                        targetId: projectile.impact.targetId,
                        targetType: projectile.impact.targetType
                    };
                    sceneSystem.getEffectSystem().createImpactEffects(gameEntity);
                    if (gameEntity.projectile?.projectileType === ProjectileType.Missile) {
                        physicsWorldSystem.applyMissileImpact(gameEntity);
                    }
                    ecsWorld.remove(gameEntity);
                    return;
                }
            });
            if (needReindex) {
                ecsWorld.reindex(gameEntity);
            }
        });
        log('entities count', ecsWorld.entities.length);
    });
    
    
    $(room.state).entities.onRemove((_entity: EntitySchema, id: string) => {
        const entity = ecsWorld.entities.find(e => e.id === id);
        if (entity) {
            console.log('remove entity', entity.id);
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
            networkPredictionSystem.update(dt);
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