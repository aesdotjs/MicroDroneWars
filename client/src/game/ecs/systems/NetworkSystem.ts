import { Room } from 'colyseus.js';
import { State } from '../../schemas/State';
import { EntitySchema } from '../../schemas/EntitySchema';
import { WeaponSchema } from '../../schemas/WeaponSchema';
import { world as ecsWorld } from '@shared/ecs/world';
import { Vector3, Quaternion, Scene } from 'babylonjs';
import { GameEntity, TransformBuffer, ProjectileComponent, VehicleComponent, InputComponent, RenderComponent } from '@shared/ecs/types';
import * as Colyseus from 'colyseus.js';
import { createCameraSystem } from './CameraSystem';
import { createPhysicsWorldSystem } from '@shared/ecs/systems';
import { createNetworkPredictionSystem } from './NetworkPredictionSystem';
import { createVehicleBody, createDroneMesh, createPlaneMesh, createPhysicsComponent } from '@shared/ecs/utils/EntityHelpers';
import { createClientInputSystem } from './ClientInputSystem';
import { createPhysicsSystem } from '@shared/ecs/systems/PhysicsSystem';
/**
* Creates a system that handles network state updates and converts them to ECS entities
*/
export function createNetworkSystem(
    room: Room<State>,
    scene: Scene,
    cameraSystem: ReturnType<typeof createCameraSystem>,
    physicsWorldSystem: ReturnType<typeof createPhysicsWorldSystem>,
    physicsSystem: ReturnType<typeof createPhysicsSystem>,
    inputSystem: ReturnType<typeof createClientInputSystem>
) {
    console.log('Creating network system...');
    const $ = Colyseus.getStateCallbacks(room);
    
    const networkPredictionSystem = createNetworkPredictionSystem(
        physicsSystem,
        physicsWorldSystem,
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
    
    // Handle network quality measurements
    room.onMessage("pong", (data: { clientTime: number, serverTime: number, latency: number }) => {
        const now = Date.now();
        const rtt = now - data.clientTime;
        const oneWayLatency = Math.max(MIN_LATENCY, rtt / 2);
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
    });
    
    // Handle entity updates
    $(room.state).entities.onAdd((entity: EntitySchema, id: string) => {
        console.log('Entity added:', { id, type: entity.type });
        const newEntity: GameEntity = {
            id,
            type: entity.type,
            transform: {
                position: new Vector3(entity.transform.positionX, entity.transform.positionY, entity.transform.positionZ),
                rotation: new Quaternion(entity.transform.quaternionX, entity.transform.quaternionY, entity.transform.quaternionZ, entity.transform.quaternionW),
                velocity: new Vector3(entity.transform.linearVelocityX, entity.transform.linearVelocityY, entity.transform.linearVelocityZ),
                angularVelocity: new Vector3(entity.transform.angularVelocityX, entity.transform.angularVelocityY, entity.transform.angularVelocityZ)
            },
            gameState: {
                health: entity.gameState.health,
                maxHealth: entity.gameState.maxHealth,
                team: entity.gameState.team,
                hasFlag: entity.gameState.hasFlag,
                carryingFlag: entity.gameState.carryingFlag,
                carriedBy: entity.gameState.carriedBy,
                atBase: entity.gameState.atBase
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
        
        // Set type-specific properties
        if (entity.type === 'drone' || entity.type === 'plane') {
            const vehicleComponent: VehicleComponent = {
                vehicleType: entity.vehicle.vehicleType as 'drone' | 'plane',
                weapons: Array.from(entity.vehicle.weapons).map(w => ({
                    id: w.id,
                    name: w.name,
                    projectileType: w.projectileType as 'bullet' | 'missile',
                    damage: w.damage,
                    fireRate: w.fireRate,
                    projectileSpeed: w.projectileSpeed,
                    cooldown: w.cooldown,
                    range: w.range,
                    isOnCooldown: w.isOnCooldown,
                    lastFireTime: w.lastFireTime
                })),
                activeWeaponIndex: entity.vehicle.activeWeaponIndex
            };
            newEntity.vehicle = vehicleComponent;
            if (newEntity.vehicle.vehicleType === 'drone') {
                createDroneMesh(newEntity, scene);
            } else if (newEntity.vehicle.vehicleType === 'plane') {
                createPlaneMesh(newEntity, scene);
            }
            if (newEntity.owner?.isLocal && newEntity.vehicle) {
                const vehicleBody = createVehicleBody(newEntity.vehicle.vehicleType, newEntity.transform!.position, newEntity.transform!.rotation);
                newEntity.physics = createPhysicsComponent(newEntity.vehicle.vehicleType, vehicleBody);
                physicsWorldSystem.addBody(newEntity);
                cameraSystem.attachCamera(newEntity);
            }
        } else if (entity.type === 'projectile') {
            const projectileComponent: ProjectileComponent = {
                projectileType: entity.projectile.projectileType as 'bullet' | 'missile',
                damage: entity.projectile.damage,
                range: entity.projectile.range,
                distanceTraveled: entity.projectile.distanceTraveled,
                sourceId: entity.projectile.sourceId,
                timestamp: entity.tick.timestamp,
                tick: entity.tick.tick
            };
            newEntity.projectile = projectileComponent;
        }
        
        ecsWorld.add(newEntity);
        console.log('Entity added to ECS world:', { id, newEntity});
        const gameEntity = ecsWorld.entities.find(e => e.id === id);

        // Transform changes
        $(entity.transform).onChange(() => {
            if (!gameEntity) return;

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
            networkPredictionSystem.addEntityState(id, transformBuffer);
        });

        // Game state changes
        $(entity.gameState).onChange(() => {
            if (!gameEntity?.gameState) return;

            gameEntity.gameState.health = entity.gameState.health;
            gameEntity.gameState.maxHealth = entity.gameState.maxHealth;
            gameEntity.gameState.hasFlag = entity.gameState.hasFlag;
            gameEntity.gameState.carryingFlag = entity.gameState.carryingFlag;
            gameEntity.gameState.carriedBy = entity.gameState.carriedBy;
            gameEntity.gameState.atBase = entity.gameState.atBase;
            gameEntity.gameState.team = entity.gameState.team;
        });

        // Tick changes
        $(entity.tick).onChange(() => {
            if (!gameEntity?.tick) return;

            gameEntity.tick.tick = entity.tick.tick;
            gameEntity.tick.timestamp = entity.tick.timestamp;
            gameEntity.tick.lastProcessedInputTimestamp = entity.tick.lastProcessedInputTimestamp;
            gameEntity.tick.lastProcessedInputTick = entity.tick.lastProcessedInputTick;
        });

        // Owner changes
        $(entity.owner).onChange(() => {
            if (!gameEntity?.owner) return;

            gameEntity.owner.id = entity.owner.id;
            gameEntity.owner.isLocal = room.sessionId === entity.owner.id;
        });

        // Vehicle changes
        if (entity.type === 'drone' || entity.type === 'plane') {
            // Weapon changes
            $(entity.vehicle).onChange(() => {
                if (!gameEntity?.vehicle) return;

                gameEntity.vehicle.vehicleType = entity.vehicle.vehicleType as 'drone' | 'plane';
                gameEntity.vehicle.activeWeaponIndex = entity.vehicle.activeWeaponIndex;
                $(entity.vehicle).weapons.onChange((weapon: WeaponSchema, index: number) => {
                    gameEntity.vehicle!.weapons[index] = {
                        id: weapon.id,
                        name: weapon.name,
                        projectileType: weapon.projectileType as 'bullet' | 'missile',
                        damage: weapon.damage,
                        fireRate: weapon.fireRate,
                        projectileSpeed: weapon.projectileSpeed,
                        cooldown: weapon.cooldown,
                        range: weapon.range,
                        isOnCooldown: weapon.isOnCooldown,
                        lastFireTime: weapon.lastFireTime
                    }
                });
            });
        }

        // Projectile changes
        if (entity.type === 'projectile') {
            $(entity.projectile).onChange(() => {
                const gameEntity = ecsWorld.entities.find(e => e.id === id);
                if (!gameEntity?.projectile) return;

                gameEntity.projectile.damage = entity.projectile.damage;
                gameEntity.projectile.range = entity.projectile.range;
                gameEntity.projectile.distanceTraveled = entity.projectile.distanceTraveled;
                gameEntity.projectile.sourceId = entity.projectile.sourceId;
                gameEntity.projectile.timestamp = entity.tick.timestamp;
                gameEntity.projectile.tick = entity.tick.tick;
            });
        }
    });
    
    
    $(room.state).entities.onRemove((_entity: EntitySchema, id: string) => {
        console.log('Entity removed:', id);
        const entity = ecsWorld.entities.find(e => e.id === id);
        if (entity) {
            ecsWorld.remove(entity);
            console.log('Entity removed from ECS world:', id);
        }
    });
    
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
            networkPredictionSystem.addInput(dt, room.sessionId, inputSystem.getInput(), inputSystem.isIdle());
        },
        cleanup: () => {
            networkPredictionSystem.cleanup();
        }
    };
} 